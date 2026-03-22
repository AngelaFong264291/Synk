import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createDocumentVersion,
  getDocumentWithExpand,
  listDocumentVersionsWithExpand,
  updateDocument,
} from "../lib/api";
import {
  documentOwnerEmail,
  formatDocumentTimestamp,
  versionAuthorEmail,
} from "../lib/display";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { buildLineDiff, getDiffStats } from "../lib/diff";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type {
  DocumentRecordWithExpand,
  DocumentVersionRecordWithExpand,
} from "../lib/types";

function versionLabel(version: DocumentVersionRecordWithExpand) {
  return version.versionName || `Snapshot ${version.id.slice(0, 4)}`;
}

export function DocumentDetail() {
  const { documentId } = useParams();
  const { activeWorkspace } = useActiveWorkspace();

  const [document, setDocument] = useState<DocumentRecordWithExpand | null>(
    null,
  );
  const [versions, setVersions] = useState<DocumentVersionRecordWithExpand[]>(
    [],
  );
  const [contentDraft, setContentDraft] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!documentId) return;

      setLoading(true);
      setError(null);

      try {
        const [nextDocument, nextVersions] = await Promise.all([
          getDocumentWithExpand(currentDocumentId),
          listDocumentVersionsWithExpand(currentDocumentId),
        ]);

        if (cancelled) {
          return;
        }

        if (nextDocument.workspace !== workspaceId) {
          setError("This document is not in the active workspace.");
          setDocument(null);
          setVersions([]);
          setContentDraft("");
          return;
        }

        setDocument(nextDocument);
        setVersions(nextVersions);
        setLeftVersionId("");
        setRightVersionId("");
        setContentDraft(nextDocument?.currentContent ?? "");
        setSnapshotName(
          nextVersions[0] ? `${versionLabel(nextVersions[0])} follow-up` : "",
        );
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load document",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (loading) {
    return <p className="muted">Loading document...</p>;
  }

  async function onCreateSnapshot(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!document || !snapshotName) {
      return;
    }

    setPendingSave("snapshot");
    setError(null);

    try {
      const createdVersion = await createDocumentVersion({
        documentId: document.id,
        versionName: snapshotName,
        content: contentDraft,
      });
      setDocument((current) =>
        current
          ? {
              ...current,
              currentContent: contentDraft,
            }
          : current,
      );
      setVersions((current) => [createdVersion, ...current]);
      setRightVersionId(createdVersion.id);
      setSnapshotName("");
    } catch (snapshotError: unknown) {
      setError(
        snapshotError instanceof Error
          ? snapshotError.message
          : "Unable to create snapshot",
      );
    } finally {
      setPendingSave(null);
    }
  }

  if (!bundle) {
    return <p className="muted">Document not found.</p>;
  }
  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Document detail"
        title={bundle.document.title}
        description="Embedded preview and version history."
      />

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading document...</p> : null}

      {document ? (
        <>
          <div className="two-column">
            <form className="panel stack" onSubmit={onSaveDraft}>
              <div className="row space-between wrap">
                <h2>Current draft</h2>
                <StatusPill
                  tone={
                    document.visibility === "workspace" ? "accent" : "warning"
                  }
                >
                  {document.visibility}
                </StatusPill>
              </div>
              <div className="meta-grid">
                <span>Owner: {documentOwnerEmail(document)}</span>
                <span>Updated: {formatDocumentTimestamp(document)}</span>
              </div>
              <label className="field">
                <span>Document content</span>
                <textarea
                  className="textarea textarea-large"
                  value={contentDraft}
                  onChange={(event) => setContentDraft(event.target.value)}
                />
              </label>
              <button type="submit" disabled={pendingSave === "draft"}>
                {pendingSave === "draft" ? "Saving..." : "Save draft"}
              </button>
            </form>

            <form className="panel stack" onSubmit={onCreateSnapshot}>
              <div className="row space-between wrap">
                <h2>Snapshot history</h2>
                <StatusPill tone="accent">{versions.length} saved</StatusPill>
              </div>
              <label className="field">
                <span>Snapshot name</span>
                <input
                  value={snapshotName}
                  onChange={(event) => setSnapshotName(event.target.value)}
                  placeholder="Stakeholder edits"
                  required
                />
              </label>
              <button type="submit" disabled={pendingSave === "snapshot"}>
                {pendingSave === "snapshot" ? "Saving..." : "Save snapshot"}
              </button>

              <div className="panel-list">
                {versions.map((version) => (
                  <article key={version.id} className="timeline-item">
                    <div className="row space-between wrap gap-sm">
                      <strong>{versionLabel(version)}</strong>
                      <span className="muted">
                        {new Date(version.created).toLocaleString()}
                      </span>
                    </div>
                    <p className="muted">
                      Author: {versionAuthorEmail(version)}
                    </p>
                  </article>
                ))}
              </div>
            </form>
          </div>
          <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
            Paste the File URL in a new tab. If it doesn't download the file, your tunnel or PocketBase permissions are not set correctly.
          </p>
        </div>
      )}

      <div className="panel stack">
        {getFilePreviewUrl(bundle.document) ? (
          <iframe
            src={getFilePreviewUrl(bundle.document)!}
            width="100%"
            height="800px"
            frameBorder="0"
            style={{ borderRadius: "12px", background: "#f1f5f9" }}
            title="Document preview"
          />
        ) : (
          <div className="stack">
            {bundle.document.file &&
              (bundle.document.file.toLowerCase().endsWith(".docx") ||
                bundle.document.file.toLowerCase().endsWith(".docm") ||
                bundle.document.file.toLowerCase().endsWith(".xlsx") ||
                bundle.document.file.toLowerCase().endsWith(".xlsm") ||
                bundle.document.file.toLowerCase().endsWith(".pptx") ||
                bundle.document.file.toLowerCase().endsWith(".pptm")) && (
                <div className="warning" style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(234, 179, 8, 0.1)", color: "#854d0e", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  <p>
                    <strong>Localhost Preview Notice:</strong> Office Online Viewer is disabled because it cannot reach your local server.
                  </p>
                  <p style={{ marginTop: "0.5rem" }}>
                    To enable high-fidelity preview on localhost:
                  </p>
                  <ol style={{ marginLeft: "1.5rem", marginTop: "0.25rem" }}>
                    <li>Start a tunnel (e.g., <code>cloudflared tunnel --url http://localhost:8090</code>) to expose your PocketBase server.</li>
                    <li>Set <code>VITE_PUBLIC_POCKETBASE_URL</code> in your <code>.env</code> file to the tunnel URL.</li>
                    <li>Restart the development server.</li>
                  </ol>
                </div>
              )}
            <p className="muted">No preview available for this file type.</p>
          </div>
        )}
      </div>

      <div className="row space-between wrap">
        <Link to="/documents">Back to documents</Link>
        <StatusPill tone={bundle.document.visibility === "workspace" ? "accent" : "warning"}>
          {bundle.document.visibility}
        </StatusPill>
      </div>

      <div className="stack-lg">
        <div className="panel stack">
          <h3>Linked Tasks</h3>
          {bundle.linkedTasks.length > 0 ? (
            <div className="list stack-sm">
              {bundle.linkedTasks.map((task: any) => (
                <Link key={task.id} to="/tasks" className="list-row panel-sm no-underline">
                  <div className="stack-xs">
                    <strong>{task.title}</strong>
                    <p className="muted small">{task.status}</p>
                  </div>
                  <span>→</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">No tasks linked to this document.</p>
          )}
        </div>

        <div className="panel stack">
          <h3>Version History</h3>
          {bundle.versions.length > 0 ? (
            <div className="list stack-sm">
              {bundle.versions.map((version: any) => (
                <div key={version.id} className="list-row panel-sm">
                  <div className="stack-xs">
                    <strong>{version.versionName}</strong>
                    <p className="muted small">
                      By {version.expand?.author?.name || "Unknown"} on {new Date(version.created).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No version history available.</p>
          )}
        </div>
      </div>
    </section>
  );
}

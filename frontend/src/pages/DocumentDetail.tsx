import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createDocumentVersion,
  getDocumentBundle,
  updateDocument,
} from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import type {
  DocumentRecordWithExpand,
  DocumentVersionRecordWithExpand,
  TaskRecordWithExpand,
} from "../lib/types";
import { pb } from "../lib/pocketbase";

function getRawFileUrl(document: DocumentRecordWithExpand) {
  if (!document.file) return null;
  let baseUrl = pb.files.getURL(document, document.file);
  const publicPocketBaseUrl = import.meta.env.VITE_PUBLIC_POCKETBASE_URL;
  if (publicPocketBaseUrl) {
    try {
      const publicUrlObj = new URL(publicPocketBaseUrl);
      const urlObj = new URL(baseUrl, window.location.origin);
      urlObj.protocol = publicUrlObj.protocol;
      urlObj.host = publicUrlObj.host;
      urlObj.port = publicUrlObj.port;
      let path = urlObj.pathname;
      if (publicUrlObj.pathname !== "/") {
        path =
          publicUrlObj.pathname.replace(/\/$/, "") +
          "/" +
          path.replace(/^\//, "");
      }
      urlObj.pathname = path;
      if (urlObj.host.includes("ngrok")) {
        urlObj.searchParams.set("ngrok-skip-browser-warning", "1");
      }
      // Support bypass for localtunnel if detected
      if (urlObj.host.includes("localtunnel.me")) {
        urlObj.searchParams.set("bypass-tunnel-reminder", "1");
      }
      baseUrl = urlObj.toString();
    } catch {
      // Ignore invalid public URL overrides
    }
  }
  if (baseUrl.startsWith("/")) {
    baseUrl = window.location.origin + baseUrl;
  }
  return baseUrl;
}

function getFilePreviewUrl(document: DocumentRecordWithExpand) {
  const fileName = document.file?.toLowerCase() || "";
  const baseUrl = getRawFileUrl(document);
  if (!baseUrl) return null;

  if (fileName.endsWith(".pdf")) {
    return baseUrl;
  }

  if (
    fileName.endsWith(".docx") ||
    fileName.endsWith(".docm") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xlsm") ||
    fileName.endsWith(".pptx") ||
    fileName.endsWith(".pptm")
  ) {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]";

    const publicPocketBaseUrl = import.meta.env.VITE_PUBLIC_POCKETBASE_URL;
    // Only block on localhost if no public override is provided.
    if (isLocal && !publicPocketBaseUrl) {
      return null;
    }

    const encodedUrl = encodeURIComponent(baseUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  }

  return null;
}

type DocumentBundle = Awaited<ReturnType<typeof getDocumentBundle>>;

function formatVersionAuthor(version: DocumentVersionRecordWithExpand) {
  const user = version.expand?.author;
  if (!user) {
    return "Unknown";
  }
  return user.email?.trim() || user.name?.trim() || "Unknown";
}

export function DocumentDetail() {
  const { documentId } = useParams();
  const [bundle, setBundle] = useState<DocumentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [snapshotVersionName, setSnapshotVersionName] = useState("");
  const [snapshotContent, setSnapshotContent] = useState("");
  const [snapshotPending, setSnapshotPending] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [revertingVersionId, setRevertingVersionId] = useState<string | null>(
    null,
  );
  const [revertError, setRevertError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!documentId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextBundle = await getDocumentBundle(documentId);
        if (!cancelled) {
          setBundle(nextBundle);
        }
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

    void run();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    const doc = bundle?.document;
    if (!doc) {
      return;
    }
    setSnapshotContent(doc.currentContent ?? "");
    // Only sync when this document's id or stored body changes (not on every bundle refresh).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are id + currentContent
  }, [bundle?.document?.id, bundle?.document?.currentContent]);

  async function onCreateSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentId || !bundle) {
      return;
    }

    const name = snapshotVersionName.trim();
    if (!name) {
      setSnapshotError("Enter a snapshot name.");
      return;
    }

    const content = snapshotContent.trim();
    if (!content) {
      setSnapshotError("Snapshot body cannot be empty.");
      return;
    }

    setSnapshotPending(true);
    setSnapshotError(null);
    setRevertError(null);

    try {
      await createDocumentVersion({
        documentId,
        versionName: name,
        content,
      });
      setSnapshotVersionName("");
      if (documentId) {
        const nextBundle = await getDocumentBundle(documentId);
        setBundle(nextBundle);
      }
    } catch (err: unknown) {
      setSnapshotError(
        err instanceof Error ? err.message : "Unable to save snapshot",
      );
    } finally {
      setSnapshotPending(false);
    }
  }

  function onResetSnapshotBody() {
    if (!bundle?.document) {
      return;
    }
    setSnapshotContent(bundle.document.currentContent ?? "");
    setSnapshotError(null);
  }

  async function onRevertToVersion(version: DocumentVersionRecordWithExpand) {
    if (!documentId || !bundle) {
      return;
    }

    const ok = window.confirm(
      `Replace the current document body with snapshot "${version.versionName}"? Your live body is updated; existing snapshots are not removed.`,
    );
    if (!ok) {
      return;
    }

    setRevertError(null);
    setRevertingVersionId(version.id);

    try {
      await updateDocument(documentId, { currentContent: version.content });
      const nextBundle = await getDocumentBundle(documentId);
      setBundle(nextBundle);
    } catch (err: unknown) {
      setRevertError(
        err instanceof Error ? err.message : "Unable to revert document",
      );
    } finally {
      setRevertingVersionId(null);
    }
  }

  if (loading) {
    return <p className="muted">Loading document...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!bundle) {
    return <p className="muted">Document not found.</p>;
  }
  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Document detail"
        title={bundle.document.title}
        description="Preview the file, save named snapshots of the current body, and compare version history."
      />

      {window.location.hostname === "localhost" && bundle.document.file && (
        <div
          style={{
            padding: "1rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            fontSize: "0.875rem",
          }}
        >
          <strong>Developer Debug:</strong>
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <code
              style={{
                background: "#eee",
                padding: "0.2rem 0.4rem",
                borderRadius: "4px",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {getRawFileUrl(bundle.document)}
            </code>
            <button
              className="button-sm"
              onClick={() => {
                const url = getRawFileUrl(bundle.document);
                if (url) navigator.clipboard.writeText(url);
              }}
            >
              Copy File URL
            </button>
          </div>
          <p
            className="muted"
            style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}
          >
            Paste the File URL in a new tab. If it doesn't download the file,
            your tunnel or PocketBase permissions are not set correctly.
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
                <div
                  className="warning"
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "rgba(234, 179, 8, 0.1)",
                    color: "#854d0e",
                    fontSize: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  <p>
                    <strong>Localhost Preview Notice:</strong> Office Online
                    Viewer is disabled because it cannot reach your local
                    server.
                  </p>
                  <p style={{ marginTop: "0.5rem" }}>
                    To enable high-fidelity preview on localhost:
                  </p>
                  <ol style={{ marginLeft: "1.5rem", marginTop: "0.25rem" }}>
                    <li>
                      Start a tunnel (e.g.,{" "}
                      <code>
                        cloudflared tunnel --url http://localhost:8090
                      </code>
                      ) to expose your PocketBase server.
                    </li>
                    <li>
                      Set <code>VITE_PUBLIC_POCKETBASE_URL</code> in your{" "}
                      <code>.env</code> file to the tunnel URL.
                    </li>
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
        <StatusPill
          tone={
            bundle.document.visibility === "workspace" ? "accent" : "warning"
          }
        >
          {bundle.document.visibility}
        </StatusPill>
      </div>

      <div className="stack-lg">
        <div className="panel stack">
          <h3>Linked Tasks</h3>
          {bundle.linkedTasks.length > 0 ? (
            <div className="list stack-sm">
              {bundle.linkedTasks.map((task: TaskRecordWithExpand) => (
                <Link
                  key={task.id}
                  to="/tasks"
                  className="list-row panel-sm no-underline"
                >
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
          <div className="row space-between wrap gap-sm">
            <h3>Create snapshot</h3>
            <p className="muted small" style={{ maxWidth: "28rem" }}>
              Saves a named version via the document_versions API (version name
              + body). Defaults to the document&apos;s current body; edit before
              saving.
            </p>
          </div>

          <form className="stack form" onSubmit={onCreateSnapshot}>
            <label className="field">
              <span>Snapshot name</span>
              <input
                type="text"
                value={snapshotVersionName}
                onChange={(event) => setSnapshotVersionName(event.target.value)}
                placeholder="e.g. v1 before stakeholder review"
                autoComplete="off"
                disabled={snapshotPending}
              />
            </label>
            <label className="field">
              <span>Snapshot body</span>
              <textarea
                className="textarea textarea-large"
                value={snapshotContent}
                onChange={(event) => setSnapshotContent(event.target.value)}
                disabled={snapshotPending}
                spellCheck
              />
            </label>
            {snapshotError ? <p className="error">{snapshotError}</p> : null}
            <div className="row gap-sm wrap">
              <button type="submit" disabled={snapshotPending}>
                {snapshotPending ? "Saving snapshot…" : "Save snapshot"}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={onResetSnapshotBody}
                disabled={snapshotPending}
              >
                Reset body from current document
              </button>
            </div>
          </form>
        </div>

        <div className="panel stack">
          <h3>Version history</h3>
          {revertError ? <p className="error">{revertError}</p> : null}
          {bundle.versions.length > 0 ? (
            <div className="list stack-sm">
              {bundle.versions.map(
                (version: DocumentVersionRecordWithExpand) => (
                  <div key={version.id} className="list-row panel-sm stack">
                    <div className="row space-between wrap gap-sm document-version-header">
                      <div className="stack-xs">
                        <strong>{version.versionName}</strong>
                        <p className="muted small">
                          {formatVersionAuthor(version)} ·{" "}
                          {new Date(version.created).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={
                          revertingVersionId !== null || snapshotPending
                        }
                        onClick={() => void onRevertToVersion(version)}
                      >
                        {revertingVersionId === version.id
                          ? "Reverting…"
                          : "Revert to this"}
                      </button>
                    </div>
                    <details className="document-version-body">
                      <summary className="muted small">
                        View snapshot body
                      </summary>
                      <pre className="document-version-pre">
                        {version.content}
                      </pre>
                    </details>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="muted">No snapshots yet. Create one above.</p>
          )}
        </div>
      </div>
    </section>
  );
}

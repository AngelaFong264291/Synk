import { useEffect, useMemo, useState, type SubmitEvent } from "react";
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
  const [pendingSave, setPendingSave] = useState<"draft" | "snapshot" | null>(
    null,
  );

  useEffect(() => {
    if (!activeWorkspace || !documentId) {
      setDocument(null);
      setVersions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const workspaceId = activeWorkspace.id;
    const currentDocumentId = documentId;
    let cancelled = false;

    async function load() {
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
              : "Unable to load document details",
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
  }, [activeWorkspace, documentId]);

  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");
  const effectiveLeftVersionId =
    leftVersionId || versions[versions.length - 1]?.id || "";
  const effectiveRightVersionId = rightVersionId || versions[0]?.id || "";

  const leftVersion = useMemo(
    () =>
      versions.find((version) => version.id === effectiveLeftVersionId) ??
      versions[versions.length - 1],
    [effectiveLeftVersionId, versions],
  );
  const rightVersion = useMemo(
    () =>
      versions.find((version) => version.id === effectiveRightVersionId) ??
      versions[0],
    [effectiveRightVersionId, versions],
  );
  const diffLines = useMemo(
    () =>
      buildLineDiff(leftVersion?.content ?? "", rightVersion?.content ?? ""),
    [leftVersion?.content, rightVersion?.content],
  );
  const diffStats = useMemo(() => getDiffStats(diffLines), [diffLines]);

  async function onSaveDraft(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!document) {
      return;
    }

    setPendingSave("draft");
    setError(null);

    try {
      const updatedDocument = await updateDocument(document.id, {
        currentContent: contentDraft,
      });
      setDocument(updatedDocument);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save document",
      );
    } finally {
      setPendingSave(null);
    }
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

  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Document detail"
        title={document?.title ?? "Document detail"}
        description={
          document
            ? "Edit the current draft, save named snapshots, and compare versions with the live diff viewer."
            : "Choose a workspace document to inspect versions and compare changes."
        }
        actions={
          <div className="row gap-sm wrap">
            <Link className="button-link button-link-secondary" to="/documents">
              All documents
            </Link>
          </div>
        }
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

          <section className="panel stack">
            <div className="row space-between wrap">
              <h2>Diff viewer</h2>
              <StatusPill tone="accent">Person 3 engine</StatusPill>
            </div>

            <div className="diff-stats">
              <div className="stat-card stat-card-compact">
                <span className="stat-value">{diffStats.added}</span>
                <p>Added lines</p>
              </div>
              <div className="stat-card stat-card-compact">
                <span className="stat-value">{diffStats.removed}</span>
                <p>Removed lines</p>
              </div>
              <div className="stat-card stat-card-compact">
                <span className="stat-value">{diffStats.unchanged}</span>
                <p>Unchanged lines</p>
              </div>
            </div>

            <div className="selector-grid">
              <label className="field">
                <span>Compare from</span>
                <select
                  value={effectiveLeftVersionId}
                  onChange={(event) => setLeftVersionId(event.target.value)}
                  disabled={!versions.length}
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {versionLabel(version)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Compare to</span>
                <select
                  value={effectiveRightVersionId}
                  onChange={(event) => setRightVersionId(event.target.value)}
                  disabled={!versions.length}
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {versionLabel(version)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="diff-legend">
              <span className="legend-chip legend-chip-added">Added</span>
              <span className="legend-chip legend-chip-removed">Removed</span>
              <span className="legend-chip legend-chip-neutral">Unchanged</span>
            </div>

            <div className="diff-list" aria-label="Version diff">
              {diffLines.map((line, index) => (
                <div
                  key={`${line.kind}-${line.leftLineNumber ?? "x"}-${line.rightLineNumber ?? "x"}-${index}`}
                  className={`diff-line diff-line-${line.kind}`}
                >
                  <span className="diff-line-number">
                    {line.leftLineNumber ?? ""}
                  </span>
                  <span className="diff-line-number">
                    {line.rightLineNumber ?? ""}
                  </span>
                  <code className="diff-line-code">{line.value || " "}</code>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

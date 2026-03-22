import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createDocument, listWorkspaceDocumentsWithExpand } from "../lib/api";
import { documentOwnerEmail, formatDocumentTimestamp } from "../lib/display";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { DocumentRecordWithExpand } from "../lib/types";
import { StatusPill } from "../components/StatusPill";

export function Documents() {
  const { activeWorkspace } = useActiveWorkspace();
  const [documents, setDocuments] = useState<DocumentRecordWithExpand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) {
      setDocuments([]);
      setError(null);
      return;
    }

    const workspaceId = activeWorkspace.id;
    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      setError(null);

      try {
        const nextDocuments =
          await listWorkspaceDocumentsWithExpand(workspaceId);
        if (!cancelled) {
          setDocuments(nextDocuments);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load documents",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspace]);

  async function onFileUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !activeWorkspace) {
      return;
    }

    setPendingUpload(true);
    setError(null);

    try {
      let title = file.name;
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith(".docx")) {
        title = file.name.replace(/\.docx$/i, "");
      } else if (lowerName.endsWith(".docm")) {
        title = file.name.replace(/\.docm$/i, "");
      } else if (lowerName.endsWith(".xlsx")) {
        title = file.name.replace(/\.xlsx$/i, "");
      } else if (lowerName.endsWith(".xlsm")) {
        title = file.name.replace(/\.xlsm$/i, "");
      } else if (lowerName.endsWith(".pptx")) {
        title = file.name.replace(/\.pptx$/i, "");
      } else if (lowerName.endsWith(".pptm")) {
        title = file.name.replace(/\.pptm$/i, "");
      } else if (lowerName.endsWith(".pdf")) {
        title = file.name.replace(/\.pdf$/i, "");
      } else {
        throw new Error("Unsupported file type");
      }

      const nextDocument = await createDocument({
        workspaceId: activeWorkspace.id,
        title: title,
        file: file,
      });

      setDocuments((current) => [nextDocument, ...current]);
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload document",
      );
    } finally {
      setPendingUpload(false);
    }
  }

  const uniqueOwners = new Set(documents.map((document) => document.owner))
    .size;
  const snapshotReadyCount = documents.filter(
    (document) => document.currentContent.trim().length > 0,
  ).length;
  const latestDocument = documents[0] ?? null;
  const emptyState = !loading && activeWorkspace && documents.length === 0;

  const documentCards = useMemo(
    () =>
      documents.map((document) => ({
        ...document,
        preview: document.currentContent.slice(0, 160) || "No content yet.",
      })),
    [documents],
  );

  return (
    <section className="stack-xl documents-page">
      <section className="documents-hero">
        <div className="documents-hero-copy stack">
          <p className="eyebrow">Workspace docs</p>
          <h1>Documents and version history</h1>
          <p className="documents-hero-text">
            {activeWorkspace
              ? `This is the document hub for ${activeWorkspace.name}. Capture plain-text drafts, prepare snapshot-ready records, and move into version history with a cleaner handoff to compare and review.`
              : "Pick or create a workspace first so documents have a real PocketBase home."}
          </p>
        </div>
        <div className="documents-hero-art" aria-hidden="true">
          <div className="documents-orb documents-orb-left" />
          <div className="documents-orb documents-orb-right" />
          <div className="documents-art-card documents-art-card-top">
            <span className="documents-art-glyph">◌</span>
            <div className="stack">
              <strong>Snapshots</strong>
              <p>Save named milestones before risky edits.</p>
            </div>
          </div>
          <div className="documents-art-card documents-art-card-bottom">
            <span className="documents-art-glyph">▤</span>
            <div className="stack">
              <strong>History</strong>
              <p>Open the detail page to compare versions next.</p>
            </div>
          </div>
          <div className="documents-art-sheet documents-art-sheet-back" />
          <div className="documents-art-sheet documents-art-sheet-front" />
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <div className="stats-grid documents-kpi-grid">
        <article className="stat-card documents-kpi-card">
          <div className="documents-kpi-top">
            <div
              className="documents-kpi-icon documents-kpi-icon-docs"
              aria-hidden="true"
            >
              <span className="documents-kpi-doc-icon">
                <span className="documents-kpi-doc-line documents-kpi-doc-line-top" />
                <span className="documents-kpi-doc-line documents-kpi-doc-line-middle" />
                <span className="documents-kpi-doc-line documents-kpi-doc-line-bottom" />
              </span>
            </div>
            <span className="documents-kpi-label">Documents</span>
          </div>
          <strong className="documents-kpi-value">{documents.length}</strong>
          <p>Tracked documents</p>
        </article>
        <article className="stat-card documents-kpi-card">
          <div className="documents-kpi-top">
            <div
              className="documents-kpi-icon documents-kpi-icon-snapshot"
              aria-hidden="true"
            >
              <span className="documents-kpi-camera-icon">
                <span className="documents-kpi-camera-top" />
                <span className="documents-kpi-camera-lens" />
              </span>
            </div>
            <span className="documents-kpi-label">Snapshots</span>
          </div>
          <strong className="documents-kpi-value">{snapshotReadyCount}</strong>
          <p>Snapshot-ready records</p>
        </article>
        <article className="stat-card documents-kpi-card">
          <div className="documents-kpi-top">
            <div
              className="documents-kpi-icon documents-kpi-icon-contributors"
              aria-hidden="true"
            >
              <span className="documents-kpi-people-icon">
                <span className="documents-kpi-person documents-kpi-person-back" />
                <span className="documents-kpi-person documents-kpi-person-front" />
              </span>
            </div>
            <span className="documents-kpi-label">Contributors</span>
          </div>
          <strong className="documents-kpi-value">{uniqueOwners}</strong>
          <p>Visible contributors</p>
        </article>
      </div>

      <div className="two-column documents-top-grid">
        <form
          className="panel stack documents-create-card"
          onSubmit={onCreateDocument}
        >
          <div className="row space-between wrap">
            <h2>New document</h2>
            <StatusPill tone={activeWorkspace ? "accent" : "warning"}>
              {activeWorkspace ? "Live create" : "Needs workspace"}
            </StatusPill>
          </div>

          <label className="field">
            <span>Select DOCX, XLSX, PPTX, or PDF file</span>
            <input
              type="file"
              accept=".docx,.docm,.xlsx,.xlsm,.pptx,.pptm,.pdf"
              onChange={onFileUpload}
              disabled={!activeWorkspace || pendingUpload}
            />
          </label>

          <p className="muted">
            The uploaded file will be parsed and saved as a new document immediately.
          </p>
        </form>

        <section className="panel stack documents-guide-card">
          <div className="row space-between wrap">
            <h2>Version control checklist</h2>
            <StatusPill tone={activeWorkspace ? "success" : "warning"}>
              {activeWorkspace ? "PRD-aligned" : "No workspace"}
            </StatusPill>
          </div>

          {activeWorkspace ? (
            <>
              <div className="feature-checklist">
                <div className="feature-check">
                  <strong>Named snapshots</strong>
                  <p>
                    Save milestone versions from the detail page before major
                    edits.
                  </p>
                </div>
                <div className="feature-check">
                  <strong>Diff compare</strong>
                  <p>
                    Open a document to compare old and current text side by
                    side.
                  </p>
                </div>
                <div className="feature-check">
                  <strong>Ownership visibility</strong>
                  <p>
                    Every record keeps a clear owner and latest update
                    timestamp.
                  </p>
                </div>
              </div>

              <div className="document-callout">
                <strong>Latest live signal</strong>
                <p>
                  {latestDocument
                    ? `${latestDocument.title} is the newest record in this workspace.`
                    : "Create the first document to start the version-control flow."}
                </p>
              </div>
            </>
          ) : (
            <div className="documents-empty-card">
              <div className="documents-empty-icon">⚠</div>
              <div className="stack">
                <strong>No workspace</strong>
                <p>
                  Visit <Link to="/workspace">Workspaces</Link> to create or
                  join a workspace first.
                </p>
              </div>
              <Link
                className="button-link documents-empty-link"
                to="/workspace"
              >
                Go to Workspaces
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="panel stack documents-list-shell">
        <div className="row space-between wrap">
          <div>
            <p className="eyebrow">Live records</p>
            <h2>Tracked documents</h2>
          </div>
          <StatusPill tone={documents.length ? "accent" : "warning"}>
            {documents.length ? `${documents.length} total` : "Empty"}
          </StatusPill>
        </div>

        {loading ? <p className="muted">Loading documents...</p> : null}

        <div className="panel-list">
          {documentCards.map((document) => (
            <article
              key={document.id}
              className="panel card-hover documents-record"
            >
              <div className="row space-between gap-md wrap">
                <div className="stack">
                  <h3>{document.title}</h3>
                  <p>{document.preview}</p>
                </div>
                <StatusPill
                  tone={
                    document.visibility === "workspace" ? "accent" : "warning"
                  }
                >
                  {document.visibility}
                </StatusPill>
              </div>
              <StatusPill
                tone={document.visibility === "workspace" ? "accent" : "warning"}
              >
                {document.visibility}
              </StatusPill>
            </div>

              <div className="document-version-strip">
                <div className="version-chip">
                  <strong>Owner</strong>
                  <span>{documentOwnerEmail(document)}</span>
                </div>
                <div className="version-chip">
                  <strong>Last update</strong>
                  <span>{formatDocumentTimestamp(document)}</span>
                </div>
                <div className="version-chip">
                  <strong>Status</strong>
                  <span>Ready for snapshot and diff</span>
                </div>
              </div>

              <div className="row space-between wrap gap-sm">
                <span className="muted">Live PocketBase document</span>
                <div className="page-actions">
                  <Link
                    className="button-link button-link-secondary"
                    to={`/documents/${document.id}`}
                  >
                    Compare versions
                  </Link>
                  <Link
                    className="button-link"
                    to={`/documents/${document.id}`}
                  >
                    Open history
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {emptyState ? (
            <p className="muted">
              No documents yet. Create your first one to start the snapshot
              flow.
            </p>
          ) : null}
        </div>
      </section>
    </section>
  );
}

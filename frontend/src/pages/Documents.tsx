import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { createDocument, listWorkspaceDocuments } from "../lib/api";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { DocumentRecord } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";

export function Documents() {
  const { activeWorkspace } = useActiveWorkspace();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pendingCreate, setPendingCreate] = useState(false);
  const uniqueOwners = new Set(documents.map((document) => document.owner)).size;

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
        const nextDocuments = await listWorkspaceDocuments(workspaceId);
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

  async function onCreateDocument(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      return;
    }

    setPendingCreate(true);
    setError(null);

    try {
      const nextDocument = await createDocument({
        workspaceId: activeWorkspace.id,
        title,
        currentContent: content,
      });

      setDocuments((current) => [nextDocument, ...current]);
      setTitle("");
      setContent("");
    } catch (createError: unknown) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create document",
      );
    } finally {
      setPendingCreate(false);
    }
  }

  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Workspace docs"
        title="Documents and version history"
        description={
          activeWorkspace
            ? `Showing live documents for ${activeWorkspace.name}. This space should read like version control for non-developers: named snapshots, compare-ready history, visible ownership, and clear restore points.`
            : "Pick or create a workspace first so documents have a real PocketBase home."
        }
      />

      {error ? <p className="error">{error}</p> : null}

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-value">{documents.length}</span>
          <p>Tracked documents</p>
        </article>
        <article className="stat-card">
          <span className="stat-value">{documents.length}</span>
          <p>Snapshot-ready records</p>
        </article>
        <article className="stat-card">
          <span className="stat-value">{uniqueOwners}</span>
          <p>Visible contributors</p>
        </article>
      </div>

      <div className="two-column">
        <form className="panel stack" onSubmit={onCreateDocument}>
          <div className="row space-between wrap">
            <h2>New document</h2>
            <StatusPill tone="accent">
              {activeWorkspace ? "Live create" : "Needs workspace"}
            </StatusPill>
          </div>

          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Launch brief"
              required
              disabled={!activeWorkspace}
            />
          </label>

          <label className="field">
            <span>Initial content</span>
            <textarea
              className="textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the first version of the document here..."
              disabled={!activeWorkspace}
            />
          </label>

          <button type="submit" disabled={!activeWorkspace || pendingCreate}>
            {pendingCreate ? "Creating..." : "Create document"}
          </button>
        </form>

        <section className="panel stack">
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
                  <p>Save commits from the detail page so every key revision has a readable label.</p>
                </div>
                <div className="feature-check">
                  <strong>Diff compare</strong>
                  <p>Open any document detail to compare versions with the line-by-line plain-text diff.</p>
                </div>
                <div className="feature-check">
                  <strong>Contributor attribution</strong>
                  <p>Each document already shows ownership; snapshot authorship is surfaced in version history.</p>
                </div>
                <div className="feature-check">
                  <strong>Restore point pattern</strong>
                  <p>Use snapshots as restore checkpoints for the MVP even if rollback stays a follow-up action.</p>
                </div>
              </div>
            </>
          ) : (
            <p className="muted">
              Visit <Link to="/workspace">Workspace</Link> to create or join a
              workspace first.
            </p>
          )}
        </section>
      </div>

      <div className="panel-list">
        {loading ? <p className="muted">Loading documents...</p> : null}

        {documents.map((document) => (
          <article key={document.id} className="panel card-hover">
            <div className="row space-between gap-md wrap">
              <div>
                <h2>{document.title}</h2>
                <p>
                  {document.currentContent.slice(0, 140) || "No content yet."}
                </p>
              </div>
              <StatusPill
                tone={
                  document.visibility === "workspace" ? "accent" : "warning"
                }
              >
                {document.visibility}
              </StatusPill>
            </div>

            <div className="document-version-strip">
              <div className="version-chip">
                <strong>Owner</strong>
                <span>{document.owner}</span>
              </div>
              <div className="version-chip">
                <strong>Last update</strong>
                <span>{new Date(document.updated).toLocaleString()}</span>
              </div>
              <div className="version-chip">
                <strong>Version control</strong>
                <span>Ready for snapshot and diff</span>
              </div>
            </div>

            <div className="document-callout">
              <strong>Why this matters</strong>
              <p>
                This card should signal the PRD promise: who owns the doc, when
                it changed, and where the team can save or compare named
                versions next.
              </p>
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
                <Link className="button-link" to={`/documents/${document.id}`}>
                  Open history
                </Link>
              </div>
            </div>
          </article>
        ))}

        {!loading && activeWorkspace && documents.length === 0 ? (
          <p className="muted">
            No documents yet. Create your first one to start the snapshot flow.
          </p>
        ) : null}
      </div>
    </section>
  );
}

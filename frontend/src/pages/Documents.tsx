import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createDocument, listWorkspaceDocuments } from "../lib/api";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { DocumentRecord } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import parseDOCX from "../parsing/parseDOCX.js";

export function Documents() {
  const { activeWorkspace } = useActiveWorkspace();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
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

  async function onDocxUpload(
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
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsedContent = await parseDOCX(bytes);

      const nextDocument = await createDocument({
        workspaceId: activeWorkspace.id,
        title: file.name.replace(/\.docx$/i, ""),
        currentContent: parsedContent,
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

  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Workspace docs"
        title="Documents and version history"
        description={
          activeWorkspace
            ? `Showing live documents for ${activeWorkspace.name}. Save document versions from the detail page and use Person 3's diff UI there.`
            : "Pick or create a workspace first so documents have a real PocketBase home."
        }
      />

      {error ? <p className="error">{error}</p> : null}

      <div className="two-column">
        <form className="panel stack">
          <div className="row space-between wrap">
            <h2>Upload document</h2>
            <StatusPill tone="accent">
              {activeWorkspace ? "Live upload" : "Needs workspace"}
            </StatusPill>
          </div>

          <label className="field">
            <span>Select DOCX file</span>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onDocxUpload}
              disabled={!activeWorkspace || pendingUpload}
            />
          </label>

          <p className="muted">
            The uploaded .docx file will be parsed and saved as a new document immediately.
          </p>
        </form>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Workspace status</h2>
            <StatusPill tone={activeWorkspace ? "success" : "warning"}>
              {activeWorkspace ? activeWorkspace.inviteCode : "No workspace"}
            </StatusPill>
          </div>
          {activeWorkspace ? (
            <>
              <p>{activeWorkspace.description || "No description yet."}</p>
              <p className="muted">
                Open a document detail page to save snapshots and compare
                versions.
              </p>
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
                <p>{document.currentContent.slice(0, 140) || "No content yet."}</p>
              </div>
              <StatusPill
                tone={document.visibility === "workspace" ? "accent" : "warning"}
              >
                {document.visibility}
              </StatusPill>
            </div>

            <div className="meta-grid">
              <span>Owner: {document.owner}</span>
              <span>Updated: {new Date(document.updated).toLocaleString()}</span>
            </div>

            <div className="row space-between wrap">
              <span className="muted">Live PocketBase document</span>
              <Link to={`/documents/${document.id}`}>Open details</Link>
            </div>
          </article>
        ))}

        {!loading && activeWorkspace && documents.length === 0 ? (
          <p className="muted">
            No documents yet. Upload your first DOCX to start the snapshot flow.
          </p>
        ) : null}
      </div>
    </section>
  );
}

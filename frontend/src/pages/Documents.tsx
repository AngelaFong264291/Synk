import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { documents } from "../lib/demo-data";

export function Documents() {
  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Workspace docs"
        title="Documents and version history"
        description="Track document ownership, keep named snapshots, and jump into diff review before the backend schema lands."
        actions={<button type="button">New document</button>}
      />

      <div className="panel-list">
        {documents.map((document) => (
          <article key={document.id} className="panel card-hover">
            <div className="row space-between gap-md wrap">
              <div>
                <h2>{document.title}</h2>
                <p>{document.excerpt}</p>
              </div>
              <StatusPill
                tone={document.status === "Ready for review" ? "success" : "warning"}
              >
                {document.status}
              </StatusPill>
            </div>

            <div className="meta-grid">
              <span>Owner: {document.owner}</span>
              <span>Visibility: {document.visibility}</span>
              <span>Linked tasks: {document.linkedTaskCount}</span>
              <span>Updated: {document.updatedAt}</span>
            </div>

            <div className="row space-between wrap">
              <span className="muted">
                {document.versions.length} snapshots saved
              </span>
              <Link to={`/documents/${document.id}`}>Open details</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

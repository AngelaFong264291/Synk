import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { getDocumentById } from "../lib/demo-data";

export function DocumentDetail() {
  const { documentId } = useParams();
  const document = getDocumentById(documentId ?? "");

  const [leftVersionId, setLeftVersionId] = useState(document.versions[0]?.id ?? "");
  const [rightVersionId, setRightVersionId] = useState(
    document.versions[document.versions.length - 1]?.id ?? "",
  );

  const leftVersion = useMemo(
    () =>
      document.versions.find((version) => version.id === leftVersionId) ??
      document.versions[0],
    [document.versions, leftVersionId],
  );
  const rightVersion = useMemo(
    () =>
      document.versions.find((version) => version.id === rightVersionId) ??
      document.versions[document.versions.length - 1],
    [document.versions, rightVersionId],
  );

  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Document detail"
        title={document.title}
        description={document.excerpt}
        actions={
          <div className="row gap-sm wrap">
            <button type="button">Save snapshot</button>
            <button type="button" className="button-secondary">
              Request review
            </button>
          </div>
        }
      />

      <div className="panel">
        <div className="row space-between gap-md wrap">
          <div className="meta-grid">
            <span>Owner: {document.owner}</span>
            <span>Visibility: {document.visibility}</span>
            <span>Linked tasks: {document.linkedTaskCount}</span>
            <span>Updated: {document.updatedAt}</span>
          </div>
          <StatusPill
            tone={document.status === "Ready for review" ? "success" : "warning"}
          >
            {document.status}
          </StatusPill>
        </div>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Snapshot history</h2>
            <Link to="/documents">All documents</Link>
          </div>
          <div className="panel-list">
            {document.versions.map((version) => (
              <article key={version.id} className="timeline-item">
                <div className="row space-between wrap gap-sm">
                  <strong>{version.label}</strong>
                  <span className="muted">{version.createdAt}</span>
                </div>
                <p>{version.summary}</p>
                <p className="muted">By {version.author}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Diff viewer</h2>
            <StatusPill tone="accent">Plain-text MVP</StatusPill>
          </div>

          <div className="selector-grid">
            <label className="field">
              <span>Compare from</span>
              <select
                value={leftVersionId}
                onChange={(event) => setLeftVersionId(event.target.value)}
              >
                {document.versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Compare to</span>
              <select
                value={rightVersionId}
                onChange={(event) => setRightVersionId(event.target.value)}
              >
                {document.versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="diff-grid">
            <article className="diff-card">
              <h3>{leftVersion?.label}</h3>
              <p className="muted">{leftVersion?.author}</p>
              <pre>{leftVersion?.content}</pre>
            </article>

            <article className="diff-card diff-card-highlight">
              <h3>{rightVersion?.label}</h3>
              <p className="muted">{rightVersion?.author}</p>
              <pre>{rightVersion?.content}</pre>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}

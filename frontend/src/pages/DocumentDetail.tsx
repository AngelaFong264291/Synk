import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDocumentBundle } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";

export function DocumentDetail() {
  const { documentId } = useParams();
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!documentId) return;

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

    void load();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

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
        description="Rendered DOCX content and version history."
      />

      <div className="panel stack">
        <div
          className="doc-preview"
          dangerouslySetInnerHTML={{
            __html: bundle.document.currentContent || "<p>No content yet.</p>",
          }}
        />
      </div>

      <div className="row space-between wrap">
        <Link to="/documents">Back to documents</Link>
        <StatusPill tone={bundle.document.visibility === "workspace" ? "accent" : "warning"}>
          {bundle.document.visibility}
        </StatusPill>
      </div>

      {/* ... existing version history / related content ... */}
    </section>
  );
}

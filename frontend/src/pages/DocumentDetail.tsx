import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDocumentBundle } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { pb } from "../lib/pocketbase";

function getRawFileUrl(document: any) {
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
        path = publicUrlObj.pathname.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
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
    } catch (e) {}
  }
  if (baseUrl.startsWith("/")) {
    baseUrl = window.location.origin + baseUrl;
  }
  return baseUrl;
}

function getFilePreviewUrl(document: any) {
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
        description="Embedded preview and version history."
      />

      {window.location.hostname === "localhost" && bundle.document.file && (
        <div style={{ padding: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "0.875rem" }}>
          <strong>Developer Debug:</strong>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <code style={{ background: "#eee", padding: "0.2rem 0.4rem", borderRadius: "4px", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
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

      {/* ... existing version history / related content ... */}
    </section>
  );
}

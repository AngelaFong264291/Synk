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
    baseUrl = pb.baseUrl.replace(/\/$/, "") + baseUrl;
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

function getRawFileUrlForRecord(record: any, fileField: string) {
  const file = record[fileField];
  if (!file) return null;
  let baseUrl = pb.files.getURL(record, file);
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
    baseUrl = pb.baseUrl.replace(/\/$/, "") + baseUrl;
  }
  return baseUrl;
}

function getFilePreviewUrlForRecord(record: any, fileField: string) {
  const file = record[fileField];
  if (!file) return null;
  const fileName = file.toLowerCase() || "";
  const baseUrl = getRawFileUrlForRecord(record, fileField);
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
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  }

  return null;
}

export function DocumentDetail() {
  const { documentId } = useParams();
  const [bundle, setBundle] = useState<DocumentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [snapshotVersionName, setSnapshotVersionName] = useState("");
  const [snapshotFile, setSnapshotFile] = useState<File | null>(null);
  const [snapshotPending, setSnapshotPending] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [previewVersion, setPreviewVersion] = useState<DocumentVersionRecordWithExpand | null>(null);

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

    if (!snapshotFile) {
      setSnapshotError("Select a file to upload.");
      return;
    }

    setSnapshotPending(true);
    setSnapshotError(null);

    try {
      await createDocumentVersion({
        documentId,
        versionName: name,
        file: snapshotFile,
      });
      await updateDocument(documentId, { file: snapshotFile });
      setSnapshotVersionName("");
      setSnapshotFile(null);
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
    setSnapshotFile(null);
    setSnapshotError(null);
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
        description="Preview the file, upload new versions, and compare version history."
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
          >
            Paste the File URL in a new tab. If it doesn't download the file,
            your tunnel or PocketBase permissions are not set correctly.
          </p>
        </div>
      )}

      <div className="panel stack">
        {previewVersion && (
          <div className="row space-between wrap">
            <h3>Previewing snapshot: {previewVersion.versionName}</h3>
          const previewRecord = bundle.document;
          const previewUrl = getFilePreviewUrl(bundle.document);
            >
              Back to current
            </button>
          </div>
        )}
        {(() => {
          const previewRecord = previewVersion || bundle.document;
          const previewUrl = getFilePreviewUrl(previewRecord);
          const fileName = previewRecord.file?.toLowerCase() || "";

          return previewUrl ? (
            <div className="stack">
              <iframe
                key={'current'}
                width="100%"
                height="800px"
                frameBorder="0"
                style={{ borderRadius: "12px", background: "#f1f5f9" }}
                title="Document preview"
                key={previewVersion ? previewVersion.id : 'current'}
              />
            </div>
          ) : (
            <div className="stack">
              {previewRecord.file &&
                (fileName.endsWith(".docx") ||
                  fileName.endsWith(".docm") ||
                  fileName.endsWith(".xlsx") ||
                  fileName.endsWith(".xlsm") ||
                  fileName.endsWith(".pptx") ||
                  fileName.endsWith(".pptm")) && (
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
          );
        })()}
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
              Upload a new version of the file, which will update the document's file and create a named version.
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
              <span>Snapshot file</span>
              <input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSnapshotFile(file);
                  if (file) {
                    setSnapshotError(null);
                  }
                }}
                disabled={snapshotPending}
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
                Reset file from current document
              </button>
            </div>
          </form>
        </div>

        <div className="panel stack">
          <h3>Version history</h3>
          {bundle.versions.length > 0 ? (
            <div className="list stack-sm">
              {bundle.versions.map(
                      <a
                        href={getFilePreviewUrlForRecord(version, "file") || getRawFileUrlForRecord(version, "file")}
                        target="_blank"
                        rel="noopener noreferrer"
                      </a>
                  >
                    <div className="stack-xs">
                      <button
                        className="button-link"
                        onClick={() => setPreviewVersion(version)}
                      >
                        <strong>{version.versionName}</strong>
                      </button>
                      <p className="muted small">
                        {formatVersionAuthor(version)} ·{" "}
                        {new Date(version.created).toLocaleString()}
                      </p>
                    </div>
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

import { useEffect, useState, type SubmitEvent } from "react";
import {
  createDecision,
  listWorkspaceDecisions,
  listWorkspaceDocuments,
  listWorkspaceTasks,
} from "../lib/api";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { DecisionRecord, DocumentRecord, TaskRecord } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";

function getLinkedTitle(
  recordId: string | undefined,
  records: Array<{ id: string; title: string }>,
) {
  if (!recordId) {
    return "None";
  }

  return records.find((record) => record.id === recordId)?.title ?? recordId;
}

export function Decisions() {
  const { activeWorkspace } = useActiveWorkspace();
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [decision, setDecision] = useState("");
  const [linkedTask, setLinkedTask] = useState("");
  const [linkedDocument, setLinkedDocument] = useState("");
  const [pendingCreate, setPendingCreate] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) {
      setDecisions([]);
      setDocuments([]);
      setTasks([]);
      setError(null);
      return;
    }

    const workspaceId = activeWorkspace.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [nextDecisions, nextDocuments, nextTasks] = await Promise.all([
          listWorkspaceDecisions(workspaceId),
          listWorkspaceDocuments(workspaceId),
          listWorkspaceTasks(workspaceId),
        ]);

        if (!cancelled) {
          setDecisions(nextDecisions);
          setDocuments(nextDocuments);
          setTasks(nextTasks);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load decisions",
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
  }, [activeWorkspace]);

  async function onCreateDecision(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      return;
    }

    const workspaceId = activeWorkspace.id;

    setPendingCreate(true);
    setError(null);

    try {
      const nextDecision = await createDecision({
        workspaceId,
        title,
        context,
        decision,
        linkedTask: linkedTask || undefined,
        linkedDocument: linkedDocument || undefined,
      });

      setDecisions((current) => [nextDecision, ...current]);
      setTitle("");
      setContext("");
      setDecision("");
      setLinkedTask("");
      setLinkedDocument("");
    } catch (createError: unknown) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create decision",
      );
    } finally {
      setPendingCreate(false);
    }
  }

  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Decision log"
        title="Capture what changed and why"
        description={
          activeWorkspace
            ? `These are live decisions for ${activeWorkspace.name}, linked back to the work that triggered them.`
            : "Choose a workspace first so the decision log can load from PocketBase."
        }
      />

      {error ? <p className="error">{error}</p> : null}

      <div className="two-column">
        <form className="panel stack" onSubmit={onCreateDecision}>
          <div className="row space-between wrap">
            <h2>Log decision</h2>
            <StatusPill tone="accent">
              {activeWorkspace ? "Live decision" : "Needs workspace"}
            </StatusPill>
          </div>

          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Use plain-text diff for MVP"
              required
              disabled={!activeWorkspace}
            />
          </label>

          <label className="field">
            <span>Context</span>
            <textarea
              className="textarea"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Why this decision came up..."
              required
              disabled={!activeWorkspace}
            />
          </label>

          <label className="field">
            <span>Decision</span>
            <textarea
              className="textarea"
              value={decision}
              onChange={(event) => setDecision(event.target.value)}
              placeholder="What the team decided..."
              required
              disabled={!activeWorkspace}
            />
          </label>

          <label className="field">
            <span>Linked task</span>
            <select
              value={linkedTask}
              onChange={(event) => setLinkedTask(event.target.value)}
              disabled={!activeWorkspace}
            >
              <option value="">None</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Linked document</span>
            <select
              value={linkedDocument}
              onChange={(event) => setLinkedDocument(event.target.value)}
              disabled={!activeWorkspace}
            >
              <option value="">None</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={!activeWorkspace || pendingCreate}>
            {pendingCreate ? "Saving..." : "Log decision"}
          </button>
        </form>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Decision quality</h2>
            <StatusPill tone={activeWorkspace ? "success" : "warning"}>
              {activeWorkspace ? `${decisions.length} logged` : "No workspace"}
            </StatusPill>
          </div>
          <p>
            Link the decision to a task or document whenever possible so your
            demo shows the full trail from work to resolution.
          </p>
          <p className="muted">
            This is the clearest product story for judges asking how Synk
            reduces repeated debates.
          </p>
        </section>
      </div>

      {loading ? <p className="muted">Loading decisions...</p> : null}

      <div className="panel-list">
        {decisions.map((entry) => (
          <article key={entry.id} className="panel">
            <div className="row space-between wrap gap-sm">
              <div>
                <h2>{entry.title}</h2>
                <p>{entry.context}</p>
              </div>
              <div className="align-right">
                <p className="muted">
                  {new Date(entry.decidedAt).toLocaleDateString()}
                </p>
                <p className="muted">{entry.owner}</p>
              </div>
            </div>
            <div className="decision-outcome">
              <strong>Decision</strong>
              <p>{entry.decision}</p>
            </div>
            <div className="meta-grid">
              <span>Task: {getLinkedTitle(entry.linkedTask, tasks)}</span>
              <span>
                Document: {getLinkedTitle(entry.linkedDocument, documents)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

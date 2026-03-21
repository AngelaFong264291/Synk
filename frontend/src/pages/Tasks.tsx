import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createTask,
  listWorkspaceDocuments,
  listWorkspaceMembers,
  listWorkspaceTasks,
  updateTaskStatus,
} from "../lib/api";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type {
  DocumentRecord,
  TaskRecord,
  TaskStatus,
  WorkspaceMemberWithExpand,
} from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";

const columns: TaskStatus[] = ["todo", "in_progress", "done"];

function formatTaskStatus(status: TaskStatus) {
  if (status === "in_progress") {
    return "In Progress";
  }

  if (status === "done") {
    return "Done";
  }

  return "To Do";
}

function getMemberLabel(member: WorkspaceMemberWithExpand) {
  return member.expand?.user?.name || member.expand?.user?.email || member.user;
}

function getAssigneeLabel(
  assigneeId: string | undefined,
  members: WorkspaceMemberWithExpand[],
) {
  if (!assigneeId) {
    return "Unassigned";
  }

  const member = members.find((entry) => entry.user === assigneeId);
  return member ? getMemberLabel(member) : assigneeId;
}

function getDocumentTitle(documentId: string | undefined, documents: DocumentRecord[]) {
  if (!documentId) {
    return "No linked document";
  }

  return documents.find((document) => document.id === documentId)?.title ?? documentId;
}

export function Tasks() {
  const { activeWorkspace } = useActiveWorkspace();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberWithExpand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pendingCreate, setPendingCreate] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) {
      setTasks([]);
      setDocuments([]);
      setMembers([]);
      setError(null);
      return;
    }

    const workspaceId = activeWorkspace.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [nextTasks, nextDocuments, nextMembers] = await Promise.all([
          listWorkspaceTasks(workspaceId),
          listWorkspaceDocuments(workspaceId),
          listWorkspaceMembers(workspaceId),
        ]);

        if (!cancelled) {
          setTasks(nextTasks);
          setDocuments(nextDocuments);
          setMembers(nextMembers);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load tasks",
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

  const groupedTasks = useMemo(
    () =>
      columns.map((status) => ({
        status,
        tasks: tasks.filter((task) => task.status === status),
      })),
    [tasks],
  );

  async function onCreateTask(event: FormEvent) {
    event.preventDefault();

    if (!activeWorkspace) {
      return;
    }

    setPendingCreate(true);
    setError(null);

    try {
      const nextTask = await createTask({
        workspaceId: activeWorkspace.id,
        title,
        assignee: selectedAssignee || undefined,
        document: selectedDocument || undefined,
        dueDate: dueDate || undefined,
      });

      setTasks((current) => [...current, nextTask]);
      setTitle("");
      setSelectedAssignee("");
      setSelectedDocument("");
      setDueDate("");
    } catch (createError: unknown) {
      setError(
        createError instanceof Error ? createError.message : "Unable to create task",
      );
    } finally {
      setPendingCreate(false);
    }
  }

  async function onMoveTask(taskId: string, status: TaskStatus) {
    try {
      const updatedTask = await updateTaskStatus(taskId, status);
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updatedTask : task)),
      );
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update task status",
      );
    }
  }

  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Ownership"
        title="Task board"
        description={
          activeWorkspace
            ? `Showing live tasks for ${activeWorkspace.name}. Move items between columns as your team progresses.`
            : "Pick a workspace first so the board has real tasks to show."
        }
      />

      {error ? <p className="error">{error}</p> : null}

      <div className="two-column">
        <form className="panel stack" onSubmit={onCreateTask}>
          <div className="row space-between wrap">
            <h2>Create task</h2>
            <StatusPill tone="accent">
              {activeWorkspace ? "Live task" : "Needs workspace"}
            </StatusPill>
          </div>

          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Review snapshot diff"
              required
              disabled={!activeWorkspace}
            />
          </label>

          <label className="field">
            <span>Assignee</span>
            <select
              value={selectedAssignee}
              onChange={(event) => setSelectedAssignee(event.target.value)}
              disabled={!activeWorkspace}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.user}>
                  {getMemberLabel(member)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Linked document</span>
            <select
              value={selectedDocument}
              onChange={(event) => setSelectedDocument(event.target.value)}
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

          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={!activeWorkspace}
            />
          </label>

          <button type="submit" disabled={!activeWorkspace || pendingCreate}>
            {pendingCreate ? "Creating..." : "Create task"}
          </button>
        </form>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Board status</h2>
            <StatusPill tone={activeWorkspace ? "success" : "warning"}>
              {activeWorkspace ? `${tasks.length} tasks` : "No workspace"}
            </StatusPill>
          </div>
          <p>
            Link tasks to documents so the team can show ownership directly next
            to version history.
          </p>
          <p className="muted">
            The move buttons below call the shared PocketBase API so status
            changes become live demo interactions.
          </p>
        </section>
      </div>

      {loading ? <p className="muted">Loading tasks...</p> : null}

      <div className="board">
        {groupedTasks.map((column) => (
          <section key={column.status} className="board-column">
            <div className="row space-between">
              <h2>{formatTaskStatus(column.status)}</h2>
              <StatusPill
                tone={
                  column.status === "done"
                    ? "success"
                    : column.status === "in_progress"
                      ? "accent"
                      : "neutral"
                }
              >
                {column.tasks.length}
              </StatusPill>
            </div>

            <div className="stack">
              {column.tasks.map((task) => (
                <article key={task.id} className="task-card">
                  <div className="row space-between gap-sm wrap">
                    <strong>{task.title}</strong>
                    <StatusPill tone="neutral">
                      {formatTaskStatus(task.status)}
                    </StatusPill>
                  </div>
                  <p>{getDocumentTitle(task.document, documents)}</p>
                  <p className="muted">
                    {getAssigneeLabel(task.assignee, members)}
                    {task.dueDate ? ` • due ${task.dueDate}` : ""}
                  </p>
                  <div className="row gap-sm wrap">
                    {columns
                      .filter((status) => status !== task.status)
                      .map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="button-secondary"
                          onClick={() => void onMoveTask(task.id, status)}
                        >
                          Move to {formatTaskStatus(status)}
                        </button>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

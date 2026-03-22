import { useEffect, useState, type SubmitEvent } from "react";
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

function getColumnHint(status: TaskStatus) {
  if (status === "in_progress") {
    return "Items actively moving through the workflow";
  }

  if (status === "done") {
    return "Completed work ready to reference in the demo";
  }

  return "Assigned work waiting for someone to pick it up";
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

function getDocumentTitle(
  documentId: string | undefined,
  documents: DocumentRecord[],
) {
  if (!documentId) {
    return "No linked document";
  }

  return (
    documents.find((document) => document.id === documentId)?.title ??
    documentId
  );
}

function formatDueDate(value: string | undefined) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return `Due ${value}`;
  }

  return `Due ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)}`;
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
  const assignedTaskCount = tasks.filter((task) => Boolean(task.assignee)).length;
  const linkedTaskCount = tasks.filter((task) => Boolean(task.document)).length;
  const dueTaskCount = tasks.filter((task) => Boolean(task.dueDate)).length;

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
            loadError instanceof Error
              ? loadError.message
              : "Unable to load tasks",
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

  async function onCreateTask(event: SubmitEvent<HTMLFormElement>) {
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
        createError instanceof Error
          ? createError.message
          : "Unable to create task",
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
            ? `Showing live tasks for ${activeWorkspace.name}. Keep work visible with clear To Do, In Progress, and Done status buckets.`
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

        <section className="panel stack task-side-panel">
          <div className="row space-between wrap">
            <h2>Board pulse</h2>
            <StatusPill tone={activeWorkspace ? "success" : "warning"}>
              {activeWorkspace ? `${tasks.length} tasks` : "No workspace"}
            </StatusPill>
          </div>

          <div className="task-pulse-grid">
            <article className="task-pulse-card">
              <span className="task-pulse-label">Assigned</span>
              <strong>{assignedTaskCount}</strong>
              <p>{tasks.length - assignedTaskCount} still need an owner</p>
            </article>
            <article className="task-pulse-card">
              <span className="task-pulse-label">Linked</span>
              <strong>{linkedTaskCount}</strong>
              <p>{tasks.length - linkedTaskCount} are still general tasks</p>
            </article>
            <article className="task-pulse-card">
              <span className="task-pulse-label">Scheduled</span>
              <strong>{dueTaskCount}</strong>
              <p>{tasks.length - dueTaskCount} have no due date yet</p>
            </article>
          </div>
        </section>
      </div>

      {loading ? <p className="muted">Loading tasks...</p> : null}

      {activeWorkspace ? (
        <section className="panel stack board-shell">
          <div className="row space-between wrap">
            <h2>Board by status</h2>
            <StatusPill tone="accent">{tasks.length} total</StatusPill>
          </div>

          <p className="board-shell-note">
            Track what is queued, what is moving, and what is ready to show in
            the final walkthrough.
          </p>

          <div className="board board-polished">
            {columns.map((column) => {
              const columnTasks = tasks.filter((task) => task.status === column);

              return (
                <section
                  key={column}
                  className={`board-column board-column-${column.replace("_", "-")}`}
                >
                  <div className="board-column-top">
                    <div className="row space-between wrap gap-sm">
                      <div className="stack board-column-heading">
                        <h3>{formatTaskStatus(column)}</h3>
                      </div>
                      <StatusPill
                        tone={
                          column === "done"
                            ? "success"
                            : column === "in_progress"
                              ? "accent"
                              : "neutral"
                        }
                      >
                        {columnTasks.length}
                      </StatusPill>
                    </div>
                    <p className="board-column-hint">{getColumnHint(column)}</p>
                  </div>

                  <div className="stack board-column-body">
                    {columnTasks.map((task) => (
                      <article key={task.id} className="task-card task-card-polished">
                        <div className="row space-between gap-sm wrap task-card-top">
                          <div className="stack task-card-copy">
                            <strong>{task.title}</strong>
                            <p>{getDocumentTitle(task.document, documents)}</p>
                          </div>
                          <StatusPill
                            tone={
                              task.status === "done"
                                ? "success"
                                : task.status === "in_progress"
                                  ? "accent"
                                  : "neutral"
                            }
                          >
                            {formatTaskStatus(task.status)}
                          </StatusPill>
                        </div>

                        <div className="task-card-meta">
                          <div className="task-meta-pill">
                            <span className="task-meta-label">Owner</span>
                            <strong>{getAssigneeLabel(task.assignee, members)}</strong>
                          </div>
                          <div className="task-meta-pill">
                            <span className="task-meta-label">Deadline</span>
                            <strong>{formatDueDate(task.dueDate)}</strong>
                          </div>
                        </div>

                        <div className="row gap-sm wrap task-card-actions">
                          {task.status !== "todo" ? (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => void onMoveTask(task.id, "todo")}
                            >
                              Mark To Do
                            </button>
                          ) : null}
                          {task.status !== "in_progress" ? (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() =>
                                void onMoveTask(task.id, "in_progress")
                              }
                            >
                              Mark In Progress
                            </button>
                          ) : null}
                          {task.status !== "done" ? (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => void onMoveTask(task.id, "done")}
                            >
                              Mark Done
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}

                    {!columnTasks.length ? (
                      <div className="board-empty-state">
                        <div className="stack">
                          <strong>No tasks yet</strong>
                          <p className="muted">
                            Nothing in {formatTaskStatus(column).toLowerCase()} yet.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}

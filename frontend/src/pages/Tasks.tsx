import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { tasks, type TaskStatus } from "../lib/demo-data";

const columns: TaskStatus[] = ["To Do", "In Progress", "Done"];

export function Tasks() {
  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Ownership"
        title="Task board"
        description="Keep work visible, assigned, and tied back to the exact documents driving the demo."
        actions={<button type="button">Create task</button>}
      />

      <div className="board">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column);

          return (
            <section key={column} className="board-column">
              <div className="row space-between">
                <h2>{column}</h2>
                <StatusPill
                  tone={
                    column === "Done"
                      ? "success"
                      : column === "In Progress"
                        ? "accent"
                        : "neutral"
                  }
                >
                  {columnTasks.length}
                </StatusPill>
              </div>

              <div className="stack">
                {columnTasks.map((task) => (
                  <article key={task.id} className="task-card">
                    <div className="row space-between gap-sm">
                      <strong>{task.title}</strong>
                      <StatusPill
                        tone={task.priority === "High" ? "warning" : "neutral"}
                      >
                        {task.priority}
                      </StatusPill>
                    </div>
                    <p className="muted">{task.linkedDocument}</p>
                    <div className="meta-grid">
                      <span>Assignee: {task.assignee}</span>
                      <span>Due: {task.dueDate}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

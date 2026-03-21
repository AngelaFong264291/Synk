import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { decisions, documents, tasks, workspace } from "../lib/demo-data";

export function Dashboard() {
  const { model } = useAuth();
  const openTasks = tasks.filter((task) => task.status !== "Done");

  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${model?.email ?? "teammate"}`}
        description="This is the hackathon control center for progress, handoffs, and demo readiness."
        actions={
          <div className="row gap-sm wrap">
            <Link className="button-link" to="/workspace">
              Open workspace
            </Link>
            <Link className="button-link button-link-secondary" to="/documents">
              Review documents
            </Link>
          </div>
        }
      />

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-value">{documents.length}</span>
          <p>Tracked documents</p>
        </article>
        <article className="stat-card">
          <span className="stat-value">{openTasks.length}</span>
          <p>Open tasks</p>
        </article>
        <article className="stat-card">
          <span className="stat-value">{decisions.length}</span>
          <p>Key decisions logged</p>
        </article>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Project summary</h2>
            <StatusPill tone="accent">{workspace.focus}</StatusPill>
          </div>
          <p>
            The team is building one clear demo flow: onboard, edit a document,
            save a named version, compare changes, assign a task, and log a
            decision.
          </p>
          <p className="muted">
            Next step: replace this demo summary with Person 3&apos;s AI
            changelog layer.
          </p>
        </section>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Recent decisions</h2>
            <Link to="/decisions">Open log</Link>
          </div>
          {decisions.map((decision) => (
            <div key={decision.id} className="list-row">
              <div>
                <strong>{decision.title}</strong>
                <p>{decision.owner}</p>
              </div>
              <span className="muted">{decision.date}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="panel stack">
        <div className="row space-between wrap">
          <h2>Execution focus</h2>
          <Link to="/tasks">See task board</Link>
        </div>
        <div className="panel-list compact-grid">
          {openTasks.map((task) => (
            <article key={task.id} className="task-card">
              <div className="row space-between gap-sm">
                <strong>{task.title}</strong>
                <StatusPill
                  tone={task.status === "In Progress" ? "accent" : "neutral"}
                >
                  {task.status}
                </StatusPill>
              </div>
              <p>{task.linkedDocument}</p>
              <p className="muted">
                {task.assignee} • due {task.dueDate}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

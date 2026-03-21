import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { documents, members, tasks, workspace } from "../lib/demo-data";

export function Workspace() {
  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Workspace"
        title={workspace.name}
        description={`${workspace.focus} in motion. Keep version history, tasks, and decisions in one place while the team ships.`}
        actions={
          <div className="row gap-sm wrap">
            <button type="button">Invite members</button>
            <button type="button" className="button-secondary">
              Join via code
            </button>
          </div>
        }
      />

      <div className="hero-panel">
        <div>
          <p className="eyebrow">Invite code</p>
          <h2>{workspace.inviteCode}</h2>
          <p>{workspace.milestone}</p>
        </div>
        <div className="avatar-row">
          {members.map((member) => (
            <div key={member.id} className="avatar-card">
              <span>{member.initials}</span>
              <div>
                <strong>{member.name}</strong>
                <p>{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-value">{documents.length}</span>
          <p>Documents tracked</p>
        </article>
        <article className="stat-card">
          <span className="stat-value">{tasks.length}</span>
          <p>Tasks in flight</p>
        </article>
        <article className="stat-card">
          <span className="stat-value">{members.length}</span>
          <p>Active collaborators</p>
        </article>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Document ownership</h2>
            <Link to="/documents">See all</Link>
          </div>
          {documents.map((document) => (
            <div key={document.id} className="list-row">
              <div>
                <strong>{document.title}</strong>
                <p>{document.owner}</p>
              </div>
              <StatusPill tone="accent">{document.visibility}</StatusPill>
            </div>
          ))}
        </section>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Today&apos;s focus</h2>
            <Link to="/tasks">Open board</Link>
          </div>
          {tasks.slice(0, 3).map((task) => (
            <div key={task.id} className="list-row">
              <div>
                <strong>{task.title}</strong>
                <p>{task.assignee}</p>
              </div>
              <StatusPill
                tone={task.status === "Done" ? "success" : "warning"}
              >
                {task.status}
              </StatusPill>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}

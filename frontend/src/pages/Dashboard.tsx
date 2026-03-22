import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { DashboardViewModel } from "../lib/view-models";
import { loadDashboardViewModel } from "../lib/view-models";
import { createDashboardSummary } from "../lib/summary";

export function Dashboard() {
  const { model } = useAuth();
  const { activeWorkspaceId } = useActiveWorkspace();
  const [data, setData] = useState<DashboardViewModel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next = await loadDashboardViewModel(activeWorkspaceId ?? undefined);

      if (!cancelled) {
        setData(next);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  if (!data) {
    return (
      <section className="stack-lg">
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome back, ${model?.email ?? "teammate"}`}
          description="Loading your workspace summary, recent activity, and live demo signals."
        />
      </section>
    );
  }

  const { decisions, documents, members, tasks, workspace, source } = data;
  const openTasks = tasks.filter((task) => task.status !== "Done");
  const completedTasks = tasks.filter((task) => task.status === "Done");
  const summary = createDashboardSummary({
    workspace,
    documents,
    tasks,
    decisions,
    members,
  });
  const totalSnapshots = documents.reduce(
    (count, document) => count + document.versions.length,
    0,
  );
  const dueTodayTasks = tasks.filter((task) => task.dueDate === "Today");
  const progressPercent = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;
  const priorityTasks = openTasks.slice(0, 2);
  const nextUpTasks = openTasks.slice(2, 4);
  const recentSnapshot = documents
    .flatMap((document) =>
      document.versions.map((version) => ({
        documentTitle: document.title,
        label: version.label,
        author: version.author,
        createdAt: version.createdAt,
      })),
    )
    .at(-1);

  return (
    <section className="dashboard-shell stack-lg">
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

      {source === "demo" ? (
        <div className="panel">
          <p className="muted">
            Showing demo fallback data.
          </p>
          <p className="muted">
            {data.error
              ? `Live PocketBase data failed to load: ${data.error}`
              : "PocketBase collections and seed data are not available for this user yet."}
          </p>
        </div>
      ) : null}

      <section className="dashboard-hero panel">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Live demo frame</p>
          <h2>{workspace.name}</h2>
          <p className="dashboard-hero-text">{workspace.milestone}</p>
          <div className="dashboard-hero-meta">
            <span>{members.length} teammates</span>
            <span>{openTasks.length} active tasks</span>
            <span>{totalSnapshots} named snapshots</span>
            <span>Invite code {workspace.inviteCode}</span>
          </div>
        </div>

        <div className="dashboard-focus-card">
          <div className="row space-between wrap gap-sm">
            <strong>Your focus today</strong>
            <StatusPill tone="accent">{workspace.focus}</StatusPill>
          </div>
          <div className="dashboard-focus-strip">
            <Link className="dashboard-focus-link" to="/documents">
              Compare latest snapshot
            </Link>
            <div className="dashboard-progress">
              <div className="dashboard-progress-top">
                <span>{dueTodayTasks.length} tasks due today</span>
                <strong>{progressPercent}%</strong>
              </div>
              <div className="dashboard-progress-bar">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
          <p className="muted">{summary.headline}</p>
        </div>
      </section>

      <section className="dashboard-kpi panel">
        <div className="dashboard-kpi-item">
          <span className="dashboard-kpi-label">Tasks</span>
          <strong>{tasks.length}</strong>
        </div>
        <div className="dashboard-kpi-item">
          <span className="dashboard-kpi-label">Decisions</span>
          <strong>{decisions.length}</strong>
        </div>
        <div className="dashboard-kpi-item">
          <span className="dashboard-kpi-label">Docs</span>
          <strong>{documents.length}</strong>
        </div>
        <div className="dashboard-kpi-item">
          <span className="dashboard-kpi-label">Snapshots</span>
          <strong>{totalSnapshots}</strong>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-card-wide">
          <div className="row space-between wrap">
            <h2>Critical now</h2>
            <Link to="/tasks">Open task board</Link>
          </div>
          <div className="dashboard-checklist">
            {priorityTasks.map((task) => (
              <label key={task.id} className="dashboard-check-item">
                <input type="checkbox" checked={task.status === "Done"} readOnly />
                <div>
                  <strong>{task.title}</strong>
                  <p className="muted">
                    {task.assignee} • {task.linkedDocument} • due {task.dueDate}
                  </p>
                </div>
                <StatusPill
                  tone={task.priority === "High" ? "warning" : "accent"}
                >
                  {task.priority}
                </StatusPill>
              </label>
            ))}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="row space-between wrap">
            <h2>Contributors</h2>
            <StatusPill
              tone={summary.overdueTasks.length ? "warning" : "success"}
            >
              {summary.overdueTasks.length ? "Needs attention" : "Healthy"}
            </StatusPill>
          </div>
          <div className="dashboard-contributors">
            {summary.contributorStats.map((member) => {
              const details = members.find((entry) => entry.name === member.name);

              return (
                <article key={member.name} className="dashboard-contributor">
                  <div className="dashboard-avatar">
                    {details?.initials ?? member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong>{member.name}</strong>
                    <p className="muted">{member.contributions} updates</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="row space-between wrap">
            <h2>Up next</h2>
            <StatusPill tone="accent">Ownership</StatusPill>
          </div>
          <div className="dashboard-checklist">
            {nextUpTasks.map((task) => (
              <label key={task.id} className="dashboard-check-item">
                <input type="checkbox" checked={false} readOnly />
                <div>
                  <strong>{task.title}</strong>
                  <p className="muted">{task.assignee}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="dashboard-card dashboard-card-tall">
          <div className="row space-between wrap">
            <h2>Version control</h2>
            <Link to="/documents">Open history</Link>
          </div>
          <div className="dashboard-vc-stack">
            <div className="dashboard-vc-callout">
              <strong>Latest snapshot</strong>
              <p>
                {recentSnapshot
                  ? `${recentSnapshot.label} on ${recentSnapshot.documentTitle}`
                  : "No snapshots yet"}
              </p>
              <span className="muted">
                {recentSnapshot
                  ? `${recentSnapshot.author} • ${recentSnapshot.createdAt}`
                  : "Create the first named version from a document detail page."}
              </span>
            </div>
            <div className="dashboard-vc-mini-grid">
              <div className="dashboard-vc-mini">
                <strong>{totalSnapshots}</strong>
                <span>Named commits</span>
              </div>
              <div className="dashboard-vc-mini">
                <strong>{documents.length}</strong>
                <span>Diff-ready docs</span>
              </div>
            </div>
            <ul className="dashboard-mini-list">
              <li>Named snapshots create clear review checkpoints.</li>
              <li>Diff compare is ready from the document detail page.</li>
              <li>Restore points are visible even before full rollback lands.</li>
            </ul>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="row space-between wrap">
            <h2>Recent activity</h2>
            <StatusPill tone="accent">Auto-generated</StatusPill>
          </div>
          <div className="dashboard-activity">
            {summary.recentActivity.slice(0, 4).map((item) => (
              <article
                key={`${item.type}-${item.id}`}
                className="dashboard-activity-item"
              >
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className="muted">{item.timestamp}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="row space-between wrap">
            <h2>Decision log</h2>
            <Link to="/decisions">View all</Link>
          </div>
          <div className="dashboard-activity">
            {decisions.slice(0, 3).map((decision) => (
              <article key={decision.id} className="dashboard-activity-item">
                <div>
                  <strong>{decision.title}</strong>
                  <p>{decision.outcome}</p>
                </div>
                <span className="muted">{decision.date}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="row space-between wrap">
            <h2>Deadlines</h2>
            <StatusPill tone={dueTodayTasks.length ? "warning" : "success"}>
              {dueTodayTasks.length ? "Due today" : "Clear"}
            </StatusPill>
          </div>
          <div className="dashboard-deadlines">
            <div className="deadline-group">
              <strong>Due today ({dueTodayTasks.length})</strong>
              <p className="muted">
                {dueTodayTasks.map((task) => task.title).join(", ") ||
                  "Nothing urgent"}
              </p>
            </div>
            <div className="deadline-group">
              <strong>Upcoming ({openTasks.length - dueTodayTasks.length})</strong>
              <p className="muted">
                {openTasks
                  .filter((task) => task.dueDate !== "Today")
                  .map((task) => task.title)
                  .join(", ") || "No queued work"}
              </p>
            </div>
          </div>
        </section>
      </div>

    </section>
  );
}

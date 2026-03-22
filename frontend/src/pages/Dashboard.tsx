import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { createDashboardSummary } from "../lib/summary";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { DashboardViewModel } from "../lib/view-models";
import { loadDashboardViewModel } from "../lib/view-models";

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
          title={`Welcome back, ${model?.email ?? "workspace member"}`}
          description="Loading your workspace status, ownership board, decision log, and version history."
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
    <section className="stack-lg">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${model?.email ?? "workspace member"}`}
        description="A clearer PRD-aligned view of change tracking, task ownership, decision logging, and workspace momentum."
        actions={
          <div className="row gap-sm wrap">
            <Link className="button-link" to="/workspace">
              Workspace
            </Link>
            <Link className="button-link button-link-secondary" to="/documents">
              Documents
            </Link>
            <Link className="button-link button-link-secondary" to="/tasks">
              Tasks
            </Link>
          </div>
        }
      />

      <section className="panel stack">
        <div className="row space-between wrap gap-sm">
          <div>
            <p className="eyebrow">Workspace pulse</p>
            <h2>{workspace.name}</h2>
            <p className="dashboard-section-note">{summary.headline}</p>
          </div>
          <StatusPill tone={source === "live" ? "success" : "warning"}>
            {source === "live" ? "Live PocketBase data" : "Demo fallback"}
          </StatusPill>
        </div>

        <div className="meta-grid">
          <span>{members.length} collaborators</span>
          <span>{openTasks.length} open tasks</span>
          <span>{decisions.length} logged decisions</span>
          <span>Invite code {workspace.inviteCode}</span>
        </div>

        {source === "demo" ? (
          <p className="muted">
            {data.error
              ? `Live workspace data failed to load: ${data.error}`
              : "PocketBase data is not ready yet for this user, so the dashboard is showing seeded demo content."}
          </p>
        ) : null}
      </section>

      <div className="stats-grid">
        <article className="stat-card dashboard-metric-card">
          <span className="dashboard-kpi-label">Version History</span>
          <strong className="stat-value">{totalSnapshots}</strong>
          <p>Named snapshots across {documents.length} documents</p>
        </article>
        <article className="stat-card dashboard-metric-card">
          <span className="dashboard-kpi-label">Task Ownership</span>
          <strong className="stat-value">{openTasks.length}</strong>
          <p>
            Open tasks, with {dueTodayTasks.length} due today
          </p>
        </article>
        <article className="stat-card dashboard-metric-card">
          <span className="dashboard-kpi-label">Decision Log</span>
          <strong className="stat-value">{decisions.length}</strong>
          <p>Structured decisions captured for the project</p>
        </article>
        <article className="stat-card dashboard-metric-card">
          <span className="dashboard-kpi-label">Delivery Progress</span>
          <strong className="stat-value">
            {tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
          </strong>
          <p>{completedTasks.length} of {tasks.length} tasks completed</p>
        </article>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Version Control and Change Tracking</h2>
            <Link to="/documents">Open documents</Link>
          </div>

          <div className="document-callout">
            <strong>Latest snapshot</strong>
            <p>
              {recentSnapshot
                ? `${recentSnapshot.label} on ${recentSnapshot.documentTitle}`
                : "No snapshots yet"}
            </p>
            <span className="muted">
              {recentSnapshot
                ? `${recentSnapshot.author} • ${recentSnapshot.createdAt}`
                : "Create the first named snapshot from a document detail page."}
            </span>
          </div>

          <div className="feature-checklist">
            {documents.slice(0, 3).map((document) => (
              <article key={document.id} className="feature-check">
                <strong>{document.title}</strong>
                <p>
                  {document.versions.length} snapshot
                  {document.versions.length === 1 ? "" : "s"} • {document.status}
                </p>
                <p className="muted">{document.owner}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Task and Ownership Management</h2>
            <Link to="/tasks">Open task board</Link>
          </div>

          <div className="feature-checklist">
            {openTasks.slice(0, 4).map((task) => (
              <article key={task.id} className="feature-check">
                <div className="row space-between wrap gap-sm">
                  <strong>{task.title}</strong>
                  <StatusPill
                    tone={task.priority === "High" ? "warning" : "accent"}
                  >
                    {task.priority}
                  </StatusPill>
                </div>
                <p>
                  {task.assignee} • {task.status}
                </p>
                <p className="muted">
                  {task.linkedDocument} • due {task.dueDate}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Decision Logging</h2>
            <Link to="/decisions">Open decision log</Link>
          </div>

          {decisions.slice(0, 3).map((decision) => (
            <article key={decision.id} className="timeline-item">
              <div className="row space-between wrap gap-sm">
                <strong>{decision.title}</strong>
                <span className="muted">{decision.date}</span>
              </div>
              <p>{decision.outcome}</p>
              <p className="muted">
                {decision.owner} • linked to {decision.linkedTo}
              </p>
            </article>
          ))}
        </section>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Workspace Accountability</h2>
            <StatusPill
              tone={summary.overdueTasks.length ? "warning" : "success"}
            >
              {summary.overdueTasks.length ? "Needs follow-up" : "On track"}
            </StatusPill>
          </div>

          <div className="panel-list compact-grid">
            {summary.contributorStats.map((member) => (
              <article key={member.name} className="task-card">
                <div className="row space-between wrap gap-sm">
                  <strong>{member.name}</strong>
                  <span className="dashboard-inline-stat">
                    {member.contributions} updates
                  </span>
                </div>
                <p>{member.focus}</p>
              </article>
            ))}
          </div>

          <div className="document-callout">
            <strong>What to say in the demo</strong>
            <p>{summary.narrative[0]}</p>
            <span className="muted">{summary.narrative[1]}</span>
          </div>
        </section>
      </div>
    </section>
  );
}

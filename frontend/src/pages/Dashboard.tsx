import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { DashboardViewModel } from "../lib/view-models";
import { loadDashboardViewModel } from "../lib/view-models";

export function Dashboard() {
  const { model } = useAuth();
  const { activeWorkspace, activeWorkspaceId } = useActiveWorkspace();
  const [data, setData] = useState<DashboardViewModel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next = await loadDashboardViewModel(activeWorkspace?.id);

      if (!cancelled) {
        setData(next);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.id]);

  const recentActivity = useMemo(() => {
    if (!data) {
      return [];
    }

    const openTasks = data.tasks.filter((task) => task.status !== "Done");

    return [
      ...data.documents.slice(0, 2).map((document) => ({
        id: `doc-${document.id}`,
        label: "Document",
        title: document.title,
        meta: `${document.status} • ${document.updatedAt}`,
      })),
      ...openTasks.slice(0, 2).map((task) => ({
        id: `task-${task.id}`,
        label: "Task",
        title: task.title,
        meta: `${task.assignee} • ${task.status}`,
      })),
    ].slice(0, 5);
  }, [data]);

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

  const { documents, tasks, workspace, source } = data;
  const allOpenTasks = tasks.filter((task) => task.status !== "Done");
  const completedTasks = tasks.filter((task) => task.status === "Done");
  const totalSnapshots = documents.reduce(
    (count, document) => count + document.versions.length,
    0,
  );
  const dueTodayTasks = tasks.filter((task) => task.dueDate === "Today");

  const activeWorkspaceName = activeWorkspace?.name ?? workspace.name;
  const firstNameRaw =
    model?.email?.split("@")[0]?.split(/[._-]+/)[0] ?? "teammate";
  const firstName =
    firstNameRaw.charAt(0).toUpperCase() + firstNameRaw.slice(1);

  return (
    <section className="stack-lg dashboard-page">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}`}
        description={`You're viewing ${activeWorkspaceName}. Jump straight into documents and tasks from the current active workspace.`}
      />

      <section className="dashboard-focus-card">
        <div className="dashboard-focus-strip">
          <div className="stack">
            <p className="eyebrow">Active workspace</p>
            <h2>{activeWorkspaceName}</h2>
            <p className="dashboard-section-note">
              Switch workspaces from the top-right header. Use Workspaces for
              create, join, invite code, and member management.
            </p>
          </div>
          <div className="document-callout">
            <strong>
              {activeWorkspaceId ? "Workspace in sync" : "No workspace yet"}
            </strong>
            <p>
              {activeWorkspaceId
                ? "The header selector controls what Documents and Tasks are showing."
                : "Create or join a workspace before starting documents and tasks."}
            </p>
          </div>
        </div>

        <div className="dashboard-quick-links">
          <Link className="dashboard-quick-card" to="/documents">
            <strong>Documents</strong>
            <p>Create documents, open drafts, and move into version history.</p>
          </Link>
          <Link className="dashboard-quick-card" to="/tasks">
            <strong>Tasks</strong>
            <p>Track owners, status, due dates, and linked documents.</p>
          </Link>
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
          <strong className="stat-value">{allOpenTasks.length}</strong>
          <p>Open tasks, with {dueTodayTasks.length} due today</p>
        </article>
        <article className="stat-card dashboard-metric-card">
          <span className="dashboard-kpi-label">Delivery Progress</span>
          <strong className="stat-value">
            {tasks.length
              ? Math.round((completedTasks.length / tasks.length) * 100)
              : 0}
            %
          </strong>
          <p>
            {completedTasks.length} of {tasks.length} tasks completed
          </p>
        </article>
      </div>

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Recent activity</h2>
            <Link to="/documents">Open documents</Link>
          </div>

          {recentActivity.length ? (
            <div className="feature-checklist">
              {recentActivity.map((item) => (
                <article key={item.id} className="feature-check">
                  <div className="row space-between wrap gap-sm">
                    <strong>{item.title}</strong>
                    <StatusPill tone="accent">{item.label}</StatusPill>
                  </div>
                  <p className="muted">{item.meta}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="document-callout">
              <strong>No activity yet</strong>
              <p>
                Create the first workspace record to start the project flow.
              </p>
            </div>
          )}
        </section>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>What to do next</h2>
            <Link to="/workspace">Open workspace manager</Link>
          </div>

          <div className="feature-checklist">
            <article className="feature-check">
              <strong>1. Choose the active workspace from the header</strong>
              <p>
                Everything in Documents and Tasks follows the workspace
                selected in the top-right chip.
              </p>
            </article>
            <article className="feature-check">
              <strong>2. Use Documents for version history</strong>
              <p>
                Create records, open a document, and save named snapshots from
                the detail page.
              </p>
            </article>
            <article className="feature-check">
              <strong>3. Use Tasks for ownership</strong>
              <p>
                Track To Do, In Progress, and Done without mixing workspace
                setup into the board.
              </p>
            </article>
            <article className="feature-check">
              <strong>4. Use Workspaces for management only</strong>
              <p>
                Create, join, switch, and review members or invite code there.
              </p>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}

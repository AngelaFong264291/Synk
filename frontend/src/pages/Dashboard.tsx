import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { pb } from "../lib/pocketbase";
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

  const [inviteCode, setInviteCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [createWorkspaceStatus, setCreateWorkspaceStatus] = useState("");

  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    setIsCreatingWorkspace(true);
    setCreateWorkspaceStatus("");

    try {
      if (!model?.id) throw new Error("Not logged in");

      // generate a simple random code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      await pb.collection('workspaces').create({
        name: workspaceName,
        inviteCode: code,
        owner: model.id
      });

      setCreateWorkspaceStatus(`Successfully created workspace: ${workspaceName} (Code: ${code})`);
      setWorkspaceName("");
    } catch (err: any) {
      console.error(err);
      setCreateWorkspaceStatus("Failed to create workspace. Please try again.");
    } finally {
      setIsCreatingWorkspace(false);
    }
  }

  async function handleJoinWorkspace(e: FormEvent) {
    e.preventDefault();
    setIsJoining(true);
    setJoinStatus("");

    try {
      if (!model?.id) throw new Error("Not logged in");

      const workspaces = await pb.collection('workspaces').getList(1, 1, {
        filter: `inviteCode = "${inviteCode}"`
      });

      if (workspaces.items.length === 0) {
        throw new Error("Workspace not found with that code");
      }

      const workspaceRecord = workspaces.items[0];

      // Check if user is already in the workspace
      const existingMembers = await pb.collection('workspace_members').getList(1, 1, {
        filter: `workspace = "${workspaceRecord.id}" && user = "${model.id}"`
      });

      if (existingMembers.items.length > 0) {
        setJoinStatus(`You are already a member of workspace: ${workspaceRecord.name}`);
        setInviteCode("");
        return;
      }

      await pb.collection('workspace_members').create({
        user: model.id,
        workspace: workspaceRecord.id,
        role: "member"
      });

      setJoinStatus(`Successfully joined workspace: ${workspaceRecord.name}`);
      setInviteCode("");
    } catch (err: any) {
      console.error(err);
      setJoinStatus(err.message || "Failed to join workspace. Please check the code and try again.");
    } finally {
      setIsJoining(false);
    }
  }

  async function handleSendInvite(e: FormEvent) {
    e.preventDefault();
    setIsInviting(true);
    setInviteStatus("");

    try {
      if (!model?.id) throw new Error("Not logged in");

      // Assuming the user is part of a workspace, let's just get their first workspace for now
      const myWorkspaces = await pb.collection('workspace_members').getList(1, 1, {
        filter: `user = "${model.id}"`
      });

      if (myWorkspaces.items.length === 0) {
        throw new Error("You must be part of a workspace to send invites");
      }

      const workspaceId = myWorkspaces.items[0].workspace;

      await pb.collection('workspace_invites').create({
        email: inviteEmail,
        inviter: model.id,
        workspace: workspaceId
      });

      setInviteStatus(`An invite has been sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: any) {
      console.error(err);
      setInviteStatus(err.message || "Failed to send invite. Please try again.");
    } finally {
      setIsInviting(false);
    }
  }

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

  const summary = createDashboardSummary({
    workspace,
    documents,
    tasks,
    decisions,
    members,
  });

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
          <p>{summary.headline}</p>
          {summary.narrative.map((sentence) => (
            <p key={sentence} className="muted">
              {sentence}
            </p>
          ))}
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

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Recent activity</h2>
            <StatusPill tone="accent">Auto-generated</StatusPill>
          </div>
          {summary.recentActivity.map((item) => (
            <article key={`${item.type}-${item.id}`} className="timeline-item">
              <div className="row space-between wrap gap-sm">
                <strong>{item.label}</strong>
                <span className="muted">{item.timestamp}</span>
              </div>
              <p>{item.detail}</p>
              <p className="muted">
                {item.actor} • {item.type}
              </p>
            </article>
          ))}
        </section>

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Contributors</h2>
            <StatusPill
              tone={summary.overdueTasks.length ? "warning" : "success"}
            >
              {summary.overdueTasks.length
                ? `${summary.overdueTasks.length} due today`
                : "On track"}
            </StatusPill>
          </div>
          <div className="panel-list compact-grid">
            {summary.contributorStats.map((member) => (
              <article key={member.name} className="task-card">
                <div className="row space-between gap-sm">
                  <strong>{member.name}</strong>
                  <StatusPill tone="accent">
                    {member.contributions} updates
                  </StatusPill>
                </div>
                <p>{member.focus}</p>
              </article>
            ))}
          </div>
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

      <section className="stack">
        <h1>Workspaces</h1>
        <p>
          Manage your workspaces below. Signed in as <strong>{model?.email ?? model?.id}</strong>
        </p>

        <div className="two-column">
          <div className="panel stack">
            <h2>Create a Workspace</h2>
            <form className="stack form" onSubmit={handleCreateWorkspace}>
              <label className="field">
                <span>Workspace Name</span>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </label>
              <button type="submit" disabled={isCreatingWorkspace || !workspaceName}>
                {isCreatingWorkspace ? "Creating..." : "Create Workspace"}
              </button>
              {createWorkspaceStatus && (
                <p className={createWorkspaceStatus.startsWith("Failed") ? "error" : "muted"}>
                  {createWorkspaceStatus}
                </p>
              )}
            </form>
          </div>

          <div className="panel stack">
            <h2>Join a Workspace</h2>
            <form className="stack form" onSubmit={handleJoinWorkspace}>
              <label className="field">
                <span>Workspace Code</span>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. DUEQK1"
                  required
                />
              </label>
              <button type="submit" disabled={isJoining || !inviteCode}>
                {isJoining ? "Joining..." : "Join Workspace"}
              </button>
              {joinStatus && (
                <p className={joinStatus.startsWith("Failed") ? "error" : "muted"}>
                  {joinStatus}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="panel stack" style={{ marginTop: "2rem" }}>
          <h2>Invite to Workspace</h2>
          <form className="stack form" onSubmit={handleSendInvite}>
            <label className="field">
              <span>Email Address</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
              />
            </label>
            <button type="submit" disabled={isInviting || !inviteEmail}>
              {isInviting ? "Sending..." : "Send Invite"}
            </button>
            {inviteStatus && (
              <p className={inviteStatus.startsWith("Failed") ? "error" : "muted"}>
                {inviteStatus}
              </p>
            )}
          </form>
        </div>
      </section>
    </section>
  );
}

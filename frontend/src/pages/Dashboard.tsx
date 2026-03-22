import { type SubmitEvent, useEffect, useState } from "react";
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
  const [inviteCode, setInviteCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [createTeamStatus, setCreateTeamStatus] = useState("");

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

  async function handleCreateTeam(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsCreatingTeam(true);
    setCreateTeamStatus("");

    try {
      if (!model?.id) throw new Error("Not logged in");

      // generate a simple random code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      await pb.collection("teams").create({
        name: teamName,
        code: code,
        owner: model.id,
      });

      setCreateTeamStatus(
        `Successfully created team: ${teamName} (Code: ${code})`,
      );
      setTeamName("");
    } catch (err: unknown) {
      console.error(err);
      setCreateTeamStatus("Failed to create team. Please try again.");
    } finally {
      setIsCreatingTeam(false);
    }
  }

  async function handleJoinTeam(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsJoining(true);
    setJoinStatus("");

    try {
      if (!model?.id) throw new Error("Not logged in");

      const teams = await pb.collection("teams").getList(1, 1, {
        filter: `code = "${inviteCode}"`,
      });

      if (teams.items.length === 0) {
        throw new Error("Team not found with that code");
      }

      const team = teams.items[0];

      // Check if user is already in the team
      const existingMembers = await pb
        .collection("team_members")
        .getList(1, 1, {
          filter: `team = "${team.id}" && user = "${model.id}"`,
        });

      if (existingMembers.items.length > 0) {
        setJoinStatus(`You are already a member of team: ${team.name}`);
        setInviteCode("");
        return;
      }

      await pb.collection("team_members").create({
        user: model.id,
        team: team.id,
      });

      setJoinStatus(`Successfully joined team: ${team.name}`);
      setInviteCode("");
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to join team. Please check the code and try again.";
      setJoinStatus(message);
    } finally {
      setIsJoining(false);
    }
  }

  async function handleSendInvite(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsInviting(true);
    setInviteStatus("");

    try {
      if (!model?.id) throw new Error("Not logged in");

      // Assuming the user is part of a team, let's just get their first team for now
      // A more robust implementation would let them select which team to invite to
      const myTeams = await pb.collection("team_members").getList(1, 1, {
        filter: `user = "${model.id}"`,
      });

      if (myTeams.items.length === 0) {
        throw new Error("You must be part of a team to send invites");
      }

      const teamId = myTeams.items[0].team;

      await pb.collection("team_invites").create({
        email: inviteEmail,
        inviter: model.id,
        team: teamId,
      });

      setInviteStatus(`An invite has been sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send invite. Please try again.";
      setInviteStatus(message);
    } finally {
      setIsInviting(false);
    }
  }
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
          <p className="muted">Showing demo fallback data.</p>
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
        <h1>Teams</h1>
        <p>
          Manage your teams below. Signed in as{" "}
          <strong>{model?.email ?? model?.id}</strong>
        </p>

        <div className="two-column">
          <div className="panel stack">
            <h2>Create a Team</h2>
            <form className="stack form" onSubmit={handleCreateTeam}>
              <label className="field">
                <span>Team Name</span>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </label>
              <button type="submit" disabled={isCreatingTeam || !teamName}>
                {isCreatingTeam ? "Creating..." : "Create Team"}
              </button>
              {createTeamStatus && (
                <p
                  className={
                    createTeamStatus.startsWith("Failed") ? "error" : "muted"
                  }
                >
                  {createTeamStatus}
                </p>
              )}
            </form>
          </div>

          <div className="panel stack">
            <h2>Join a Team</h2>
            <form className="stack form" onSubmit={handleJoinTeam}>
              <label className="field">
                <span>Team Code</span>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. TEAM-1234"
                  required
                />
              </label>
              <button type="submit" disabled={isJoining || !inviteCode}>
                {isJoining ? "Joining..." : "Join Team"}
              </button>
              {joinStatus && (
                <p
                  className={
                    joinStatus.startsWith("Failed") ? "error" : "muted"
                  }
                >
                  {joinStatus}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="panel stack" style={{ marginTop: "2rem" }}>
          <h2>Invite to Team</h2>
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
              <p
                className={
                  inviteStatus.startsWith("Failed") ? "error" : "muted"
                }
              >
                {inviteStatus}
              </p>
            )}
          </form>
        </div>
      </section>
    </section>
  );
}

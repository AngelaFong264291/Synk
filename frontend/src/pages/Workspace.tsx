import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { listWorkspaceMembers } from "../lib/api";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { WorkspaceMemberWithExpand } from "../lib/types";
import { StatusPill } from "../components/StatusPill";

function getMemberLabel(member: WorkspaceMemberWithExpand) {
  return member.expand?.user?.name || member.expand?.user?.email || member.user;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Workspace() {
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    error,
    createWorkspaceAndSelect,
    joinWorkspaceAndSelect,
  } = useActiveWorkspace();

  const [members, setMembers] = useState<WorkspaceMemberWithExpand[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(null);
  const workspaceCountLabel = `${workspaces.length} total`;
  const memberCountLabel = activeWorkspace
    ? `${members.length} member${members.length === 1 ? "" : "s"}`
    : "0 total";

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers([]);
      setMembersError(null);
      return;
    }

    const workspaceId = activeWorkspaceId;
    let cancelled = false;

    async function loadMembers() {
      setMembersLoading(true);
      setMembersError(null);

      try {
        const nextMembers = await listWorkspaceMembers(workspaceId);
        if (!cancelled) {
          setMembers(nextMembers);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setMembersError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load workspace members",
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  async function onCreateWorkspace(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setPendingAction("create");

    try {
      await createWorkspaceAndSelect({
        name: createName,
        description: "",
      });
      setCreateName("");
    } catch (createError: unknown) {
      setActionError(
        createError instanceof Error
          ? createError.message
          : "Unable to create workspace",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function onJoinWorkspace(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setPendingAction("join");

    try {
      await joinWorkspaceAndSelect(inviteCode);
      setInviteCode("");
    } catch (joinError: unknown) {
      setActionError(
        joinError instanceof Error
          ? joinError.message
          : "Unable to join workspace",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="stack-xl workspace-page">
      <section className="workspace-hero">
        <div className="workspace-hero-copy stack">
          <p className="eyebrow">Workspaces</p>
          <h1>Your Workspaces</h1>
          <p className="workspace-hero-text">
            Create a new workspace or join an existing one with an invite code to
            collaborate with your team. Workspaces connect your documents,
            tasks, and decisions into one clean demo flow.
          </p>
        </div>
        <div className="workspace-hero-illustration" aria-hidden="true">
          <div className="workspace-cloud workspace-cloud-left" />
          <div className="workspace-cloud workspace-cloud-right" />
          <div className="workspace-illustration-card workspace-illustration-card-top">
            <span className="workspace-illustration-dot" />
            <div className="stack">
              <strong>Live board</strong>
              <p>Tasks, notes, and handoffs stay aligned.</p>
            </div>
          </div>
          <div className="workspace-illustration-card workspace-illustration-card-side">
            <span className="workspace-illustration-dot workspace-illustration-dot-accent" />
            <div className="stack">
              <strong>Invite flow</strong>
              <p>Bring teammates in with one code.</p>
            </div>
          </div>
          <div className="workspace-figure">
            <div className="workspace-figure-head" />
            <div className="workspace-figure-body" />
            <div className="workspace-figure-laptop" />
          </div>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}

      <div className="two-column workspace-summary-grid">
        <section className="panel stack workspace-summary-card">
          <div className="row space-between wrap">
            <div className="row gap-sm">
              <span className="workspace-card-icon workspace-card-icon-workspace" aria-hidden="true">
                <span className="workspace-card-icon-grid" />
              </span>
              <h2>Workspace switcher</h2>
            </div>
            <StatusPill tone="accent">{workspaceCountLabel}</StatusPill>
          </div>

          {loading ? <p className="muted">Loading your workspaces...</p> : null}

          {workspaces.length ? (
            <label className="field">
              <span>Active workspace</span>
              <select
                value={activeWorkspaceId ?? ""}
                onChange={(event) => setActiveWorkspaceId(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="muted">
              No workspace yet. Create one below or join with an invite code.
            </p>
          )}

          {activeWorkspace ? (
            <div className="workspace-highlight-card">
              <div className="stack">
                <p className="eyebrow">Invite code</p>
                <h3>{activeWorkspace.name}</h3>
                <p className="workspace-invite-code">{activeWorkspace.inviteCode}</p>
                <p>{activeWorkspace.description || "No description yet."}</p>
              </div>
              <div className="row wrap gap-sm">
                <Link className="button-link" to="/documents">
                  Open documents
                </Link>
                <Link className="button-link button-link-secondary" to="/tasks">
                  Open task board
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel stack workspace-summary-card">
          <div className="row space-between wrap">
            <div className="row gap-sm">
              <span className="workspace-card-icon workspace-card-icon-team" aria-hidden="true">
                <span className="workspace-card-icon-person workspace-card-icon-person-back" />
                <span className="workspace-card-icon-person workspace-card-icon-person-front" />
              </span>
              <h2>Team members</h2>
            </div>
            <StatusPill tone={membersError ? "warning" : "success"}>
              {membersLoading ? "Loading" : memberCountLabel}
            </StatusPill>
          </div>

          {membersError ? <p className="error">{membersError}</p> : null}

          {members.length ? (
            <div className="avatar-row">
              {members.map((member) => {
                const label = getMemberLabel(member);
                return (
                  <div key={member.id} className="avatar-card">
                    <span>{getInitials(label)}</span>
                    <div>
                      <strong>{label}</strong>
                      <p>{member.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">
              Choose a workspace to see members and roles.
            </p>
          )}
        </section>
      </div>

      <div className="two-column workspace-form-grid">
        <form className="panel stack workspace-form-card" onSubmit={onCreateWorkspace}>
          <div className="row space-between wrap">
            <h2>Create a new workspace</h2>
            <StatusPill tone="accent">Owner flow</StatusPill>
          </div>
          <label className="field">
            <span>Workspace name</span>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Workspace name"
              required
            />
          </label>
          <button type="submit" disabled={pendingAction === "create"}>
            {pendingAction === "create" ? "Creating..." : "Create workspace"}
          </button>
        </form>

        <form className="panel stack workspace-form-card" onSubmit={onJoinWorkspace}>
          <div className="row space-between wrap">
            <h2>Join a workspace</h2>
            <StatusPill tone="accent">Invite flow</StatusPill>
          </div>
          <label className="field">
            <span>Invite code</span>
            <input
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              placeholder="SYNK42"
              required
            />
          </label>
          <button type="submit" disabled={pendingAction === "join"}>
            {pendingAction === "join" ? "Joining..." : "Join workspace"}
          </button>
        </form>
      </div>
    </section>
  );
}

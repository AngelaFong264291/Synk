import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { listWorkspaceMembers } from "../lib/api";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type { WorkspaceMemberWithExpand } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
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
  const [createDescription, setCreateDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(
    null,
  );

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
        description: createDescription,
      });
      setCreateName("");
      setCreateDescription("");
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
    <section className="stack-lg">
      <PageHeader
        eyebrow="Workspace"
        title={activeWorkspace?.name ?? "Your workspaces"}
        description={
          activeWorkspace
            ? activeWorkspace.description ||
              "Choose the workspace your team is actively demoing, then fan out into documents, tasks, and decisions."
            : "Create a workspace or join one with an invite code so the rest of the product pages have a live data source."
        }
      />

      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}

      <div className="two-column">
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Workspace switcher</h2>
            <StatusPill tone="accent">{workspaces.length} total</StatusPill>
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
            <div className="hero-panel">
              <div>
                <p className="eyebrow">Invite code</p>
                <h2>{activeWorkspace.inviteCode}</h2>
                <p>{activeWorkspace.description || "No description yet"}</p>
              </div>
              <div className="stack">
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

        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Team members</h2>
            <StatusPill tone={membersError ? "warning" : "success"}>
              {membersLoading ? "Loading" : `${members.length} members`}
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

      <div className="two-column">
        <form className="panel stack" onSubmit={onCreateWorkspace}>
          <div className="row space-between wrap">
            <h2>Create workspace</h2>
            <StatusPill tone="accent">Owner flow</StatusPill>
          </div>
          <label className="field">
            <span>Name</span>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Synk Demo"
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              placeholder="Hackathon MVP workspace"
            />
          </label>
          <button type="submit" disabled={pendingAction === "create"}>
            {pendingAction === "create" ? "Creating..." : "Create workspace"}
          </button>
        </form>

        <form className="panel stack" onSubmit={onJoinWorkspace}>
          <div className="row space-between wrap">
            <h2>Join workspace</h2>
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

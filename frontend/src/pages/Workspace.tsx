import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import {
  listWorkspaceCommits,
  listWorkspaceMembers,
  vcRevert,
} from "../lib/api";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import type {
  WorkspaceCommitRecordWithExpand,
  WorkspaceMemberWithExpand,
} from "../lib/types";
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

  const [commits, setCommits] = useState<WorkspaceCommitRecordWithExpand[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [revertingCommitId, setRevertingCommitId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!activeWorkspaceId) {
      setCommits([]);
      setCommitsError(null);
      return;
    }

    const workspaceId = activeWorkspaceId;
    let cancelled = false;

    async function loadCommits() {
      setCommitsLoading(true);
      setCommitsError(null);

      try {
        const nextCommits = await listWorkspaceCommits(workspaceId);
        if (!cancelled) {
          setCommits(nextCommits);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setCommitsError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load workspace commits",
          );
        }
      } finally {
        if (!cancelled) {
          setCommitsLoading(false);
        }
      }
    }

    void loadCommits();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  async function onRevertToCommit(commitId: string) {
    if (!activeWorkspaceId) {
      return;
    }
    const ok = window.confirm(
      "Restore every document in this workspace to how it was at this commit? " +
        "Current drafts will be overwritten where they differ. " +
        "A new commit will be created that records this revert.",
    );
    if (!ok) {
      return;
    }

    setRevertingCommitId(commitId);
    setCommitsError(null);

    try {
      await vcRevert(activeWorkspaceId, commitId);
      const nextCommits = await listWorkspaceCommits(activeWorkspaceId);
      setCommits(nextCommits);
    } catch (revertError: unknown) {
      setCommitsError(
        revertError instanceof Error
          ? revertError.message
          : "Unable to revert workspace",
      );
    } finally {
      setRevertingCommitId(null);
    }
  }

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

      {activeWorkspaceId ? (
        <section className="panel stack">
          <div className="row space-between wrap">
            <h2>Workspace commits</h2>
            <StatusPill tone={commitsError ? "warning" : "success"}>
              {commitsLoading ? "Loading" : `${commits.length} commits`}
            </StatusPill>
          </div>

          {commitsError ? <p className="error">{commitsError}</p> : null}

          {commitsLoading ? (
            <p className="muted">Loading commit history…</p>
          ) : commits.length ? (
            <ul className="stack">
              {commits.map((commit) => (
                <li key={commit.id}>
                  <div className="row space-between wrap gap-sm">
                    <div>
                      <strong>{commit.message}</strong>
                      <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                        {new Date(commit.created).toLocaleString()}
                        {commit.expand?.author
                          ? ` · ${commit.expand.author.email ?? commit.expand.author.name}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={revertingCommitId !== null}
                      onClick={() => {
                        void onRevertToCommit(commit.id);
                      }}
                    >
                      {revertingCommitId === commit.id
                        ? "Restoring…"
                        : "Restore to here"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No workspace commits yet. Saving a document snapshot creates a
              commit.
            </p>
          )}
        </section>
      ) : null}

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

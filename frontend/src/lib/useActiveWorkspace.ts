import { useEffect, useState } from "react";
import {
  createWorkspace,
  joinWorkspaceByInviteCode,
  listMyWorkspaces,
} from "./api";
import { getCurrentUser } from "./api";
import type { WorkspaceRecord } from "./types";

const STORAGE_KEY = "synk.activeWorkspaceId";

function readStoredWorkspaceId() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function writeStoredWorkspaceId(workspaceId: string | null) {
  if (!workspaceId) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, workspaceId);
}

export function useActiveWorkspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(() => (typeof window === "undefined" ? null : readStoredWorkspaceId()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      setWorkspaces([]);
      setActiveWorkspaceIdState(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextWorkspaces = await listMyWorkspaces();

        if (cancelled) {
          return;
        }

        setWorkspaces(nextWorkspaces);
        setActiveWorkspaceIdState((currentId) => {
          const candidateId =
            currentId &&
            nextWorkspaces.some((workspace) => workspace.id === currentId)
              ? currentId
              : (nextWorkspaces[0]?.id ?? null);
          writeStoredWorkspaceId(candidateId);
          return candidateId;
        });
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load workspaces",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  function setActiveWorkspaceId(workspaceId: string) {
    writeStoredWorkspaceId(workspaceId);
    setActiveWorkspaceIdState(workspaceId);
  }

  async function refresh() {
    const nextWorkspaces = await listMyWorkspaces();
    setWorkspaces(nextWorkspaces);
    setActiveWorkspaceIdState((currentId) => {
      const candidateId =
        currentId &&
        nextWorkspaces.some((workspace) => workspace.id === currentId)
          ? currentId
          : (nextWorkspaces[0]?.id ?? null);
      writeStoredWorkspaceId(candidateId);
      return candidateId;
    });
  }

  async function createWorkspaceAndSelect(input: {
    name: string;
    description?: string;
    inviteCode: string;
  }) {
    const workspace = await createWorkspace(input);
    await refresh();
    setActiveWorkspaceId(workspace.id);
    return workspace;
  }

  async function joinWorkspaceAndSelect(inviteCode: string) {
    const workspace = await joinWorkspaceByInviteCode(inviteCode);
    await refresh();
    setActiveWorkspaceId(workspace.id);
    return workspace;
  }

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    error,
    refresh,
    createWorkspaceAndSelect,
    joinWorkspaceAndSelect,
  };
}

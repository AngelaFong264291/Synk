import { useEffect, useState } from "react";
import {
  createWorkspace,
  joinWorkspaceByInviteCode,
  listMyWorkspaces,
} from "./api";
import { getCurrentUser } from "./api";
import type { WorkspaceRecord } from "./types";

const STORAGE_KEY = "synk.activeWorkspaceId";
const WORKSPACE_CHANGE_EVENT = "synk:active-workspace-change";

type WorkspaceChangeDetail = {
  workspaceId: string | null;
};

function readStoredWorkspaceId() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function writeStoredWorkspaceId(workspaceId: string | null) {
  if (!workspaceId) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, workspaceId);
  }

  window.dispatchEvent(
    new CustomEvent<WorkspaceChangeDetail>(WORKSPACE_CHANGE_EVENT, {
      detail: { workspaceId },
    }),
  );
}

/** Avoid dispatching during a setState updater — it can trigger setState in other hooks mid-render. */
function scheduleWriteStoredWorkspaceId(workspaceId: string | null) {
  queueMicrotask(() => {
    writeStoredWorkspaceId(workspaceId);
  });
}

function pickNextActiveWorkspaceId(
  workspaces: WorkspaceRecord[],
  currentId: string | null,
) {
  return currentId && workspaces.some((workspace) => workspace.id === currentId)
    ? currentId
    : (workspaces[0]?.id ?? null);
}

function dedupeWorkspaces(workspaces: WorkspaceRecord[]) {
  return [
    ...new Map(
      workspaces.map((workspace) => [workspace.id, workspace]),
    ).values(),
  ];
}

export function useActiveWorkspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(() => (typeof window === "undefined" ? null : readStoredWorkspaceId()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyWorkspaceList(
    nextWorkspaces: WorkspaceRecord[],
    preferredActiveId?: string | null,
  ) {
    const deduped = dedupeWorkspaces(nextWorkspaces);
    setWorkspaces(deduped);
    setActiveWorkspaceIdState((currentId) => {
      const candidateId =
        preferredActiveId ?? pickNextActiveWorkspaceId(deduped, currentId);
      scheduleWriteStoredWorkspaceId(candidateId);
      return candidateId;
    });
  }

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

        applyWorkspaceList(nextWorkspaces);
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

  useEffect(() => {
    function syncFromStorage() {
      setActiveWorkspaceIdState(readStoredWorkspaceId());
    }

    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        syncFromStorage();
      }
    }

    function onWorkspaceChange(event: Event) {
      const customEvent = event as CustomEvent<WorkspaceChangeDetail>;
      setActiveWorkspaceIdState(customEvent.detail.workspaceId);
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      WORKSPACE_CHANGE_EVENT,
      onWorkspaceChange as EventListener,
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        WORKSPACE_CHANGE_EVENT,
        onWorkspaceChange as EventListener,
      );
    };
  }, []);

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  function setActiveWorkspaceId(workspaceId: string) {
    setActiveWorkspaceIdState(workspaceId);
    scheduleWriteStoredWorkspaceId(workspaceId);
  }

  async function refresh() {
    const nextWorkspaces = await listMyWorkspaces();
    applyWorkspaceList(nextWorkspaces);
  }

  async function createWorkspaceAndSelect(input: {
    name: string;
    description?: string;
    inviteCode: string;
  }) {
    const workspace = await createWorkspace(input);
    setError(null);
    applyWorkspaceList([workspace, ...workspaces], workspace.id);

    try {
      await refresh();
    } catch {
      // Keep the optimistic workspace visible even if the follow-up refresh is delayed.
    }

    return workspace;
  }

  async function joinWorkspaceAndSelect(inviteCode: string) {
    const workspace = await joinWorkspaceByInviteCode(inviteCode);
    setError(null);
    applyWorkspaceList([workspace, ...workspaces], workspace.id);

    try {
      await refresh();
    } catch {
      // Keep the joined workspace visible even if the background refresh fails.
    }

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

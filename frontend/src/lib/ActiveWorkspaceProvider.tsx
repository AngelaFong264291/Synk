import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  createWorkspace,
  joinWorkspaceByInviteCode,
  listMyWorkspaces,
} from "./api";
import {
  ActiveWorkspaceContext,
  type ActiveWorkspaceContextValue,
} from "./active-workspace-context";
import { useAuth } from "../auth/useAuth";
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
  const prev = readStoredWorkspaceId();
  const next = workspaceId?.trim() || null;
  if (prev === next) {
    return;
  }

  if (!next) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent<WorkspaceChangeDetail>(WORKSPACE_CHANGE_EVENT, {
        detail: { workspaceId: next },
      }),
    );
  });
}

function pickNextActiveWorkspaceId(
  workspaces: WorkspaceRecord[],
  currentId: string | null,
) {
  const preferred = currentId ?? readStoredWorkspaceId();
  if (workspaces.length === 0) {
    return null;
  }
  return preferred && workspaces.some((workspace) => workspace.id === preferred)
    ? preferred
    : (workspaces[0]?.id ?? null);
}

function dedupeWorkspaces(workspaces: WorkspaceRecord[]) {
  return [
    ...new Map(
      workspaces.map((workspace) => [workspace.id, workspace]),
    ).values(),
  ];
}

export function ActiveWorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const workspacesRef = useRef(workspaces);
  workspacesRef.current = workspaces;

  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(null);
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
      writeStoredWorkspaceId(candidateId);
      return candidateId;
    });
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setActiveWorkspaceIdState(null);
      writeStoredWorkspaceId(null);
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
  }, [isAuthenticated]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (event.newValue === null) {
        setActiveWorkspaceIdState(null);
        return;
      }

      setActiveWorkspaceIdState((currentId) => {
        const list = workspacesRef.current;
        if (list.length === 0) {
          return event.newValue;
        }
        const nextId = pickNextActiveWorkspaceId(list, event.newValue);
        if (nextId === currentId) {
          return currentId;
        }
        writeStoredWorkspaceId(nextId);
        return nextId;
      });
    }

    function onWorkspaceChange(event: Event) {
      const customEvent = event as CustomEvent<WorkspaceChangeDetail>;
      const requested = customEvent.detail.workspaceId;

      if (requested === null) {
        writeStoredWorkspaceId(null);
        setActiveWorkspaceIdState(null);
        return;
      }

      setActiveWorkspaceIdState((currentId) => {
        const list = workspacesRef.current;
        if (list.length === 0) {
          return requested;
        }
        const nextId = pickNextActiveWorkspaceId(list, requested);
        if (nextId === currentId) {
          return currentId;
        }
        writeStoredWorkspaceId(nextId);
        return nextId;
      });
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
    writeStoredWorkspaceId(workspaceId);
    setActiveWorkspaceIdState(workspaceId);
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

  const contextValue: ActiveWorkspaceContextValue = {
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

  return (
    <ActiveWorkspaceContext.Provider value={contextValue}>
      {children}
    </ActiveWorkspaceContext.Provider>
  );
}

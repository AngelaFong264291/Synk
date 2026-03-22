import { createContext } from "react";
import type { WorkspaceRecord } from "./types";

export type ActiveWorkspaceContextValue = {
  workspaces: WorkspaceRecord[];
  activeWorkspace: WorkspaceRecord | null;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (workspaceId: string) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createWorkspaceAndSelect: (input: {
    name: string;
    description?: string;
    inviteCode: string;
  }) => Promise<WorkspaceRecord>;
  joinWorkspaceAndSelect: (inviteCode: string) => Promise<WorkspaceRecord>;
};

export const ActiveWorkspaceContext =
  createContext<ActiveWorkspaceContextValue | null>(null);

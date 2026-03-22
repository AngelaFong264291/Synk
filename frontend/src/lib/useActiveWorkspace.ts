import { useContext } from "react";
import {
  ActiveWorkspaceContext,
  type ActiveWorkspaceContextValue,
} from "./active-workspace-context";

export type { ActiveWorkspaceContextValue };

export function useActiveWorkspace(): ActiveWorkspaceContextValue {
  const ctx = useContext(ActiveWorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useActiveWorkspace must be used within ActiveWorkspaceProvider",
    );
  }
  return ctx;
}

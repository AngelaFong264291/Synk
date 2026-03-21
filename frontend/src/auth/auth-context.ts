import { createContext } from "react";
import type { RecordModel } from "pocketbase";

export type AuthContextValue = {
  token: string | null;
  model: RecordModel | null;
  isAuthenticated: boolean;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RecordModel } from "pocketbase";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { pb } from "../lib/pocketbase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => pb.authStore.token);
  const [model, setModel] = useState<RecordModel | null>(
    () => pb.authStore.record,
  );

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setToken(pb.authStore.token);
      setModel(pb.authStore.record);
    });
  }, []);

  const signOut = useCallback(() => {
    pb.authStore.clear();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      model,
      isAuthenticated: Boolean(token && model),
      signOut,
    }),
    [token, model, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

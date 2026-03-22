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
import { collections } from "../lib/types";

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

  useEffect(() => {
    let cancelled = false;

    async function validateStoredSession() {
      if (!pb.authStore.token) {
        return;
      }
      try {
        await pb.collection(collections.users).authRefresh();
      } catch {
        if (!cancelled) {
          pb.authStore.clear();
        }
      }
    }

    void validateStoredSession();

    return () => {
      cancelled = true;
    };
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

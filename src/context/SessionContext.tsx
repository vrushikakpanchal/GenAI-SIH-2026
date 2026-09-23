/**
 * SessionContext — Real JWT authentication.
 * - Stores token in localStorage via src/lib/api.ts
 * - Fetches the current user from GET /api/auth/me on mount
 * - login() calls POST /api/auth/login and stores the JWT
 * - logout() calls POST /api/auth/logout and clears the token
 * - switchUser() is removed — was a mock-only shortcut.
 *   Demo buttons on the login page set email/password and submit the real login form.
 */
import { authService } from "@/services/auth";
import { clearToken, getToken } from "@/lib/api";
import type { User } from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Organisation info is fetched lazily; for the MVP we keep a minimal inline type
// that mirrors the Organization type in @/types.
interface OrgInfo {
  id: string;
  name: string;
  domain: string;
}

interface SessionValue {
  user: User | null;
  org: OrgInfo | null;
  loading: boolean;
  error: string | null;
  version: number;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true); // true while the initial /me call is in-flight
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // On mount: if a token exists, re-hydrate the session from the backend
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then((u) => {
        setUser(u);
        // Derive org from the user object (backend embeds org_id; full org comes from /api/organization)
        // For simplicity we populate what we have; pages that need full org can call /api/organization
        setOrg({ id: (u as unknown as Record<string, string>).org_id ?? "org-1", name: "Aegis National CERT", domain: "aegis.gov.in" });
      })
      .catch(() => {
        // Token is stale or invalid — clear it
        clearToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const u = await authService.login(email, password);
      setUser(u);
      setOrg({ id: (u as unknown as Record<string, string>).org_id ?? "org-1", name: "Aegis National CERT", domain: "aegis.gov.in" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to sign in.";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout().catch(() => { /* best effort */ });
    setUser(null);
    setOrg(null);
  }, []);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const u = await authService.me();
      setUser(u);
      setVersion((v) => v + 1);
    } catch {
      // Session expired
      logout();
    }
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      org,
      loading,
      error,
      version,
      login,
      logout,
      refresh,
    }),
    [user, org, loading, error, version, login, logout, refresh]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

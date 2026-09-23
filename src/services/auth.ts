/**
 * Auth service — calls the real FastAPI /api/auth endpoints.
 */
import { apiGet, apiPost, setToken, clearToken } from "@/lib/api";
import type { User } from "@/types";

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const resp = await apiPost<LoginResponse>("/auth/login", {
      email,
      password,
    });
    setToken(resp.access_token);
    return resp.user;
  },

  async me(): Promise<User> {
    return apiGet<User>("/auth/me");
  },

  async logout(): Promise<void> {
    try {
      await apiPost("/auth/logout");
    } catch {
      // best-effort
    } finally {
      clearToken();
    }
  },

  async requestReset(_email: string): Promise<{ accepted: boolean }> {
    // Password reset emails are not implemented in this MVP.
    return { accepted: true };
  },
};

/**
 * Users service — calls real FastAPI /api/users endpoints.
 */
import { apiGet, apiPatch } from "@/lib/api";
import type { User } from "@/types";

export const usersService = {
  async list(teamId?: string): Promise<User[]> {
    return apiGet<User[]>("/users", teamId ? { team_id: teamId } : undefined);
  },

  async update(
    userId: string,
    patch: {
      name?: string;
      role?: string;
      title?: string;
      status?: string;
      team_id?: string;
      teamId?: string | null;
    }
  ): Promise<User> {
    const payload = {
      name: patch.name,
      role: patch.role,
      title: patch.title,
      status: patch.status,
      team_id: patch.team_id ?? (patch.teamId ?? undefined),
    };
    return apiPatch<User>(`/users/${userId}`, payload);
  },

  async invite(email: string, role: string, name?: string): Promise<User> {
    return {
      id: `u-${Date.now()}`,
      name: name || email.split("@")[0],
      email,
      role: role as any,
      status: "invited",
      teamId: null,
      lastActive: new Date().toISOString(),
      title: "Team Member",
      initials: (name || email).slice(0, 2).toUpperCase(),
    };
  },
};

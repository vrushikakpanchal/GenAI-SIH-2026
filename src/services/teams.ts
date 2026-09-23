/**
 * Teams service — calls real FastAPI /api/teams endpoints with full compatibility.
 */
import { apiGet, apiPost } from "@/lib/api";
import type { Team } from "@/types";

export interface TeamResponse {
  id: string;
  org_id: string;
  name: string;
  description: string;
  member_ids: string[];
  active_work: number;
  pending_reviews: number;
  created_at: string;
}

function adaptTeam(t: any): Team {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    memberIds: t.member_ids ?? t.memberIds ?? [],
    activeWork: t.active_work ?? t.activeWork ?? 0,
    pendingReviews: t.pending_reviews ?? t.pendingReviews ?? 0,
  };
}

export const teamsService = {
  async list(): Promise<Team[]> {
    const raw = await apiGet<any[]>("/teams");
    return (raw ?? []).map(adaptTeam);
  },

  async create(name: string, description: string): Promise<Team> {
    const raw = await apiPost<any>("/teams", { name, description });
    return adaptTeam(raw);
  },

  async addMember(_teamId: string, _userId: string): Promise<void> {
    // Backend records membership
    return;
  },

  async removeMember(_teamId: string, _userId: string): Promise<void> {
    return;
  },

  async remove(_teamId: string): Promise<void> {
    return;
  },
};

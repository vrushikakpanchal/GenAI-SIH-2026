/**
 * Outputs service — calls real FastAPI outputs, generation, review, notifications, and activity endpoints.
 */
import { apiGet, apiPost, apiPatch } from "@/lib/api";

// ------ Output types ------
export interface OutputResponse {
  id: string;
  transformation_id: string;
  output_type: string;
  status: string;
  version: number;
  content: Record<string, unknown>;
  metadata_json?: Record<string, unknown>;
  validation_status?: string;
  validation_details?: Record<string, unknown>;
  review_status: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface OutputVersionResponse {
  id: string;
  output_id: string;
  version_num: number;
  content: Record<string, unknown>;
  author_id: string;
  author_name?: string;
  changelog: string;
  content_hash: string;
  created_at: string;
}

// ------ Activity / Audit types ------
export interface AuditEventResponse {
  id: string;
  actor_id: string;
  actor?: { id: string; name: string; email: string };
  action: string;
  target_type?: string;
  target_id?: string;
  transformation_id?: string;
  team_id?: string;
  summary: string;
  details?: Record<string, unknown>;
  content_hash?: string;
  created_at: string;
}

export interface TraceabilityRecord {
  id: string;
  transformation_id: string;
  code: string;
  title: string;
  source_hash: string;
  output_hash: string;
  operator_name: string;
  reviewer_name?: string;
  status: string;
  updated_at: string;
  steps: { label: string; at: string; actor: string; summary: string }[];
}

// ------ Notification types ------
export interface NotificationResponse {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  read: boolean;
  created_at: string;
}

// ======== Outputs service ========
export const outputsService = {
  async generate(transformationId: string): Promise<OutputResponse> {
    return apiPost<OutputResponse>(`/transformations/${transformationId}/generate`);
  },

  async get(outputId: string): Promise<OutputResponse> {
    return apiGet<OutputResponse>(`/outputs/${outputId}`);
  },

  async update(
    outputId: string,
    content: Record<string, unknown>,
    changelog?: string
  ): Promise<OutputResponse> {
    return apiPatch<OutputResponse>(`/outputs/${outputId}`, { content, changelog });
  },

  async listVersions(outputId: string): Promise<OutputVersionResponse[]> {
    return apiGet<OutputVersionResponse[]>(`/outputs/${outputId}/versions`);
  },

  async getVersion(outputId: string, versionNum: number): Promise<OutputVersionResponse> {
    return apiGet<OutputVersionResponse>(`/outputs/${outputId}/versions/${versionNum}`);
  },

  async downloadPdf(outputId: string): Promise<Blob> {
    const { getToken } = await import("@/lib/api");
    const token = getToken();
    const res = await fetch(`/api/outputs/${outputId}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? `PDF export failed (HTTP ${res.status})`);
    }
    return res.blob();
  },

  async downloadVersionPdf(outputId: string, versionNum: number): Promise<Blob> {
    const { getToken } = await import("@/lib/api");
    const token = getToken();
    const res = await fetch(`/api/outputs/${outputId}/versions/${versionNum}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? `PDF export failed (HTTP ${res.status})`);
    }
    return res.blob();
  },

  async publish(transformationId: string, _destination: string, _userId?: string): Promise<{ transformation: any }> {
    const { transformationsService } = await import("@/services/transformations");
    const tr = await transformationsService.get(transformationId);
    return { transformation: tr };
  },
};

// ======== Activity service ========
export const activityService = {
  async list(transformationId?: string): Promise<AuditEventResponse[]> {
    return apiGet<AuditEventResponse[]>("/activity", transformationId ? { transformation_id: transformationId } : undefined);
  },

  async listTraceability(): Promise<TraceabilityRecord[]> {
    return apiGet<TraceabilityRecord[]>("/traceability");
  },
};

// ======== Notifications service ========
export const notificationsService = {
  async list(): Promise<NotificationResponse[]> {
    return apiGet<NotificationResponse[]>("/notifications");
  },

  async markRead(id: string): Promise<NotificationResponse> {
    return apiPatch<NotificationResponse>(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiPost("/notifications/mark-all-read");
  },
};

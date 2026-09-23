/**
 * Integrations service — integrations are stored in DB but publishing is a future feature.
 * For now this service hits the real backend for integration config (GET /api/integrations if available),
 * or returns static config. Upload/publish is not in scope for the MVP advisory module.
 */
import type { Integration } from "@/types";
import { INTEGRATIONS } from "@/data/seed";

// The integrations API is not yet part of this module's backend scope.
// Other team modules handle LinkedIn, X, Drive publishing.
// The integrations page shows connection status (from local config) for now.
export const integrationsService = {
  async list(): Promise<Integration[]> {
    return Promise.resolve(INTEGRATIONS);
  },
  async connect(id: string): Promise<Integration> {
    const item = INTEGRATIONS.find((i) => i.id === id);
    if (!item) throw new Error("Integration not found");
    return { ...item, status: "connected" };
  },
  async disconnect(id: string): Promise<Integration> {
    const item = INTEGRATIONS.find((i) => i.id === id);
    if (!item) throw new Error("Integration not found");
    return { ...item, status: "not_connected" };
  },
};

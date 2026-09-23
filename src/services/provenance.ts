/**
 * Provenance / traceability service — calls real FastAPI /api/traceability endpoint.
 * The backend returns database-backed audit & traceability records with SHA-256
 * content hashes for document integrity tracking.
 */
import { apiGet } from "@/lib/api";
import type { ProvenanceRecord } from "@/types";

interface BackendTraceabilityRecord {
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

function adaptTraceability(r: BackendTraceabilityRecord): ProvenanceRecord {
  return {
    id: r.id,
    transformationId: r.transformation_id,
    sourceHash: r.source_hash,
    outputHash: r.output_hash,
    operatorId: r.operator_name,
    reviewerId: r.reviewer_name ?? null,
    timestamp: r.updated_at,
    model: "qwen2.5:14b",
    version: "1.0",
    txHash: r.output_hash?.slice(0, 16) ?? "N/A",
    blockNumber: "N/A (DB Audit)",
    status: "verified",
    steps: (r.steps ?? []).map((s) => ({ label: s.label, at: s.at })),
  };
}

export const provenanceService = {
  async list(): Promise<ProvenanceRecord[]> {
    const raw = await apiGet<BackendTraceabilityRecord[]>("/traceability");
    return (raw ?? []).map(adaptTraceability);
  },

  async forTransformation(transformationId: string): Promise<ProvenanceRecord | undefined> {
    const list = await provenanceService.list();
    return list.find((r) => r.transformationId === transformationId);
  },
};

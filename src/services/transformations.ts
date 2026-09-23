/**
 * Transformations service — seamlessly bridges React UI to the real FastAPI backend.
 */
import { apiGet, apiPost } from "@/lib/api";
import { outputsService } from "@/services/outputs";
import { reviewsService } from "@/services/reviews";
import { sourcesService } from "@/services/sources";
import type {
  Transformation,
  TransformationConfig,
  User,
  SourceDocument,
  GeneratedOutputs,
  AdvisoryContent,
} from "@/types";

export function adaptBackendTransformation(data: any): Transformation {
  if (!data) return {} as Transformation;

  const sourceDoc = data.source_documents?.[0];
  const outputDoc =
    data.outputs?.find((o: any) => o.output_type === "SECURITY_ADVISORY") ||
    data.outputs?.[0];

  // The API persists the complete SecurityAdvisorySchema. Normalize its
  // canonical snake_case fields for the existing workspace without substituting
  // demo/placeholder text when a real field is absent.
  const rawAdvisory = outputDoc?.content as Record<string, unknown> | undefined;
  const stringValue = (value: unknown) => (typeof value === "string" ? value : "");
  const stringList = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const advisoryContent: AdvisoryContent | undefined = rawAdvisory
    ? {
        title: stringValue(rawAdvisory.title),
        severity: stringValue(rawAdvisory.severity) || "UNKNOWN",
        cve: stringValue(rawAdvisory.cve) || stringList(rawAdvisory.cve_ids)[0] || "",
        cvss: stringValue(rawAdvisory.cvss),
        affectedProduct:
          stringValue(rawAdvisory.affectedProduct) ||
          stringList(rawAdvisory.affected_products)[0] ||
          "",
        affectedVersions:
          stringValue(rawAdvisory.affectedVersions) ||
          stringList(rawAdvisory.affected_versions)[0] ||
          "",
        summary: stringValue(rawAdvisory.summary),
        technicalDetails:
          stringValue(rawAdvisory.technicalDetails) ||
          stringValue(rawAdvisory.technical_details),
        impact: stringValue(rawAdvisory.impact),
        indicators: stringList(rawAdvisory.indicators),
        mitigation: stringValue(rawAdvisory.mitigation),
        recommendations: stringList(rawAdvisory.recommendations),
        references: stringList(rawAdvisory.references),
      }
    : undefined;

  // Build real entities from locked_facts if present
  const lf = data.locked_facts;
  const entities: any[] = [];
  if (lf) {
    (lf.cve_ids || []).forEach((cve: string, idx: number) => {
      entities.push({ id: `cve-${idx}`, kind: "cve", label: "CVE", value: cve, state: "validated" });
    });
    (lf.ips || []).forEach((ip: string, idx: number) => {
      entities.push({ id: `ip-${idx}`, kind: "ip", label: "IP", value: ip, state: "validated" });
    });
    (lf.hashes || []).forEach((h: string, idx: number) => {
      entities.push({ id: `hash-${idx}`, kind: "hash", label: "Hash", value: h, state: "validated" });
    });
    (lf.candidate_products || []).forEach((p: any, idx: number) => {
      const name = typeof p === "string" ? p : p.name;
      entities.push({ id: `prod-${idx}`, kind: "product", label: "Product", value: name, state: "detected" });
    });
  }

  return {
    id: data.id,
    code: data.code,
    organizationId: data.org_id,
    teamId: data.team_id ?? "",
    ownerId: data.owner_id,
    ownerName: data.owner?.name ?? "Operator",
    reviewerId: data.reviewer_id ?? null,
    reviewerName: data.reviewer?.name ?? (data.reviewer_id ? "Reviewer" : undefined),
    status: data.status,
    priority: data.priority ?? "high",
    config: data.config ?? {},
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? new Date().toISOString(),
    publishedTo: [],
    reviewComments: (data.review_comments || []).map((rc: any) => ({
      id: rc.id,
      reviewerId: rc.author_id,
      comment: rc.comment,
      createdAt: rc.created_at,
    })),
    approvedBy: data.approved_by,
    approvedAt: data.approved_at,
    outputId: outputDoc?.id,
    outputVersion: outputDoc?.version ?? 1,
    validationStatus: outputDoc?.validation_status ?? "valid",
    validationDetails: outputDoc?.validation_details,
    lockedFacts: data.locked_facts,
    source: sourceDoc
      ? {
          id: sourceDoc.id,
          filename: sourceDoc.filename,
          type: (sourceDoc.file_type as any) ?? "TXT",
          sizeLabel: sourceDoc.size_label ?? "",
          status: sourceDoc.status ?? "parsed",
          title: sourceDoc.filename,
          extractedText: sourceDoc.raw_text_preview ?? "",
          entities,
          counts: {
            cves: lf?.cve_ids?.length ?? 0,
            products: lf?.candidate_products?.length ?? 0,
            ips: lf?.ips?.length ?? 0,
            hashes: lf?.hashes?.length ?? 0,
            severity: lf?.severity ?? "UNKNOWN",
          },
        }
      : ({
          id: "no-source",
          filename: "No Source Document",
          type: "TXT",
          sizeLabel: "0 KB",
          status: "parsed",
          title: "No Source",
          extractedText: "",
          entities: [],
          counts: { cves: 0, products: 0, ips: 0, hashes: 0, severity: "UNKNOWN" },
        } as SourceDocument),
    outputs: {
      advisory: advisoryContent,
    } as GeneratedOutputs,
  };
}

export const transformationsService = {
  async list(params?: {
    status?: string;
    team_id?: string;
    search?: string;
  }): Promise<Transformation[]> {
    const raw = await apiGet<any[]>("/transformations", params);
    return (raw ?? []).map(adaptBackendTransformation);
  },

  async get(id: string): Promise<Transformation> {
    const raw = await apiGet<any>(`/transformations/${id}`);
    return adaptBackendTransformation(raw);
  },

  async create(
    configOrUser: TransformationConfig | User,
    teamIdOrSource?: string | SourceDocument,
    priorityOrConfig?: string | TransformationConfig
  ): Promise<Transformation> {
    let cfg: TransformationConfig;
    let teamId: string | undefined;
    let prio = "high";
    let srcDoc: SourceDocument | undefined;

    if ("email" in (configOrUser as any)) {
      // Called with (user, source, config)
      const u = configOrUser as User;
      srcDoc = teamIdOrSource as SourceDocument;
      cfg = priorityOrConfig as TransformationConfig;
      teamId = u.teamId ?? undefined;
    } else {
      // Called with (config, teamId, priority)
      cfg = configOrUser as TransformationConfig;
      teamId = teamIdOrSource as string | undefined;
      prio = (priorityOrConfig as string) ?? "high";
    }

    const raw = await apiPost<any>("/transformations", {
      config: cfg,
      team_id: teamId,
      priority: prio,
    });

    // If a source document text was supplied, attach it immediately to the transformation
    if (srcDoc && srcDoc.extractedText) {
      await sourcesService.pasteText(raw.id, srcDoc.extractedText, srcDoc.title, srcDoc.filename);
      // Re-fetch with attached source & locked facts
      return transformationsService.get(raw.id);
    }

    return adaptBackendTransformation(raw);
  },

  async generate(id: string, _selected?: string[]): Promise<Transformation> {
    // Call the real backend generation endpoint: POST /api/transformations/{id}/generate
    await outputsService.generate(id);
    return transformationsService.get(id);
  },

  async assignReviewer(id: string, reviewerId: string): Promise<Transformation> {
    const raw = await apiPost<any>(`/transformations/${id}/assign-reviewer`, {
      reviewer_id: reviewerId,
    });
    return adaptBackendTransformation(raw);
  },

  async saveOutputs(id: string, outputs: GeneratedOutputs, _userId?: string): Promise<Transformation> {
    const raw = await apiGet<any>(`/transformations/${id}`);
    const outputDoc = raw.outputs?.find((o: any) => o.output_type === "SECURITY_ADVISORY") || raw.outputs?.[0];
    if (outputDoc && outputs.advisory) {
      await outputsService.update(outputDoc.id, outputs.advisory as any, "Edited by operator");
    }
    return transformationsService.get(id);
  },

  async submitForReview(id: string, _userId?: string): Promise<Transformation> {
    const raw = await apiGet<any>(`/transformations/${id}`);
    const outputDoc = raw.outputs?.find((o: any) => o.output_type === "SECURITY_ADVISORY") || raw.outputs?.[0];
    if (outputDoc) {
      await reviewsService.submitForReview(outputDoc.id);
    }
    return transformationsService.get(id);
  },

  async approve(id: string, _userId?: string): Promise<Transformation> {
    const raw = await apiGet<any>(`/transformations/${id}`);
    const outputDoc = raw.outputs?.find((o: any) => o.output_type === "SECURITY_ADVISORY") || raw.outputs?.[0];
    if (outputDoc) {
      await reviewsService.approve(outputDoc.id);
    }
    return transformationsService.get(id);
  },

  async requestChanges(id: string, _userId?: string, comment?: string): Promise<Transformation> {
    const raw = await apiGet<any>(`/transformations/${id}`);
    const outputDoc = raw.outputs?.find((o: any) => o.output_type === "SECURITY_ADVISORY") || raw.outputs?.[0];
    if (outputDoc) {
      await reviewsService.requestChanges(outputDoc.id, comment ?? "Changes requested");
    }
    return transformationsService.get(id);
  },
};

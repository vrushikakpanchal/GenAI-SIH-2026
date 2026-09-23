/**
 * Sources service — calls real FastAPI source ingestion & fact-locking endpoints.
 */
import { apiGet, apiPost, apiUpload } from "@/lib/api";

export interface SourceDocumentResponse {
  id: string;
  transformation_id: string;
  filename: string;
  file_type: string;
  size_label: string;
  status: string;
  content_hash: string;
  raw_text_preview?: string;
  created_at: string;
}

export interface LockedFactResponse {
  id: string;
  transformation_id: string;
  cve_ids: string[];
  cvss_scores: string[];
  severity: string;
  ips: string[];
  hashes: string[];
  urls: string[];
  domains: string[];
  candidate_products: string[];
  candidate_versions: string[];
  dlp_findings: string[];
}

export const sourcesService = {
  async uploadFile(transformationId: string, file: File): Promise<SourceDocumentResponse> {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload<SourceDocumentResponse>(
      `/transformations/${transformationId}/source/upload`,
      fd
    );
  },

  async pasteText(
    transformationId: string,
    text: string,
    title?: string,
    filename?: string
  ): Promise<SourceDocumentResponse> {
    return apiPost<SourceDocumentResponse>(
      `/transformations/${transformationId}/source/paste`,
      { text, title, filename }
    );
  },

  async getLockedFacts(transformationId: string): Promise<LockedFactResponse> {
    return apiGet<LockedFactResponse>(`/transformations/${transformationId}/facts`);
  },
};

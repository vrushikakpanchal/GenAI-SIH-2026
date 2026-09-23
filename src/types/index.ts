export type Role = "admin" | "reviewer" | "operator" | "viewer";

export type UserStatus = "active" | "invited" | "deactivated";

export type TransformationStatus =
  | "draft"
  | "processing"
  | "awaiting_review"
  | "changes_requested"
  | "approved"
  | "publishing"
  | "published"
  | "verified"
  | "failed";

export type OutputType =
  | "advisory"
  | "executive"
  | "linkedin"
  | "x_thread"
  | "video"
  | "infographic"
  | "presentation";

export type EntityKind = "cve" | "cvss" | "product" | "version" | "ip" | "hash" | "severity";

export type EntityState = "detected" | "source_linked" | "validated" | "needs_review";

export type IntegrationStatus = "connected" | "not_connected";

export type IntegrationCategory = "publishing" | "storage" | "cms";

export type Priority = "high" | "medium" | "low";

export interface Organization {
  id: string;
  name: string;
  domain: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  activeWork: number;
  pendingReviews: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  status: UserStatus;
  lastActive: string;
  title: string;
  initials: string;
}

export interface SecurityEntity {
  id: string;
  kind: EntityKind;
  label: string;
  value: string;
  state: EntityState;
}

export interface SourceDocument {
  id: string;
  filename: string;
  type: "PDF" | "DOCX" | "TXT" | "Image" | "Video" | "Pasted text";
  sizeLabel: string;
  status: "uploaded" | "parsed" | "failed";
  title: string;
  extractedText: string;
  entities: SecurityEntity[];
  counts: {
    cves: number;
    products: number;
    ips: number;
    hashes: number;
    severity: string;
  };
}

export interface TransformationConfig {
  audience: string;
  tone: string;
  language: string;
  detail: number;
  objective: string;
  style: string;
  outputTypes: OutputType[];
}

export interface AdvisoryContent {
  title: string;
  severity: string;
  cve: string;
  cvss: string;
  affectedProduct: string;
  affectedVersions: string;
  summary: string;
  technicalDetails: string;
  impact: string;
  indicators: string[];
  mitigation: string;
  recommendations: string[];
  references: string[];
}

export interface ExecutiveContent {
  overview: string;
  keyFinding: string;
  businessImpact: string;
  risk: string;
  recommendedAction: string;
  takeaways: string[];
}

export interface LinkedInContent {
  body: string;
  hashtags: string[];
}

export interface XThreadPost {
  id: string;
  text: string;
}

export interface VideoScene {
  id: string;
  title: string;
  description: string;
  narration: string;
  visuals: string;
  subtitles: string;
}

export interface VideoPackage {
  script: string;
  scenes: VideoScene[];
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  notes: string;
}

export interface InfographicContent {
  title: string;
  keyMessage: string;
  stats: { label: string; value: string }[];
  entities: string[];
  layout: string;
  hierarchy: string[];
  callouts: string[];
}

export interface GeneratedOutputs {
  advisory?: AdvisoryContent;
  executive?: ExecutiveContent;
  linkedin?: LinkedInContent;
  xThread?: XThreadPost[];
  video?: VideoPackage;
  presentation?: Slide[];
  infographic?: InfographicContent;
}

export interface ReviewComment {
  id: string;
  reviewerId: string;
  comment: string;
  createdAt: string;
}

export interface Transformation {
  id: string;
  code: string;
  source: SourceDocument;
  config: TransformationConfig;
  outputs: GeneratedOutputs;
  organizationId: string;
  teamId: string;
  ownerId: string;
  ownerName?: string;
  reviewerId: string | null;
  reviewerName?: string;
  status: TransformationStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  publishedTo: string[];
  reviewComments: ReviewComment[];
  approvedBy?: string;
  approvedAt?: string;
  generationProgress?: Record<string, number>;
  outputId?: string;
  outputVersion?: number;
  validationStatus?: string;
  validationDetails?: any;
  lockedFacts?: any;
}

export interface ActivityEvent {
  id: string;
  transformationId: string | null;
  userId: string | null;
  teamId: string | null;
  action: string;
  detail: string;
  at: string;
}

export interface ProvenanceRecord {
  id: string;
  transformationId: string;
  sourceHash: string;
  outputHash: string;
  operatorId: string;
  reviewerId: string | null;
  timestamp: string;
  model: string;
  version: string;
  txHash: string;
  blockNumber: string;
  status: "recorded" | "verified" | "pending";
  steps: { label: string; at: string }[];
}

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  account: string | null;
  lastUsed: string | null;
  permissions: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  at: string;
  href?: string;
}

export interface EngineStatus {
  online: boolean;
  model: string;
  inference: string;
  validation: string;
  rag: string;
  provenance: string;
}

export interface DashboardStats {
  sources: number;
  generated: number;
  pendingReview: number;
  verified: number;
}

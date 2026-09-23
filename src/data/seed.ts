import type {
  ActivityEvent,
  EngineStatus,
  Integration,
  NotificationItem,
  Organization,
  ProvenanceRecord,
  SourceDocument,
  Team,
  Transformation,
  User,
} from "@/types";

export const ORG: Organization = {
  id: "org-1",
  name: "Aegis National CERT",
  domain: "aegis.gov.in",
};

export const USERS: User[] = [
  {
    id: "u-ishita",
    name: "Ishita Jagtap",
    email: "ishita@aegis.gov.in",
    role: "operator",
    teamId: "t-ti",
    status: "active",
    lastActive: new Date(Date.now() - 4 * 60_000).toISOString(),
    title: "Threat Intelligence Analyst",
    initials: "IJ",
  },
  {
    id: "u-rahul",
    name: "Rahul Sharma",
    email: "rahul@aegis.gov.in",
    role: "reviewer",
    teamId: "t-ti",
    status: "active",
    lastActive: new Date(Date.now() - 12 * 60_000).toISOString(),
    title: "Team Lead, Threat Intelligence",
    initials: "RS",
  },
  {
    id: "u-ananya",
    name: "Ananya Patel",
    email: "ananya@aegis.gov.in",
    role: "operator",
    teamId: "t-comms",
    status: "active",
    lastActive: new Date(Date.now() - 2 * 3600_000).toISOString(),
    title: "Communications Officer",
    initials: "AP",
  },
  {
    id: "u-priya",
    name: "Priya Mehta",
    email: "priya@aegis.gov.in",
    role: "admin",
    teamId: "t-review",
    status: "active",
    lastActive: new Date(Date.now() - 30 * 60_000).toISOString(),
    title: "Organization Administrator",
    initials: "PM",
  },
  {
    id: "u-karan",
    name: "Karan Desai",
    email: "karan@aegis.gov.in",
    role: "viewer",
    teamId: "t-soc",
    status: "active",
    lastActive: new Date(Date.now() - 26 * 3600_000).toISOString(),
    title: "Research Liaison",
    initials: "KD",
  },
];

export const TEAMS: Team[] = [
  {
    id: "t-ti",
    name: "Threat Intelligence",
    description: "Advisory production from incoming intel and CVE reports.",
    memberIds: ["u-ishita", "u-rahul"],
    activeWork: 4,
    pendingReviews: 2,
  },
  {
    id: "t-comms",
    name: "Communications",
    description: "Public-facing and executive briefing outputs.",
    memberIds: ["u-ananya"],
    activeWork: 2,
    pendingReviews: 1,
  },
  {
    id: "t-soc",
    name: "Security Operations",
    description: "SOC monitoring, triage, and operational response content.",
    memberIds: ["u-karan"],
    activeWork: 3,
    pendingReviews: 1,
  },
  {
    id: "t-ir",
    name: "Incident Response",
    description: "Incident coordination and stakeholder communications.",
    memberIds: [],
    activeWork: 1,
    pendingReviews: 0,
  },
  {
    id: "t-review",
    name: "Administration",
    description: "Organization administration, policy, and governance.",
    memberIds: ["u-priya"],
    activeWork: 1,
    pendingReviews: 3,
  },
];

export const ENGINE: EngineStatus = {
  online: true,
  model: "Qwen2.5-14B-Instruct",
  inference: "Remote GPU",
  validation: "Active",
  rag: "Connected",
  provenance: "Connected",
};

export const SAMPLE_SOURCE: SourceDocument = {
  id: "src-1",
  filename: "critical_vulnerability_report.pdf",
  type: "PDF",
  sizeLabel: "4.2 MB",
  status: "parsed",
  title: "Critical Vulnerability Report",
  extractedText: `VENDOR SECURITY NOTICE — CONFIDENTIAL UNTIL PUBLICATION

Title: Remote code execution in Example Product management interface

Identifier: CVE-2026-XXXX
CVSS v3.1 Base Score: 9.8 (Critical)
Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H

Affected product: Example Product
Affected versions: 4.1 through 4.3 inclusive (fixed in 4.3.1)

Summary
A crafted request to the management interface can result in unauthenticated remote code execution. The vendor reports limited in-the-wild exploitation against internet-exposed consoles.

Observed indicators
- Network: 203.0.113.41, 198.51.100.17
- File hashes (SHA-256): 8f7a91ac…, 91af72cd…

Recommended actions
1. Restrict management interfaces to trusted networks.
2. Apply vendor patch 4.3.1.
3. Hunt for anomalous process creation on management hosts.

This excerpt is sample content for demonstration. Values are illustrative and not a real advisory.`,
  entities: [
    { id: "e1", kind: "cve", label: "CVE", value: "CVE-2026-XXXX", state: "source_linked" },
    { id: "e2", kind: "cvss", label: "CVSS", value: "9.8", state: "source_linked" },
    { id: "e3", kind: "severity", label: "Severity", value: "Critical", state: "detected" },
    { id: "e4", kind: "product", label: "Affected Product", value: "Example Product", state: "source_linked" },
    { id: "e5", kind: "version", label: "Affected Version", value: "4.2.1", state: "needs_review" },
    { id: "e6", kind: "ip", label: "IP", value: "203.0.113.41", state: "detected" },
    { id: "e7", kind: "hash", label: "Hash", value: "8f7a91acd4e2…", state: "detected" },
  ],
  counts: { cves: 4, products: 3, ips: 8, hashes: 6, severity: "Critical" },
};

function advisory() {
  return {
    title: "Critical Security Advisory — Example Product Remote Code Execution",
    severity: "CRITICAL",
    cve: "CVE-2026-XXXX",
    cvss: "9.8",
    affectedProduct: "Example Product",
    affectedVersions: "4.1 – 4.3",
    summary:
      "Unauthenticated remote code execution is possible against internet-exposed management interfaces of Example Product versions 4.1 through 4.3. Apply vendor update 4.3.1 and restrict management access immediately.",
    technicalDetails:
      "The management API accepts a crafted request that reaches an unsafe deserialization path. No authentication is required when the interface is reachable. The source document lists a CVSS 3.1 base score of 9.8 and limited exploitation against exposed consoles.",
    impact:
      "Successful exploitation can yield full control of the management host, with potential access to connected operational systems and credentials stored on the appliance.",
    indicators: [
      "203.0.113.41",
      "198.51.100.17",
      "SHA-256 8f7a91ac… (sample)",
      "SHA-256 91af72cd… (sample)",
    ],
    mitigation:
      "Isolate management networks. Block inbound access to the management port at the perimeter. Deploy vendor patch 4.3.1. Review process-creation logs on management hosts.",
    recommendations: [
      "Patch to 4.3.1 or newer without delay.",
      "Confirm no unexpected outbound connections from management hosts.",
      "Notify downstream operators if Example Product is in production.",
    ],
    references: [
      "Source: critical_vulnerability_report.pdf",
      "Vendor bulletin (placeholder — not retrieved live)",
    ],
  };
}

function executive() {
  return {
    overview:
      "A critical remotely exploitable flaw in Example Product may allow attackers to take over exposed management consoles. Immediate patching and access restriction are recommended.",
    keyFinding:
      "CVE-2026-XXXX (CVSS 9.8) affects Example Product 4.1–4.3. Exploitation does not require credentials when the management interface is reachable.",
    businessImpact:
      "Compromise of a management console can interrupt operations, expose credentials, and create a foothold for further intrusion. Organizations running internet-facing consoles are at highest risk.",
    risk: "Critical — unauthenticated network attack, high impact on confidentiality, integrity, and availability.",
    recommendedAction:
      "Restrict management interfaces today and schedule emergency change control for patch 4.3.1. Brief incident-response and communications teams.",
    takeaways: [
      "Issue is critical and remotely exploitable.",
      "Fix is available (4.3.1).",
      "Human review is required before any external publication.",
    ],
  };
}

function linkedin() {
  return {
    body: `Security teams should treat CVE-2026-XXXX as an emergency change.

Example Product versions 4.1–4.3 are affected by unauthenticated remote code execution on exposed management interfaces (CVSS 9.8).

Recommended now:
• Restrict management access to trusted networks
• Apply vendor update 4.3.1
• Hunt for anomalous activity on management hosts

This post is generated from an internal source document and is intended for review before any public distribution.`,
    hashtags: ["#CyberSecurity", "#VulnerabilityManagement", "#CERT"],
  };
}

export const TRANSFORMATIONS: Transformation[] = [
  {
    id: "tr-1042",
    code: "TR-1042",
    source: SAMPLE_SOURCE,
    config: {
      audience: "Security Analysts",
      tone: "Professional",
      language: "English",
      detail: 80,
      objective: "Alert",
      style: "Technical",
      outputTypes: ["advisory", "executive", "linkedin"],
    },
    outputs: {
      advisory: advisory(),
      executive: executive(),
      linkedin: linkedin(),
    },
    organizationId: "org-1",
    teamId: "t-ti",
    ownerId: "u-ishita",
    reviewerId: "u-rahul",
    status: "awaiting_review",
    priority: "high",
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    publishedTo: [],
    reviewComments: [],
  },
  {
    id: "tr-1038",
    code: "TR-1038",
    source: {
      ...SAMPLE_SOURCE,
      id: "src-2",
      filename: "certin_security_alert.pdf",
      title: "CERT-In Security Alert",
      sizeLabel: "1.1 MB",
    },
    config: {
      audience: "Executives",
      tone: "Formal",
      language: "English",
      detail: 40,
      objective: "Summarize",
      style: "Executive",
      outputTypes: ["executive"],
    },
    outputs: { executive: executive() },
    organizationId: "org-1",
    teamId: "t-comms",
    ownerId: "u-ananya",
    reviewerId: "u-rahul",
    status: "approved",
    priority: "medium",
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 21 * 60_000).toISOString(),
    publishedTo: [],
    reviewComments: [],
    approvedBy: "u-rahul",
    approvedAt: new Date(Date.now() - 21 * 60_000).toISOString(),
  },
  {
    id: "tr-1031",
    code: "TR-1031",
    source: {
      ...SAMPLE_SOURCE,
      id: "src-3",
      filename: "phishing_campaign_notes.docx",
      title: "Phishing Campaign Notes",
      type: "DOCX",
      sizeLabel: "860 KB",
      counts: { cves: 0, products: 1, ips: 12, hashes: 9, severity: "High" },
    },
    config: {
      audience: "General Public",
      tone: "Accessible",
      language: "English",
      detail: 35,
      objective: "Educate",
      style: "Public-facing",
      outputTypes: ["linkedin", "x_thread"],
    },
    outputs: {
      linkedin: {
        body: "A coordinated phishing campaign is impersonating payroll notices. Verify senders, do not open unexpected attachments, and report messages to your security team.",
        hashtags: ["#Phishing", "#Awareness"],
      },
      xThread: [
        { id: "p1", text: "1/4 Payroll-themed phishing is circulating. Treat unexpected HR attachments as hostile until verified." },
        { id: "p2", text: "2/4 Look for lookalike domains and urgency language requesting credentials." },
        { id: "p3", text: "3/4 Report to your SOC. Do not forward the lure to colleagues." },
        { id: "p4", text: "4/4 This thread is an internal draft pending approval. Not a public advisory." },
      ],
    },
    organizationId: "org-1",
    teamId: "t-comms",
    ownerId: "u-ananya",
    reviewerId: "u-rahul",
    status: "published",
    priority: "medium",
    createdAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    publishedTo: ["drive"],
    reviewComments: [],
    approvedBy: "u-rahul",
    approvedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
  },
  {
    id: "tr-1022",
    code: "TR-1022",
    source: {
      ...SAMPLE_SOURCE,
      id: "src-4",
      filename: "incident_ir-441.txt",
      title: "Incident IR-441 Brief",
      type: "TXT",
      sizeLabel: "42 KB",
    },
    config: {
      audience: "Technical Teams",
      tone: "Technical",
      language: "English",
      detail: 70,
      objective: "Inform",
      style: "Technical",
      outputTypes: ["advisory", "presentation"],
    },
    outputs: { advisory: advisory() },
    organizationId: "org-1",
    teamId: "t-ti",
    ownerId: "u-ishita",
    reviewerId: "u-rahul",
    status: "verified",
    priority: "high",
    createdAt: new Date(Date.now() - 80 * 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
    publishedTo: ["linkedin"],
    reviewComments: [],
    approvedBy: "u-rahul",
    approvedAt: new Date(Date.now() - 50 * 3600_000).toISOString(),
  },
  {
    id: "tr-1040",
    code: "TR-1040",
    source: {
      ...SAMPLE_SOURCE,
      id: "src-5",
      filename: "ransomware_watch.docx",
      title: "Ransomware Watch Notes",
      type: "DOCX",
      sizeLabel: "2.0 MB",
    },
    config: {
      audience: "IT Administrators",
      tone: "Urgent",
      language: "English",
      detail: 55,
      objective: "Alert",
      style: "Professional",
      outputTypes: ["advisory", "infographic"],
    },
    outputs: {},
    organizationId: "org-1",
    teamId: "t-ti",
    ownerId: "u-ishita",
    reviewerId: null,
    status: "draft",
    priority: "low",
    createdAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 70 * 60_000).toISOString(),
    publishedTo: [],
    reviewComments: [],
  },
];

export const ACTIVITIES: ActivityEvent[] = [
  {
    id: "a1",
    transformationId: "tr-1042",
    userId: "u-ishita",
    teamId: "t-ti",
    action: "source_uploaded",
    detail: "Ishita uploaded source",
    at: new Date(Date.now() - 18 * 60_000).toISOString(),
  },
  {
    id: "a2",
    transformationId: "tr-1042",
    userId: null,
    teamId: "t-ti",
    action: "parsed",
    detail: "Source parsed",
    at: new Date(Date.now() - 17 * 60_000).toISOString(),
  },
  {
    id: "a3",
    transformationId: "tr-1042",
    userId: null,
    teamId: "t-ti",
    action: "generated",
    detail: "Transformation generated",
    at: new Date(Date.now() - 16 * 60_000).toISOString(),
  },
  {
    id: "a4",
    transformationId: "tr-1042",
    userId: "u-ishita",
    teamId: "t-ti",
    action: "edited",
    detail: "Ishita edited advisory",
    at: new Date(Date.now() - 13 * 60_000).toISOString(),
  },
  {
    id: "a5",
    transformationId: "tr-1042",
    userId: "u-ishita",
    teamId: "t-ti",
    action: "submitted",
    detail: "Submitted for review",
    at: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
  {
    id: "a6",
    transformationId: "tr-1038",
    userId: "u-rahul",
    teamId: "t-comms",
    action: "approved",
    detail: "Rahul approved output",
    at: new Date(Date.now() - 21 * 60_000).toISOString(),
  },
  {
    id: "a7",
    transformationId: "tr-1031",
    userId: "u-ananya",
    teamId: "t-comms",
    action: "published",
    detail: "Saved to Google Drive",
    at: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
  {
    id: "a8",
    transformationId: "tr-1022",
    userId: null,
    teamId: "t-ti",
    action: "provenance",
    detail: "Provenance record created",
    at: new Date(Date.now() - 48 * 3600_000).toISOString(),
  },
];

export const PROVENANCE: ProvenanceRecord[] = [
  {
    id: "prv-1022",
    transformationId: "tr-1022",
    sourceHash: "8f7a91acd4e21190c0ab91ac",
    outputHash: "91af72cd44b01883aa72cd91",
    operatorId: "u-ishita",
    reviewerId: "u-rahul",
    timestamp: new Date(Date.now() - 48 * 3600_000).toISOString(),
    model: "Qwen2.5-14B-Instruct",
    version: "engine-2026.09",
    txHash: "0x7c91af72cd8f7a91ac0011bb",
    blockNumber: "18422901",
    status: "verified",
    steps: [
      { label: "Source Uploaded", at: new Date(Date.now() - 80 * 3600_000).toISOString() },
      { label: "AI Generated", at: new Date(Date.now() - 79 * 3600_000).toISOString() },
      { label: "Edited", at: new Date(Date.now() - 70 * 3600_000).toISOString() },
      { label: "Approved", at: new Date(Date.now() - 50 * 3600_000).toISOString() },
      { label: "Published", at: new Date(Date.now() - 49 * 3600_000).toISOString() },
      { label: "Hash Recorded", at: new Date(Date.now() - 48 * 3600_000).toISOString() },
    ],
  },
  {
    id: "prv-1031",
    transformationId: "tr-1031",
    sourceHash: "11ab8f7a91acd4e2001191ac",
    outputHash: "22cd91af72cd44b0aa72cd91",
    operatorId: "u-ananya",
    reviewerId: "u-rahul",
    timestamp: new Date(Date.now() - 5 * 3600_000).toISOString(),
    model: "Qwen2.5-14B-Instruct",
    version: "engine-2026.09",
    txHash: "0xpending-not-finalized",
    blockNumber: "—",
    status: "recorded",
    steps: [
      { label: "Source Uploaded", at: new Date(Date.now() - 26 * 3600_000).toISOString() },
      { label: "AI Generated", at: new Date(Date.now() - 25 * 3600_000).toISOString() },
      { label: "Approved", at: new Date(Date.now() - 6 * 3600_000).toISOString() },
      { label: "Published", at: new Date(Date.now() - 5 * 3600_000).toISOString() },
      { label: "Hash Recorded", at: new Date(Date.now() - 5 * 3600_000).toISOString() },
    ],
  },
];

export const INTEGRATIONS: Integration[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "publishing",
    status: "connected",
    account: "Aegis National CERT",
    lastUsed: new Date(Date.now() - 48 * 3600_000).toISOString(),
    permissions: ["Publish to organization page", "Read profile"],
  },
  {
    id: "x",
    name: "X",
    category: "publishing",
    status: "not_connected",
    account: null,
    lastUsed: null,
    permissions: ["Publish posts", "Publish threads"],
  },
  {
    id: "drive",
    name: "Google Drive",
    category: "storage",
    status: "connected",
    account: "records@aegis.gov.in",
    lastUsed: new Date(Date.now() - 5 * 3600_000).toISOString(),
    permissions: ["Create files", "Write to selected folder"],
  },
  {
    id: "cms",
    name: "Website / CMS",
    category: "cms",
    status: "not_connected",
    account: null,
    lastUsed: null,
    permissions: ["Create draft pages"],
  },
];

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "Ready for review",
    body: "Your transformation TR-1042 is ready for review.",
    unread: true,
    at: new Date(Date.now() - 10 * 60_000).toISOString(),
    href: "/review",
  },
  {
    id: "n2",
    title: "Advisory approved",
    body: "Rahul Sharma approved CERT-In Security Alert.",
    unread: true,
    at: new Date(Date.now() - 21 * 60_000).toISOString(),
    href: "/transformations/tr-1038",
  },
  {
    id: "n3",
    title: "Saved to storage",
    body: "Phishing Campaign Notes was saved to Google Drive.",
    unread: false,
    at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    href: "/transformations/tr-1031",
  },
  {
    id: "n4",
    title: "Integration disconnected",
    body: "X is not connected. Publishing to X requires an organization account.",
    unread: false,
    at: new Date(Date.now() - 40 * 3600_000).toISOString(),
    href: "/integrations",
  },
];

export const DEMO_ACCOUNTS = [
  { email: "ishita@aegis.gov.in", password: "demo", label: "Operator" },
  { email: "rahul@aegis.gov.in", password: "demo", label: "Reviewer" },
  { email: "priya@aegis.gov.in", password: "demo", label: "Admin" },
  { email: "karan@aegis.gov.in", password: "demo", label: "Viewer" },
];

export function generatedBundle() {
  return {
    advisory: advisory(),
    executive: executive(),
    linkedin: linkedin(),
    xThread: [
      { id: "x1", text: "1/5 Critical: CVE-2026-XXXX in Example Product (CVSS 9.8). Unauthenticated RCE on exposed management interfaces." },
      { id: "x2", text: "2/5 Affected versions 4.1–4.3. Fixed in 4.3.1. Restrict management access immediately." },
      { id: "x3", text: "3/5 Hunt for unexpected process creation on management hosts and review perimeter exposure." },
      { id: "x4", text: "4/5 Indicators in the source include sample IPs 203.0.113.41 and 198.51.100.17 — treat as illustrative." },
      { id: "x5", text: "5/5 This thread is a draft for human approval. It is not a live public advisory." },
    ],
    video: {
      script:
        "Open with the severity, name the product and CVE, state the action (patch 4.3.1 and isolate management networks), close with a reminder that publication requires approval.",
      scenes: [
        { id: "s1", title: "Introduction", description: "State the alert and audience.", narration: "This briefing covers a critical issue in Example Product.", visuals: "Title card, CERT mark, severity chip.", subtitles: "Critical briefing: Example Product." },
        { id: "s2", title: "Threat Overview", description: "CVE, CVSS, attack path.", narration: "CVE-2026-XXXX is rated 9.8 and requires no credentials.", visuals: "Entity callouts for CVE and CVSS.", subtitles: "CVE-2026-XXXX, CVSS 9.8." },
        { id: "s3", title: "Impact", description: "Business and operational impact.", narration: "A compromised console can expose credentials and interrupt operations.", visuals: "Simple impact diagram.", subtitles: "Full control of the management host." },
        { id: "s4", title: "Recommended Action", description: "Patch and isolate.", narration: "Restrict access today and apply 4.3.1 under emergency change control.", visuals: "Numbered actions 1-3.", subtitles: "Patch 4.3.1. Restrict management access." },
      ],
    },
    presentation: [
      { id: "sl1", title: "Title", content: "CVE-2026-XXXX\nExample Product — Critical RCE\nInternal briefing", notes: "State that this is generated from the source PDF and pending review." },
      { id: "sl2", title: "Threat Overview", content: "Unauthenticated RCE on exposed management interfaces\nCVSS 9.8", notes: "Do not claim in-the-wild confirmation beyond the source wording." },
      { id: "sl3", title: "Impact", content: "Host takeover\nCredential exposure\nOperational disruption", notes: "Keep this slide non-technical for mixed audiences." },
      { id: "sl4", title: "Technical Details", content: "Unsafe deserialization path on management API\nNo authentication when reachable", notes: "Point reviewers to the source-linked CVSS and version range." },
      { id: "sl5", title: "Recommendations", content: "1. Restrict management networks\n2. Patch 4.3.1\n3. Hunt management hosts", notes: "Approval is required before external distribution." },
    ],
    infographic: {
      title: "CVE-2026-XXXX at a glance",
      keyMessage: "Patch Example Product 4.1–4.3 and isolate management interfaces.",
      stats: [
        { label: "CVSS", value: "9.8" },
        { label: "Severity", value: "Critical" },
        { label: "Auth required", value: "None" },
      ],
      entities: ["CVE-2026-XXXX", "Example Product", "4.3.1 patch"],
      layout: "Vertical poster: severity band, three stats, then three actions.",
      hierarchy: ["Severity", "Product / versions", "Actions"],
      callouts: ["Source-linked CVSS 9.8", "Fix available: 4.3.1", "Human approval before publish"],
    },
  };
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Organization Admin",
  reviewer: "Team Lead / Reviewer",
  operator: "Operator",
  viewer: "Viewer",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  awaiting_review: "Awaiting Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  publishing: "Publishing",
  published: "Published",
  verified: "Verified",
  failed: "Failed",
};

export const OUTPUT_LABEL: Record<string, string> = {
  advisory: "Security Advisory",
  executive: "Executive Summary",
  linkedin: "LinkedIn",
  x_thread: "X Thread",
  video: "Video Package",
  infographic: "Infographic",
  presentation: "Presentation",
};

export function outputLabels(types: string[]) {
  return types.map((t) => OUTPUT_LABEL[t] ?? t).join(" + ");
}

export function truncateHash(hash: string) {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}

export function canSeeOrgAdmin(role: string) {
  return role === "admin";
}

export function canReview(role: string) {
  return role === "admin" || role === "reviewer";
}

export function canCreate(role: string) {
  return role === "admin" || role === "reviewer" || role === "operator";
}

export function canApprove(role: string) {
  return role === "admin" || role === "reviewer";
}

export function canPublish(role: string) {
  return role === "admin" || role === "reviewer";
}

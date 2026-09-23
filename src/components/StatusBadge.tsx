import { cn } from "@/lib/utils";
import type { TransformationStatus } from "@/types";

const styles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  processing: "bg-indigo-50 text-indigo-700",
  awaiting_review: "bg-amber-50 text-amber-800",
  changes_requested: "bg-orange-50 text-orange-800",
  approved: "bg-emerald-50 text-emerald-800",
  publishing: "bg-sky-50 text-sky-800",
  published: "bg-sky-50 text-sky-800",
  verified: "bg-emerald-50 text-emerald-800",
  failed: "bg-red-50 text-red-800",
  high: "bg-red-50 text-red-800",
  medium: "bg-amber-50 text-amber-800",
  low: "bg-slate-100 text-slate-600",
  connected: "bg-emerald-50 text-emerald-800",
  not_connected: "bg-slate-100 text-slate-600",
  source_linked: "bg-indigo-50 text-indigo-700",
  detected: "bg-slate-100 text-slate-700",
  validated: "bg-emerald-50 text-emerald-800",
  needs_review: "bg-amber-50 text-amber-800",
};

const labels: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  awaiting_review: "Awaiting Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  publishing: "Publishing",
  published: "Published",
  verified: "Verified",
  failed: "Failed",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  connected: "Connected",
  not_connected: "Not connected",
  source_linked: "Source-linked",
  detected: "Detected",
  validated: "Validated",
  needs_review: "Needs Review",
};

export function StatusBadge({
  value,
  label,
}: {
  value: TransformationStatus | string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        styles[value] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {label ?? labels[value] ?? value}
    </span>
  );
}

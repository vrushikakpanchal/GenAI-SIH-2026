import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper-elevated p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
        <Icon className="h-4 w-4 text-ink-muted" />
      </div>
      <p className="mt-3 font-sans text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className={cn("mt-1 text-xs text-ink-muted")}>{hint}</p> : null}
    </div>
  );
}

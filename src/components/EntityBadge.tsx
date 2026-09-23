import { StatusBadge } from "@/components/StatusBadge";
import type { EntityState } from "@/types";

export function EntityBadge({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: EntityState;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="font-mono text-sm text-ink">{value}</p>
      </div>
      <StatusBadge value={state} />
    </div>
  );
}

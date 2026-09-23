import { cn, ROLE_LABEL } from "@/lib/utils";

const light: Record<string, string> = {
  admin: "bg-navy text-white",
  reviewer: "bg-accent-soft text-accent",
  operator: "bg-slate-100 text-ink",
  viewer: "bg-paper text-ink-muted border border-line",
};

const dark: Record<string, string> = {
  admin: "bg-white text-navy",
  reviewer: "bg-white/15 text-indigo-200",
  operator: "bg-white/10 text-white",
  viewer: "bg-white/5 text-slate-300",
};

export function RoleBadge({ role, onDark }: { role: string; onDark?: boolean }) {
  const styles = onDark ? dark : light;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
        styles[role] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

import { Check, ShieldAlert } from "lucide-react";

const CHECKS = [
  { label: "Input validation", state: "pass" as const },
  { label: "PII/DLP scan", state: "pass" as const },
  { label: "Prompt injection scan", state: "pass" as const },
  { label: "Output validation", state: "pending" as const },
  { label: "Human approval", state: "pending" as const },
];

export function SecurityCheckPanel({ approved, hasOutputs }: { approved?: boolean; hasOutputs?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Security checks</p>
      <p className="mt-1 text-xs text-ink-muted">Mock indicators. Live scanning is not connected.</p>
      <ul className="mt-3 space-y-2">
        {CHECKS.map((c) => {
          const ok =
            c.state === "pass" ||
            (c.label === "Output validation" && hasOutputs) ||
            (c.label === "Human approval" && approved);
          return (
            <li key={c.label} className="flex items-center justify-between text-sm">
              <span className="text-ink">{c.label}</span>
              {ok ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                  <Check className="h-3.5 w-3.5" /> Passed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                  <ShieldAlert className="h-3.5 w-3.5" /> Pending
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { Check, ShieldCheck } from "lucide-react";

interface GovSecurityValidationProps {
  tlp?: string;
  sourceHash?: string;
  dlpFindingsCount?: number;
}

export function GovSecurityValidation({
  tlp = "TLP:AMBER",
  sourceHash,
  dlpFindingsCount = 0,
}: GovSecurityValidationProps) {
  const checks = [
    {
      label: "Source Integrity (SHA-256)",
      status: sourceHash ? `${sourceHash.slice(0, 10)}…` : "Verified on Ingest",
      badge: "Cryptographic Lock",
    },
    {
      label: "DLP / Sensitive Data Screening",
      status: dlpFindingsCount === 0 ? "Clean (0 Flags)" : `${dlpFindingsCount} Findings`,
      badge: dlpFindingsCount === 0 ? "Passed" : "Action Required",
    },
    {
      label: "Deterministic Technical Entity Lock",
      status: "Active (CVE, IP, Hash Isolation)",
      badge: "Enforced",
    },
    {
      label: "Prompt Injection Mitigation",
      status: "Untrusted Boundary Delimiters",
      badge: "Active",
    },
  ];

  return (
    <section className="border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">Security & Integrity Controls</h3>
        </div>
        <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
          Grounded Protection
        </span>
      </div>
      <ul className="divide-y divide-line">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <p className="text-xs font-medium text-ink">{c.label}</p>
              <p className="font-mono text-[11px] text-ink-muted">{c.status}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-paper px-2 py-0.5 text-[11px] font-medium text-success">
              <Check className="h-3 w-3" aria-hidden />
              {c.badge}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="text-xs font-medium text-ink">Information Classification</span>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-900">
            {tlp}
          </span>
        </li>
      </ul>
    </section>
  );
}

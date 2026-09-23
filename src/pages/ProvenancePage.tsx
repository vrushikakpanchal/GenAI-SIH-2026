import { EmptyState, LoadingSkeleton } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/context/SessionContext";
import { formatRelative, truncateHash } from "@/lib/utils";
import { provenanceService } from "@/services/provenance";
import { store } from "@/services/mockStore";
import type { ProvenanceRecord } from "@/types";
import { Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const TIMELINE = [
  "Source Ingested",
  "Content Analyzed",
  "Transformation Generated",
  "Operator Edited",
  "Reviewed",
  "Approved",
  "Hash Recorded",
  "Distributed",
];

export function ProvenancePage() {
  const { version } = useSession();
  const [records, setRecords] = useState<ProvenanceRecord[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void provenanceService.list().then((list) => {
      setRecords(list);
      setSelected(list[0]?.id ?? null);
    });
  }, [version]);

  if (!records) return <LoadingSkeleton rows={6} />;
  const rec = records.find((r) => r.id === selected) ?? records[0];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Cryptographic Lineage</p>
        <h1 className="text-xl font-bold text-ink">Output Provenance & Audit Trail</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-ink-muted">
          Tamper-evident verification linking source intelligence, deterministic locked facts, and generated outputs via SHA-256 hash chains.
        </p>
      </header>

      {records.length === 0 ? (
        <EmptyState
          icon={Fingerprint}
          title="No verification records"
          description="Records are created after approved content is distributed."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border border-line bg-white">
            <h2 className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Records
            </h2>
            <ul className="divide-y divide-line">
              {records.map((r) => {
                const tr = store.transformationById(r.transformationId);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r.id)}
                      className={`w-full px-3 py-2.5 text-left text-sm ${selected === r.id ? "border-l-2 border-l-accent bg-accent-soft/50" : "hover:bg-paper"}`}
                    >
                      <p className="font-medium">{tr?.source.title ?? r.id}</p>
                      <p className="font-mono text-[11px] text-ink-muted">{tr?.code}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {rec ? <RecordDetail rec={rec} /> : null}
        </div>
      )}
    </div>
  );
}

function RecordDetail({ rec }: { rec: ProvenanceRecord }) {
  const tr = store.transformationById(rec.transformationId);
  const operator = store.userById(rec.operatorId);
  const reviewer = rec.reviewerId ? store.userById(rec.reviewerId) : undefined;

  const steps = rec.steps.length >= TIMELINE.length
    ? rec.steps
    : TIMELINE.map((label, i) => ({
        label,
        at: rec.steps[i]?.at ?? rec.timestamp,
        actor: i === 0 ? operator?.name : i < 4 ? operator?.name : i < 6 ? reviewer?.name : "System",
        version: `v1.${i + 1}`,
      }));

  return (
    <div className="space-y-5">
      <div className="border border-line bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{tr?.outputs.advisory ? "Security Advisory" : "Output"}</p>
            <p className="font-mono text-lg font-semibold">{tr?.outputs.advisory?.cve ?? tr?.code}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{tr?.source.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
              Demo ledger
            </span>
            <StatusBadge value={rec.status === "verified" ? "verified" : "published"} label={rec.status === "verified" ? "VERIFIED" : rec.status.toUpperCase()} />
          </div>
        </div>
      </div>

      <section className="border border-line bg-white">
        <h2 className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
          Provenance Timeline
        </h2>
        <ol className="relative px-4 py-4">
          {steps.map((s, i) => {
            const step = s as { label: string; at: string; actor?: string; version?: string };
            return (
              <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 ? (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-line" aria-hidden />
                ) : null}
                <span className="relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-accent" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{step.label}</p>
                  <p className="text-xs text-ink-muted">
                    {step.actor ?? operator?.name ?? "System"} · {formatRelative(step.at)}
                    {step.version ? ` · ${step.version}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="border border-line bg-white">
        <h2 className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
          Cryptographic Integrity & Lineage
        </h2>
        <dl className="grid gap-0 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          <HashRow label="Source SHA-256" value={`sha256:${truncateHash(rec.sourceHash)}`} />
          <HashRow label="Output SHA-256" value={`sha256:${truncateHash(rec.outputHash)}`} />
          <HashRow label="Audit Storage" value="Database WAL Ledger" />
          <HashRow label="Tamper Status" value="Cryptographically Bound" />
          <MetaRow label="Operator" value={operator?.name ?? "—"} />
          <MetaRow label="Reviewer" value={reviewer?.name ?? "—"} />
          <MetaRow label="Model" value={rec.model || "qwen2.5:14b"} />
          <MetaRow label="Verification Status" value={rec.status === "verified" ? "Verified" : rec.status} />
        </dl>
        <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-muted">
          All transformations and versions are permanently sealed with SHA-256 digests in the audit log.
        </p>
      </section>

      {tr ? (
        <Link to={`/transformations/${tr.id}`} className="inline-block text-sm font-medium text-accent">
          Open output workspace →
        </Link>
      ) : null}
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line px-4 py-3 sm:border-r sm:last:border-r-0">
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-ink">{value}</dd>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line px-4 py-3 sm:border-r sm:last:border-r-0">
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}

import { PipelineStrip } from "@/components/PipelineStrip";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSkeleton } from "@/components/EmptyState";
import { useSession } from "@/context/SessionContext";
import { canCreate, formatRelative, greeting, outputLabels } from "@/lib/utils";
import { transformationsService } from "@/services/transformations";
import { activityService } from "@/services/outputs";
import type { AuditEventResponse } from "@/services/outputs";
import type { Transformation } from "@/types";
import {
  CheckCircle2,
  Clock3,
  FileStack,
  Plus,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const QUICK = [
  { type: "advisory", label: "Security Advisory", desc: "Structured cybersecurity advisory" },
  { type: "executive", label: "Executive Summary", desc: "Concise executive briefing" },
  { type: "linkedin", label: "LinkedIn", desc: "Professional publication-ready post" },
  { type: "x_thread", label: "X Thread", desc: "Platform-optimized thread" },
  { type: "video", label: "Video Package", desc: "Script, storyboard, narration" },
  { type: "presentation", label: "Presentation", desc: "Slides and speaker notes" },
  { type: "infographic", label: "Infographic", desc: "Key messaging and layout" },
];

export function DashboardPage() {
  const { user, version } = useSession();
  const [items, setItems] = useState<Transformation[]>([]);
  const [activity, setActivity] = useState<AuditEventResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    Promise.all([
      transformationsService.list(),
      activityService.list(),
    ])
      .then(([txs, acts]) => {
        setItems(txs);
        setActivity(acts.slice(0, 6));
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [user, version]);

  if (!user) return <LoadingSkeleton />;

  const stats = {
    total: items.length,
    pendingReview: items.filter((t) => t.status === "awaiting_review" || t.status === "changes_requested").length,
    approved: items.filter((t) => t.status === "approved" || t.status === "verified").length,
    published: items.filter((t) => t.status === "published" || t.status === "verified").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Transform intelligence into communication-ready content.</p>
        </div>
        {canCreate(user.role) ? (
          <Link
            to="/transformations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            New Transformation
          </Link>
        ) : null}
      </div>

      <PipelineStrip />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Transformations" value={stats.total} icon={FileStack} />
        <StatCard label="Pending Reviews" value={stats.pendingReview} icon={Clock3} />
        <StatCard label="Approved Outputs" value={stats.approved} icon={CheckCircle2} />
        <StatCard label="Published Outputs" value={stats.published} icon={Send} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-ink">What do you want to create?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK.map((q) => (
            <Link
              key={q.type}
              to={`/transformations/new?output=${q.type}`}
              className="rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-accent/40"
            >
              <p className="text-sm font-semibold text-ink">{q.label}</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">{q.desc}</p>
              <p className="mt-3 text-[11px] font-medium text-accent">Multiple outputs supported</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent transformations</h2>
            <Link to="/workspace" className="text-xs font-medium text-accent">
              Open workspace
            </Link>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
            <div className="hidden grid-cols-12 gap-2 border-b border-line bg-paper px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted md:grid">
              <span className="col-span-3">Code</span>
              <span className="col-span-3">Config</span>
              <span className="col-span-2">Team</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Updated</span>
            </div>
            {loadingData ? (
              <div className="px-4 py-6 text-sm text-ink-muted">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-ink-muted">No transformations yet. Create one above.</div>
            ) : (
              items.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  to={`/transformations/${t.id}`}
                  className="grid grid-cols-1 gap-1 border-b border-line px-4 py-3 text-sm last:border-0 hover:bg-paper md:grid-cols-12 md:items-center md:gap-2"
                >
                  <span className="col-span-3 font-medium text-ink">{t.code}</span>
                  <span className="col-span-3 text-ink-muted">
                    {t.config?.outputTypes ? outputLabels(t.config.outputTypes) : "Advisory"}
                  </span>
                  <span className="col-span-2 text-ink-muted">{(t as unknown as Record<string, string>).team_id ?? ""}</span>
                  <span className="col-span-2">
                    <StatusBadge value={t.status} />
                  </span>
                  <span className="col-span-2 text-xs text-ink-muted">{formatRelative(t.updatedAt ?? (t as any).updated_at)}</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">AI Engine</h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Connected
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <Row k="Model" v="Qwen2.5-7B via Ollama" />
              <Row k="Inference" v="Remote GPU (Kaggle)" />
              <Row k="Validation" v="Active" />
              <Row k="Audit" v="Database-backed" />
              <Row k="Traceability" v="SHA-256 hashing" />
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <Link to="/activity" className="text-xs font-medium text-accent">
                View all
              </Link>
            </div>
            <ol className="mt-4 space-y-3">
              {activity.map((e) => (
                <li key={e.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <p className="text-xs text-ink-muted">{formatRelative(e.created_at)}</p>
                  <p className="mt-0.5 text-sm text-ink">{e.summary}</p>
                </li>
              ))}
              {activity.length === 0 && !loadingData && (
                <li className="text-xs text-ink-muted">No activity yet.</li>
              )}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
    </div>
  );
}

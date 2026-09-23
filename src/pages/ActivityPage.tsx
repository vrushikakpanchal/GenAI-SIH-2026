import { EmptyState, LoadingSkeleton } from "@/components/EmptyState";
import { useSession } from "@/context/SessionContext";
import { cn, formatTime } from "@/lib/utils";
import { activityService } from "@/services/outputs";
import type { AuditEventResponse } from "@/services/outputs";
import { Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Category = "all" | "transformations" | "reviews" | "approvals" | "distribution" | "security" | "organization";

const CATEGORY_MAP: Record<string, Category[]> = {
  SOURCE_UPLOADED: ["transformations"],
  TRANSFORMATION_CREATED: ["transformations"],
  GENERATION_COMPLETED: ["transformations"],
  OUTPUT_EDITED: ["transformations"],
  SUBMITTED_FOR_REVIEW: ["reviews"],
  RESUBMITTED: ["reviews"],
  REVIEW_COMMENT_ADDED: ["reviews"],
  CHANGES_REQUESTED: ["reviews"],
  APPROVED: ["approvals"],
  ASSIGNMENT_CHANGED: ["organization"],
};

export function ActivityPage() {
  const { version } = useSession();
  const [events, setEvents] = useState<AuditEventResponse[] | null>(null);
  const [category, setCategory] = useState<Category>("all");

  useEffect(() => {
    void activityService.list().then(setEvents).catch(() => setEvents([]));
  }, [version]);

  const filtered = useMemo(() => {
    if (!events) return [];
    if (category === "all") return events;
    return events.filter((e) => CATEGORY_MAP[e.action]?.includes(category));
  }, [events, category]);

  if (!events) return <LoadingSkeleton rows={8} />;

  const filters: { id: Category; label: string }[] = [
    { id: "all", label: "All" },
    { id: "transformations", label: "Transformations" },
    { id: "reviews", label: "Reviews" },
    { id: "approvals", label: "Approvals" },
    { id: "distribution", label: "Distribution" },
    { id: "security", label: "Security" },
    { id: "organization", label: "Organization" },
  ];

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Audit</p>
        <h1 className="text-xl font-semibold text-ink">System Activity</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Database-backed audit trail for operational accountability. SHA-256 hashes track content integrity.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border border-line bg-white p-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCategory(f.id)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium",
              category === f.id ? "bg-accent text-white" : "text-ink-muted hover:bg-paper",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No activity" description="No events match the selected category." />
      ) : (
        <section className="border border-line bg-white">
          <ol className="divide-y divide-line">
            {filtered.map((e) => (
              <li key={e.id} className="flex gap-4 px-4 py-3">
                <time className="w-16 shrink-0 font-mono text-xs text-ink-muted">{formatTime(e.created_at)}</time>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-medium">{e.actor?.name ?? "System"}</span>{" "}
                    <span className="text-ink-muted">{e.action.replaceAll("_", " ").toLowerCase()}</span>
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{e.summary}</p>
                  {e.content_hash && (
                    <p className="mt-0.5 font-mono text-[10px] text-ink-muted" title="SHA-256 content reference hash">
                      SHA-256: {e.content_hash.slice(0, 16)}…
                    </p>
                  )}
                  {e.transformation_id ? (
                    <Link to={`/transformations/${e.transformation_id}`} className="mt-1 inline-block text-xs text-accent">
                      View record
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

import { EmptyState, LoadingSkeleton } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/context/SessionContext";
import { cn, formatDateShort, OUTPUT_LABEL } from "@/lib/utils";
import { transformationsService } from "@/services/transformations";
import type { Transformation } from "@/types";
import { ArrowDownUp, Inbox, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Filter = "all" | "mine" | "team" | "pending" | "approved" | "changes";

export function ReviewQueuePage() {
  const { user, version } = useSession();
  const [items, setItems] = useState<Transformation[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"submitted" | "priority">("submitted");

  useEffect(() => {
    void transformationsService.list().then(setItems);
  }, [version]);

  const list = useMemo(() => {
    if (!items || !user) return [];
    let rows = items.filter((t) =>
      ["awaiting_review", "changes_requested", "approved", "published", "verified"].includes(t.status),
    );

    if (filter === "mine") {
      rows = rows.filter((t) => t.reviewerId === user.id || user.role === "admin");
    } else if (filter === "team") {
      rows = rows.filter((t) => t.teamId === user.teamId);
    } else if (filter === "pending") {
      rows = rows.filter((t) => t.status === "awaiting_review");
    } else if (filter === "approved") {
      rows = rows.filter((t) => ["approved", "published", "verified"].includes(t.status));
    } else if (filter === "changes") {
      rows = rows.filter((t) => t.status === "changes_requested");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.source.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.ownerName || "").toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      if (sort === "priority") {
        const p = { high: 0, medium: 1, low: 2 };
        return p[a.priority] - p[b.priority];
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return rows;
  }, [items, user, filter, search, sort]);

  if (!user) return null;
  if (!items) return <LoadingSkeleton rows={5} />;

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "mine", label: "My Reviews" },
    { id: "team", label: "Team Reviews" },
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "changes", label: "Changes Requested" },
  ];

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Operations</p>
        <h1 className="text-xl font-semibold text-ink">Review Queue</h1>
        <p className="mt-0.5 text-sm text-ink-muted">Operational review console for pending content approvals.</p>
      </header>

      <div className="flex flex-col gap-3 border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium",
                filter === f.id ? "bg-accent text-white" : "text-ink-muted hover:bg-paper",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              className="w-full rounded border border-line py-1.5 pl-8 pr-2 text-sm"
              placeholder="Search content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-line px-2.5 py-1.5 text-xs"
            onClick={() => setSort((s) => (s === "submitted" ? "priority" : "submitted"))}
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {sort === "submitted" ? "Submitted" : "Priority"}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Inbox} title="No review items" description="No content matches the current filters." />
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5">Content</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Team</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Submitted</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((t) => {
                const primaryType = OUTPUT_LABEL[t.config.outputTypes[0]] ?? "Security Advisory";
                return (
                  <tr key={t.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{t.source.title}</p>
                      <p className="font-mono text-[11px] text-ink-muted">{t.code}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{primaryType}</td>
                    <td className="px-4 py-3 font-medium text-ink">{t.ownerName || "Operator"}</td>
                    <td className="px-4 py-3 text-ink-muted">{t.teamId || "SOC"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={t.priority} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDateShort(t.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/review/${t.id}`} className="text-sm font-medium text-accent hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { EmptyState, LoadingSkeleton } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/context/SessionContext";
import { canCreate, formatRelative, outputLabels } from "@/lib/utils";
import { transformationsService } from "@/services/transformations";
import type { Transformation, TransformationStatus } from "@/types";
import { FolderSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STATUSES: TransformationStatus[] = [
  "draft",
  "processing",
  "awaiting_review",
  "changes_requested",
  "approved",
  "published",
  "verified",
  "failed",
];

export function WorkspacePage() {
  const { user, version } = useSession();
  const [items, setItems] = useState<Transformation[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [team, setTeam] = useState("all");
  const [owner, setOwner] = useState("all");
  const [output, setOutput] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [sort, setSort] = useState("updated");
  const [range, setRange] = useState("all");

  useEffect(() => {
    void transformationsService.list().then(setItems);
  }, [version]);

  const filtered = useMemo(() => {
    if (!items || !user) return [];
    let list = items;
    if (user.role === "viewer") {
      list = list.filter((t) => ["approved", "published", "verified"].includes(t.status));
    }
    const query = q.trim().toLowerCase();
    return list.filter((t) => {
      const userName = (t.ownerName || "").toLowerCase();
      const teamName = (t.teamId || "").toLowerCase();
      const matchesQuery =
        !query ||
        t.source.title.toLowerCase().includes(query) ||
        t.source.filename.toLowerCase().includes(query) ||
        t.code.toLowerCase().includes(query) ||
        userName.includes(query) ||
        teamName.includes(query);
      const matchesStatus = status === "all" || t.status === status;
      const matchesTeam = team === "all" || t.teamId === team;
      const matchesOwner = owner === "all" || t.ownerId === owner;
      const matchesOut = output === "all" || t.config.outputTypes.includes(output as never);
      const matchesSource = sourceType === "all" || t.source.type === sourceType;
      const age = Date.now() - new Date(t.updatedAt).getTime();
      const matchesRange =
        range === "all" ||
        (range === "1h" && age <= 3600_000) ||
        (range === "24h" && age <= 24 * 3600_000) ||
        (range === "7d" && age <= 7 * 24 * 3600_000);
      return matchesQuery && matchesStatus && matchesTeam && matchesOwner && matchesOut && matchesSource && matchesRange;
    }).sort((a, b) => {
      if (sort === "source") return a.source.title.localeCompare(b.source.title);
      if (sort === "oldest") return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [items, q, status, team, owner, output, sourceType, sort, range, user]);

  if (!user) return null;
  if (!items) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <p className="mt-1 text-sm text-ink-muted">Search and filter transformations across the organization.</p>
        </div>
        {canCreate(user.role) ? (
          <Link to="/transformations/new" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white">
            New Transformation
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <input
          className="rounded-lg border border-line px-3 py-2 text-sm xl:col-span-1"
          placeholder="Search source, owner, team"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="all">All teams</option>
          <option value="SOC">SOC Operations</option>
          <option value="Incident Response">Incident Response</option>
        </select>
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="all">All operators</option>
          <option value="Ishita">Ishita</option>
          <option value="Operator">Operator</option>
          <option value="Admin">Admin</option>
        </select>
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={output} onChange={(e) => setOutput(e.target.value)}>
          <option value="all">All output types</option>
          <option value="advisory">Advisory</option>
          <option value="executive">Executive</option>
          <option value="linkedin">LinkedIn</option>
          <option value="x_thread">X Thread</option>
          <option value="video">Video</option>
          <option value="presentation">Presentation</option>
          <option value="infographic">Infographic</option>
        </select>
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
          <option value="all">All source types</option>
          <option value="PDF">PDF</option>
          <option value="DOCX">DOCX</option>
          <option value="TXT">TXT</option>
        </select>
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="all">Any date</option>
          <option value="1h">Last hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
        <select className="rounded-lg border border-line px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="updated">Newest updated</option>
          <option value="oldest">Oldest updated</option>
          <option value="source">Source name</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title="No transformations yet"
          description="Your first transformation starts here."
          actionLabel={canCreate(user.role) ? "New Transformation" : undefined}
          to={canCreate(user.role) ? "/transformations/new" : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="hidden grid-cols-12 gap-2 border-b border-line bg-paper px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted lg:grid">
            <span className="col-span-3">Source</span>
            <span className="col-span-2">Outputs</span>
            <span className="col-span-2">Team</span>
            <span className="col-span-1">Owner</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Updated</span>
          </div>
          {filtered.map((t) => (
            <Link
              key={t.id}
              to={`/transformations/${t.id}`}
              className="grid gap-1 border-b border-line px-4 py-3 text-sm last:border-0 hover:bg-paper lg:grid-cols-12 lg:items-center"
            >
              <span className="col-span-3 font-medium">
                {t.source.title}
                <span className="mt-0.5 block font-mono text-[11px] text-ink-muted">{t.code}</span>
              </span>
              <span className="col-span-2 text-ink-muted">{outputLabels(t.config.outputTypes)}</span>
              <span className="col-span-2 text-ink-muted">{t.teamId || "SOC"}</span>
              <span className="col-span-1 text-ink-muted">{(t.ownerName || "Operator").split(" ")[0]}</span>
              <span className="col-span-2">
                <StatusBadge value={t.status} />
              </span>
              <span className="col-span-2 text-xs text-ink-muted">{formatRelative(t.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

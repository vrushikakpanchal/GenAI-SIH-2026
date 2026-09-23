import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  to,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  to?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>
      {actionLabel && to ? (
        <Link
          to={to}
          className={cn(
            "mt-5 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90",
          )}
        >
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-5 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-200/70" />
      ))}
    </div>
  );
}

export function ErrorBanner({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-semibold text-red-800">{title}</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
    </div>
  );
}

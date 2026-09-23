import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useSession } from "@/context/SessionContext";
import { canCreate, canReview, canSeeOrgAdmin, cn, ROLE_LABEL } from "@/lib/utils";
import { notificationsService } from "@/services/outputs";
import type { NotificationResponse } from "@/services/outputs";
import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  FileSearch,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  Link2,
  Menu,
  Plug,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
  );

export function AppLayout() {
  const { user, org, logout, version } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<NotificationResponse[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    void notificationsService.list().then(setNotes).catch(() => setNotes([]));
  }, [version]);

  if (!user) return null;

  const unread = notes.filter((n) => !n.read).length;
  const role = user.role;

  const primary = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/transformations/new", label: "New Transformation", icon: Shield, show: canCreate(role) },
    { to: "/workspace", label: "Workspace", icon: FileSearch, show: true },
    { to: "/review", label: "Review Queue", icon: ClipboardCheck, show: canReview(role) },
    { to: "/activity", label: "Activity", icon: Activity, show: role !== "viewer" },
    { to: "/provenance", label: "Provenance", icon: Fingerprint, show: true },
  ];

  const orgNav = [
    { to: "/organization", label: "Teams", icon: Building2, show: canSeeOrgAdmin(role) },
    { to: "/members", label: "Members", icon: Users, show: canSeeOrgAdmin(role) },
    { to: "/organization/roles", label: "Roles & Permissions", icon: KeyRound, show: canSeeOrgAdmin(role) },
    { to: "/integrations", label: "Integrations", icon: Plug, show: canSeeOrgAdmin(role) },
    { to: "/activity", label: "Audit Log", icon: Activity, show: canSeeOrgAdmin(role) },
  ];

  const orgName = org?.name ?? "Aegis National CERT";

  const sidebar = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-lg leading-none">
            ◈
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em]">SENTINEL</p>
            <p className="text-[11px] text-slate-400">Content Intelligence</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {primary
            .filter((i) => i.show)
            .map((i) => (
              <NavLink key={i.to} to={i.to} className={navClass}>
                <i.icon className="h-4 w-4" />
                {i.label}
              </NavLink>
            ))}
        </div>
        {orgNav.some((i) => i.show) ? (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Organization
            </p>
            <div className="space-y-0.5">
              {orgNav
                .filter((i) => i.show)
                .map((i) => (
                  <NavLink key={i.to} to={i.to} className={navClass}>
                    <i.icon className="h-4 w-4" />
                    {i.label}
                  </NavLink>
                ))}
            </div>
          </div>
        ) : null}
        <NavLink to="/settings" className={navClass}>
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <UserAvatar initials={user.initials} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <div className="mt-2">
          <RoleBadge role={user.role} onDark />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <span className="text-[11px] text-slate-300">AI Engine</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Connected
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-3 w-full text-left text-[11px] text-slate-400 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-navy/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-72">{sidebar}</div>
        </div>
      ) : null}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-line p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-ink-muted">{orgName}</p>
              <p className="text-sm font-medium text-ink">Source → Transform → Review → Approve → Distribute</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative rounded-lg border border-line p-2 hover:bg-paper"
              onClick={() => setNotesOpen((v) => !v)}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
              ) : null}
            </button>
          </div>
        </header>
        {notesOpen ? (
          <div className="absolute right-4 top-16 z-40 w-[360px] rounded-xl border border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex gap-2">
                <button
                  className="text-xs text-accent"
                  onClick={async () => {
                    await notificationsService.markAllRead();
                    setNotes(await notificationsService.list());
                  }}
                >
                  Mark read
                </button>
                <button onClick={() => setNotesOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id}>
                  <button
                    className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-paper"
                    onClick={() => {
                      if (n.link) navigate(n.link);
                      setNotesOpen(false);
                    }}
                  >
                    <Link2 className="mt-0.5 h-4 w-4 text-ink-muted" />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        {n.title}
                        {!n.read ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{n.message}</span>
                    </span>
                  </button>
                </li>
              ))}
              {notes.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-ink-muted">No notifications</li>
              )}
            </ul>
          </div>
        ) : null}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

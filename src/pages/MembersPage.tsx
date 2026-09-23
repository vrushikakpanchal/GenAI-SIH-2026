import { RoleBadge } from "@/components/RoleBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, LoadingSkeleton } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useSession } from "@/context/SessionContext";
import { formatRelative } from "@/lib/utils";
import { usersService } from "@/services/users";
import { store } from "@/services/mockStore";
import type { Role, User } from "@/types";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";

export function MembersPage() {
  const { refresh, version } = useSession();
  const [users, setUsers] = useState<User[] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operator");
  const [teamId, setTeamId] = useState("t-ti");
  const [edit, setEdit] = useState<User | null>(null);

  useEffect(() => {
    void usersService.list().then(setUsers);
  }, [version]);

  if (!users) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="mt-1 text-sm text-ink-muted">Invite colleagues and assign teams. Invitations are mocked.</p>
        </div>
        <button className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white" onClick={() => setInviteOpen(true)}>
          Invite member
        </button>
      </div>
      {users.length === 0 ? (
        <EmptyState icon={Users} title="No members" description="Invite the first operator or reviewer." actionLabel="Invite member" onClick={() => setInviteOpen(true)} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper text-[11px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Team</th>
                <th className="px-4 py-2 font-semibold">Role</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Last active</th>
                <th className="px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar initials={u.initials} size="sm" />
                      {u.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">{store.teamById(u.teamId ?? "")?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={u.status === "active" ? "approved" : u.status === "invited" ? "processing" : "failed"} label={u.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{formatRelative(u.lastActive)}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-medium text-accent" onClick={() => setEdit(u)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inviteOpen ? (
        <ConfirmDialog
          title="Invite member"
          confirmLabel="Send invitation"
          onCancel={() => setInviteOpen(false)}
          onConfirm={async () => {
            if (!email.trim()) return;
            await usersService.invite(email, role, teamId);
            refresh();
            setInviteOpen(false);
            setEmail("");
          }}
        >
          <label className="block text-sm text-ink">
            Email
            <input className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="mt-3 block text-sm text-ink">
            Role
            <select className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="operator">Operator</option>
              <option value="reviewer">Team Lead / Reviewer</option>
              <option value="admin">Organization Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label className="mt-3 block text-sm text-ink">
            Team
            <select className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {store.teams().map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </ConfirmDialog>
      ) : null}

      {edit ? (
        <ConfirmDialog
          title={`Manage ${edit.name}`}
          confirmLabel="Save"
          onCancel={() => setEdit(null)}
          onConfirm={async () => {
            await usersService.update(edit.id, { role: edit.role, teamId: edit.teamId, status: edit.status });
            refresh();
            setEdit(null);
          }}
        >
          <label className="block text-sm text-ink">
            Role
            <select className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
              <option value="operator">Operator</option>
              <option value="reviewer">Team Lead / Reviewer</option>
              <option value="admin">Organization Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label className="mt-3 block text-sm text-ink">
            Team
            <select
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={edit.teamId ?? ""}
              onChange={(e) => setEdit({ ...edit, teamId: e.target.value })}
            >
              {store.teams().map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="mt-4 text-sm text-danger"
            onClick={() => setEdit({ ...edit, status: edit.status === "deactivated" ? "active" : "deactivated" })}
          >
            {edit.status === "deactivated" ? "Reactivate" : "Deactivate"}
          </button>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

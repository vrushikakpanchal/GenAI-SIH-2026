import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, LoadingSkeleton } from "@/components/EmptyState";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useSession } from "@/context/SessionContext";
import { formatRelative, ROLE_LABEL } from "@/lib/utils";
import { store } from "@/services/mockStore";
import { teamsService } from "@/services/teams";
import { usersService } from "@/services/users";
import type { Role, Team } from "@/types";
import { FolderKanban, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export function OrganizationPage() {
  const { org, version, refresh } = useSession();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    void teamsService.list().then(setTeams);
  }, [version]);

  if (!teams) return <LoadingSkeleton />;

  function teamLead(team: Team) {
    const lead = store.users().find((u) => team.memberIds.includes(u.id) && (u.role === "reviewer" || u.role === "admin"));
    return lead?.name ?? "—";
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Organization</p>
          <h1 className="text-xl font-semibold text-ink">{org?.name ?? "Organization"}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Teams, members, and operational structure.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded bg-accent px-3 py-2 text-sm font-medium text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Team
        </button>
      </header>

      {teams.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No teams" description="Create your first team." onClick={() => setCreateOpen(true)} actionLabel="Create team" />
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5">Team</th>
                <th className="px-4 py-2.5">Members</th>
                <th className="px-4 py-2.5">Lead</th>
                <th className="px-4 py-2.5">Active</th>
                <th className="px-4 py-2.5">Pending Reviews</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-ink-muted">{t.description}</p>
                  </td>
                  <td className="px-4 py-3">{t.memberIds.length}</td>
                  <td className="px-4 py-3">{teamLead(t)}</td>
                  <td className="px-4 py-3">{t.activeWork}</td>
                  <td className="px-4 py-3">{t.pendingReviews}</td>
                  <td className="px-4 py-3">
                    <Link to={`/organization/${t.id}`} className="text-sm font-medium text-accent hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen ? (
        <ConfirmDialog
          title="Create team"
          confirmLabel="Create"
          onCancel={() => setCreateOpen(false)}
          onConfirm={async () => {
            if (!name.trim()) return;
            await teamsService.create(name, desc);
            refresh();
            setCreateOpen(false);
            setName("");
            setDesc("");
          }}
        >
          <input className="w-full rounded border border-line px-3 py-2 text-sm" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="mt-2 w-full rounded border border-line px-3 py-2 text-sm" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

const PERMS = [
  { label: "View team work", roles: ["admin", "reviewer", "operator", "viewer"] },
  { label: "Create transformations", roles: ["admin", "reviewer", "operator"] },
  { label: "Edit outputs", roles: ["admin", "reviewer", "operator"] },
  { label: "Submit for review", roles: ["admin", "reviewer", "operator"] },
  { label: "Approve outputs", roles: ["admin", "reviewer"] },
  { label: "Publish externally", roles: ["admin", "reviewer"] },
  { label: "Manage integrations", roles: ["admin"] },
  { label: "Manage members", roles: ["admin"] },
];

export function TeamDetailPage() {
  const { teamId } = useParams();
  const { refresh, version } = useSession();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [roleUser, setRoleUser] = useState<{ id: string; role: Role } | null>(null);
  void version;
  const team = store.teams().find((t) => t.id === teamId);

  if (!team) {
    return <EmptyState icon={FolderKanban} title="Team not found" description="This team is no longer available." to="/organization" actionLabel="Back to teams" />;
  }

  const members = store.users().filter((u) => team.memberIds.includes(u.id));
  const available = store.users().filter((u) => !team.memberIds.includes(u.id));

  return (
    <div className="space-y-4">
      <header>
        <Link to="/organization" className="text-xs font-medium text-accent">
          ← Teams
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{team.name}</h1>
        <p className="text-sm text-ink-muted">{team.description}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">Team Members</h2>
            <button className="text-xs font-medium text-accent" type="button" onClick={() => setAddOpen(true)}>
              Add member
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Last Active</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar initials={m.initials} />
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-ink-muted">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <RoleBadge role={m.role} />
                      <p className="mt-0.5 text-[10px] text-ink-muted">{ROLE_LABEL[m.role]}</p>
                    </td>
                    <td className="px-4 py-2.5 capitalize">{m.status}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{formatRelative(m.lastActive)}</td>
                    <td className="px-4 py-2.5">
                      <button className="text-xs text-accent" onClick={() => setRoleUser({ id: m.id, role: m.role })}>
                        Change role
                      </button>
                      <button className="ml-2 text-xs text-danger" onClick={() => setRemoveId(m.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="border border-line bg-white">
          <h2 className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            Permissions
          </h2>
          <ul className="divide-y divide-line text-sm">
            {PERMS.map((p) => (
              <li key={p.label} className="flex items-start justify-between gap-2 px-3 py-2">
                <span>{p.label}</span>
                <span className="text-right text-[10px] text-ink-muted">{p.roles.join(", ")}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-3">
            <button className="text-xs text-danger" onClick={() => setConfirmDelete(true)}>
              Delete team
            </button>
          </div>
        </aside>
      </div>

      {addOpen ? (
        <ConfirmDialog
          title="Add member"
          confirmLabel="Add"
          onCancel={() => setAddOpen(false)}
          onConfirm={async () => {
            if (!addUserId) return;
            await teamsService.addMember(team.id, addUserId);
            refresh();
            setAddOpen(false);
            setAddUserId("");
          }}
        >
          <select className="w-full rounded border border-line px-3 py-2 text-sm" value={addUserId} onChange={(e) => setAddUserId(e.target.value)}>
            <option value="">Select member</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </ConfirmDialog>
      ) : null}

      {roleUser ? (
        <ConfirmDialog
          title="Change role"
          confirmLabel="Save"
          onCancel={() => setRoleUser(null)}
          onConfirm={async () => {
            await usersService.update(roleUser.id, { role: roleUser.role });
            refresh();
            setRoleUser(null);
          }}
        >
          <select
            className="w-full rounded border border-line px-3 py-2 text-sm"
            value={roleUser.role}
            onChange={(e) => setRoleUser({ ...roleUser, role: e.target.value as Role })}
          >
            {(["admin", "reviewer", "operator", "viewer"] as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </ConfirmDialog>
      ) : null}

      {removeId ? (
        <ConfirmDialog
          title="Remove member"
          confirmLabel="Remove"
          danger
          onCancel={() => setRemoveId(null)}
          onConfirm={async () => {
            await teamsService.removeMember(team.id, removeId);
            refresh();
            setRemoveId(null);
          }}
        >
          Remove this member from the team?
        </ConfirmDialog>
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title="Delete team"
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await teamsService.remove(team.id);
            refresh();
            navigate("/organization");
          }}
        >
          This will permanently remove the team. Members are not deleted.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

export function RolesPage() {
  return (
    <div className="space-y-4">
      <header>
        <Link to="/organization" className="text-xs font-medium text-accent">
          ← Organization
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Roles & Permissions</h1>
      </header>
      <div className="border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5">Permission</th>
              <th className="px-4 py-2.5">Organization Admin</th>
              <th className="px-4 py-2.5">Team Lead / Reviewer</th>
              <th className="px-4 py-2.5">Operator</th>
              <th className="px-4 py-2.5">Viewer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PERMS.map((p) => (
              <tr key={p.label}>
                <td className="px-4 py-2.5">{p.label}</td>
                {(["admin", "reviewer", "operator", "viewer"] as Role[]).map((r) => (
                  <td key={r} className="px-4 py-2.5 text-center">
                    {p.roles.includes(r) ? "✓" : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

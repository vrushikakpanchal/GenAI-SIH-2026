import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, LoadingSkeleton } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/context/SessionContext";
import { formatRelative } from "@/lib/utils";
import { integrationsService } from "@/services/integrations";
import type { Integration } from "@/types";
import { Globe, HardDrive, Plug, Share2 } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  linkedin: Share2,
  x: Share2,
  drive: HardDrive,
  cms: Globe,
};

export function IntegrationsPage() {
  const { version, refresh } = useSession();
  const [items, setItems] = useState<Integration[] | null>(null);
  const [connect, setConnect] = useState<Integration | null>(null);
  const [disconnect, setDisconnect] = useState<Integration | null>(null);

  useEffect(() => {
    void integrationsService.list().then(setItems);
  }, [version]);

  if (!items) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Distribution</p>
        <h1 className="text-xl font-semibold text-ink">Distribution & Integrations</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-ink-muted">
          Manage approved destinations for content distribution. All connections are mock — no real OAuth or publishing.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={Plug} title="No integrations" description="Connect a service to distribute approved content." />
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Account</th>
                <th className="px-4 py-2.5">Last Used</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((i) => {
                const Icon = ICONS[i.id] ?? Plug;
                return (
                  <tr key={i.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-ink-muted" />
                        <span className="font-medium">{i.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={i.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{i.account ?? "Not connected"}</td>
                    <td className="px-4 py-3 text-ink-muted">{i.lastUsed ? formatRelative(i.lastUsed) : "Never"}</td>
                    <td className="px-4 py-3">
                      {i.status === "connected" ? (
                        <div className="flex gap-2">
                          <button className="text-xs font-medium text-accent" onClick={() => setConnect(i)}>
                            Manage
                          </button>
                          <button className="text-xs text-danger" onClick={() => setDisconnect(i)}>
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button className="text-xs font-medium text-accent" onClick={() => setConnect(i)}>
                          Connect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {connect ? (
        <ConfirmDialog
          title={connect.status === "connected" ? `Manage ${connect.name}` : "Connection Required"}
          confirmLabel={connect.status === "connected" ? "Done" : "Connect Account"}
          cancelLabel={connect.status === "connected" ? "Cancel" : "Save as Draft"}
          onCancel={() => setConnect(null)}
          onConfirm={async () => {
            if (connect.status !== "connected") {
              await integrationsService.connect(connect.id);
              refresh();
            }
            setConnect(null);
          }}
        >
          {connect.status === "connected" ? (
            <p>Account: {connect.account}. OAuth management is simulated in this prototype.</p>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">This destination is not connected.</p>
              <p className="text-sm text-ink-muted">
                You will be redirected to authorize an organization account. No real OAuth occurs in this prototype.
              </p>
            </div>
          )}
        </ConfirmDialog>
      ) : null}

      {disconnect ? (
        <ConfirmDialog
          title={`Disconnect ${disconnect.name}`}
          confirmLabel="Disconnect"
          danger
          onCancel={() => setDisconnect(null)}
          onConfirm={async () => {
            await integrationsService.disconnect(disconnect.id);
            refresh();
            setDisconnect(null);
          }}
        >
          Approved content remains in SENTINEL. Publishing to this destination will be blocked until reconnected.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

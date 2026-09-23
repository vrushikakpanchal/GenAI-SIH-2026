import { useSession } from "@/context/SessionContext";
import { ROLE_LABEL } from "@/lib/utils";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function SettingsPage() {
  const { user, org } = useSession();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Organization and engine values are placeholders until FastAPI is connected.</p>
      </div>

      <Card title="Profile">
        <Row k="Name" v={user.name} />
        <Row k="Email" v={user.email} />
        <Row k="Role" v={ROLE_LABEL[user.role]} />
        <Row k="Title" v={user.title} />
      </Card>

      <Card title="Organization">
        <Row k="Name" v={org?.name ?? "—"} />
        <Row k="Domain" v={org?.domain ?? "—"} />
        {user.role === "admin" ? (
          <Link to="/organization" className="mt-3 inline-block text-sm font-medium text-accent">
            Manage teams and members
          </Link>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Organization administration is limited to admins.</p>
        )}
      </Card>

      <Card title="AI Engine">
        <Row k="Model" v="qwen2.5:14b (Kaggle T4)" />
        <Row k="Status" v="Connected via ngrok" />
        <Row k="Inference" v="Remote Ollama" />
        <Row k="Validation" v="Pydantic v2 + fact-lock" />
        <Row k="RAG" v="Disabled (coming soon)" />
        <Row k="Provenance" v="SHA-256 hash chain" />
      </Card>

      <Card title="Generation defaults">
        <Row k="Audience" v="Security Analysts" />
        <Row k="Tone" v="Professional" />
        <Row k="Language" v="English" />
        <Row k="Detail" v="Detailed" />
      </Card>

      <Card title="Integrations">
        <p className="text-sm text-ink-muted">Publishing destinations are managed separately from personal credentials.</p>
        {user.role === "admin" ? (
          <Link to="/integrations" className="mt-3 inline-block text-sm font-medium text-accent">
            Open integrations
          </Link>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Ask an administrator to connect LinkedIn, X, Drive, or CMS.</p>
        )}
      </Card>

      <Card title="Security">
        <Row k="Session" v="JWT (FastAPI)" />
        <Row k="SSO" v="Placeholder" />
        <p className="mt-3 text-sm text-ink-muted">External publishing always requires human approval first.</p>
      </Card>

      <Card title="Appearance">
        <Row k="Theme" v="Light intelligence" />
        <Row k="Density" v="Comfortable" />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
      <span className="text-ink-muted">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

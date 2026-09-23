import { DEMO_ACCOUNTS } from "@/data/seed";
import { useSession } from "@/context/SessionContext";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

export function LoginPage() {
  const { user, login, loading, error } = useSession();
  const [email, setEmail] = useState("ishita@aegis.gov.in");
  const [password, setPassword] = useState("demo");
  const [ssoOpen, setSsoOpen] = useState(false);

  if (user) {
    if (user.role === "reviewer") return <Navigate to="/review" replace />;
    if (user.role === "viewer") return <Navigate to="/workspace" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      // Navigation is handled by the Navigate block below after user state is set
    } catch {
      /* error is surfaced via session.error */
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between p-12">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full border border-white/10" />
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-xl">◈</div>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em]">SENTINEL</p>
              <p className="text-xs text-slate-400">Content Intelligence</p>
            </div>
          </div>
          <h1 className="mt-16 max-w-md text-4xl font-semibold leading-tight">
            Transform intelligence into communication-ready content.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
            A governed pipeline for cybersecurity advisories, executive briefings, and publication-ready outputs. AI
            drafts. Humans approve. Provenance records what happened.
          </p>
        </div>
        <ol className="relative z-10 grid grid-cols-2 gap-3 text-xs text-slate-300">
          {["Source", "Analyze", "Transform", "Review", "Approve", "Distribute", "Verify"].map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="font-mono text-[10px] text-slate-500">{String(i + 1).padStart(2, "0")}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-sm font-semibold tracking-[0.18em] text-navy lg:hidden">◈ SENTINEL</p>
          <h2 className="mt-4 text-2xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">Use your organization account. Authentication is mocked for this prototype.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-ink">
              Email
              <input
                className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Password
              <input
                className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-accent hover:underline">
              Forgot password?
            </Link>
            <button type="button" className="text-ink-muted hover:text-ink" onClick={() => setSsoOpen(true)}>
              Sign in with organization SSO
            </button>
          </div>
          {ssoOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6">
                <h3 className="text-lg font-semibold">Organization SSO</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  SSO is a placeholder in this prototype. Identity federation will be handled by the backend. Use a demo
                  account to continue.
                </p>
                <button
                  type="button"
                  className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white"
                  onClick={() => setSsoOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-8 rounded-xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Demo accounts</p>
            <p className="mt-1 text-xs text-ink-muted">Password for all accounts: demo</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    className="text-left text-ink hover:text-accent"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword("demo");
                    }}
                  >
                    {a.email} — {a.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold tracking-[0.18em] text-navy">◈ SENTINEL</p>
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  return (
    <AuthShell title="Reset password">
      <p className="mt-2 text-sm text-ink-muted">Enter your email. This prototype does not send messages.</p>
      {sent ? (
        <p className="mt-6 text-sm text-success">If the account exists, a reset link would be issued.</p>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <input className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" placeholder="Email" />
          <button className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white">Send reset link</button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-sm text-accent">
        Back to sign in
      </Link>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password">
      <form className="mt-6 space-y-3" onSubmit={(e) => e.preventDefault()}>
        <input className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" type="password" placeholder="New password" />
        <input className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" type="password" placeholder="Confirm password" />
        <button className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white">Update password</button>
      </form>
    </AuthShell>
  );
}

export function InvitePage() {
  const navigate = useNavigate();
  return (
    <AuthShell title="Accept invitation">
      <p className="mt-2 text-sm text-ink-muted">You have been invited to Aegis National CERT as an Operator.</p>
      <button
        className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white"
        onClick={() => navigate("/login")}
      >
        Continue to sign in
      </button>
    </AuthShell>
  );
}

export function OrgSelectPage() {
  const navigate = useNavigate();
  return (
    <AuthShell title="Select organization">
      <button
        className="mt-6 w-full rounded-xl border border-line p-4 text-left hover:border-accent"
        onClick={() => navigate("/dashboard")}
      >
        <p className="font-medium">Aegis National CERT</p>
        <p className="text-sm text-ink-muted">aegis.gov.in</p>
      </button>
    </AuthShell>
  );
}

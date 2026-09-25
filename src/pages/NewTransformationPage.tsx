import { ErrorBanner } from "@/components/EmptyState";
import { GovSecurityValidation } from "@/components/GovSecurityValidation";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowIndicator } from "@/components/WorkflowIndicator";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import { sourcesService, type LockedFactResponse } from "@/services/sources";
import { transformationsService } from "@/services/transformations";
import type { OutputType, SourceDocument, TransformationConfig } from "@/types";
import {
  FileUp,
  Loader2,
  Shield,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export function NewTransformationPage() {
  const { user, refresh } = useSession();
  const navigate = useNavigate();

  const [transformationId, setTransformationId] = useState<string | null>(null);
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [lockedFacts, setLockedFacts] = useState<LockedFactResponse | null>(null);
  const [sourceHash, setSourceHash] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [phase, setPhase] = useState<"intake" | "generating">("intake");
  const [genStage, setGenStage] = useState<string>("Initializing inference...");
  const [genError, setGenError] = useState<string | null>(null);

  const [selectedOutputs] = useState<OutputType[]>(["advisory"]);
  const [config, setConfig] = useState<Omit<TransformationConfig, "outputTypes">>({
    audience: "Security Operations",
    tone: "Formal",
    language: "English",
    detail: 80,
    objective: "Alert",
    style: "Technical",
  });

  const fullConfig: TransformationConfig = useMemo(
    () => ({ ...config, outputTypes: selectedOutputs }),
    [config, selectedOutputs]
  );

  // Real File Upload Handler
  async function handleFileUpload(file: File) {
    if (!user) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      // 1. Create transformation record in FastAPI
      const tr = await transformationsService.create(user, undefined, fullConfig);
      setTransformationId(tr.id);

      // 2. Upload and parse real file via FastAPI
      const srcDoc = await sourcesService.uploadFile(tr.id, file);
      setSourceHash(srcDoc.content_hash);

      // 3. Fetch real deterministic locked facts
      const facts = await sourcesService.getLockedFacts(tr.id);
      setLockedFacts(facts);

      // 4. Map to local SourceDocument for rendering
      const entities: any[] = [];
      (facts.cve_ids || []).forEach((c, idx) =>
        entities.push({ id: `cve-${idx}`, kind: "cve", label: "CVE", value: c, state: "validated" })
      );
      (facts.ips || []).forEach((ip, idx) =>
        entities.push({ id: `ip-${idx}`, kind: "ip", label: "IP", value: ip, state: "validated" })
      );
      (facts.hashes || []).forEach((h, idx) =>
        entities.push({ id: `h-${idx}`, kind: "hash", label: "Hash", value: h, state: "validated" })
      );
      (facts.candidate_products || []).forEach((p: any, idx) => {
        const name = typeof p === "string" ? p : p.name;
        entities.push({ id: `p-${idx}`, kind: "product", label: "Product", value: name, state: "detected" });
      });

      setSource({
        id: srcDoc.id,
        filename: srcDoc.filename,
        type: (srcDoc.file_type as any) || "TXT",
        sizeLabel: srcDoc.size_label,
        status: "parsed",
        title: srcDoc.filename,
        extractedText: srcDoc.raw_text_preview || "",
        entities,
        counts: {
          cves: facts.cve_ids?.length || 0,
          products: facts.candidate_products?.length || 0,
          ips: facts.ips?.length || 0,
          hashes: facts.hashes?.length || 0,
          severity: facts.severity || "UNKNOWN",
        },
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to process source file. Ensure format is PDF, DOCX, or TXT.");
    } finally {
      setIsUploading(false);
    }
  }

  // Real Paste Handler
  async function handlePasteSubmit() {
    if (!user || !pasteText.trim()) return;
    setUploadError(null);
    setIsUploading(true);
    setPasteOpen(false);
    try {
      const tr = await transformationsService.create(user, undefined, fullConfig);
      setTransformationId(tr.id);

      const srcDoc = await sourcesService.pasteText(
        tr.id,
        pasteText,
        "Pasted Threat Report",
        "pasted_threat_report.txt"
      );
      setSourceHash(srcDoc.content_hash);

      const facts = await sourcesService.getLockedFacts(tr.id);
      setLockedFacts(facts);

      const entities: any[] = [];
      (facts.cve_ids || []).forEach((c, idx) =>
        entities.push({ id: `cve-${idx}`, kind: "cve", label: "CVE", value: c, state: "validated" })
      );
      (facts.ips || []).forEach((ip, idx) =>
        entities.push({ id: `ip-${idx}`, kind: "ip", label: "IP", value: ip, state: "validated" })
      );
      (facts.hashes || []).forEach((h, idx) =>
        entities.push({ id: `h-${idx}`, kind: "hash", label: "Hash", value: h, state: "validated" })
      );
      (facts.candidate_products || []).forEach((p: any, idx) => {
        const name = typeof p === "string" ? p : p.name;
        entities.push({ id: `p-${idx}`, kind: "product", label: "Product", value: name, state: "detected" });
      });

      setSource({
        id: srcDoc.id,
        filename: "pasted_threat_report.txt",
        type: "Pasted text",
        sizeLabel: srcDoc.size_label,
        status: "parsed",
        title: "Pasted Threat Report",
        extractedText: srcDoc.raw_text_preview || "",
        entities,
        counts: {
          cves: facts.cve_ids?.length || 0,
          products: facts.candidate_products?.length || 0,
          ips: facts.ips?.length || 0,
          hashes: facts.hashes?.length || 0,
          severity: facts.severity || "UNKNOWN",
        },
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to process pasted content.");
    } finally {
      setIsUploading(false);
    }
  }

  // Real Generation Handler
  async function runGenerate() {
    if (!transformationId || !source) return;
    setGenError(null);
    setPhase("generating");
    setGenStage("Connecting to Ollama (gpt-oss:120b-cloud)...");

    try {
      setGenStage("Grounding prompt with verified technical facts & executing inference...");
      await transformationsService.generate(transformationId);
      
      setGenStage("Pydantic schema validation & fact-lock verification complete. Redirecting...");
      refresh();
      navigate(`/transformations/${transformationId}`);
    } catch (err: any) {
      setGenError(
        err.message ||
          "Generation failed. Check that Ollama engine is online and responding."
      );
      setPhase("intake");
    }
  }

  if (phase === "generating") {
    return (
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
        <WorkflowIndicator activeStep="Transform" completedThrough="Analyze" />
        <div className="mx-auto max-w-3xl space-y-6 p-6 py-16 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Generating Security Advisory</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Processing source intelligence through gpt-oss:120b-cloud via Ollama with zero-hallucination fact locks.
            </p>
          </div>

          <div className="mx-auto max-w-md rounded-xl border border-line bg-white p-5 text-left shadow-sm">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white text-xs">
                ●
              </span>
              <span className="font-medium text-ink">{genStage}</span>
            </div>
            <div className="mt-4 space-y-2 text-xs text-ink-muted">
              <p>• Model: <span className="font-mono text-ink">gpt-oss:120b-cloud</span></p>
              <p>• Architecture: Deterministic Extraction → Grounded Prompt → Pydantic Schema</p>
              <p>• Safety: Untrusted boundary delimiters active</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      <WorkflowIndicator activeStep="Source" />

      <div className="space-y-6 p-4 pb-28 md:p-6 lg:p-8">
        <header className="border-b border-line pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            National Cybersecurity Operations Platform
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">New Security Advisory Transformation</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Upload threat intelligence reports, advisories, or logs to generate authoritative, grounded security advisories.
          </p>
        </header>

        {uploadError && <ErrorBanner title="Source Processing Failed" message={uploadError} />}
        {genError && <ErrorBanner title="AI Advisory Generation Failed" message={genError} />}

        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          {/* LEFT: Source Intake & Extracted Facts */}
          <div className="space-y-5">
            <section className="border border-line bg-white shadow-sm">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">1. Source Document Ingest</h2>
                <p className="text-xs text-ink-muted">
                  Supports raw PDF (pypdf text extraction), DOCX, TXT, or direct text paste.
                </p>
              </div>

              {!source ? (
                <div
                  className="flex min-h-[220px] flex-col items-center justify-center border-b border-dashed border-line p-8 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.length) {
                      void handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <FileUp className="h-8 w-8 text-accent" />
                  <p className="mt-3 text-sm font-semibold text-ink">
                    {isUploading ? "Extracting & Locking Technical Facts..." : "Drop Threat Report Here"}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    PDF · DOCX · TXT (Up to 50 MB)
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <label
                      className={`cursor-pointer rounded bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent/90 ${
                        isUploading ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {isUploading ? "Processing..." : "Select File"}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                        disabled={isUploading}
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            void handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => setPasteOpen(true)}
                      className="rounded border border-line bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-slate-100"
                    >
                      Paste Text
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  <div className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
                    <div>
                      <span className="text-[11px] font-medium uppercase text-ink-muted">Document</span>
                      <p className="font-medium text-ink truncate">{source.filename}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium uppercase text-ink-muted">Format</span>
                      <p className="font-medium text-ink">{source.type}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium uppercase text-ink-muted">File Size</span>
                      <p className="font-medium text-ink">{source.sizeLabel}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium uppercase text-ink-muted">Status</span>
                      <div className="mt-0.5">
                        <StatusBadge value="approved" label="Parsed & Locked" />
                      </div>
                    </div>
                  </div>

                  {/* Real Deterministic Facts Locked */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                        Deterministic Technical Facts (Locked)
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSource(null);
                          setLockedFacts(null);
                          setTransformationId(null);
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        Change Source
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded border border-line bg-paper/50 p-3">
                        <span className="text-[11px] font-semibold uppercase text-ink-muted">
                          Identified CVE IDs
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {lockedFacts?.cve_ids && lockedFacts.cve_ids.length > 0 ? (
                            lockedFacts.cve_ids.map((c) => (
                              <span
                                key={c}
                                className="rounded bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold text-rose-700 border border-rose-200"
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-ink-muted italic">
                              No CVE IDs found in source document
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded border border-line bg-paper/50 p-3">
                        <span className="text-[11px] font-semibold uppercase text-ink-muted">
                          Severity & CVSS
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold ${
                              lockedFacts?.severity === "CRITICAL"
                                ? "bg-red-100 text-red-800"
                                : lockedFacts?.severity === "HIGH"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {lockedFacts?.severity || "UNKNOWN"}
                          </span>
                          {lockedFacts?.cvss_scores && lockedFacts.cvss_scores.length > 0 ? (
                            <span className="font-mono text-xs text-ink">
                              CVSS: {lockedFacts.cvss_scores.join(", ")}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">No CVSS in source</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Network & Hashes */}
                    <div className="mt-3 space-y-2">
                      {lockedFacts?.ips && lockedFacts.ips.length > 0 && (
                        <div>
                          <span className="text-[11px] font-medium uppercase text-ink-muted">
                            Network Indicators (IPs):
                          </span>
                          <p className="font-mono text-xs text-ink mt-0.5">
                            {lockedFacts.ips.join(", ")}
                          </p>
                        </div>
                      )}
                      {lockedFacts?.hashes && lockedFacts.hashes.length > 0 && (
                        <div>
                          <span className="text-[11px] font-medium uppercase text-ink-muted">
                            File Hashes (SHA-256 / MD5):
                          </span>
                          <p className="font-mono text-xs text-ink mt-0.5 truncate">
                            {lockedFacts.hashes.join(", ")}
                          </p>
                        </div>
                      )}
                      {lockedFacts?.candidate_products && lockedFacts.candidate_products.length > 0 && (
                        <div>
                          <span className="text-[11px] font-medium uppercase text-ink-muted">
                            Candidate Products:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lockedFacts.candidate_products.map((p: any, idx: number) => (
                              <span
                                key={idx}
                                className="rounded border border-line bg-white px-2 py-0.5 text-xs text-ink"
                              >
                                {typeof p === "string" ? p : p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Real Security & Governance Controls */}
            <GovSecurityValidation
              sourceHash={sourceHash || undefined}
              dlpFindingsCount={lockedFacts?.dlp_findings?.length || 0}
            />
          </div>

          {/* RIGHT: Configuration & Generation Options */}
          <div className="space-y-5">
            <section className="border border-line bg-white shadow-sm">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">2. Advisory Configuration</h2>
                <p className="text-xs text-ink-muted">Configure tone, audience, and tactical focus.</p>
              </div>

              <div className="divide-y divide-line px-4">
                <div className="py-3">
                  <label className="block text-xs font-semibold text-ink">Target Audience</label>
                  <select
                    className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent"
                    value={config.audience}
                    onChange={(e) => setConfig({ ...config, audience: e.target.value })}
                  >
                    <option>Security Operations</option>
                    <option>Incident Response Teams</option>
                    <option>Executive Leadership / CISO</option>
                    <option>System Administrators</option>
                    <option>Public / General Communication</option>
                  </select>
                </div>

                <div className="py-3">
                  <label className="block text-xs font-semibold text-ink">Tone</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Formal", "Technical", "Urgent", "Executive", "Concise"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setConfig({ ...config, tone: t })}
                        className={cn(
                          "rounded border px-3 py-1 text-xs font-medium transition",
                          config.tone === t
                            ? "border-accent bg-accent text-white"
                            : "border-line bg-white text-ink hover:border-slate-300"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="py-3">
                  <label className="block text-xs font-semibold text-ink">Technical Detail Level</label>
                  <div className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                    <span>Summary</span>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={config.detail}
                      onChange={(e) => setConfig({ ...config, detail: Number(e.target.value) })}
                      className="flex-1 accent-accent"
                    />
                    <span className="font-semibold text-ink">{config.detail}%</span>
                  </div>
                </div>

                <div className="py-3">
                  <label className="block text-xs font-semibold text-ink">Output Format</label>
                  <div className="mt-2 rounded border border-accent/40 bg-accent-soft/30 p-3 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Structured Security Advisory</p>
                      <p className="text-xs text-ink-muted">
                        Full enterprise document with metadata, CVSS, CVEs, affected versions, impact, IOCs, mitigations, and ReportLab PDF export.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Grounding Assurance */}
            <div className="rounded border border-indigo-200 bg-indigo-50/50 p-4 text-xs text-indigo-950">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Zero-Hallucination AI Grounding Active
              </div>
              <p className="mt-1.5 text-indigo-800 leading-relaxed">
                gpt-oss:120b-cloud runs in strict JSON-mode with prompt-injection defenses. All CVE IDs, CVSS scores, and indicators are strictly bounded by deterministic facts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-6 py-3">
          <div className="text-xs text-ink-muted">
            {source ? (
              <span className="font-medium text-ink">
                Ready: <span className="font-mono">{source.filename}</span> ({source.sizeLabel})
              </span>
            ) : (
              <span>Upload or paste a threat report to proceed</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              onClick={() => navigate("/workspace")}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!source || isUploading}
              onClick={() => void runGenerate()}
              className="inline-flex items-center gap-2 rounded bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              Generate Security Advisory
            </button>
          </div>
        </div>
      </div>

      {/* Paste Modal */}
      {pasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-line bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-bold text-ink">Paste Threat Intelligence Report</h2>
              <span className="text-xs text-ink-muted">Raw Text / Bulletin</span>
            </div>
            <textarea
              className="mt-4 h-56 w-full rounded border border-line p-3 font-mono text-xs leading-relaxed text-ink focus:border-accent"
              placeholder="Paste incident report, SOC analysis, threat bulletin, or vulnerability text here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-line px-4 py-2 text-sm font-medium text-ink"
                onClick={() => setPasteOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pasteText.trim() || isUploading}
                className="rounded bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void handlePasteSubmit()}
              >
                Ingest & Lock Facts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

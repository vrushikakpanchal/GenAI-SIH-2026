import { ErrorBanner, LoadingSkeleton } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowIndicator } from "@/components/WorkflowIndicator";
import { WorkspaceValidationPanel } from "@/components/WorkspaceValidationPanel";
import { useSession } from "@/context/SessionContext";
import { cn, formatRelative } from "@/lib/utils";
import {
  outputsService,
  type OutputVersionResponse,
} from "@/services/outputs";
import {
  reviewsService,
  type ReviewCommentResponse,
} from "@/services/reviews";
import { transformationsService } from "@/services/transformations";
import type { AdvisoryContent, Transformation } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  History,
  MessageSquare,
  Save,
  Send,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function TransformationWorkspacePage() {
  const { id } = useParams();
  const { user, refresh, version } = useSession();
  const navigate = useNavigate();

  const [item, setItem] = useState<Transformation | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryContent | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState<AdvisoryContent | null>(null);

  const [versions, setVersions] = useState<OutputVersionResponse[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);

  const [comments, setComments] = useState<ReviewCommentResponse[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");

  const [pdfLoading, setPdfLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Transformation & Outputs
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    transformationsService
      .get(id)
      .then(async (t) => {
        setItem(t);
        const adv = t.outputs.advisory ?? null;
        setAdvisory(adv);
        setEditBuffer(adv);
        setSelectedVersionNum(t.outputVersion ?? 1);

        if (t.outputId) {
          // Load versions & comments in parallel
          const [vList, cList] = await Promise.all([
            outputsService.listVersions(t.outputId).catch(() => []),
            reviewsService.listComments(t.outputId).catch(() => []),
          ]);
          setVersions(vList);
          setComments(cList);
        }
      })
      .catch((err) => {
        setStatusMsg({ text: `Failed to load advisory: ${err.message}`, type: "error" });
      })
      .finally(() => setLoading(false));
  }, [id, version]);

  if (!user) return null;
  if (loading) return <LoadingSkeleton rows={8} />;
  if (!item || !advisory) {
    return (
      <div className="p-8 text-center">
        <ErrorBanner
          title="Security Advisory Not Found"
          message="This transformation does not contain a generated advisory yet. Please generate from the New Transformation page."
        />
        <button
          onClick={() => navigate("/workspace")}
          className="mt-4 rounded bg-accent px-4 py-2 text-sm text-white"
        >
          Back to Workspace
        </button>
      </div>
    );
  }

  const outputId = item.outputId;
  const currentVersion = selectedVersionNum ?? item.outputVersion ?? 1;
  const isOperator = user.role === "operator" || user.role === "admin";
  const isReviewer = user.role === "reviewer" || user.role === "admin";

  // PDF Export
  async function handleDownloadPdf() {
    if (!outputId) return;
    setPdfLoading(true);
    setStatusMsg(null);
    try {
      const blob = await outputsService.downloadPdf(outputId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Advisory_${item?.code || "SEC"}_v${currentVersion}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setStatusMsg({ text: "Official PDF downloaded successfully.", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "PDF generation failed.", type: "error" });
    } finally {
      setPdfLoading(false);
    }
  }

  // Save New Version (Edit)
  async function handleSaveVersion() {
    if (!outputId || !editBuffer) return;
    setStatusMsg(null);
    try {
      const updated = await outputsService.update(
        outputId,
        editBuffer as unknown as Record<string, unknown>,
        `Operator updated advisory content (saved as v${(item?.outputVersion ?? 1) + 1})`
      );
      setEditing(false);
      refresh();
      setStatusMsg({
        text: `Advisory updated and saved as Version ${updated.version}. Cross-validation recomputed.`,
        type: "success",
      });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to save new version.", type: "error" });
    }
  }

  // Switch Historical Version
  async function handleSelectVersion(vNum: number) {
    if (!outputId) return;
    try {
      const ver = await outputsService.getVersion(outputId, vNum);
      setSelectedVersionNum(vNum);
      const c = ver.content as unknown as AdvisoryContent;
      setAdvisory(c);
      setEditBuffer(c);
      setEditing(false);
    } catch (err: any) {
      setStatusMsg({ text: `Could not load version ${vNum}`, type: "error" });
    }
  }

  // Submit for Review
  async function handleSubmitForReview() {
    if (!outputId) return;
    setStatusMsg(null);
    try {
      if (item?.status === "changes_requested") {
        await reviewsService.resubmit(outputId);
      } else {
        await reviewsService.submitForReview(outputId);
      }
      refresh();
      setStatusMsg({ text: "Security Advisory submitted for formal review.", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Submission failed.", type: "error" });
    }
  }

  // Approve
  async function handleApprove() {
    if (!outputId) return;
    setStatusMsg(null);
    try {
      await reviewsService.approve(outputId);
      refresh();
      setStatusMsg({ text: "Security Advisory signed-off and approved.", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Approval failed.", type: "error" });
    }
  }

  // Request Changes
  async function handleRequestChanges() {
    if (!outputId || !changeNotes.trim()) return;
    setStatusMsg(null);
    try {
      await reviewsService.requestChanges(outputId, changeNotes);
      setChangeModalOpen(false);
      setChangeNotes("");
      refresh();
      setStatusMsg({ text: "Changes requested. Operator has been notified.", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to request changes.", type: "error" });
    }
  }

  // Post Comment
  async function handleAddComment() {
    if (!outputId || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const c = await reviewsService.addComment(outputId, newComment.trim());
      setComments((prev) => [...prev, c]);
      setNewComment("");
    } catch (err: any) {
      setStatusMsg({ text: "Failed to post comment.", type: "error" });
    } finally {
      setIsSubmittingComment(false);
    }
  }

  // Copy Markdown
  function handleCopyMarkdown() {
    if (!item || !advisory) return;
    const md = `# ${advisory.title}
**Advisory ID**: ${item.code} | **Severity**: ${advisory.severity} | **CVSS**: ${advisory.cvss}
**CVE IDs**: ${advisory.cve || "None reported"}
**Affected Products**: ${advisory.affectedProduct} (${advisory.affectedVersions})

## Summary
${advisory.summary}

## Technical Details
${advisory.technicalDetails}

## Impact
${advisory.impact}

## Indicators of Compromise (IOCs)
${(advisory.indicators || []).map((i) => `- ${i}`).join("\n")}

## Mitigation & Recommendations
${advisory.mitigation}
${(advisory.recommendations || []).map((r) => `- ${r}`).join("\n")}

## References
${(advisory.references || []).map((ref) => `- ${ref}`).join("\n")}
`;
    void navigator.clipboard.writeText(md);
    setStatusMsg({ text: "Advisory copied to clipboard as Markdown.", type: "success" });
  }

  const sevColor = (s: string) => {
    const up = s.toUpperCase();
    if (up.includes("CRIT")) return "bg-red-600 text-white";
    if (up.includes("HIGH")) return "bg-orange-600 text-white";
    if (up.includes("MED")) return "bg-amber-500 text-white";
    return "bg-emerald-600 text-white";
  };

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      <WorkflowIndicator
        activeStep={item.status === "approved" ? "Approve" : item.status === "awaiting_review" ? "Review" : "Transform"}
        completedThrough={item.status === "approved" ? "Transform" : "Analyze"}
      />

      <div className="space-y-5 p-4 md:p-6 lg:p-8">
        {/* Workspace Action Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/workspace")}
              className="rounded p-1.5 text-ink-muted hover:bg-slate-100 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">{item.code}</span>
                <StatusBadge value={item.status} />
                <span className="rounded bg-paper px-2 py-0.5 text-xs font-mono font-medium text-ink">
                  Version {currentVersion}
                </span>
              </div>
              <h1 className="mt-0.5 text-xl font-bold text-ink">{advisory.title}</h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>

            <button
              type="button"
              disabled={pdfLoading}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-paper disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-accent" />
              {pdfLoading ? "Generating PDF..." : "Download Official PDF"}
            </button>

            {isOperator && !editing && (
              <button
                type="button"
                onClick={() => {
                  setEditBuffer(advisory);
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Advisory
              </button>
            )}

            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveVersion}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save as v{(item.outputVersion ?? 1) + 1}
                </button>
              </>
            )}

            {/* Review Workflow Controls */}
            {isOperator && (item.status === "draft" || item.status === "changes_requested") && !editing && (
              <button
                type="button"
                onClick={handleSubmitForReview}
                className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90"
              >
                <Send className="h-3.5 w-3.5" />
                {item.status === "changes_requested" ? "Resubmit for Review" : "Submit for Review"}
              </button>
            )}

            {isReviewer && item.status === "awaiting_review" && !editing && (
              <>
                <button
                  type="button"
                  onClick={() => setChangeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve Advisory
                </button>
              </>
            )}
          </div>
        </header>

        {statusMsg && (
          <div
            className={`rounded-lg p-3 text-xs font-medium ${
              statusMsg.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* 2-Column Professional Architecture */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT: Authoritative Security Advisory Document */}
          <main className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
            {/* CISA / CERT-In Masthead */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-800">
                    National Cybersecurity Advisory
                  </span>
                </div>
                <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs font-bold text-amber-900">
                  TLP:AMBER
                </span>
              </div>

              {editing ? (
                <input
                  className="mt-3 w-full rounded border border-line p-2 text-xl font-bold text-ink"
                  value={editBuffer?.title || ""}
                  onChange={(e) => setEditBuffer({ ...editBuffer!, title: e.target.value })}
                />
              ) : (
                <h1 className="mt-3 text-2xl font-extrabold text-ink">{advisory.title}</h1>
              )}

              {/* Metadata Bar */}
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-4 text-xs">
                <div>
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Advisory ID</span>
                  <p className="mt-0.5 font-mono font-bold text-slate-900">{item.code}</p>
                </div>
                <div>
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Severity</span>
                  <div className="mt-0.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${sevColor(advisory.severity)}`}>
                      {advisory.severity}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold uppercase tracking-wider text-slate-500">CVSS Base</span>
                  <p className="mt-0.5 font-mono font-bold text-slate-900">{advisory.cvss || "Unassigned"}</p>
                </div>
                <div>
                  <span className="font-semibold uppercase tracking-wider text-slate-500">CVE IDs</span>
                  <p className="mt-0.5 font-mono font-bold text-slate-900">
                    {advisory.cve || (advisory as any).cve_ids?.join(", ") || "None"}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Content Sections */}
            <div className="mt-6 space-y-6 text-sm text-slate-800 leading-relaxed">
              {/* Executive Summary */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Executive Summary
                </h2>
                {editing ? (
                  <textarea
                    className="mt-2 w-full rounded border border-line p-2 text-sm leading-relaxed"
                    rows={4}
                    value={editBuffer?.summary || ""}
                    onChange={(e) => setEditBuffer({ ...editBuffer!, summary: e.target.value })}
                  />
                ) : (
                  <p className="mt-2 font-medium">{advisory.summary}</p>
                )}
              </section>

              {/* Technical Description */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Technical Vulnerability Details & Analysis
                </h2>
                {editing ? (
                  <textarea
                    className="mt-2 w-full rounded border border-line p-2 text-sm leading-relaxed"
                    rows={5}
                    value={editBuffer?.technicalDetails || ""}
                    onChange={(e) => setEditBuffer({ ...editBuffer!, technicalDetails: e.target.value })}
                  />
                ) : (
                  <p className="mt-2 whitespace-pre-wrap">{advisory.technicalDetails}</p>
                )}
              </section>

              {/* Affected Systems Table */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Affected Products & Version Ranges
                </h2>
                <div className="mt-2 overflow-x-auto rounded border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-line font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="px-4 py-2">Affected Product</th>
                        <th className="px-4 py-2">Vulnerable Versions</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      <tr>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {editing ? (
                            <input
                              className="rounded border border-line px-2 py-1 text-xs w-full"
                              value={editBuffer?.affectedProduct || ""}
                              onChange={(e) => setEditBuffer({ ...editBuffer!, affectedProduct: e.target.value })}
                            />
                          ) : (
                            advisory.affectedProduct || "Not specified in generated advisory"
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono">
                          {editing ? (
                            <input
                              className="rounded border border-line px-2 py-1 text-xs w-full"
                              value={editBuffer?.affectedVersions || ""}
                              onChange={(e) => setEditBuffer({ ...editBuffer!, affectedVersions: e.target.value })}
                            />
                          ) : (
                            advisory.affectedVersions || "Not specified in generated advisory"
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            Vulnerable
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Threat Impact */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  4. Potential Operational Impact
                </h2>
                {editing ? (
                  <textarea
                    className="mt-2 w-full rounded border border-line p-2 text-sm leading-relaxed"
                    rows={3}
                    value={editBuffer?.impact || ""}
                    onChange={(e) => setEditBuffer({ ...editBuffer!, impact: e.target.value })}
                  />
                ) : (
                  <p className="mt-2">{advisory.impact}</p>
                )}
              </section>

              {/* Indicators of Compromise (IOCs) */}
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  5. Indicators of Compromise (IOCs)
                </h2>
                {advisory.indicators && advisory.indicators.length > 0 ? (
                  <div className="mt-2 rounded border border-line bg-slate-50 p-3 font-mono text-xs">
                    <ul className="space-y-1">
                      {advisory.indicators.map((ioc, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-slate-400">#</span>
                          <span className="text-slate-900">{ioc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 italic">No network or file indicators identified in source report.</p>
                )}
              </section>

              {/* Mitigations & Actions */}
              <section className="rounded-lg border-2 border-emerald-500/30 bg-emerald-50/40 p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  6. Mitigations & Remediation Steps
                </h2>
                {editing ? (
                  <textarea
                    className="mt-2 w-full rounded border border-emerald-300 bg-white p-2 text-sm leading-relaxed"
                    rows={4}
                    value={editBuffer?.mitigation || ""}
                    onChange={(e) => setEditBuffer({ ...editBuffer!, mitigation: e.target.value })}
                  />
                ) : (
                  <p className="mt-2 text-emerald-950 leading-relaxed">{advisory.mitigation}</p>
                )}

                {advisory.recommendations && advisory.recommendations.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-xs font-semibold uppercase text-emerald-900">
                      Tactical Recommendations:
                    </h3>
                    <ul className="mt-1.5 list-disc pl-5 space-y-1 text-xs text-emerald-900">
                      {advisory.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* References & Cryptographic Lineage */}
              <section className="border-t border-line pt-4 text-xs text-slate-600">
                <h2 className="font-bold uppercase tracking-wider text-slate-500">
                  7. Document Lineage & References
                </h2>
                <div className="mt-2 space-y-1">
                  {(advisory.references || []).map((ref, idx) => (
                    <p key={idx} className="font-mono text-[11px] text-accent truncate">
                      • {ref}
                    </p>
                  ))}
                  <p className="pt-2 text-[11px] text-slate-400">
                    Source Document: {item.source.filename} ({item.source.sizeLabel})
                  </p>
                </div>
              </section>
            </div>
          </main>

          {/* RIGHT: Operational Validation, Review & Versions */}
          <aside className="space-y-5">
            {/* Real Grounded Fact Validation */}
            <WorkspaceValidationPanel
              approved={item.status === "approved"}
              validationStatus={item.validationStatus}
              validationDetails={item.validationDetails}
              lockedFacts={item.lockedFacts}
            />

            {/* Version History & Switching */}
            <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-line pb-2.5">
                <History className="h-4 w-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                  Version History
                </h3>
              </div>

              <div className="mt-3 space-y-2">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVersion(v.version_num)}
                    className={cn(
                      "w-full rounded-lg border p-2.5 text-left text-xs transition",
                      currentVersion === v.version_num
                        ? "border-accent bg-accent-soft/40 shadow-sm"
                        : "border-line bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">Version {v.version_num}</span>
                      <span className="text-[10px] text-ink-muted">{formatRelative(v.created_at)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">{v.changelog}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      SHA: {v.content_hash ? v.content_hash.slice(0, 12) : "—"}…
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Review Discussion & Sign-off */}
            <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-line pb-2.5">
                <MessageSquare className="h-4 w-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                  Review Thread ({comments.length})
                </h3>
              </div>

              <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
                {comments.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No review notes recorded yet.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="rounded bg-slate-50 p-2.5 border border-line">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{c.author?.name || "Reviewer"}</span>
                        <span className="text-[10px] text-ink-muted">{formatRelative(c.created_at)}</span>
                      </div>
                      <p className="mt-1 text-slate-700 leading-relaxed">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <div className="mt-3 pt-2 border-t border-line flex gap-1.5">
                <input
                  className="flex-1 rounded border border-line px-2.5 py-1 text-xs text-ink focus:border-accent"
                  placeholder="Add note or instruction..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddComment();
                  }}
                />
                <button
                  type="button"
                  disabled={!newComment.trim() || isSubmittingComment}
                  onClick={handleAddComment}
                  className="rounded bg-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Post
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Request Changes Modal */}
      {changeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-ink">Request Advisory Revisions</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Provide specific operational instructions for the Operator to revise.
            </p>
            <textarea
              className="mt-3 h-32 w-full rounded border border-line p-3 text-xs focus:border-rose-500 text-ink"
              placeholder="e.g. Please verify affected version range against the patch notes..."
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-line px-3 py-1.5 text-xs font-medium"
                onClick={() => setChangeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!changeNotes.trim()}
                className="rounded bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                onClick={handleRequestChanges}
              >
                Submit Change Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

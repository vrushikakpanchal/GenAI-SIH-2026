const STEPS = ["Source", "Analyze", "Transform", "Review", "Approve", "Distribute", "Verify"];

export function PipelineStrip() {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink"
        >
          <span className="font-mono text-[10px] text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

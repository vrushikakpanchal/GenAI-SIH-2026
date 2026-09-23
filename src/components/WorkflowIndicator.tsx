import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export const WORKFLOW_STEPS = [
  "Source",
  "Analyze",
  "Transform",
  "Review",
  "Approve",
  "Distribute",
  "Verify",
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

export function WorkflowIndicator({
  activeStep = "Source",
  completedThrough,
}: {
  activeStep?: WorkflowStep;
  completedThrough?: WorkflowStep;
}) {
  const activeIdx = WORKFLOW_STEPS.indexOf(activeStep);
  const doneIdx = completedThrough ? WORKFLOW_STEPS.indexOf(completedThrough) : -1;

  return (
    <nav aria-label="Transformation workflow" className="border-b border-line bg-white">
      <ol className="flex flex-wrap items-center gap-1 px-1 py-2 sm:gap-0 sm:px-0">
        {WORKFLOW_STEPS.map((step, i) => {
          const done = i <= doneIdx;
          const active = i === activeIdx;
          return (
            <li key={step} className="flex items-center">
              <span
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide sm:px-3 sm:text-xs",
                  done && "text-success",
                  active && !done && "border-b-2 border-accent text-accent",
                  !done && !active && "text-ink-muted",
                )}
              >
                <span className="font-mono text-[10px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </span>
              {i < WORKFLOW_STEPS.length - 1 ? (
                <ChevronRight className="hidden h-3.5 w-3.5 text-ink-muted/40 sm:block" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

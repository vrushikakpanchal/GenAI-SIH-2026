import { cn } from "@/lib/utils";

export function UserAvatar({
  initials,
  size = "md",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white",
        size === "sm" && "h-7 w-7",
        size === "md" && "h-9 w-9 text-xs",
        size === "lg" && "h-11 w-11 text-sm",
      )}
    >
      {initials}
    </div>
  );
}

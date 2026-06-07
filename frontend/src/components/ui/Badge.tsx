import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "healthy" | "warning" | "critical" | "offline" | "activity" | "default";
  className?: string;
  dot?: boolean;
};

const variants = {
  healthy: "bg-status-healthy/15 text-status-healthy border-status-healthy/25",
  warning: "bg-status-warning/15 text-status-warning border-status-warning/25",
  critical: "bg-status-critical/15 text-status-critical border-status-critical/25",
  offline: "bg-status-offline/15 text-status-offline border-status-offline/25",
  activity: "bg-status-activity/15 text-status-activity border-status-activity/25",
  default: "bg-surface-overlay text-slate-300 border-edge"
};

export function Badge({ children, variant = "default", className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-status-healthy": variant === "healthy",
            "bg-status-warning": variant === "warning",
            "bg-status-critical animate-pulse-soft": variant === "critical",
            "bg-status-offline": variant === "offline",
            "bg-status-activity": variant === "activity",
            "bg-slate-400": variant === "default"
          })}
        />
      )}
      {children}
    </span>
  );
}

export function statusToBadge(status: string): BadgeProps["variant"] {
  switch (status) {
    case "UP":
      return "healthy";
    case "DOWN":
      return "critical";
    case "UNKNOWN":
      return "offline";
    default:
      return "default";
  }
}

/** UP + HTTP 4xx → warning (degraded but not down). */
export function healthBadgeVariant(
  status: string,
  statusCode?: number | null
): BadgeProps["variant"] {
  if (status === "UP" && statusCode != null && statusCode >= 400 && statusCode < 500) {
    return "warning";
  }
  return statusToBadge(status);
}

export function healthBadgeLabel(status: string, statusCode?: number | null): string {
  if (statusCode != null && statusCode > 0) {
    return `${status} · ${statusCode}`;
  }
  return status;
}


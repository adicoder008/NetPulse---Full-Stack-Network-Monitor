import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  status?: "healthy" | "warning" | "critical" | "offline" | "activity" | "metric";
  live?: boolean;
};

const statusColors = {
  healthy: "text-status-healthy",
  warning: "text-status-warning",
  critical: "text-status-critical",
  offline: "text-status-offline",
  activity: "text-status-activity",
  metric: "text-status-metric"
};

export function KpiCard({ label, value, subtext, status = "activity", live }: KpiCardProps) {
  return (
    <motion.div
      layout
      className="panel p-4 relative overflow-hidden"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        {live && (
          <span className="flex items-center gap-1 text-2xs text-status-healthy">
            <span className="h-1.5 w-1.5 rounded-full bg-status-healthy animate-pulse-soft" />
            LIVE
          </span>
        )}
      </div>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        className={cn("text-2xl font-semibold tabular-nums tracking-tight", statusColors[status])}
      >
        {value}
      </motion.div>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </motion.div>
  );
}

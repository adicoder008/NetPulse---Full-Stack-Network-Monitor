import { Activity } from "lucide-react";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-status-activity/30 bg-surface-overlay">
        <Activity className="h-4 w-4 text-status-activity" strokeWidth={2.5} />
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-healthy border-2 border-surface-raised" />
      </div>
      {!compact && (
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-100">NetPulse</div>
          <div className="text-2xs text-slate-500 leading-none">Network Monitoring</div>
        </div>
      )}
    </div>
  );
}

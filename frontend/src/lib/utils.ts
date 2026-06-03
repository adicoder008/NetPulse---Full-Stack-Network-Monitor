import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLatency(ms: number | undefined | null): string {
  if (ms == null) return "—";
  return `${Math.round(ms)} ms`;
}

export function formatUptime(pct: number | undefined): string {
  if (pct == null) return "—";
  return `${pct.toFixed(1)}%`;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case "UP":
      return "text-status-healthy";
    case "DOWN":
      return "text-status-critical";
    case "UNKNOWN":
      return "text-status-offline";
    default:
      return "text-slate-400";
  }
}

export function statusBg(status: string): string {
  switch (status) {
    case "UP":
      return "bg-status-healthy/15 text-status-healthy border-status-healthy/30";
    case "DOWN":
      return "bg-status-critical/15 text-status-critical border-status-critical/30";
    case "UNKNOWN":
      return "bg-status-offline/15 text-status-offline border-status-offline/30";
    default:
      return "bg-slate-800 text-slate-400 border-edge";
  }
}
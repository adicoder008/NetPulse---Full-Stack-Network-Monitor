import { ServiceStatus } from "@prisma/client";

/** HTTP health: UP when status code is 1–499, DOWN for 5xx or unreachable (0). */
export function isHttpUp(statusCode: number): boolean {
  return statusCode > 0 && statusCode < 500;
}

export function deriveCheckStatus(statusCode: number): "UP" | "DOWN" {
  return isHttpUp(statusCode) ? "UP" : "DOWN";
}

export function toServiceStatus(statusCode: number): ServiceStatus {
  return isHttpUp(statusCode) ? ServiceStatus.UP : ServiceStatus.DOWN;
}

export function formatCheckMessage(statusCode: number, region: string, latencyMs: number): string {
  if (isHttpUp(statusCode)) {
    const note = statusCode >= 400 ? " (degraded HTTP)" : "";
    return `Health check passed — HTTP ${statusCode}${note} (${region}, ${latencyMs}ms)`;
  }
  if (statusCode === 0) {
    return `Health check failed — unreachable (${region})`;
  }
  return `Health check failed — HTTP ${statusCode} (${region})`;
}

export type CheckStatus = "UP" | "DOWN";

export type HealthCheckCompletedEvent = {
  eventType: "health.check.completed.v1";
  eventId: string;
  serviceId: string;
  url: string;
  status: CheckStatus;
  statusCode: number;
  latencyMs: number;
  checkedAt: string;
  attempt: number;
  region?: string;
  errorMessage?: string;
};

export type ServiceStatus = "UP" | "DOWN" | "UNKNOWN";
export type Environment = "PRODUCTION" | "STAGING" | "DEVELOPMENT";

export type Service = {
  id: string;
  name: string;
  url: string;
  intervalSec: number;
  tags: string[];
  environment: Environment;
  lastKnownStatus: ServiceStatus;
  uptimePercent?: number;
  latest?: {
    latencyMs: number;
    checkedAt: string;
    status: string;
    statusCode?: number | null;
    region?: string;
  } | null;
};

export type Incident = {
  id: string;
  serviceId: string;
  status: "OPEN" | "RESOLVED";
  startedAt: string;
  resolvedAt?: string | null;
  summary: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  service?: { id: string; name: string; environment?: Environment } | null;
};

export type DashboardMetrics = {
  totalServices: number;
  healthyServices: number;
  activeIncidents: number;
  unacknowledgedIncidents: number;
  averageLatencyMs: number;
  packetLossPercent: number;
  probesPerMinute: number;
  servicesByStatus: Record<string, number>;
};

export type HealthScore = {
  score: number;
  uptimePercent: number;
  lastKnownStatus: ServiceStatus;
};

export type TimelineEvent = {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
  service?: { id: string; name: string } | null;
};

export type HistoryPoint = {
  bucket: string;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  samples?: number;
};

export type ProbeHistoryPoint = {
  bucket: string;
  packetLossPercent: number;
  probesPerMinute: number;
  totalProbes: number;
  failedProbes: number;
};

export type RawMetric = {
  id: string;
  status: ServiceStatus;
  statusCode?: number | null;
  latencyMs: number;
  region: string;
  checkedAt: string;
};

export type AlertChannel = {
  id: string;
  name: string;
  type: "DISCORD" | "WEBHOOK";
  webhookUrl: string;
  isEnabled: boolean;
  createdAt: string;
};

export type AlertFeedItem = {
  id: string;
  source: "incident" | "timeline";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  serviceId?: string;
  serviceName?: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgeable: boolean;
};

export type WsEvent =
  | { type: "service.status.updated"; payload: { serviceId: string; status: ServiceStatus; latencyMs: number } }
  | { type: "incident.opened"; payload: { incidentId: string; serviceId: string } }
  | { type: "incident.resolved"; payload: { incidentId: string; serviceId: string } };

export type AlertSeverity = "critical" | "warning" | "info";

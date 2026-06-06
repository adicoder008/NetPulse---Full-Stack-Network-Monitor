import type {
  AlertChannel,
  AlertFeedItem,
  DashboardMetrics,
  HealthScore,
  HistoryPoint,
  Incident,
  ProbeHistoryPoint,
  RawMetric,
  Service,
  TimelineEvent
} from "@/types";
import { buildFilterParams, type AppFilters } from "@/lib/filters";

export const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";
export const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws";

type FilterOpts = Partial<AppFilters> & { tags?: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, init);
  if (!res.ok) {
    let message = `API error ${res.status}: ${path}`;
    let code = "REQUEST_FAILED";
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.message) message = body.error.message;
      if (body.error?.code) code = body.error.code;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, code, message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getSummary: (filters: FilterOpts = {}) =>
    request<{ services: Service[] }>(`/dashboard/summary${buildFilterParams(filters)}`),

  getDashboardMetrics: (filters: FilterOpts = {}) =>
    request<{ metrics: DashboardMetrics }>(`/dashboard/metrics${buildFilterParams(filters)}`),

  getIncidents: (
    status: "OPEN" | "RESOLVED" = "OPEN",
    opts: FilterOpts & { serviceId?: string; acknowledged?: boolean } = {}
  ) => {
    const params = new URLSearchParams({ status });
    if (opts.serviceId) params.set("serviceId", opts.serviceId);
    if (opts.environment) params.set("environment", opts.environment.toUpperCase());
    if (opts.search?.trim()) params.set("search", opts.search.trim());
    if (opts.acknowledged === false) params.set("acknowledged", "false");
    if (opts.acknowledged === true) params.set("acknowledged", "true");
    return request<{ incidents: Incident[] }>(`/incidents?${params}`);
  },

  acknowledgeIncident: (id: string, acknowledgedBy = "ops-engineer") =>
    request<{ incident: Incident }>(`/incidents/${id}/acknowledge`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledgedBy })
    }),

  getAlertsFeed: (
    opts: FilterOpts & {
      severity?: string;
      acknowledged?: "true" | "false";
      limit?: number;
    } = {}
  ) => {
    const params = new URLSearchParams();
    if (opts.environment) params.set("environment", opts.environment.toUpperCase());
    if (opts.search?.trim()) params.set("search", opts.search.trim());
    if (opts.severity && opts.severity !== "all") params.set("severity", opts.severity);
    if (opts.acknowledged) params.set("acknowledged", opts.acknowledged);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<{ alerts: AlertFeedItem[] }>(`/alerts/feed${qs ? `?${qs}` : ""}`);
  },

  getTimeline: (opts: FilterOpts & { serviceId?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.serviceId) params.set("serviceId", opts.serviceId);
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.environment) params.set("environment", opts.environment.toUpperCase());
    if (opts.search?.trim()) params.set("search", opts.search.trim());
    const qs = params.toString();

    const path = opts.serviceId
      ? `/services/${opts.serviceId}/timeline${opts.limit ? `?limit=${opts.limit}` : ""}`
      : `/timeline${qs ? `?${qs}` : ""}`;
    return request<{ events: TimelineEvent[] }>(path);
  },

  getHealth: (id: string) => request<{ health: HealthScore }>(`/services/${id}/health`),

  getMetricsHistory: (serviceId: string, range: string, region?: string) => {
    const params = new URLSearchParams({ range });
    if (region) params.set("region", region);
    return request<{ history: { points: HistoryPoint[] } }>(
      `/services/${serviceId}/metrics/history?${params}`
    );
  },

  getProbeHistory: (serviceId: string, range: string, region?: string) => {
    const params = new URLSearchParams({ range });
    if (region) params.set("region", region);
    return request<{ probes: { points: ProbeHistoryPoint[] } }>(
      `/services/${serviceId}/metrics/probes?${params}`
    );
  },

  getRegions: (serviceId: string) =>
    request<{ regions: string[] }>(`/services/${serviceId}/regions`),

  getRawMetrics: (serviceId: string, limit = 50, region?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (region) params.set("region", region);
    return request<{ metrics: RawMetric[] }>(`/services/${serviceId}/metrics?${params}`);
  },

  getAlertChannels: () => request<{ channels: AlertChannel[] }>("/alerts/channels"),

  createService: (body: {
    name: string;
    url: string;
    intervalSec: number;
    tags?: string[];
    environment?: string;
  }) =>
    request<{ service: Service }>("/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),

  disableService: (id: string) => request(`/services/${id}`, { method: "DELETE" }),

  createAlertChannel: (body: { name: string; webhookUrl: string; type: "DISCORD" | "WEBHOOK" }) =>
    request("/alerts/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),

  toggleAlertChannel: (id: string, isEnabled: boolean) =>
    request(`/alerts/channels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled })
    }),

  deleteAlertChannel: (id: string) => request(`/alerts/channels/${id}`, { method: "DELETE" })
};

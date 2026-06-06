import { QueryClient } from "@tanstack/react-query";
import type { AppFilters } from "@/lib/filters";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
      // No global refetchInterval — WebSocket + manual refresh drive updates
    }
  }
});

export const queryKeys = {
  summary: (filters: Partial<AppFilters> & { tags?: string } = {}) =>
    ["summary", filters] as const,
  metrics: (filters: Partial<AppFilters> = {}) => ["dashboard-metrics", filters] as const,
  incidents: (status: string, filters: Partial<AppFilters> & { serviceId?: string } = {}) =>
    ["incidents", status, filters] as const,
  timeline: (filters: Partial<AppFilters> & { serviceId?: string; limit?: number } = {}) =>
    ["timeline", filters] as const,
  history: (serviceId: string, range: string, region?: string) =>
    ["history", serviceId, range, region] as const,
  probes: (serviceId: string, range: string, region?: string) =>
    ["probes", serviceId, range, region] as const,
  regions: (serviceId: string) => ["regions", serviceId] as const,
  rawMetrics: (serviceId: string, region?: string) => ["raw-metrics", serviceId, region] as const,
  alertChannels: ["alert-channels"] as const,
  alertsFeed: (filters: Record<string, unknown> = {}) => ["alerts-feed", filters] as const,
  health: (id: string) => ["health", id] as const
};

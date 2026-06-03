export type Environment = "production" | "staging" | "development";

export type AppFilters = {
  environment: Environment;
  search: string;
};

export function environmentToApi(env: Environment): string {
  return env.toUpperCase();
}

export function buildFilterParams(filters: Partial<AppFilters> & { tags?: string }) {
  const params = new URLSearchParams();
  if (filters.environment) params.set("environment", environmentToApi(filters.environment));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.tags?.trim()) params.set("tags", filters.tags.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export type WsConnectionStatus = "connecting" | "connected" | "disconnected";

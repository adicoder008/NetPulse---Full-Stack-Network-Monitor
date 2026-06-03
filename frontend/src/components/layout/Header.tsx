import { Link } from "react-router-dom";
import { Bell, ChevronDown, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { useAppContext } from "@/context/AppContext";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { AppFilters } from "@/lib/filters";

export function Header() {
  const { filters, setEnvironment, setSearch, wsStatus } = useAppContext();

  const { data: metricsData } = useQuery({
    queryKey: queryKeys.metrics(filters),
    queryFn: () => api.getDashboardMetrics(filters)
  });

  const unacknowledged = metricsData?.metrics.unacknowledgedIncidents ?? 0;

  const wsBadge =
    wsStatus === "connected"
      ? { variant: "healthy" as const, label: "Live" }
      : wsStatus === "connecting"
        ? { variant: "warning" as const, label: "Connecting" }
        : { variant: "critical" as const, label: "Disconnected" };

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-edge bg-surface-raised px-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Environment</span>
        <Select
          value={filters.environment}
          onChange={(e) => setEnvironment(e.target.value as AppFilters["environment"])}
          className="w-36 text-xs"
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </Select>
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Search services by name, URL, or tag..."
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-xs h-8"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <Link
          to="/alerts"
          className="relative rounded-md p-2 text-slate-400 hover:bg-surface-overlay hover:text-slate-200 transition-colors"
          title="Open alerts center"
        >
          <Bell className="h-4 w-4" />
          {unacknowledged > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-2xs font-medium text-white">
              {unacknowledged}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 rounded-md border border-edge bg-surface px-2 py-1">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-surface-overlay">
            <User className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-medium text-slate-200">Ops Engineer</div>
            <div className="text-2xs text-slate-500">Monitor role</div>
          </div>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </div>

        <Badge variant={wsBadge.variant} dot>
          {wsBadge.label}
        </Badge>
      </div>
    </header>
  );
}

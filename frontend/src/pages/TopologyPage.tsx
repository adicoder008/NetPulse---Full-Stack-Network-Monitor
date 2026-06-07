import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { useAppFilters } from "@/context/AppContext";
import { CardHeader } from "@/components/ui/Card";
import { NetworkTopology } from "@/components/topology/NetworkTopology";
import { Badge, healthBadgeLabel, healthBadgeVariant } from "@/components/ui/Badge";
import { formatLatency, formatHttpStatus } from "@/lib/utils";

export function TopologyPage() {
  const filters = useAppFilters();

  const { data } = useQuery({
    queryKey: queryKeys.summary(filters),
    queryFn: () => api.getSummary(filters)
  });

  const services = data?.services ?? [];
  const upCount = services.filter((s) => s.lastKnownStatus === "UP").length;
  const downCount = services.filter((s) => s.lastKnownStatus === "DOWN").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Network Topology</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {filters.environment} · {services.length} services · {upCount} healthy · {downCount} degraded
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="healthy" dot>Healthy connection</Badge>
        <Badge variant="critical" dot>Failed connection</Badge>
        <Badge variant="offline" dot>Unknown state</Badge>
        <Badge variant="activity">Animated = active traffic</Badge>
      </div>

      <NetworkTopology services={services} className="h-[calc(100vh-220px)] min-h-[480px]" />

      <div className="panel">
        <div className="panel-header">
          <CardHeader title="Node Registry" subtitle="Monitored endpoints in selected environment" className="mb-0" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-4">
          {services.map((s) => (
            <div key={s.id} className="rounded border border-edge-subtle bg-surface p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-200 truncate">{s.name}</span>
                <Badge variant={healthBadgeVariant(s.lastKnownStatus, s.latest?.statusCode)}>
                  {healthBadgeLabel(s.lastKnownStatus, s.latest?.statusCode)}
                </Badge>
              </div>
              <div className="text-2xs text-slate-500 truncate">{s.url}</div>
              <div className="text-xs text-slate-400 mt-2 tabular-nums">
                {formatLatency(s.latest?.latencyMs)}
                {s.latest?.region ? ` · ${s.latest.region}` : ""}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-slate-500 col-span-full">No services match current filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}

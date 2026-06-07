import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { useAppFilters } from "@/context/AppContext";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, healthBadgeLabel, healthBadgeVariant } from "@/components/ui/Badge";
import { LatencyChart, StatusBarChart } from "@/components/charts/MetricCharts";
import { NetworkTopology } from "@/components/topology/NetworkTopology";
import { formatLatency, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function DashboardPage() {
  const filters = useAppFilters();

  const { data: metricsData } = useQuery({
    queryKey: queryKeys.metrics(filters),
    queryFn: () => api.getDashboardMetrics(filters)
  });

  const { data: summaryData } = useQuery({
    queryKey: queryKeys.summary(filters),
    queryFn: () => api.getSummary(filters)
  });

  const { data: incidentsData } = useQuery({
    queryKey: queryKeys.incidents("OPEN", filters),
    queryFn: () => api.getIncidents("OPEN", filters)
  });

  const { data: timelineData } = useQuery({
    queryKey: queryKeys.timeline({ ...filters, limit: 8 }),
    queryFn: () => api.getTimeline({ ...filters, limit: 8 })
  });

  const services = summaryData?.services ?? [];
  const metrics = metricsData?.metrics;
  const incidents = incidentsData?.incidents ?? [];

  const firstService = services[0];
  const { data: historyData } = useQuery({
    queryKey: queryKeys.history(firstService?.id ?? "", "1h"),
    queryFn: () => api.getMetricsHistory(firstService!.id, "1h"),
    enabled: !!firstService
  });

  const offlineCount = metrics
    ? (metrics.servicesByStatus.DOWN ?? 0) + (metrics.servicesByStatus.UNKNOWN ?? 0)
    : 0;

  const statusChartData = metrics
    ? Object.entries(metrics.servicesByStatus).map(([status, count]) => ({ status, count }))
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Operations Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filters.environment} · {services.length} services
            {filters.search ? ` · matching "${filters.search}"` : ""}
          </p>
        </div>
        <Link to="/topology">
          <Button variant="ghost" size="sm">
            Full topology <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard label="Active Nodes" value={metrics.healthyServices} status="healthy" live subtext={`of ${metrics.totalServices} total`} />
          <KpiCard label="Offline Nodes" value={offlineCount} status={offlineCount > 0 ? "critical" : "offline"} live />
          <KpiCard label="Avg Latency" value={formatLatency(metrics.averageLatencyMs)} status="metric" live subtext="Last hour" />
          <KpiCard
            label="Check Failure Rate"
            value={`${metrics.packetLossPercent}%`}
            status={metrics.packetLossPercent > 5 ? "warning" : "activity"}
            live
            subtext="Failed probes / total"
          />
          <KpiCard label="Probe Rate" value={`${metrics.probesPerMinute}/min`} status="metric" live subtext="Health checks (1h)" />
          <KpiCard
            label="Unacknowledged"
            value={metrics.unacknowledgedIncidents}
            status={metrics.unacknowledgedIncidents > 0 ? "critical" : "healthy"}
            live
            subtext={`${metrics.activeIncidents} open total`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card padding={false}>
            <div className="panel-header">
              <CardHeader title="Network Topology" subtitle="Click a node for details · pan and zoom enabled" className="mb-0" />
            </div>
            <div className="p-2">
              <NetworkTopology services={services.slice(0, 12)} className="border-0 !h-[360px]" />
            </div>
          </Card>

          {historyData && firstService && (
            <LatencyChart data={historyData.history.points} title={`Latency — ${firstService.name}`} height={240} />
          )}
        </div>

        <div className="space-y-4">
          <StatusBarChart data={statusChartData} />

          <Card>
            <CardHeader title="Active Incidents" subtitle={`${incidents.length} open`} />
            {incidents.length === 0 ? (
              <p className="text-xs text-slate-500">All systems operational</p>
            ) : (
              <div className="space-y-2">
                {incidents.slice(0, 4).map((inc) => (
                  <Link
                    key={inc.id}
                    to={`/nodes/${inc.serviceId}`}
                    className="block rounded border border-status-critical/20 bg-status-critical/5 p-2.5 hover:border-status-critical/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium text-status-critical">{inc.summary}</div>
                      {inc.acknowledgedAt && (
                        <Badge variant="offline">ACK</Badge>
                      )}
                    </div>
                    <div className="text-2xs text-slate-500 mt-1">{formatRelativeTime(inc.startedAt)}</div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent Events" />
            <div className="space-y-2.5">
              {(timelineData?.events ?? []).slice(0, 5).map((ev) => (
                <div key={ev.id} className="flex gap-2 text-xs">
                  <span className="text-slate-500 shrink-0 tabular-nums">{formatRelativeTime(ev.createdAt)}</span>
                  <span className="text-slate-400 truncate">{ev.message}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card padding={false}>
        <div className="panel-header">
          <CardHeader title="Monitored Services" subtitle="Quick status view" className="mb-0" />
          <Link to="/services">
            <Button variant="ghost" size="sm">Manage</Button>
          </Link>
        </div>
        <div className="divide-y divide-edge-subtle">
          {services.slice(0, 6).map((s) => (
            <Link
              key={s.id}
              to={`/nodes/${s.id}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-overlay/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant={healthBadgeVariant(s.lastKnownStatus, s.latest?.statusCode)} dot>
                  {healthBadgeLabel(s.lastKnownStatus, s.latest?.statusCode)}
                </Badge>
                <span className="text-sm text-slate-200 truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                <span className="tabular-nums">{formatLatency(s.latest?.latencyMs)}</span>
                {s.latest?.region && <span>{s.latest.region}</span>}
              </div>
            </Link>
          ))}
          {services.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500">No services in this environment match your filters.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

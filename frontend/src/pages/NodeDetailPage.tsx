import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { useAppFilters } from "@/context/AppContext";
import { Badge, statusToBadge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { LatencyChart, MetricAreaChart } from "@/components/charts/MetricCharts";
import { formatLatency, formatTimestamp, formatUptime } from "@/lib/utils";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export function NodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const filters = useAppFilters();
  const [range, setRange] = useState<"1h" | "24h" | "7d">("24h");
  const [region, setRegion] = useState("");

  const { data: summaryData } = useQuery({
    queryKey: queryKeys.summary(filters),
    queryFn: () => api.getSummary(filters)
  });

  const service = summaryData?.services.find((s) => s.id === id);

  const { data: healthData } = useQuery({
    queryKey: queryKeys.health(id!),
    queryFn: () => api.getHealth(id!),
    enabled: !!id
  });

  const { data: historyData } = useQuery({
    queryKey: queryKeys.history(id!, range, region || undefined),
    queryFn: () => api.getMetricsHistory(id!, range, region || undefined),
    enabled: !!id
  });

  const { data: probeData } = useQuery({
    queryKey: queryKeys.probes(id!, range, region || undefined),
    queryFn: () => api.getProbeHistory(id!, range, region || undefined),
    enabled: !!id
  });

  const { data: rawData } = useQuery({
    queryKey: queryKeys.rawMetrics(id!, region || undefined),
    queryFn: () => api.getRawMetrics(id!, 20, region || undefined),
    enabled: !!id
  });

  const { data: timelineData } = useQuery({
    queryKey: queryKeys.timeline({ serviceId: id, limit: 30 }),
    queryFn: () => api.getTimeline({ serviceId: id, limit: 30 })
  });

  const { data: incidentsData } = useQuery({
    queryKey: queryKeys.incidents("OPEN", { ...filters, serviceId: id }),
    queryFn: () => api.getIncidents("OPEN", { serviceId: id })
  });

  const { data: regionsData } = useQuery({
    queryKey: queryKeys.regions(id!),
    queryFn: () => api.getRegions(id!),
    enabled: !!id
  });

  if (!service) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-slate-400 mb-4">Service not found in current environment/filters</p>
        <Link to="/">
          <Button variant="secondary">Back to overview</Button>
        </Link>
      </div>
    );
  }

  const health = healthData?.health;
  const score = health?.score ?? 0;
  const scoreColor = score >= 90 ? "text-status-healthy" : score >= 70 ? "text-status-warning" : "text-status-critical";
  const points = historyData?.history.points ?? [];
  const probePoints = probeData?.probes.points ?? [];
  const raw = rawData?.metrics ?? [];
  const regions = regionsData?.regions ?? [];
  const incidents = incidentsData?.incidents ?? [];

  const failureRateChart = probePoints.map((p) => ({
    time: new Date(p.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: p.packetLossPercent
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <Link to="/topology" className="mt-1 text-slate-500 hover:text-slate-300">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-100">{service.name}</h1>
            <Badge variant={statusToBadge(service.lastKnownStatus)} dot>
              {service.lastKnownStatus}
            </Badge>
            <Badge variant="activity">{service.environment}</Badge>
          </div>
          <a
            href={service.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-status-activity hover:underline mt-0.5"
          >
            {service.url} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="text-right">
          <div className="text-2xs text-slate-500 uppercase">Health Score</div>
          <div className={`text-3xl font-semibold tabular-nums ${scoreColor}`}>{score}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xs text-slate-500 uppercase">Latency</div>
          <div className="text-lg font-semibold text-status-metric tabular-nums">{formatLatency(service.latest?.latencyMs)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-slate-500 uppercase">Uptime</div>
          <div className="text-lg font-semibold text-status-healthy tabular-nums">
            {formatUptime(health?.uptimePercent ?? service.uptimePercent)}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-slate-500 uppercase">Check Interval</div>
          <div className="text-lg font-semibold text-slate-200 tabular-nums">{service.intervalSec}s</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-slate-500 uppercase">Region</div>
          <div className="text-lg font-semibold text-slate-200">{service.latest?.region ?? "default"}</div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["1h", "24h", "7d"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded border px-2.5 py-1 text-xs ${
              range === r ? "border-status-activity/50 bg-status-activity/10 text-status-activity" : "border-edge text-slate-400"
            }`}
          >
            {r}
          </button>
        ))}
        {regions.length > 1 && (
          <Select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LatencyChart data={points} title="Historical Latency" height={260} />
        <MetricAreaChart data={failureRateChart} title="Check Failure Rate (%)" color="#f59e0b" unit="%" height={260} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding={false}>
          <div className="panel-header">
            <CardHeader title="Recent Probes" subtitle="Last 20 health checks" className="mb-0" />
          </div>
          <Table>
            <THead>
              <TH>Status</TH>
              <TH>Latency</TH>
              <TH>Region</TH>
              <TH>Time</TH>
            </THead>
            <TBody>
              {raw.map((m) => (
                <TR key={m.id}>
                  <TD><Badge variant={statusToBadge(m.status)}>{m.status}</Badge></TD>
                  <TD className="tabular-nums">{m.latencyMs} ms</TD>
                  <TD>{m.region}</TD>
                  <TD className="text-xs text-slate-500">{formatTimestamp(m.checkedAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Recent Incidents" subtitle={`${incidents.length} active`} />
            {incidents.length === 0 ? (
              <p className="text-xs text-slate-500">No active incidents</p>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className="rounded border border-status-critical/20 p-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-status-critical">{inc.summary}</div>
                    {inc.acknowledgedAt && <Badge variant="offline">ACK</Badge>}
                  </div>
                  <div className="text-2xs text-slate-500">{formatTimestamp(inc.startedAt)}</div>
                </div>
              ))
            )}
          </Card>

          <Card>
            <CardHeader title="Event Log" />
            <div className="space-y-3 max-h-64 overflow-y-auto border-l border-edge pl-3">
              {(timelineData?.events ?? []).map((ev) => (
                <div key={ev.id} className="relative">
                  <span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-edge" />
                  <div className="text-xs font-medium text-slate-300">{ev.eventType.replace(/_/g, " ")}</div>
                  <div className="text-2xs text-slate-500">{ev.message}</div>
                  <div className="text-2xs text-slate-600">{formatTimestamp(ev.createdAt)}</div>
                </div>
              ))}
            </div>
          </Card>

          {service.tags.length > 0 && (
            <Card>
              <CardHeader title="Tags" />
              <div className="flex flex-wrap gap-1">
                {service.tags.map((t) => (
                  <Badge key={t} variant="activity">{t}</Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

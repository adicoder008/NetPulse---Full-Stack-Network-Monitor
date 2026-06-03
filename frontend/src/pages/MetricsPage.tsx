import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { useAppFilters } from "@/context/AppContext";
import { Select } from "@/components/ui/Input";
import { LatencyChart, MetricAreaChart } from "@/components/charts/MetricCharts";
import { CardHeader } from "@/components/ui/Card";

export function MetricsPage() {
  const filters = useAppFilters();

  const { data: summaryData } = useQuery({
    queryKey: queryKeys.summary(filters),
    queryFn: () => api.getSummary(filters)
  });

  const services = summaryData?.services ?? [];
  const [selectedId, setSelectedId] = useState("");
  const [range, setRange] = useState<"1h" | "24h" | "7d">("1h");
  const [region, setRegion] = useState("");

  const serviceId = selectedId || services[0]?.id || "";

  const { data: regionsData } = useQuery({
    queryKey: queryKeys.regions(serviceId),
    queryFn: () => api.getRegions(serviceId),
    enabled: !!serviceId
  });

  const { data: historyData } = useQuery({
    queryKey: queryKeys.history(serviceId, range, region || undefined),
    queryFn: () => api.getMetricsHistory(serviceId, range, region || undefined),
    enabled: !!serviceId
  });

  const { data: probeData } = useQuery({
    queryKey: queryKeys.probes(serviceId, range, region || undefined),
    queryFn: () => api.getProbeHistory(serviceId, range, region || undefined),
    enabled: !!serviceId
  });

  const points = historyData?.history.points ?? [];
  const probePoints = probeData?.probes.points ?? [];
  const regions = regionsData?.regions ?? [];
  const selectedService = services.find((s) => s.id === serviceId);

  const packetLossChart = probePoints.map((p) => ({
    time: new Date(p.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: p.packetLossPercent
  }));

  const throughputChart = probePoints.map((p) => ({
    time: new Date(p.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: p.probesPerMinute
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Real-Time Metrics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Probe data from health checks · failure rate and throughput computed server-side
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={serviceId} onChange={(e) => setSelectedId(e.target.value)} className="min-w-[160px]">
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          {(["1h", "24h", "7d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded border px-2.5 py-1.5 text-xs transition-colors ${
                range === r
                  ? "border-status-activity/50 bg-status-activity/10 text-status-activity"
                  : "border-edge text-slate-400 hover:bg-surface-overlay"
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
      </div>

      {serviceId ? (
        <>
          <LatencyChart data={points} title={`Latency Trends — ${selectedService?.name ?? ""}`} height={300} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <MetricAreaChart
              data={packetLossChart}
              title="Check Failure Rate (%)"
              color="#f59e0b"
              unit="%"
              height={200}
            />
            <MetricAreaChart
              data={throughputChart}
              title="Probe Throughput (checks/min)"
              color="#06b6d4"
              height={200}
            />
          </div>

          <div className="panel p-4">
            <CardHeader
              title="Probe Summary"
              subtitle={`${probePoints.length} buckets in selected range`}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-2xs text-slate-500 uppercase">Total Probes</div>
                <div className="text-lg font-semibold tabular-nums text-slate-200">
                  {probePoints.reduce((s, p) => s + p.totalProbes, 0)}
                </div>
              </div>
              <div>
                <div className="text-2xs text-slate-500 uppercase">Failed Probes</div>
                <div className="text-lg font-semibold tabular-nums text-status-critical">
                  {probePoints.reduce((s, p) => s + p.failedProbes, 0)}
                </div>
              </div>
              <div>
                <div className="text-2xs text-slate-500 uppercase">Avg Failure Rate</div>
                <div className="text-lg font-semibold tabular-nums text-status-warning">
                  {probePoints.length
                    ? `${(probePoints.reduce((s, p) => s + p.packetLossPercent, 0) / probePoints.length).toFixed(1)}%`
                    : "0%"}
                </div>
              </div>
              <div>
                <div className="text-2xs text-slate-500 uppercase">Avg Probe Rate</div>
                <div className="text-lg font-semibold tabular-nums text-status-metric">
                  {probePoints.length
                    ? `${Math.round(probePoints.reduce((s, p) => s + p.probesPerMinute, 0) / probePoints.length)}/min`
                    : "0/min"}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="panel p-8 text-center text-sm text-slate-500">
          No services in this environment. Add one from the Services page.
        </div>
      )}
    </div>
  );
}

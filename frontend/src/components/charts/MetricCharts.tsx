import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import type { HistoryPoint } from "@/types";
import { formatTimestamp } from "@/lib/utils";

const chartTheme = {
  grid: "#2a3040",
  axis: "#64748b",
  tooltip: { bg: "#161922", border: "#2a3040" }
};

type LatencyChartProps = {
  data: HistoryPoint[];
  title?: string;
  height?: number;
};

export function LatencyChart({ data, title = "Latency Trend", height = 280 }: LatencyChartProps) {
  return (
    <Card padding={false}>
      <div className="panel-header">
        <CardHeader title={title} subtitle="Avg / Min / Max latency over time" className="mb-0" />
      </div>
      <div className="p-4 pt-2" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
            <XAxis
              dataKey="bucket"
              tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              stroke={chartTheme.axis}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke={chartTheme.axis}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              unit="ms"
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartTheme.tooltip.bg,
                border: `1px solid ${chartTheme.tooltip.border}`,
                borderRadius: 6,
                fontSize: 12
              }}
              labelFormatter={(v) => formatTimestamp(String(v))}
            />
            <Line type="monotone" dataKey="avgLatencyMs" name="Avg" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="minLatencyMs" name="Min" stroke="#22c55e" strokeWidth={1} dot={false} strokeOpacity={0.7} />
            <Line type="monotone" dataKey="maxLatencyMs" name="Max" stroke="#ef4444" strokeWidth={1} dot={false} strokeOpacity={0.7} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

type MetricAreaChartProps = {
  data: { time: string; value: number }[];
  title: string;
  color?: string;
  unit?: string;
  height?: number;
};

export function MetricAreaChart({
  data,
  title,
  color = "#3b82f6",
  unit = "",
  height = 200
}: MetricAreaChartProps) {
  return (
    <Card className="p-3">
      <div className="text-xs font-medium text-slate-400 mb-2">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              stroke={chartTheme.axis}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} stroke={chartTheme.axis} axisLine={false} tickLine={false} width={35} />
            <Tooltip
              contentStyle={{
                backgroundColor: chartTheme.tooltip.bg,
                border: `1px solid ${chartTheme.tooltip.border}`,
                borderRadius: 6,
                fontSize: 11
              }}
              formatter={(v: number) => [`${v}${unit}`, ""]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#grad-${title})`}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

type StatusBarChartProps = {
  data: { status: string; count: number }[];
};

export function StatusBarChart({ data }: StatusBarChartProps) {
  const colors: Record<string, string> = {
    UP: "#22c55e",
    DOWN: "#ef4444",
    UNKNOWN: "#64748b"
  };

  return (
    <Card className="p-4">
      <CardHeader title="Status Distribution" subtitle="Current service health breakdown" />
      <div className="space-y-3">
        {data.map(({ status, count }) => {
          const total = data.reduce((s, d) => s + d.count, 0) || 1;
          const pct = (count / total) * 100;
          return (
            <div key={status}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{status}</span>
                <span className="text-slate-300 tabular-nums">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colors[status] ?? "#64748b" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

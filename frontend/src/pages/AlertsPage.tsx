import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { useAppFilters } from "@/context/AppContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatRelativeTime, formatTimestamp } from "@/lib/utils";
import type { AlertSeverity } from "@/types";

const severityBadge = {
  critical: "critical" as const,
  warning: "warning" as const,
  info: "activity" as const
};

export function AlertsPage() {
  const qc = useQueryClient();
  const filters = useAppFilters();
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [alertForm, setAlertForm] = useState({ name: "", webhookUrl: "", type: "DISCORD" as "DISCORD" | "WEBHOOK" });

  const feedFilters = {
    ...filters,
    severity: severityFilter,
    acknowledged: showAcknowledged ? undefined : ("false" as const),
    limit: 50
  };

  const { data: feedData } = useQuery({
    queryKey: queryKeys.alertsFeed(feedFilters),
    queryFn: () =>
      api.getAlertsFeed({
        ...filters,
        severity: severityFilter,
        acknowledged: showAcknowledged ? undefined : "false",
        limit: 50
      })
  });

  const { data: channelsData } = useQuery({
    queryKey: queryKeys.alertChannels,
    queryFn: () => api.getAlertChannels()
  });

  const { data: metricsData } = useQuery({
    queryKey: queryKeys.metrics(filters),
    queryFn: () => api.getDashboardMetrics(filters)
  });

  const acknowledge = useMutation({
    mutationFn: (incidentId: string) => api.acknowledgeIncident(incidentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts-feed"] });
      void qc.invalidateQueries({ queryKey: ["incidents"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    }
  });

  const createChannel = useMutation({
    mutationFn: () => api.createAlertChannel(alertForm),
    onSuccess: () => {
      setAlertForm({ name: "", webhookUrl: "", type: "DISCORD" });
      void qc.invalidateQueries({ queryKey: queryKeys.alertChannels });
    }
  });

  const toggleChannel = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.toggleAlertChannel(id, enabled),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.alertChannels })
  });

  const deleteChannel = useMutation({
    mutationFn: (id: string) => api.deleteAlertChannel(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.alertChannels })
  });

  const alerts = feedData?.alerts ?? [];
  const filtered =
    severityFilter === "all" ? alerts : alerts.filter((a) => a.severity === severityFilter);

  const channels = channelsData?.channels ?? [];
  const metrics = metricsData?.metrics;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Alerts Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Incidents and check failures · acknowledge persists to database
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "critical", "warning", "info"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`rounded border px-2.5 py-1 text-xs capitalize transition-colors ${
              severityFilter === s
                ? "border-status-activity/50 bg-status-activity/10 text-status-activity"
                : "border-edge text-slate-400 hover:bg-surface-overlay"
            }`}
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => setShowAcknowledged((v) => !v)}
          className={`rounded border px-2.5 py-1 text-xs transition-colors ${
            showAcknowledged ? "border-edge bg-surface-overlay text-slate-300" : "border-edge text-slate-500"
          }`}
        >
          {showAcknowledged ? "Hide" : "Show"} acknowledged
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 panel">
          <div className="panel-header">
            <CardHeader title="Alert Timeline" subtitle={`${filtered.length} alerts`} className="mb-0" />
          </div>
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">No alerts matching filters</p>
          ) : (
            <Table>
              <THead>
                <TH>Severity</TH>
                <TH>Alert</TH>
                <TH>Service</TH>
                <TH>Time</TH>
                <TH className="w-20">Action</TH>
              </THead>
              <TBody>
                {filtered.map((alert) => (
                  <TR key={alert.id}>
                    <TD>
                      <Badge variant={severityBadge[alert.severity]} dot>
                        {alert.severity}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="text-sm text-slate-200">{alert.title}</div>
                      <div className="text-2xs text-slate-500 truncate max-w-xs">{alert.message}</div>
                    </TD>
                    <TD>
                      {alert.serviceId ? (
                        <Link to={`/nodes/${alert.serviceId}`} className="text-xs text-status-activity hover:underline">
                          {alert.serviceName ?? "View service"}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TD>
                    <TD className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatRelativeTime(alert.timestamp)}
                    </TD>
                    <TD>
                      {alert.acknowledgeable && !alert.acknowledged ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acknowledge.mutate(alert.id)}
                          disabled={acknowledge.isPending}
                          title="Acknowledge incident"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      ) : alert.acknowledged ? (
                        <span className="text-2xs text-slate-600">ACK</span>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Notification Channels" subtitle={`${channels.length} configured`} />
            <div className="space-y-2 mb-4">
              {channels.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between rounded border border-edge-subtle p-2.5">
                  <div>
                    <div className="text-sm text-slate-200">{ch.name}</div>
                    <div className="text-2xs text-slate-500">{ch.type}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleChannel.mutate({ id: ch.id, enabled: !ch.isEnabled })}
                    >
                      {ch.isEnabled ? "On" : "Off"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteChannel.mutate(ch.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-status-critical" />
                    </Button>
                  </div>
                </div>
              ))}
              {channels.length === 0 && <p className="text-xs text-slate-500">No channels configured</p>}
            </div>
            <div className="space-y-2 border-t border-edge-subtle pt-3">
              <Input placeholder="Channel name" value={alertForm.name} onChange={(e) => setAlertForm((v) => ({ ...v, name: e.target.value }))} />
              <Input placeholder="Webhook URL" value={alertForm.webhookUrl} onChange={(e) => setAlertForm((v) => ({ ...v, webhookUrl: e.target.value }))} />
              <Select value={alertForm.type} onChange={(e) => setAlertForm((v) => ({ ...v, type: e.target.value as "DISCORD" | "WEBHOOK" }))}>
                <option value="DISCORD">Discord</option>
                <option value="WEBHOOK">Generic Webhook</option>
              </Select>
              <Button variant="primary" className="w-full" onClick={() => createChannel.mutate()}>
                Add Channel
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Alert Stats" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Unacknowledged</span>
                <span className="text-status-critical tabular-nums">{metrics?.unacknowledgedIncidents ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Open incidents</span>
                <span className="text-status-warning tabular-nums">{metrics?.activeIncidents ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last event</span>
                <span className="text-slate-400 text-xs">
                  {filtered[0] ? formatTimestamp(filtered[0].timestamp) : "—"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

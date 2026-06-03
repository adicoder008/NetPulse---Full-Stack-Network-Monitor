import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { useAppFilters } from "@/context/AppContext";
import { environmentToApi } from "@/lib/filters";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, statusToBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatLatency, formatUptime } from "@/lib/utils";
import type { AppFilters } from "@/lib/filters";

export function ServicesPage() {
  const qc = useQueryClient();
  const filters = useAppFilters();
  const [tagFilter, setTagFilter] = useState("");
  const [newService, setNewService] = useState({
    name: "",
    url: "",
    intervalSec: 30,
    tags: "",
    environment: filters.environment
  });

  const listFilters = { ...filters, tags: tagFilter || undefined };

  const { data } = useQuery({
    queryKey: queryKeys.summary(listFilters),
    queryFn: () => api.getSummary(listFilters)
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const tags = newService.tags.split(",").map((t) => t.trim()).filter(Boolean);
      return api.createService({
        name: newService.name,
        url: newService.url,
        intervalSec: newService.intervalSec,
        tags: tags.length ? tags : undefined,
        environment: environmentToApi(newService.environment as AppFilters["environment"])
      });
    },
    onSuccess: () => {
      setNewService({ name: "", url: "", intervalSec: 30, tags: "", environment: filters.environment });
      void qc.invalidateQueries({ queryKey: ["summary"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    }
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api.disableService(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["summary"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    }
  });

  const services = data?.services ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Service Registry</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage monitored endpoints · {services.length} in {filters.environment}
        </p>
      </div>

      <Card>
        <CardHeader title="Add Service" subtitle="HTTP health check endpoint" />
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <Input placeholder="Service name" value={newService.name} onChange={(e) => setNewService((v) => ({ ...v, name: e.target.value }))} />
          <Input className="md:col-span-2" placeholder="https://api.example.com/health" value={newService.url} onChange={(e) => setNewService((v) => ({ ...v, url: e.target.value }))} />
          <Input placeholder="tags: auth,api" value={newService.tags} onChange={(e) => setNewService((v) => ({ ...v, tags: e.target.value }))} />
          <Select
            value={newService.environment}
            onChange={(e) => setNewService((v) => ({ ...v, environment: e.target.value as AppFilters["environment"] }))}
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </Select>
          <Button variant="primary" onClick={() => createMutation.mutate()} disabled={!newService.name || !newService.url}>
            Add Service
          </Button>
        </div>
      </Card>

      <div className="panel">
        <div className="panel-header">
          <CardHeader title="All Services" className="mb-0" />
          <Input
            placeholder="Filter by tags (comma-separated)..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-56 h-8 text-xs"
          />
        </div>
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>Environment</TH>
            <TH>Status</TH>
            <TH>Latency</TH>
            <TH>Uptime</TH>
            <TH>Region</TH>
            <TH>Tags</TH>
            <TH className="w-24">Actions</TH>
          </THead>
          <TBody>
            {services.map((s) => (
              <TR key={s.id}>
                <TD>
                  <Link to={`/nodes/${s.id}`} className="text-sm text-status-activity hover:underline font-medium">
                    {s.name}
                  </Link>
                  <div className="text-2xs text-slate-500 truncate max-w-[200px]">{s.url}</div>
                </TD>
                <TD className="text-xs">{s.environment}</TD>
                <TD><Badge variant={statusToBadge(s.lastKnownStatus)} dot>{s.lastKnownStatus}</Badge></TD>
                <TD className="tabular-nums">{formatLatency(s.latest?.latencyMs)}</TD>
                <TD className="tabular-nums">{formatUptime(s.uptimePercent)}</TD>
                <TD className="text-xs">{s.latest?.region ?? "—"}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {(s.tags ?? []).map((t) => (
                      <Badge key={t} variant="default">{t}</Badge>
                    ))}
                  </div>
                </TD>
                <TD>
                  <Button variant="danger" size="sm" onClick={() => disableMutation.mutate(s.id)}>
                    Disable
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {services.length === 0 && (
          <p className="p-4 text-sm text-slate-500">No services found. Add one above or change environment/search filters.</p>
        )}
      </div>
    </div>
  );
}

import { IncidentStatus, TimelineEventType } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma.client.js";
import { parseListQuery, buildServiceWhere } from "../../lib/filters.js";

export type AlertFeedItem = {
  id: string;
  source: "incident" | "timeline";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  serviceId?: string;
  serviceName?: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgeable: boolean;
};

export async function getAlertsFeed(query: {
  environment?: string;
  search?: string;
  severity?: string;
  acknowledged?: string;
  limit?: number;
}): Promise<AlertFeedItem[]> {
  const filters = parseListQuery(query);
  const serviceWhere = buildServiceWhere(filters);
  const services = await prisma.service.findMany({
    where: serviceWhere,
    select: { id: true, name: true }
  });
  const serviceIds = services.map((s) => s.id);
  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));

  if (serviceIds.length === 0) return [];

  const limit = Math.min(query.limit ?? 50, 100);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [openIncidents, resolvedIncidents, failureEvents] = await Promise.all([
    prisma.incident.findMany({
      where: { status: IncidentStatus.OPEN, serviceId: { in: serviceIds } },
      orderBy: { startedAt: "desc" },
      take: limit
    }),
    prisma.incident.findMany({
      where: { status: IncidentStatus.RESOLVED, serviceId: { in: serviceIds }, resolvedAt: { gte: since } },
      orderBy: { resolvedAt: "desc" },
      take: 10
    }),
    prisma.timelineEvent.findMany({
      where: {
        eventType: TimelineEventType.SERVICE_FAILED,
        serviceId: { in: serviceIds },
        createdAt: { gte: since }
      },
      include: { service: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const items: AlertFeedItem[] = [];

  for (const inc of openIncidents) {
    items.push({
      id: inc.id,
      source: "incident",
      severity: "critical",
      title: inc.summary,
      message: "Open incident — service failing health checks",
      serviceId: inc.serviceId,
      serviceName: serviceNameById.get(inc.serviceId),
      timestamp: inc.startedAt.toISOString(),
      acknowledged: inc.acknowledgedAt != null,
      acknowledgeable: true
    });
  }

  for (const inc of resolvedIncidents) {
    items.push({
      id: `resolved-${inc.id}`,
      source: "incident",
      severity: "info",
      title: `[Resolved] ${inc.summary}`,
      message: "Incident resolved — service recovered",
      serviceId: inc.serviceId,
      serviceName: serviceNameById.get(inc.serviceId),
      timestamp: (inc.resolvedAt ?? inc.startedAt).toISOString(),
      acknowledged: true,
      acknowledgeable: false
    });
  }

  for (const ev of failureEvents) {
    items.push({
      id: ev.id,
      source: "timeline",
      severity: "warning",
      title: "Health check failed",
      message: ev.message,
      serviceId: ev.serviceId ?? undefined,
      serviceName: ev.service?.name,
      timestamp: ev.createdAt.toISOString(),
      acknowledged: true,
      acknowledgeable: false
    });
  }

  let filtered = items;

  if (query.severity && query.severity !== "all") {
    filtered = filtered.filter((a) => a.severity === query.severity);
  }

  if (query.acknowledged === "false") {
    filtered = filtered.filter((a) => !a.acknowledged);
  } else if (query.acknowledged === "true") {
    filtered = filtered.filter((a) => a.acknowledged);
  }

  return filtered
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

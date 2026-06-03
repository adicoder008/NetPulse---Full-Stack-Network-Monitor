import { IncidentStatus, ServiceStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma.client.js";
import { ServiceListFilters, buildServiceWhere } from "../../lib/filters.js";

export async function getDashboardMetrics(filters: ServiceListFilters = {}) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const serviceWhere = buildServiceWhere(filters);

  const serviceIds = await prisma.service.findMany({
    where: serviceWhere,
    select: { id: true }
  });
  const ids = serviceIds.map((s) => s.id);

  if (ids.length === 0) {
    return {
      totalServices: 0,
      healthyServices: 0,
      activeIncidents: 0,
      unacknowledgedIncidents: 0,
      averageLatencyMs: 0,
      packetLossPercent: 0,
      probesPerMinute: 0,
      servicesByStatus: { UP: 0, DOWN: 0, UNKNOWN: 0 }
    };
  }

  const [
    totalServices,
    activeIncidents,
    unacknowledgedIncidents,
    statusGroups,
    latencyAgg,
    healthyCount,
    probeStats
  ] = await Promise.all([
    prisma.service.count({ where: serviceWhere }),
    prisma.incident.count({
      where: { status: IncidentStatus.OPEN, serviceId: { in: ids } }
    }),
    prisma.incident.count({
      where: { status: IncidentStatus.OPEN, acknowledgedAt: null, serviceId: { in: ids } }
    }),
    prisma.service.groupBy({
      by: ["lastKnownStatus"],
      where: serviceWhere,
      _count: { _all: true }
    }),
    prisma.metric.aggregate({
      _avg: { latencyMs: true },
      where: {
        checkedAt: { gte: oneHourAgo },
        status: ServiceStatus.UP,
        serviceId: { in: ids }
      }
    }),
    prisma.service.count({
      where: { ...serviceWhere, lastKnownStatus: ServiceStatus.UP }
    }),
    prisma.metric.groupBy({
      by: ["status"],
      where: { checkedAt: { gte: oneHourAgo }, serviceId: { in: ids } },
      _count: { _all: true }
    })
  ]);

  const servicesByStatus: Record<string, number> = { UP: 0, DOWN: 0, UNKNOWN: 0 };
  for (const g of statusGroups) {
    servicesByStatus[g.lastKnownStatus] = g._count._all;
  }

  let totalProbes = 0;
  let failedProbes = 0;
  for (const g of probeStats) {
    totalProbes += g._count._all;
    if (g.status === ServiceStatus.DOWN) {
      failedProbes += g._count._all;
    }
  }

  const packetLossPercent =
    totalProbes > 0 ? Math.round((failedProbes / totalProbes) * 1000) / 10 : 0;
  const probesPerMinute = Math.round(totalProbes / 60);

  return {
    totalServices,
    healthyServices: healthyCount,
    activeIncidents,
    unacknowledgedIncidents,
    averageLatencyMs: Math.round(latencyAgg._avg.latencyMs ?? 0),
    packetLossPercent,
    probesPerMinute,
    servicesByStatus
  };
}

export async function computeHealthScore(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return null;

  const uptime =
    service.totalChecks > 0
      ? (service.successfulChecks / service.totalChecks) * 100
      : 100;

  let score = Math.round(uptime);
  if (service.lastKnownStatus === ServiceStatus.DOWN) {
    score = Math.min(score, 45);
  } else if (service.lastKnownStatus === ServiceStatus.UNKNOWN) {
    score = Math.min(score, 65);
  }

  return {
    score,
    uptimePercent: Math.round(uptime * 10) / 10,
    lastKnownStatus: service.lastKnownStatus
  };
}

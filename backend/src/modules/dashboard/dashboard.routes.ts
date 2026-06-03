import { IncidentStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma.client.js";
import { StatusCache } from "../cache/status-cache.js";
import { computeUptimePercent } from "../timeline/timeline.service.js";
import { getDashboardMetrics, computeHealthScore } from "./dashboard.metrics.js";
import { parseListQuery, buildServiceWhere } from "../../lib/filters.js";

const cache = new StatusCache();

const incidentInclude = {
  service: { select: { id: true, name: true, environment: true } }
};

export async function registerDashboardRoutes(app: any) {
  app.get("/api/dashboard/summary", async (req: any) => {
    const filters = parseListQuery(req.query as { tags?: string; environment?: string; search?: string });
    const where = buildServiceWhere(filters);

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    const enriched = await Promise.all(
      services.map(async (service) => {
        const latest = await cache.getLatest(service.id);
        const uptimePercent = computeUptimePercent(service.totalChecks, service.successfulChecks);
        return { ...service, latest, uptimePercent };
      })
    );

    const serviceIds = services.map((s) => s.id);
    const activeIncidents = await prisma.incident.count({
      where: {
        status: IncidentStatus.OPEN,
        ...(serviceIds.length ? { serviceId: { in: serviceIds } } : { serviceId: { in: [] } })
      }
    });

    return { services: enriched, activeIncidents };
  });

  app.get("/api/dashboard/metrics", async (req: any) => {
    const filters = parseListQuery(req.query as { tags?: string; environment?: string; search?: string });
    const metrics = await getDashboardMetrics(filters);
    return { metrics };
  });

  app.get("/api/services/:id/health", async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const health = await computeHealthScore(id);
    if (!health) {
      return reply.code(404).send({ error: { code: "SERVICE_NOT_FOUND", message: "Service not found" } });
    }
    return { health };
  });

  app.get("/api/services/:id/metrics", async (req: any) => {
    const { id } = req.params as { id: string };
    const query = req.query as { limit?: string; region?: string };
    const limit = Number(query.limit ?? 50);
    const metrics = await prisma.metric.findMany({
      where: {
        serviceId: id,
        ...(query.region ? { region: query.region } : {})
      },
      orderBy: { checkedAt: "desc" },
      take: Math.min(limit, 500)
    });
    return { metrics };
  });

  app.get("/api/incidents", async (req: any) => {
    const query = req.query as {
      status?: IncidentStatus;
      serviceId?: string;
      environment?: string;
      search?: string;
      acknowledged?: string;
    };
    const filters = parseListQuery(query);

    const serviceWhere = buildServiceWhere(filters);
    const matchingServices = await prisma.service.findMany({
      where: serviceWhere,
      select: { id: true }
    });
    const serviceIds = matchingServices.map((s) => s.id);

    const incidents = await prisma.incident.findMany({
      where: {
        status: query.status,
        ...(query.serviceId ? { serviceId: query.serviceId } : { serviceId: { in: serviceIds } }),
        ...(query.acknowledged === "false" ? { acknowledgedAt: null } : {}),
        ...(query.acknowledged === "true" ? { acknowledgedAt: { not: null } } : {})
      },
      include: incidentInclude,
      orderBy: { startedAt: "desc" }
    });
    return { incidents };
  });

  app.patch("/api/incidents/:id/acknowledge", async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { acknowledgedBy?: string };

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) {
      return reply.code(404).send({ error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found" } });
    }
    if (incident.status !== IncidentStatus.OPEN) {
      return reply.code(400).send({
        error: { code: "INCIDENT_NOT_OPEN", message: "Only open incidents can be acknowledged" }
      });
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: body.acknowledgedBy ?? "ops-engineer"
      },
      include: incidentInclude
    });

    return { incident: updated };
  });
}

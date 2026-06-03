import { IncidentStatus, ServiceStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma.client.js";
import { TimelineService } from "../timeline/timeline.service.js";

const timeline = new TimelineService();

export class IncidentEngine {
  async evaluate(serviceId: string, metricId: string, status: ServiceStatus) {
    const active = await prisma.incident.findFirst({
      where: { serviceId, status: IncidentStatus.OPEN }
    });

    if (status === ServiceStatus.DOWN) {
      const recent = await prisma.metric.findMany({
        where: { serviceId },
        orderBy: { checkedAt: "desc" },
        take: 3
      });
      const failed3x = recent.length === 3 && recent.every((m) => m.status === ServiceStatus.DOWN);
      if (failed3x && !active) {
        const incident = await prisma.incident.create({
          data: {
            serviceId,
            status: IncidentStatus.OPEN,
            triggeredByMetricId: metricId,
            failureCountAtOpen: 3,
            summary: "Service failed 3 consecutive checks"
          }
        });
        await timeline.record("INCIDENT_OPENED", `Incident opened for service`, {
          serviceId,
          incidentId: incident.id,
          payload: { incidentId: incident.id, metricId }
        });
        return incident;
      }
      return null;
    }

    if (status === ServiceStatus.UP && active) {
      const incident = await prisma.incident.update({
        where: { id: active.id },
        data: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedByMetricId: metricId,
          summary: "Service recovered after incident"
        }
      });
      await timeline.record("INCIDENT_RESOLVED", `Incident resolved for service`, {
        serviceId,
        incidentId: incident.id,
        payload: { incidentId: incident.id, metricId }
      });
      return incident;
    }
    return null;
  }
}

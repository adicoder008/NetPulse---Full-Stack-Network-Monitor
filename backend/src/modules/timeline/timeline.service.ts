import { TimelineEventType, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma.client.js";

export class TimelineService {
  async record(
    eventType: TimelineEventType,
    message: string,
    opts: { serviceId?: string; incidentId?: string; payload?: Prisma.InputJsonValue }
  ) {
    return prisma.timelineEvent.create({
      data: {
        eventType,
        message,
        serviceId: opts.serviceId,
        incidentId: opts.incidentId,
        payload: opts.payload
      }
    });
  }

  list(opts: { serviceId?: string; serviceIds?: string[]; limit?: number }) {
    const limit = Math.min(opts.limit ?? 100, 500);
    const where =
      opts.serviceId != null
        ? { serviceId: opts.serviceId }
        : opts.serviceIds?.length
          ? { serviceId: { in: opts.serviceIds } }
          : undefined;

    return prisma.timelineEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { service: { select: { id: true, name: true } } }
    });
  }
}

export function computeUptimePercent(totalChecks: number, successfulChecks: number): number {
  if (totalChecks === 0) return 100;
  return Math.round((successfulChecks / totalChecks) * 10000) / 100;
}

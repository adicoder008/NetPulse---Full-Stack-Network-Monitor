import { ServiceStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../infrastructure/db/prisma.client.js";
import { redis } from "../../infrastructure/redis/redis.client.js";
import { publishDashboardEvent } from "../dashboard/dashboard.gateway.js";
import { IncidentEngine } from "../incident/incident.engine.js";
import { StatusCache } from "../cache/status-cache.js";
import { AlertService } from "../alert/alert.service.js";
import { TimelineService } from "../timeline/timeline.service.js";
import { HealthCheckCompletedEvent } from "./stream.types.js";

const incidentEngine = new IncidentEngine();
const statusCache = new StatusCache();
const alertService = new AlertService();
const timeline = new TimelineService();

function parseEvent(fields: string[]): HealthCheckCompletedEvent {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return {
    eventType: "health.check.completed.v1",
    eventId: obj.eventId,
    serviceId: obj.serviceId,
    url: obj.url,
    status: obj.status as "UP" | "DOWN",
    latencyMs: Number(obj.latencyMs),
    checkedAt: obj.checkedAt,
    attempt: Number(obj.attempt ?? 1),
    region: obj.region ?? "default",
    errorMessage: obj.errorMessage
  };
}

async function ensureGroup() {
  try {
    await redis.xgroup("CREATE", env.STREAM_KEY, env.STREAM_GROUP, "$", "MKSTREAM");
  } catch (error) {
    const message = String(error);
    if (!message.includes("BUSYGROUP")) {
      throw error;
    }
  }
}

export async function startStreamConsumer() {
  await ensureGroup();

  while (true) {
    try {
      const res = await redis.xreadgroup(
        "GROUP",
        env.STREAM_GROUP,
        env.STREAM_CONSUMER,
        "COUNT",
        20,
        "BLOCK",
        5000,
        "STREAMS",
        env.STREAM_KEY,
        ">"
      );

      if (!res) {
        continue;
      }

      for (const [, entries] of res as [string, [string, string[]][]][]) {
        for (const [streamId, fields] of entries) {
          const event = parseEvent(fields);
          const isUp = event.status === "UP";
          const metricStatus = isUp ? ServiceStatus.UP : ServiceStatus.DOWN;
          const region = event.region ?? "default";

          const existing = await prisma.metric.findUnique({
            where: { streamEventId: event.eventId }
          });
          if (existing) {
            await redis.xack(env.STREAM_KEY, env.STREAM_GROUP, streamId);
            continue;
          }

          const metric = await prisma.metric.create({
            data: {
              serviceId: event.serviceId,
              status: metricStatus,
              latencyMs: event.latencyMs,
              checkedAt: new Date(event.checkedAt),
              streamEventId: event.eventId,
              region,
              errorMessage: event.errorMessage
            }
          });

          await prisma.service.update({
            where: { id: event.serviceId },
            data: {
              lastKnownStatus: metric.status,
              totalChecks: { increment: 1 },
              ...(isUp ? { successfulChecks: { increment: 1 } } : {})
            }
          });

          await timeline.record(
            isUp ? "SERVICE_CHECKED" : "SERVICE_FAILED",
            isUp
              ? `Health check passed (${region}, ${event.latencyMs}ms)`
              : `Health check failed (${region})`,
            {
              serviceId: event.serviceId,
              payload: { metricId: metric.id, region, latencyMs: event.latencyMs, status: event.status }
            }
          );

          const incident = await incidentEngine.evaluate(event.serviceId, metric.id, metric.status);

          await statusCache.setLatest(event.serviceId, {
            serviceId: event.serviceId,
            status: metric.status,
            latencyMs: metric.latencyMs,
            checkedAt: metric.checkedAt.toISOString(),
            region
          });

          publishDashboardEvent({
            type: "service.status.updated",
            payload: {
              serviceId: event.serviceId,
              status: metric.status,
              latencyMs: metric.latencyMs,
              checkedAt: metric.checkedAt,
              region
            }
          });

          if (incident) {
            void alertService.onIncidentChange(incident);
            publishDashboardEvent({
              type: incident.status === "OPEN" ? "incident.opened" : "incident.resolved",
              payload: incident
            });
          }

          await redis.xack(env.STREAM_KEY, env.STREAM_GROUP, streamId);
        }
      }
    } catch (error) {
      logger.error({ error }, "stream consumer loop failed");
    }
  }
}

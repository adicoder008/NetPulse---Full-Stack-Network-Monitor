import { Prisma, ServiceStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma.client.js";

export type MetricsRange = "1h" | "24h" | "7d";

const RANGE_CONFIG: Record<MetricsRange, { ms: number; trunc: string; maxPoints: number }> = {
  "1h": { ms: 60 * 60 * 1000, trunc: "minute", maxPoints: 60 },
  "24h": { ms: 24 * 60 * 60 * 1000, trunc: "hour", maxPoints: 96 },
  "7d": { ms: 7 * 24 * 60 * 60 * 1000, trunc: "hour", maxPoints: 168 }
};

export class MetricsHistoryService {
  async getLatencyHistory(serviceId: string, range: MetricsRange, region?: string) {
    const cfg = RANGE_CONFIG[range];
    const since = new Date(Date.now() - cfg.ms);

    const regionFilter = region ? Prisma.sql`AND m."region" = ${region}` : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{ bucket: Date; avgLatencyMs: number; minLatencyMs: number; maxLatencyMs: number; samples: bigint }>
    >(
      Prisma.sql`
        SELECT
          date_trunc(${cfg.trunc}, m."checkedAt") AS bucket,
          ROUND(AVG(m."latencyMs"))::int AS "avgLatencyMs",
          MIN(m."latencyMs")::int AS "minLatencyMs",
          MAX(m."latencyMs")::int AS "maxLatencyMs",
          COUNT(*)::bigint AS samples
        FROM "Metric" m
        WHERE m."serviceId" = ${serviceId}
          AND m."checkedAt" >= ${since}
          ${regionFilter}
        GROUP BY bucket
        ORDER BY bucket ASC
        LIMIT ${cfg.maxPoints}
      `
    );

    return {
      range,
      since: since.toISOString(),
      region: region ?? "all",
      points: rows.map((r) => ({
        bucket: r.bucket.toISOString(),
        avgLatencyMs: Number(r.avgLatencyMs),
        minLatencyMs: Number(r.minLatencyMs),
        maxLatencyMs: Number(r.maxLatencyMs),
        samples: Number(r.samples)
      }))
    };
  }

  async getProbeHistory(serviceId: string, range: MetricsRange, region?: string) {
    const cfg = RANGE_CONFIG[range];
    const since = new Date(Date.now() - cfg.ms);
    const regionFilter = region ? Prisma.sql`AND m."region" = ${region}` : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        bucket: Date;
        totalProbes: bigint;
        failedProbes: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          date_trunc(${cfg.trunc}, m."checkedAt") AS bucket,
          COUNT(*)::bigint AS "totalProbes",
          COUNT(*) FILTER (WHERE m."status" = ${ServiceStatus.DOWN})::bigint AS "failedProbes"
        FROM "Metric" m
        WHERE m."serviceId" = ${serviceId}
          AND m."checkedAt" >= ${since}
          ${regionFilter}
        GROUP BY bucket
        ORDER BY bucket ASC
        LIMIT ${cfg.maxPoints}
      `
    );

    const bucketMinutes = cfg.trunc === "minute" ? 1 : 60;

    return {
      range,
      since: since.toISOString(),
      region: region ?? "all",
      points: rows.map((r) => {
        const total = Number(r.totalProbes);
        const failed = Number(r.failedProbes);
        return {
          bucket: r.bucket.toISOString(),
          packetLossPercent: total > 0 ? Math.round((failed / total) * 1000) / 10 : 0,
          probesPerMinute: Math.round(total / bucketMinutes),
          totalProbes: total,
          failedProbes: failed
        };
      })
    };
  }

  async getRegionsForService(serviceId: string) {
    const rows = await prisma.metric.findMany({
      where: { serviceId },
      distinct: ["region"],
      select: { region: true },
      orderBy: { region: "asc" }
    });
    return rows.map((r) => r.region);
  }
}

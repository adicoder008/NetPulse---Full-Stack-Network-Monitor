import { z } from "zod";
import { MetricsHistoryService, MetricsRange } from "./metrics.service.js";

const rangeSchema = z.enum(["1h", "24h", "7d"]);

export async function registerMetricsRoutes(app: any) {
  const svc = new MetricsHistoryService();

  app.get("/api/services/:id/metrics/history", async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const query = req.query as { range?: string; region?: string };
    const parsed = rangeSchema.safeParse(query.range ?? "1h");
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: "INVALID_RANGE", message: "range must be 1h, 24h, or 7d" } });
    }
    const history = await svc.getLatencyHistory(id, parsed.data as MetricsRange, query.region);
    return { history };
  });

  app.get("/api/services/:id/metrics/probes", async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const query = req.query as { range?: string; region?: string };
    const parsed = rangeSchema.safeParse(query.range ?? "1h");
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: "INVALID_RANGE", message: "range must be 1h, 24h, or 7d" } });
    }
    const probes = await svc.getProbeHistory(id, parsed.data as MetricsRange, query.region);
    return { probes };
  });

  app.get("/api/services/:id/regions", async (req: any) => {
    const { id } = req.params as { id: string };
    const regions = await svc.getRegionsForService(id);
    return { regions };
  });
}

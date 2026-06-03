import { TimelineService } from "./timeline.service.js";
import { parseListQuery, buildServiceWhere } from "../../lib/filters.js";
import { prisma } from "../../infrastructure/db/prisma.client.js";

export async function registerTimelineRoutes(app: any) {
  const svc = new TimelineService();

  app.get("/api/timeline", async (req: any) => {
    const query = req.query as { serviceId?: string; limit?: string; environment?: string; search?: string };
    const limit = Number(query.limit ?? 100);

    if (query.serviceId) {
      const events = await svc.list({ serviceId: query.serviceId, limit });
      return { events };
    }

    const filters = parseListQuery(query);
    const services = await prisma.service.findMany({
      where: buildServiceWhere(filters),
      select: { id: true }
    });
    if (services.length === 0) {
      return { events: [] };
    }
    const events = await svc.list({
      serviceIds: services.map((s) => s.id),
      limit
    });
    return { events };
  });

  app.get("/api/services/:id/timeline", async (req: any) => {
    const { id } = req.params as { id: string };
    const query = req.query as { limit?: string };
    const events = await svc.list({ serviceId: id, limit: Number(query.limit ?? 100) });
    return { events };
  });
}

import { z } from "zod";
import { Environment } from "@prisma/client";
import { parseListQuery } from "../../lib/filters.js";
import { ServiceRepository } from "./service.repository.js";
import { ServiceService } from "./service.service.js";

const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  intervalSec: z.number().int().min(10).max(3600),
  tags: z.array(z.string().min(1).max(32)).max(10).optional(),
  environment: z.nativeEnum(Environment).optional()
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional()
});

export async function registerServiceRoutes(app: any) {
  const svc = new ServiceService(new ServiceRepository());

  app.post("/api/services", async (req: any, reply: any) => {
    try {
      const body = createSchema.parse(req.body);
      const service = await svc.create(body);
      return reply.code(201).send({ service });
    } catch (error: any) {
      if (error.code === "P2002") {
        return reply.code(409).send({
          error: { code: "DUPLICATE_SERVICE", message: "A service with this name already exists" }
        });
      }
      throw error;
    }
  });

  app.get("/api/services", async (req: any) => {
    const query = req.query as { tags?: string; environment?: string; search?: string };
    const services = await svc.list(parseListQuery(query));
    return { services };
  });

  app.get("/api/services/:id", async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const service = await svc.getById(id);
    if (!service) {
      return reply.code(404).send({ error: { code: "SERVICE_NOT_FOUND", message: "Service not found" } });
    }
    return { service };
  });

  app.put("/api/services/:id", async (req: any) => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    const service = await svc.update(id, body);
    return { service };
  });

  app.delete("/api/services/:id", async (req: any) => {
    const { id } = req.params as { id: string };
    const service = await svc.remove(id);
    return { service };
  });
}

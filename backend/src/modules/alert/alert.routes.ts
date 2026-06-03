import { z } from "zod";
import { AlertChannelType } from "@prisma/client";
import { AlertService } from "./alert.service.js";
import { getAlertsFeed } from "./alert.feed.js";

const createChannelSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(AlertChannelType),
  webhookUrl: z.string().url()
});

export async function registerAlertRoutes(app: any) {
  const svc = new AlertService();

  app.get("/api/alerts/feed", async (req: any) => {
    const query = req.query as {
      environment?: string;
      search?: string;
      severity?: string;
      acknowledged?: string;
      limit?: string;
    };
    const alerts = await getAlertsFeed({
      ...query,
      limit: Number(query.limit ?? 50)
    });
    return { alerts };
  });

  app.get("/api/alerts/channels", async () => {
    const channels = await svc.listChannels();
    return { channels };
  });

  app.post("/api/alerts/channels", async (req: any, reply: any) => {
    const body = createChannelSchema.parse(req.body);
    const channel = await svc.createChannel(body);
    return reply.code(201).send({ channel });
  });

  app.patch("/api/alerts/channels/:id", async (req: any) => {
    const { id } = req.params as { id: string };
    const body = z.object({ isEnabled: z.boolean() }).parse(req.body);
    const channel = await svc.toggleChannel(id, body.isEnabled);
    return { channel };
  });

  app.delete("/api/alerts/channels/:id", async (req: any) => {
    const { id } = req.params as { id: string };
    await svc.deleteChannel(id);
    return { ok: true };
  });
}

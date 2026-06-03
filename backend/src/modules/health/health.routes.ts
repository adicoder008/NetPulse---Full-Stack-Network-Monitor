import { prisma } from "../../infrastructure/db/prisma.client.js";
import { redis } from "../../infrastructure/redis/redis.client.js";

export async function registerHealthRoutes(app: any) {
  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return { status: "ready" };
  });
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { logger } from "./config/logger.js";
import { registerServiceRoutes } from "./modules/service/service.routes.js";
import { registerDashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { registerDashboardGateway } from "./modules/dashboard/dashboard.gateway.js";
import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { registerMetricsRoutes } from "./modules/metrics/metrics.routes.js";
import { registerTimelineRoutes } from "./modules/timeline/timeline.routes.js";
import { registerAlertRoutes } from "./modules/alert/alert.routes.js";

export async function buildApp() {
  const app = Fastify({ loggerInstance: logger });
  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute"
  });

  app.setErrorHandler((error, _req, reply) => {
    app.log.error({ error }, "request failed");
    reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Unexpected error" } });
  });

  await registerHealthRoutes(app);
  await registerServiceRoutes(app);
  await registerDashboardRoutes(app);
  await registerMetricsRoutes(app);
  await registerTimelineRoutes(app);
  await registerAlertRoutes(app);
  registerDashboardGateway(app);
  return app;
}

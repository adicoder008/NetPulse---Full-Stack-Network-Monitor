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
import { env } from "./config/env.js";
import { registerAlertRoutes } from "./modules/alert/alert.routes.js";

export async function buildApp() {
  const app = Fastify({ loggerInstance: logger });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Rate limit off by default — the dashboard polls multiple endpoints and
  // would hit 429s in local/Docker use. Set RATE_LIMIT_MAX=600 in production.
  if (env.RATE_LIMIT_MAX > 0) {
    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: "1 minute"
    });
  }

  app.setErrorHandler((error: any, _req, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode === 429) {
      return reply.code(429).send({
        error: { code: "RATE_LIMITED", message: "Too many requests — slow down polling" }
      });
    }

    if (error.name === "ZodError") {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: error.errors?.[0]?.message ?? "Invalid request" }
      });
    }

    if (error.code === "P2002") {
      return reply.code(409).send({
        error: { code: "DUPLICATE_SERVICE", message: "A service with this name already exists" }
      });
    }

    app.log.error({ error }, "request failed");
    reply.code(statusCode >= 400 && statusCode < 600 ? statusCode : 500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: statusCode === 500 ? "Unexpected error" : String(error.message ?? "Request failed")
      }
    });
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

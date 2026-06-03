import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { buildApp } from "./app.js";
import { startStreamConsumer } from "./modules/stream/stream.consumer.js";

async function start() {
  const app = await buildApp();
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  logger.info({ port: env.API_PORT }, "api listening");
  void startStreamConsumer();
}

start().catch((error) => {
  logger.error({ error }, "failed to start api");
  process.exit(1);
});

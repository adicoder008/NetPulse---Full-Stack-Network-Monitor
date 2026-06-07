import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import { deriveCheckStatus } from "./health-status.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

const streamKey = process.env.STREAM_KEY ?? "stream:health_checks";
const workerRegion = process.env.WORKER_REGION ?? "default";
const loopDelayMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);
const timeoutMs = Number(process.env.CHECK_TIMEOUT_MS ?? 3000);

const breakerState = new Map<string, { failures: number; openedAt?: number }>();
const breakerFailureThreshold = 3;
const breakerCooldownMs = 15000;

type ProbeResult = {
  status: "UP" | "DOWN";
  statusCode: number;
  latencyMs: number;
  attempt: number;
};

async function probe(url: string, retries = 2): Promise<ProbeResult> {
  let attempt = 0;
  while (attempt <= retries) {
    attempt += 1;
    const started = Date.now();
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(t);
      const statusCode = res.status;
      return {
        status: deriveCheckStatus(statusCode),
        statusCode,
        latencyMs: Date.now() - started,
        attempt
      };
    } catch {
      if (attempt > retries) {
        return { status: "DOWN", statusCode: 0, latencyMs: Date.now() - started, attempt };
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
  return { status: "DOWN", statusCode: 0, latencyMs: timeoutMs, attempt: retries + 1 };
}

function canExecute(serviceId: string) {
  const state = breakerState.get(serviceId);
  if (!state || !state.openedAt) {
    return true;
  }
  return Date.now() - state.openedAt > breakerCooldownMs;
}

function recordResult(serviceId: string, status: "UP" | "DOWN") {
  const current = breakerState.get(serviceId) ?? { failures: 0 };
  if (status === "UP") {
    breakerState.set(serviceId, { failures: 0 });
    return;
  }
  const failures = current.failures + 1;
  if (failures >= breakerFailureThreshold) {
    breakerState.set(serviceId, { failures, openedAt: Date.now() });
  } else {
    breakerState.set(serviceId, { failures });
  }
}

async function publishEvent(payload: Record<string, string | number>) {
  await redis.xadd(
    streamKey,
    "MAXLEN",
    "~",
    "100000",
    "*",
    ...Object.entries(payload).flatMap(([k, v]) => [k, String(v)])
  );
}

async function runLoop() {
  logger.info({ region: workerRegion }, "worker started");
  while (true) {
    try {
      const services = await prisma.service.findMany({ where: { isActive: true } });
      for (const service of services) {
        if (!canExecute(service.id)) {
          continue;
        }

        const result = await probe(service.url);
        recordResult(service.id, result.status);

        await publishEvent({
          eventType: "health.check.completed.v1",
          eventId: uuidv4(),
          serviceId: service.id,
          url: service.url,
          status: result.status,
          statusCode: result.statusCode,
          latencyMs: result.latencyMs,
          checkedAt: new Date().toISOString(),
          attempt: result.attempt,
          region: workerRegion
        });
      }
    } catch (error) {
      logger.error({ error }, "worker loop error");
    }

    await new Promise((resolve) => setTimeout(resolve, loopDelayMs));
  }
}

runLoop().catch((error) => {
  logger.error({ error }, "worker crashed");
  process.exit(1);
});

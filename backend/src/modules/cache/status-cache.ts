import { env } from "../../config/env.js";
import { redis } from "../../infrastructure/redis/redis.client.js";

export class StatusCache {
  async setLatest(serviceId: string, payload: Record<string, unknown>) {
    const key = `cache:service:status:${serviceId}`;
    await redis.set(key, JSON.stringify(payload), "EX", env.STATUS_CACHE_TTL_SEC);
  }

  async getLatest(serviceId: string) {
    const key = `cache:service:status:${serviceId}`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }
}

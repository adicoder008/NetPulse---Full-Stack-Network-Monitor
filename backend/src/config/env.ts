import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  STREAM_KEY: z.string().default("stream:health_checks"),
  STREAM_GROUP: z.string().default("metrics-processors"),
  STREAM_CONSUMER: z.string().default("api-1"),
  STATUS_CACHE_TTL_SEC: z.coerce.number().default(120)
});

export const env = envSchema.parse(process.env);

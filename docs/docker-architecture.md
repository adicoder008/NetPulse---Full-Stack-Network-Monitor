# Docker Architecture

NetPulse runs as four containers on a single Docker network:

1. `postgres` - primary persistent store for services, metrics, incidents.
2. `redis` - stream broker + cache layer for latest status.
3. `api` - Fastify HTTP/WebSocket server + Redis Stream consumer.
4. `worker` - distributed health checker + Redis Stream producer.
5. `frontend` - Vite React dashboard.

## Runtime topology
- `worker -> redis(stream)` using `XADD`.
- `api -> redis(stream)` using `XREADGROUP`.
- `api -> postgres` for persistent writes.
- `api -> redis(cache)` for latest status reads/writes.
- `frontend -> api` via REST + WebSocket.

## Operational behavior
- Healthchecks on `postgres` and `redis` gate startup dependencies.
- Volumes:
  - `pg_data` for PostgreSQL persistence.
  - `redis_data` for append-only Redis durability in local demo.
- API runs migrations on startup (`prisma migrate deploy`) to keep setup simple.

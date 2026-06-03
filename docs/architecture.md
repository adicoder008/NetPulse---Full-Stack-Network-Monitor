# NetPulse System Design

## Why Fastify over Express
- Better out-of-the-box performance and lower overhead for high-frequency health events.
- First-class plugin ecosystem for rate limiting and websockets.
- Strong TypeScript ergonomics for portfolio-quality API contracts.

## Why PostgreSQL
- Strong consistency for incident state transitions (OPEN -> RESOLVED).
- Relational model fits Service -> Metric -> Incident joins well.
- Reliable indexing and query planning for time-series-ish metric reads.

## Why Redis
- In-memory reads for fast dashboard snapshots.
- Natural fit for temporary state (latest status cache, circuit hints).
- Shared infra for both cache and event transport.

## Why Redis Streams
- Durable append-only event log with consumer groups.
- At-least-once delivery model supports resilient processing with idempotency.
- Horizontal scaling by adding API consumers in the same group.

## Throughput Considerations
- Worker writes are O(number_of_services / interval) and can spike.
- Stream decouples write spikes from DB flush rate.
- `MAXLEN` prevents unbounded stream growth.

## Latency Optimization
- Dashboard summary reads latest status from Redis cache, not DB aggregates.
- WebSocket pushes avoid polling-only UI behavior.
- Worker HTTP checks use short timeout + bounded retries.

## Reliability Mechanisms
- Ack stream entries only after DB write + cache update.
- Idempotent metric insert via unique `streamEventId`.
- Health/readiness endpoints support operational checks.
- Simple circuit breaker prevents repeated hammering of unhealthy endpoints.

## Horizontal Scaling Opportunities
- Scale worker replicas for more checks per second.
- Scale API replicas with shared Redis consumer group.
- Add partitioned stream keys by service hash if event volume grows.

## Failure Scenarios
- Worker crash: no event loss if checks already pushed to stream.
- API crash after read before ack: event remains pending and can be reclaimed.
- Redis outage: checks temporarily unavailable; worker retries and logs.
- DB outage: consumer loop keeps retrying and avoids acking failed writes.

## Observability Extensions (implemented)
- **Uptime counters** on `Service` — O(1) increment per check, percentage at read time.
- **Timeline events** — append-only audit trail for portfolio-grade incident forensics.
- **Alert channels** — pluggable Discord/webhook handlers with dedupe via `AlertDelivery` unique key.
- **Historical metrics** — `date_trunc` aggregation with range-aware bucket sizes and composite indexes.
- **Multi-region workers** — `WORKER_REGION` on stream events; see `docs/multi-region.md`.

## Future Improvements
- Dead-letter queue automation and replay tooling.
- OpenTelemetry traces from worker -> stream -> API.
- SLO burn-rate alerts beyond incident open/resolve.

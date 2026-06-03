# NetPulse Event Flow

1. Worker polls active services from PostgreSQL.
2. Worker executes health probe with timeout, retry, and simple circuit breaker.
3. Worker emits `health.check.completed.v1` event into `stream:health_checks`.
4. API stream consumer (`metrics-processors`) reads event.
5. API performs idempotent metric write using unique `eventId`.
6. API updates latest service cache in Redis with TTL.
7. Incident engine checks consecutive failures:
   - 3 consecutive `DOWN` => create `OPEN` incident.
   - first `UP` after an open incident => mark `RESOLVED`.
8. API broadcasts updates over WebSocket to dashboard clients.
9. API acknowledges stream message only after successful persistence.

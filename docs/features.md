# NetPulse Observability Features

## 1. Uptime Percentage Tracking

**Design:** Incremental counters on `Service` (`totalChecks`, `successfulChecks`) updated atomically on each new metric (idempotent via `streamEventId`). Uptime is computed at read time: `(successfulChecks / totalChecks) * 100`, avoiding expensive full-table scans.

**API:** Included in `GET /api/dashboard/summary` as `uptimePercent` per service.

## 2. Historical Metrics Analytics

**Design:** PostgreSQL `date_trunc` aggregation with range-specific bucket sizes:
- `1h` → minute buckets
- `24h` → hour buckets  
- `7d` → hour buckets

Indexed by `(serviceId, region, checkedAt DESC)` for efficient range scans.

**API:**
- `GET /api/services/:id/metrics/history?range=1h|24h|7d&region=optional`
- `GET /api/services/:id/regions`

## 3. Alerting System

**Design:** Pluggable handlers (`DiscordWebhookHandler`, `GenericWebhookHandler`) registered in `alertHandlers`. `AlertDelivery` unique constraint `(channelId, incidentId, alertType)` prevents duplicate spam.

**Triggers:** Incident OPEN → `INCIDENT_OPENED`, RESOLVED → `INCIDENT_RESOLVED`.

**API:**
- `GET/POST /api/alerts/channels`
- `PATCH /api/alerts/channels/:id` (enable/disable)
- `DELETE /api/alerts/channels/:id`

## 4. Service Tagging

**Design:** PostgreSQL `text[]` with GIN index for `hasSome` filtering.

**API:** `tags` on create/update; `?tags=auth,payments` on list and dashboard summary.

## 5. Dashboard Metrics

**API:** `GET /api/dashboard/metrics`

Returns: `totalServices`, `healthyServices`, `activeIncidents`, `averageLatencyMs` (last hour, UP checks only), `servicesByStatus`.

## 6. Incident Timeline

**Design:** Append-only `TimelineEvent` table; recorded at service creation, each check/failure, incident open/resolve.

**API:**
- `GET /api/timeline?serviceId=&limit=`
- `GET /api/services/:id/timeline`

## 7. Multi-Region Monitoring

**Design:** Workers publish `region` in stream events; metrics stored per region. Horizontal scale: add worker containers with unique `WORKER_REGION` — same code, same stream, consumer group handles fan-in.

**Local simulation:** `docker compose` runs `worker-bangalore`, `worker-singapore`, `worker-frankfurt`.

See `docs/multi-region.md` for architecture detail.

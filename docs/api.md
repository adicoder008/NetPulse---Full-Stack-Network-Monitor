# NetPulse API Contracts

Base URL: `/api`

## Services

### POST `/services`
```json
{
  "name": "User API",
  "url": "https://example.com/health",
  "intervalSec": 30,
  "tags": ["auth", "api"]
}
```

### GET `/services?tags=auth,payments`
Returns services; optional comma-separated tag filter.

### GET `/services/:id`
Returns one service.

### PUT `/services/:id`
Partial update (`name`, `url`, `intervalSec`, `isActive`, `tags`).

### DELETE `/services/:id`
Soft delete by setting `isActive=false`.

## Dashboard

### GET `/dashboard/summary?tags=auth`
Returns services with `latest`, `uptimePercent`, and active incident count.

### GET `/dashboard/metrics`
```json
{
  "metrics": {
    "totalServices": 5,
    "healthyServices": 4,
    "activeIncidents": 1,
    "averageLatencyMs": 42,
    "servicesByStatus": { "UP": 4, "DOWN": 1, "UNKNOWN": 0 }
  }
}
```

### GET `/services/:id/metrics?limit=50&region=bangalore`
Returns latest metrics; optional region filter.

### GET `/services/:id/metrics/history?range=1h|24h|7d&region=bangalore`
Returns aggregated latency time series.

### GET `/services/:id/regions`
Lists distinct regions with metrics for a service.

## Incidents

### GET `/incidents?status=OPEN|RESOLVED&serviceId=<id>`
Returns incidents filtered by status and service.

## Timeline

### GET `/timeline?serviceId=<id>&limit=100`
Global or filtered event history.

### GET `/services/:id/timeline?limit=100`
Service-scoped timeline.

Event types: `SERVICE_CREATED`, `SERVICE_CHECKED`, `SERVICE_FAILED`, `INCIDENT_OPENED`, `INCIDENT_RESOLVED`.

## Alerts

### GET `/alerts/channels`
### POST `/alerts/channels`
```json
{ "name": "Ops Discord", "type": "DISCORD", "webhookUrl": "https://discord.com/api/webhooks/..." }
```
Types: `DISCORD`, `WEBHOOK`.

### PATCH `/alerts/channels/:id` — `{ "isEnabled": false }`
### DELETE `/alerts/channels/:id`

## Health

### GET `/healthz` — Liveness
### GET `/readyz` — Readiness (DB + Redis)

## WebSocket

Endpoint: `/ws`

Event examples:
```json
{
  "type": "service.status.updated",
  "payload": {
    "serviceId": "uuid",
    "status": "UP",
    "latencyMs": 42,
    "checkedAt": "2026-06-02T10:00:00.000Z",
    "region": "bangalore"
  }
}
```

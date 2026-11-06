# API

Base URL is `http://127.0.0.1:8000`. FastAPI also serves interactive OpenAPI documentation at `/docs`.

| Method | Path | Purpose | Access |
| --- | --- | --- | --- |
| GET | `/api/snapshot` | Aircraft, latest telemetry, alerts, maintenance, flights, analytics, simulator state | Public demo |
| GET | `/api/stream` | Server-sent events | Public demo |
| GET | `/api/flights/{id}` | Stored flight and samples | Public demo |
| GET | `/api/aircraft/{id}/telemetry?limit=120` | Recent persisted telemetry, limit 1–500 | Public demo |
| GET | `/api/system` | API, database, stream and simulator health | Public demo |
| POST | `/api/demo/scenario` | Select a synthetic scenario and reset its clock | Local demo, can be disabled |
| POST | `/api/demo/simulator` | Start, pause, resume, reset, optional speed 1–8 | Local demo, can be disabled |
| PATCH | `/api/alerts/{id}` | Acknowledge or resolve with a note | Admin token |
| PATCH | `/api/maintenance/{id}` | Schedule or complete with technician and note | Admin token |

Example scenario request:

```json
{"scenario":"connectivity"}
```

Example SSE telemetry envelope (one event per simulator tick):

```text
event: telemetry
data: {"type":"telemetry","timestamp":"2026-11-06T12:00:00Z","samples":[{"aircraft_id":"UAV-001","timestamp":"2026-11-06T12:00:00Z","position":{"latitude":9.08,"longitude":7.40,"altitude_m":120},"ground_speed_mps":12,"vertical_speed_mps":0.2,"heading_deg":90,"battery":{"percentage":88,"voltage_v":23.4,"temperature_c":30},"gps_satellites":13,"gps_fix":"3D","connectivity":{"status":"connected","signal_quality":90},"sensor_status":"nominal","status":"active"}],"alerts":[]}
```

`ready` and `heartbeat` maintain connection state. `reset` and `state` tell clients to refresh their snapshot. The endpoint sends `Cache-Control: no-cache, no-transform` and disables reverse-proxy buffering.

Admin requests carry `X-Admin-Token`. When `ADMIN_TOKEN` is unset, protected updates return 503. An invalid token returns 401. Unknown records return 404, attempts to alter resolved alerts return 409, invalid fields return 422. Set `DEMO_CONTROLS_ENABLED=false` to return 403 for simulator control requests. This local token design should be replaced by a user identity provider before multi-user administrative deployment.

# Security and trust boundary

UAV Hub is an observation-only portfolio demo. Aircraft identities, routes, status, and faults are fictional. The API has no flight-controller connection, control endpoint, mission execution, or targeting feature.

The public Cloudflare deployment uses a single shared Durable Object for synthetic scenario controls and explicitly disables administrative PATCH updates. The token-based administration described below applies only to the local FastAPI service.

## Main risks and controls

| Risk | Current control | Deployment requirement |
| --- | --- | --- |
| Unauthorized record changes | Alert and maintenance PATCH endpoints use a server-side `ADMIN_TOKEN`, compared with constant-time equality; mutations create audit events. | Use individual authenticated accounts and role-based authorization before real multi-user deployment. |
| Cross-origin requests | API CORS origins are explicitly configured with `CORS_ORIGINS`; methods and headers are restricted. | Set only the exact frontend origin. |
| Shared demo state abuse | Scenario controls only affect the fictional simulator and can be disabled with `DEMO_CONTROLS_ENABLED=false`. | Disable or isolate controls per visitor on public hosting; add rate limits. |
| Unbounded streaming memory | Each SSE subscriber has a one-item queue; old live telemetry is periodically pruned. | Monitor process memory, reconnects, and database growth. |
| Secret exposure | The frontend receives no admin secret from the backend. Environment examples contain no usable secret; `.env*` is ignored. | Store credentials in host secret management and rotate them. |
| Misleading real-world interpretation | Demo labels mark all data simulated; alerts retain source samples. | Preserve the simulation labels and add provenance checks for any future imported dataset. |

The demo token is held in page memory after entry; it is not stored in browser persistence. It is suitable only for a trusted local demonstration. There is no account system, token rotation, per-user audit identity, request rate limiting, or formal penetration test. The default development API enables simulator controls and is not meant to be exposed publicly as-is.

For a vulnerability report, contact the repository maintainer privately with a minimal reproduction. Do not post credentials, sensitive locations, or exploit payloads in a public issue.

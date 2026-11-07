# Limitations and next steps

- All aircraft, routes, flight records, maintenance entries, and live telemetry are deterministic synthetic data. The platform has no real-aircraft integration.
- Alert thresholds are demonstration logic. They are not certified diagnostics, maintenance approval, airworthiness advice, or operational safety guidance.
- The generic 3D quadcopter is an illustrative component explorer. It is not a model of the selected aircraft or an engineering drawing.
- The public PX4 Flight Review site can expose real locations in shared logs. Vektr therefore does not ingest public ULog data in this version. A future importer needs provenance, consent, field validation, and redaction options.
- Admin access is one shared local token, without user accounts or per-user roles. Public multi-user administration requires an identity provider, stronger authorization, and rate limiting.
- The FastAPI simulator is process-local. The Cloudflare version uses one Durable Object, so all public visitors share scenario, pause, and reset controls. Its recent telemetry history is capped; it is a portfolio demo, not tenant-isolated software.
- Historical flights are stored as JSON sample arrays. This is appropriate for the small demo set; larger flight archives need object storage or a partitioned time-series design.
- Live sample retention is 24 hours, pruned periodically. Recorded flight sessions are retained separately.
- The map uses a third-party tile service and needs network access. Replacing it with offline tiles is a separate packaging task.
- The public demo is deployed to Cloudflare Workers. It has fictional data and no administrative write access. Both apex and `www.vektr.ng` are routed to the `vektr` Worker in Cloudflare.

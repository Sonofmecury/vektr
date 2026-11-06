# Limitations and next steps

- All aircraft, routes, flight records, maintenance entries, and live telemetry are deterministic synthetic data. The platform has no real-aircraft integration.
- Alert thresholds are demonstration logic. They are not certified diagnostics, maintenance approval, airworthiness advice, or operational safety guidance.
- The generic 3D quadcopter is an illustrative component explorer. It is not a model of the selected aircraft or an engineering drawing.
- The public PX4 Flight Review site can expose real locations in shared logs. UAV Hub therefore does not ingest public ULog data in this version. A future importer needs provenance, consent, field validation, and redaction options.
- Admin access is one shared local token, without user accounts or per-user roles. Public multi-user administration requires an identity provider, stronger authorization, and rate limiting.
- Simulator state is process-local. A second API instance would have its own state; multi-instance hosting needs an external event broker and coordinated simulation ownership.
- Historical flights are stored as JSON sample arrays. This is appropriate for the small demo set; larger flight archives need object storage or a partitioned time-series design.
- Live sample retention is 24 hours, pruned periodically. Recorded flight sessions are retained separately.
- The map uses a third-party tile service and needs network access. Replacing it with offline tiles is a separate packaging task.
- The demo is documented for deployment but has not been deployed publicly, as requested in the project brief.

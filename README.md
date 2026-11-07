# Vektr

Vektr is a software-first portfolio demonstration of civilian unmanned aircraft fleet observation. Six fictional aircraft produce deterministic telemetry. A product site introduces a separate dark operations console with a live map, aircraft health, alerts, flight replay, maintenance records, analytics, and an interactive 3D model. It does not control aircraft.

**Live demo:** [vektr.ng](https://vektr.ng). The Cloudflare Worker also serves `www.vektr.ng`.

[Open the flight console](https://vektr.ng/platform/) · [Mission planning](https://vektr.ng/platform/plan/)

## What works

- Fly workspace: satellite map, aircraft silhouettes, recorded routes and waypoints, relative traffic view, an instrument panel, and a simulated camera rendered from imagery and telemetry.
- Plan workspace: draft a simulated route, undo points, or export GeoJSON. Route drafts and per-aircraft preflight checks are stored in the browser.
- Five simulator scenarios: normal, connectivity, battery, sensor, and maintenance. Pause, resume, and reset controls change the backend simulator.
- Server-sent telemetry events, persistent alert evidence with condition deduplication, and delayed or disconnected stream state.
- Fleet search, filtering, sorting, cards, aircraft records, and interactive multirotor, VTOL, and fixed wing models with selectable components.
- Six stored fictional flights, synchronized map and altitude replay, analytics from persisted records, and maintenance schedule.
- Local FastAPI administration: alert and maintenance updates guarded by a configured token, with audit events. The public Cloudflare demo disables administrative updates.

## Run locally

Requirements: Node.js 22+, Python 3.13+, and npm. PostgreSQL is supported; SQLite is the zero-setup local default.

```powershell
cd backend
py -3.13 -m venv ..\.venv
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\alembic.exe upgrade head
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3001`. The API defaults to `http://127.0.0.1:8000`; set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if needed. Set `ADMIN_TOKEN` in the API environment to enable record updates and enter it in Settings. Do not commit the token.

Alternatively run `docker compose up --build` from this directory to start PostgreSQL, the API, and the web app. The Compose password is only for local use.

## Demo walkthrough

1. Open **Fly** and select an aircraft on the map, fleet list, or traffic plot.
2. Use the timeline or a numbered map waypoint to replay a sample. The map marker, camera, and instrument readings follow the same sample.
3. Open **Preflight checklist** or **Inspect 3D airframe** in the left rail to review the selected aircraft.
4. Open **Plan** to draft and export a survey route. Choose a simulator scenario from **Simulation** to explore how telemetry and alerts change.
5. Open **File** for Flight History, Maintenance, and Alerts. Open **Analyze** for fleet metrics.

## Check the build

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm run typecheck
npm run build
```

## Cloudflare deployment

The public version uses a static Next.js export and a Cloudflare Worker with a SQLite-backed Durable Object. The Worker serves the frontend and same-origin `/api/*` endpoints. Demo state, evidence-backed alerts, and recent telemetry survive Worker restarts; the six historical flight paths are regenerated deterministically from their fictional seed. Scenario controls affect the shared public demo; no administrative mutations are exposed.

```powershell
cd frontend
npm ci
$env:STATIC_EXPORT='1'
npm run build
cd ..\edge
npm ci
npm run check
npm run deploy
```

Cloudflare's `vektr` Worker serves the `vektr.ng/*` and `www.vektr.ng/*` routes. The domain is registered at OneBit and delegated to Cloudflare. The zone uses Cloudflare's Free plan. The API is served on the same origin, so no production `NEXT_PUBLIC_API_URL` is needed.

The apex and `www` routes are assigned to `vektr` in the Cloudflare dashboard. `wrangler.jsonc` omits route declarations, so deploys update the Worker without attempting a zone route change; the current CLI token can deploy Workers but has no zone route permission. `workers.dev` is disabled. Change routes in the dashboard, then verify the live domain after each deploy.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Security](docs/SECURITY.md)
- [Design](docs/DESIGN.md)
- [Limitations](docs/LIMITATIONS.md)
- [Competitor research](docs/COMPETITOR_RESEARCH.md)
- [Redesign delivery and verification](docs/REDESIGN_DELIVERY.md)

## Deployment

For a non-demo service with independent organizations or real integrations, the FastAPI backend needs a persistent Python process and managed PostgreSQL. Run `alembic upgrade head`, configure `DATABASE_URL` and `CORS_ORIGINS`, and replace the shared demo controls with per-user authorization. The Cloudflare deployment is a fictional public portfolio demonstration only.

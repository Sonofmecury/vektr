# UAV Hub

UAV Hub is a software-first portfolio demonstration of civilian unmanned aircraft fleet observation. Six fictional aircraft produce deterministic telemetry. The interface links a live map, aircraft health, alerts, stored flight replay, maintenance records, analytics, and a generic interactive 3D model. It does not control aircraft.

![UAV Hub desktop overview](docs/screenshots/overview-desktop.png)

[Mobile overview](docs/screenshots/overview-mobile.png) · [3D component explorer](docs/screenshots/aircraft-viewer.png)

## What works

- Overview and Live Operations: map markers, selected aircraft telemetry, connection state, and backend-derived fleet counts.
- Five simulator scenarios: normal, connectivity, battery, sensor, and maintenance. Pause, resume, and reset controls change the backend simulator.
- Server-sent telemetry events, persistent alert evidence with condition deduplication, and delayed or disconnected stream state.
- Fleet search, filtering, sorting, cards, aircraft records, and selectable 3D components.
- Six stored fictional flights, synchronized map and altitude replay, analytics from persisted records, and maintenance schedule.
- Administrative alert and maintenance updates guarded by a configured token, with audit events. Visitors can explore without registration.

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

1. Open Overview and select an aircraft on the map or list.
2. Choose **Connectivity degradation**; the first aircraft becomes delayed, then disconnected, and an evidence-backed alert appears.
3. Open Alerts to inspect the stored telemetry sample. Change to another scenario to see its specific condition.
4. Open Flight History, select a recorded session, then play or scrub the map and altitude together.
5. Open Fleet to inspect health fields and rotate/select components of the generic 3D model.
6. Open Maintenance and Analytics to inspect stored service records and calculated fleet measures.

## Check the build

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm run typecheck
npm run build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Security](docs/SECURITY.md)
- [Design](docs/DESIGN.md)
- [Limitations](docs/LIMITATIONS.md)
- [Competitor research](docs/COMPETITOR_RESEARCH.md)

## Deployment

The frontend can run on a static-capable Next.js host; FastAPI needs a persistent Python process for SSE and the simulator. Use managed PostgreSQL, run `alembic upgrade head`, configure `DATABASE_URL`, `CORS_ORIGINS`, and `NEXT_PUBLIC_API_URL`, and restrict administrative actions. Disable `DEMO_CONTROLS_ENABLED` for a public read-only service unless the simulation controls are isolated per visitor. The application has deliberately **not** been deployed publicly.

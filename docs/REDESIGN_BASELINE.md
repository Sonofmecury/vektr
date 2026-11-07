# Vektr redesign baseline

Captured 7 November 2026 before the master-brief redesign. This is the regression checklist for the existing functional product. The current visual refresh is an interim state, not the target design.

## Architecture and routes

- `frontend`: Next.js 16 static export, React 19, MapLibre, React Three Fiber. The operational views are `/`, `/fleet`, `/live`, `/flights`, `/analytics`, `/maintenance`, `/alerts`, `/system`, and `/settings`.
- `edge`: Cloudflare Worker serving static assets and same-origin API endpoints. A SQLite-backed Durable Object keeps shared simulator state, alert evidence, recent telemetry, and maintenance records across Worker restarts.
- `backend`: optional local FastAPI + SQLAlchemy implementation with SQLite or PostgreSQL, migrations, admin-protected alert and maintenance mutations, and audit events. The public Worker has no admin mutation endpoint.
- Public hosts: `vektr.ng`, `www.vektr.ng`, and a Workers preview. The older `uav-hub` Worker still exists while routing is being checked.

## Existing behavior to preserve

| Area | Current capability | Regression check |
| --- | --- | --- |
| Simulator | Six fictional civilian aircraft; normal, connectivity, battery, sensor and maintenance scenarios; pause, resume, reset | Scenario actions affect the backend snapshot, never a frontend invented value |
| Stream | 1 Hz server-sent events, reconnect state, delayed and disconnected telemetry | Status and timestamps accurately distinguish current from stale data |
| Fleet | Search, filter, sort, cards/table, aircraft record, selected aircraft | Selection updates the map and detail across views |
| Map | MapLibre markers, street/satellite switch, fit to fleet, zoom, aircraft selection | Tiles load with attribution; markers follow backend coordinates |
| Telemetry | Position, altitude, speed, heading, battery, GPS, signal, sensor and status | Selected record and displayed sample agree |
| Alerts | Condition-derived records with deduplication and evidence | An anomaly creates a relevant alert without repeated spam |
| Maintenance | Scheduled fictional inspections, persistent local admin updates | Status is reflected in readiness and survives restart where supported |
| Flights | Six historical flight IDs and recorded sample responses | Route, replay marker, chart, timestamp and telemetry stay synchronized |
| Analytics | Flight hours, battery health, alert categories and inspection counts from project state | No decorative or arbitrary values are introduced |
| Digital twin | Interactive illustrative quadcopter component selection | Rotate/zoom/selection works; engineering claims are limited to available data |

## Current limitations that the redesign must address

- The public root goes directly into the operational UI; there is no separate product story or `/platform` route.
- The interim mark is a V/checkmark and must be replaced by a spatial symbol.
- The interim UI uses large rounded cards and a mint active navigation block; the master brief requires a stricter operational visual language.
- The hero drone is animated but decorative. Component detail needs to use selected aircraft health and maintenance data.
- Historical flight routes require a distinct deterministic morphology per flight. Add tests for repeatability, difference and replay alignment.
- Public scenario controls mutate one shared demo state for every visitor. Preserve the disclosure and prevent the UI from implying actual live aircraft control.

## Build and verification commands

- `cd frontend; npm run typecheck; $env:STATIC_EXPORT='1'; npm run build`
- `cd edge; npm run check; npm run deploy`
- `cd backend; ..\.venv\Scripts\python.exe -m pytest -q`
- Browser checks: desktop and mobile root, fleet selection, map layers, simulator controls, flight replay, alert evidence, and offline state.

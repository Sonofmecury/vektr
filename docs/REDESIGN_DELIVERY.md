# Vektr redesign delivery

Implemented against the user-provided master brief and subsequent reference pivot in November 2026. The public site pairs full-width field imagery and Rethink Sans with black and white editorial sections. The console uses neutral charcoal surfaces and reserves status colors for telemetry.

## Design and interaction decisions

- A custom `V` aircraft/route symbol, wordmark, SVG variants, favicon, and interface icon family establish a consistent identity. The editable source assets live in `brand/`.
- The product site uses a generated field survey illustration, a custom React Three Fiber drone scene, and GSAP scroll transitions. The console's aircraft viewer remains an inspection tool. Both honor reduced-motion settings and have readable text outside the canvas.
- `/platform` provides a map-first fleet overview; `/platform/flights` connects a selectable flight, timeline, telemetry, and map position. Fleet, alerts, maintenance, and analytics use one visual system and coherent status colors.
- Six aircraft and their histories are deterministic fictional records. The routes are distinct, replayable, and backed by the local simulator or Cloudflare Durable Object rather than random values generated during rendering.
- The public Worker serves static frontend assets and same-origin API endpoints. Durable Object state makes scenario and alert behavior survive Worker restarts, but the shared demo is not an authenticated fleet service.

## Verification

- Frontend TypeScript check and production static export passed.
- FastAPI tests passed: four tests, including distinct route generation and operations behavior.
- Cloudflare Worker syntax check passed. The Worker and frontend assets deployed; both zone routes point at `vektr`. Route ownership is managed in the Cloudflare dashboard, so code deploys do not need zone route permission.
- Desktop and 390px mobile browser checks covered the public site and operations console. The mobile workspace was corrected to avoid horizontal overflow.
- A recorded flight replay was checked by selecting an event and observing timeline, coordinate, altitude, battery, signal, and link state update together.

## Scope

The public site is a portfolio simulation. Aircraft positions, alerts, maintenance, and playback are synthetic. There is no aircraft command link, real telemetry ingestion, tenant isolation, or safety certification. See [Limitations](LIMITATIONS.md) for details.

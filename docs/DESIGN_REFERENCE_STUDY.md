# Vektr design reference study

Reviewed 7 November 2026. These references inform hierarchy and interactions; no proprietary mark, image, aircraft model or source code is used.

| Reference | Strong idea | Vektr application | Do not copy / opportunity |
| --- | --- | --- | --- |
| [Terra Industries](https://www.terraindustries.co/) | Hardware leads the story; short product statements sit beside concrete specifications. | Let one fictional civilian airframe carry the public story, then reveal verifiable platform data. | Do not reproduce Terra's aircraft, imagery, claims, or brand. Vektr can explain software state more deeply than a hardware catalog. |
| [Anduril](https://www.anduril.com/) | Large-scale product presentation and controlled pacing. | Use industrial typography, negative space, and restrained transitions from object to operations. | Avoid militarized imagery, borrowed model silhouettes, and spectacle that hides functionality. |
| [Palantir](https://www.palantir.com/) | Product storytelling across data workflows. | Explain how position, health, historical evidence and maintenance connect. | Avoid generic abstract diagrams or claims of operational capabilities not in the repo. |
| [FlytBase fleet management](https://docs.flytbase.com/in-flight-modules/how-to-manage-your-flight-operations/fleet-management) and [Fleet View](https://releases.flytbase.com/introducing-fleet-view-2.0) | Device selection connects a fleet list, map, and detailed state. | Use a three-zone operational instrument with map dominance and selection-linked telemetry. | Do not copy control actions or video-wall claims; Vektr is observation-only. |
| [AirData Fleet Intelligence](https://airdata.com/capabilities-fleet-intelligence) | Aircraft, battery and service state form a readiness story. | Link maintenance and battery state to selected aircraft and derived readiness. | Avoid presenting pilot certification or cell-level analytics that the project does not have. |
| [QGroundControl Fly View](https://docs.qgroundcontrol.com/master/en/qgc-user-guide/fly_view/fly_view.html) | Dense status can be legible when grouped by system and state. | Separate position, link, energy, GPS, and payload in the aircraft detail hierarchy. | Do not add arming, waypoint execution, or other flight-control functions. |
| [PX4 Flight Review](https://review.px4.io/) | Recorded telemetry is inspectable against time and location. | Make route, timeline, events and charts follow one replay cursor. | Avoid implying imported ULog data; use deterministic fictional records and label them. |

## Design decisions

1. Public entry: warm white, graphite, engineered symbol, one large aircraft object. Use subtle scroll and pointer motion only where it explains systems.
2. Operational application: near-black graphite, small radii, custom line icons, compact values and one restrained identity accent. A map, fleet rail and selected-aircraft context form the primary view.
3. Data truth: no fixed decorative KPI values. Every operational metric must come from a snapshot, stored record or deterministic flight.
4. 3D: production model rendered with React Three Fiber; the selected aircraft and component state control the digital twin. Fall back to a static visual when WebGL or reduced motion makes animation unsuitable.
5. Motion: transitions indicate selection, state change or a spatial relationship. Avoid endless rotation and decorative shaders.

The current interim Vektr UI still has oversized cards and a generic V/checkmark. Those are explicit redesign targets.

# Interface design

The workspace puts the geographic view, fleet selection, and selected aircraft telemetry on one surface. It uses a restrained dark palette so technical status and alerts carry the strongest color. All status numbers include units and, where applicable, a UTC timestamp.

## Tokens

| Role | CSS token | Value |
| --- | --- | --- |
| Canvas | `--bg` | `#080d12` |
| Panel | `--surface` | `#101920` |
| Raised panel | `--surface-2` | `#14212a` |
| Main text | `--text` | `#e8f0f1` |
| Secondary text | `--muted` | `#91a4ad` |
| Selection | `--accent` | `#d9ae68` |
| Healthy | `--green` | `#65b68d` |
| Informational | `--cyan` | `#78c6c2` |
| Warning | `--amber` | `#e1ad62` |
| Critical | `--red` | `#d78079` |

Inter and system sans-serif type cover labels and prose. Monospace labels distinguish telemetry, timestamps, units, and section IDs. Large metrics use tabular numerals. The sidebar is 228px on desktop, collapses to a drawer on tablets, and the content grid stacks on mobile. Component headings, row heights, borders, and status pills repeat across views.

MapLibre raster tiles are credited in the map attribution. Aircraft markers are keyboard-focusable buttons. Forms have accessible labels, dialogs use semantic roles, loading and error states are explicit, and reduced-motion preference shortens transitions. The 3D viewer also provides ordinary buttons for component selection so mouse drag is not the only interaction.

The product structure is based on the [reference study](COMPETITOR_RESEARCH.md), with original layouts and visual treatment. The prominent simulated-data label and observation-only wording are deliberate product cues, not hidden implementation notes.

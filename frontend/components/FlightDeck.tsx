"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { request } from "@/lib/api";
import type { Aircraft, Flight, Snapshot, Telemetry } from "@/lib/types";
import { AircraftGlyph } from "./AircraftGlyph";
import { DeckIcon, type DeckIconName } from "./DeckIcon";
import { Instruments, ReplayTimeline, TrafficView, elapsedFrom } from "./DeckWidgets";
import { MissionMap, SimulatedCamera, positionOf, type Coordinate } from "./MissionMap";
import { VektrLogo } from "./VektrLogo";

const Aircraft3DViewer = dynamic(() => import("./Aircraft3DViewer"), {
  ssr: false,
  loading: () => <p className="deck-empty">Preparing the aircraft model…</p>,
});

type DeckProps = {
  data: Snapshot;
  mode: "fly" | "plan";
  selected: string;
  onSelect: (id: string) => void;
  link: string;
  clock: string;
  navigate: (view: string) => void;
  chooseScenario: (scenario: string) => Promise<void>;
  control: (action: string) => Promise<void>;
  scenarios: readonly (readonly [string, string])[];
  pages: readonly (readonly [string, string])[];
};

type Checklist = Record<string, string[]>;
type Drafts = Record<string, Coordinate[]>;

const checkItems = [
  ["airframe", "Airframe and propellers", "Inspect body, mounting points, and fasteners."],
  ["battery", "Battery secured", "Verify the pack is seated and the connector latched."],
  ["area", "Survey area reviewed", "Confirm the operating area and crew briefing."],
] as const;
const EMPTY_POINTS: Coordinate[] = [];
const EMPTY_SAMPLES: Telemetry[] = [];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

function DeskButton({ name, label, active, onClick }: { name: DeckIconName; label: string; active?: boolean; onClick: () => void }) {
  return <button type="button" className="deck-icon-button" aria-label={label} aria-pressed={active} title={label} onClick={onClick}><DeckIcon name={name} /></button>;
}

function Preflight({ sample, checks, onToggle }: { sample?: Telemetry; checks: string[]; onToggle: (key: string) => void }) {
  const sensor = sample?.sensor_status;
  const link = sample?.connectivity.status;
  return <div className="deck-checklist">
    <p>Simulation checklist · {checks.length}/{checkItems.length} reviewed</p>
    {checkItems.map(([key, title, detail]) => <label key={key}>
      <input type="checkbox" checked={checks.includes(key)} onChange={() => onToggle(key)} />
      <span><strong>{title}</strong><small>{detail}</small></span>
    </label>)}
    <div className="deck-auto-check"><DeckIcon name="settings" size={14} /> Sensors <strong data-ok={sensor === "nominal"}>{sensor ?? "Unavailable"}</strong></div>
    <div className="deck-auto-check"><DeckIcon name="compass" size={14} /> GPS <strong data-ok={!!sample?.gps_satellites}>{sample ? sample.gps_fix + " · " + sample.gps_satellites + " sats" : "Unavailable"}</strong></div>
    <div className="deck-auto-check"><DeckIcon name="live" size={14} /> Radio link <strong data-ok={link === "connected"}>{link ?? "Unavailable"}</strong></div>
  </div>;
}

function FlightDiagnostics({ aircraft, data, onClose }: { aircraft: Aircraft; data: Snapshot; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return <dialog ref={dialog} className="deck-diagnostic-dialog" aria-label="Aircraft diagnostics" onCancel={onClose}>
    <header><div><DeckIcon name="inspect" /><strong>Aircraft diagnostics</strong><span>{aircraft.id} · SIMULATION</span></div>
      <DeskButton name="close" label="Close diagnostics" onClick={onClose} /></header>
    <Aircraft3DViewer aircraft={aircraft} maintenance={data.maintenance.filter(record => record.aircraft_id === aircraft.id)} />
  </dialog>;
}

export function FlightDeck({ data, mode, selected, onSelect, link, clock, navigate, chooseScenario, control, scenarios, pages }: DeckProps) {
  const aircraft = data.aircraft.find(craft => craft.id === selected);
  const [query, setQuery] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [sidebar, setSidebar] = useState<"instruments" | "checklist" | "events">("instruments");
  const [tracksVisible, setTracksVisible] = useState(true);
  const [rangeVisible, setRangeVisible] = useState(true);
  const [trafficVisible, setTrafficVisible] = useState(true);
  const [cameraVisible, setCameraVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [tilted, setTilted] = useState(false);
  const [focus, setFocus] = useState<{ kind: "fleet" | "aircraft"; revision: number }>({ kind: "fleet", revision: 0 });
  const [inspect, setInspect] = useState(false);
  const [checks, setChecks] = useState<Checklist>(() => readStorage("vektr.preflight.v1", {}));
  const [drafts, setDrafts] = useState<Drafts>(() => readStorage("vektr.plans.v1", {}));
  const [placing, setPlacing] = useState(false);
  const [index, setIndex] = useState(0);
  const [replay, setReplay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(16);
  const [tracks, setTracks] = useState<Flight[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const flightsKey = data.flights.map(flight => flight.id).join(",");
  const selectedFlight = tracks.find(flight => flight.aircraft_id === selected);
  const samples = selectedFlight?.samples ?? EMPTY_SAMPLES;
  const last = Math.max(0, samples.length - 1);
  const activeIndex = Math.min(index, last);
  const isPlaying = playing && activeIndex < last;
  const replayActive = mode === "fly" && replay && !!samples.length;
  const activeSample = replayActive ? samples[activeIndex] : aircraft?.telemetry ?? undefined;
  const waypoints = mode === "plan" ? drafts[selected] ?? EMPTY_POINTS : EMPTY_POINTS;

  useEffect(() => {
    const abort = new AbortController();
    const ids = flightsKey.split(",").filter(Boolean);
    Promise.allSettled(ids.map(id => request<Flight>("/api/flights/" + encodeURIComponent(id), { signal: abort.signal }))).then(results => {
      if (abort.signal.aborted) return;
      const loaded = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      setTracks(loaded);
      setFocus(previous => previous.revision === 0 ? { ...previous, revision: 1 } : previous);
      setLoading(false);
      setLoadError(loaded.length < ids.length ? "Some recordings could not load." : "");
    });
    return () => abort.abort();
  }, [flightsKey]);

  useEffect(() => { saveStorage("vektr.preflight.v1", checks); }, [checks]);
  useEffect(() => { saveStorage("vektr.plans.v1", drafts); }, [drafts]);

  useEffect(() => {
    if (!isPlaying || mode !== "fly" || !samples.length) return;
    const cadence = Math.max(.1, elapsedFrom(samples, 1) || 1);
    const timer = window.setInterval(() => setIndex(current => Math.min(last, current + 1)), cadence * 1000 / speed);
    return () => window.clearInterval(timer);
  }, [last, mode, isPlaying, samples, speed]);

  const moveFocus = (kind: "fleet" | "aircraft") => setFocus(previous => ({ kind, revision: previous.revision + 1 }));

  function goLive() {
    setReplay(false);
    setPlaying(false);
  }

  function selectCraft(id: string) {
    if (id !== selected) {
      onSelect(id);
      goLive();
      setIndex(0);
    }
    moveFocus("aircraft");
  }

  function seek(next: number) {
    setIndex(Math.max(0, Math.min(last, next)));
    setPlaying(false);
    setReplay(true);
  }

  function play() {
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (activeIndex >= last || !replayActive) setIndex(0);
    setReplay(true);
    setPlaying(true);
    moveFocus("aircraft");
  }

  function toggleCheck(key: string) {
    setChecks(previous => {
      const items = previous[selected] ?? [];
      return { ...previous, [selected]: items.includes(key) ? items.filter(item => item !== key) : [...items, key] };
    });
  }

  function addPoint(point: Coordinate) {
    setDrafts(previous => {
      const points = previous[selected] ?? EMPTY_POINTS;
      return points.length >= 50 ? previous : { ...previous, [selected]: [...points, point] };
    });
  }

  function exportDraft() {
    if (waypoints.length < 2) return;
    const blob = new Blob([JSON.stringify({ type: "Feature", properties: { aircraft_id: selected, simulated: true },
      geometry: { type: "LineString", coordinates: waypoints } }, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selected + "-simulation-plan.geojson";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function switchMode(view: string) {
    setPlacing(false);
    goLive();
    navigate(view);
  }

  const visibleFleet = data.aircraft.filter(craft =>
    (!attentionOnly || craft.telemetry?.status === "attention") &&
    [craft.name, craft.id, craft.model].some(field => field.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const vehicleAlerts = data.alerts.filter(alert => alert.aircraft_id === selected);
  const activeCount = data.aircraft.filter(craft => craft.telemetry?.status === "active").length;

  return <div className="flight-deck">
    <header className="deck-top">
      <div className="deck-top-left">
        <a className="deck-logo" href="/" aria-label="Vektr homepage"><VektrLogo size={20} /></a>
        <details className="deck-menu">
          <summary>File</summary>
          <div className="deck-dropdown deck-glass">{pages.map(([id, label]) => <button key={id} type="button" onClick={event => {
            event.currentTarget.closest("details")?.removeAttribute("open");
            switchMode(id);
          }}>{label}</button>)}</div>
        </details>
        <details className="deck-menu">
          <summary>Widgets</summary>
          <div className="deck-dropdown deck-glass">
            <label><input type="checkbox" checked={trafficVisible} onChange={e => setTrafficVisible(e.target.checked)} /> Traffic view</label>
            <label><input type="checkbox" checked={cameraVisible} onChange={e => { setCameraVisible(e.target.checked); setExpanded(false); }} /> Simulated camera</label>
            <label><input type="checkbox" checked={tracksVisible} onChange={e => setTracksVisible(e.target.checked)} /> Recorded flight paths</label>
            <label><input type="checkbox" checked={rangeVisible} onChange={e => setRangeVisible(e.target.checked)} /> 1 km reference ring</label>
          </div>
        </details>
      </div>
      <nav className="deck-modes" aria-label="Workspace modes">
        <button type="button" aria-current={mode === "plan" ? "page" : undefined} onClick={() => switchMode("plan")}><DeckIcon name="route" /> Plan</button>
        <button type="button" aria-current={mode === "fly" ? "page" : undefined} onClick={() => switchMode("overview")}><DeckIcon name="live" /> Fly</button>
        <button type="button" onClick={() => switchMode("analytics")}><DeckIcon name="chart" /> Analyze</button>
      </nav>
      <div className="deck-top-right">
        <span className="deck-clock">{clock} UTC</span>
        <details className="deck-menu deck-session">
          <summary aria-label="Simulator settings"><i data-link={link} /><span>Simulation</span><DeckIcon name="chevron" size={13} /></summary>
          <div className="deck-dropdown deck-glass">
            <p>Simulated fleet · {link}</p>
            <label htmlFor="deck-scenario">Scenario</label>
            <select id="deck-scenario" value={data.simulator.scenario} onChange={e => void chooseScenario(e.target.value)}>
              {scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={() => void control(data.simulator.running ? "pause" : "resume")}>{data.simulator.running ? "Pause simulator" : "Resume simulator"}</button>
            <button type="button" onClick={() => void control("reset")}>Reset simulator</button>
          </div>
        </details>
      </div>
    </header>

    <main className="deck-workspace" aria-label="Vektr flight console">
      <aside className="deck-side" aria-label="Aircraft and instruments">
        <div className="deck-fleet-tools">
          <label><DeckIcon name="search" size={15} /><input aria-label="Search fleet" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search aircraft…" /></label>
          <DeskButton name="filter" label="Show aircraft needing attention" active={attentionOnly} onClick={() => setAttentionOnly(value => !value)} />
          <DeskButton name="inspect" label="Open aircraft diagnostics" onClick={() => setInspect(true)} />
        </div>
        <div className="deck-fleet" aria-label="Aircraft list">
          {visibleFleet.map(craft => {
            const telemetry = craft.id === selected ? activeSample : craft.telemetry;
            return <button key={craft.id} type="button" aria-pressed={selected === craft.id} className="deck-aircraft-row" onClick={() => selectCraft(craft.id)}>
              <AircraftGlyph kind={craft.kind} size={17} />
              <span><strong>{craft.name}</strong><small>{craft.id}</small></span>
              <span className="deck-row-battery">{telemetry ? telemetry.battery.percentage + "%" : "—"}</span>
              <i data-status={telemetry?.status ?? "offline"} title={telemetry?.status ?? "offline"} />
            </button>;
          })}
          {!visibleFleet.length && <p className="deck-empty">No aircraft match these filters.</p>}
        </div>

        <section className="deck-sidebar-panel" aria-label="Selected aircraft widgets">
          <nav aria-label="Aircraft widgets" className="deck-rail">
            <DeskButton name="gauge" label="Instruments" active={sidebar === "instruments"} onClick={() => setSidebar("instruments")} />
            <DeskButton name="checklist" label="Preflight checklist" active={sidebar === "checklist"} onClick={() => setSidebar("checklist")} />
            <DeskButton name="alert" label="Aircraft event log" active={sidebar === "events"} onClick={() => setSidebar("events")} />
            <DeskButton name="inspect" label="Inspect 3D airframe" onClick={() => setInspect(true)} />
          </nav>
          <div className="deck-sidebar-content">
            <header><h1>{mode === "plan" ? "MISSION PLAN" : sidebar === "instruments" ? "INSTRUMENTS" : sidebar === "checklist" ? "PREFLIGHT CHECKLIST" : "EVENT LOG"}</h1><span>{aircraft?.id}</span></header>
            {mode === "plan" ? <div className="deck-plan">
              <p>Sketch a survey route for this simulation.</p>
              <div className="deck-plan-actions">
                <button type="button" aria-pressed={placing} onClick={() => setPlacing(value => !value)}><DeckIcon name="plus" size={14} />{placing ? "Finish placing" : "Place on map"}</button>
                <button type="button" disabled={!aircraft?.telemetry || waypoints.length >= 50} onClick={() => aircraft?.telemetry && addPoint(positionOf(aircraft.telemetry))}>Add aircraft position</button>
              </div>
              {placing && <p role="status">Click the map to add a waypoint.</p>}
              <ol>{waypoints.map(([lng, lat], i) => <li key={i}><b>{String(i + 1).padStart(2, "0")}</b><span>{lat.toFixed(5)}, {lng.toFixed(5)}</span></li>)}</ol>
              <div className="deck-plan-actions">
                <button type="button" disabled={!waypoints.length} onClick={() => setDrafts(previous => ({ ...previous, [selected]: waypoints.slice(0, -1) }))}><DeckIcon name="undo" size={14} /> Undo</button>
                <button type="button" disabled={waypoints.length < 2} onClick={exportDraft}>Export GeoJSON</button>
              </div>
            </div> : sidebar === "instruments"
              ? <Instruments sample={activeSample} elapsed={elapsedFrom(samples, activeIndex)} replay={replayActive} />
              : sidebar === "checklist"
                ? <Preflight sample={activeSample} checks={checks[selected] ?? []} onToggle={toggleCheck} />
                : <div className="deck-events">{vehicleAlerts.length ? vehicleAlerts.map(alert => <article key={alert.id}>
                  <DeckIcon name="alert" size={14} /><div><strong>{alert.description}</strong><small>{new Date(alert.timestamp).toLocaleTimeString("en-GB", { timeZone: "UTC" })} UTC · {alert.state}</small></div>
                </article>) : <p className="deck-empty">No logged alerts for this aircraft.</p>}</div>}
          </div>
        </section>
      </aside>

      <div className="deck-main">
        <section className="deck-map" aria-label="Operations map and widgets">
          <MissionMap fleet={data.aircraft} selected={selected} onSelect={selectCraft} tracks={tracks}
            replaySample={replayActive ? activeSample : undefined} showTracks={tracksVisible} showRange={rangeVisible} satellite={satellite}
            tilted={tilted} focus={focus} waypoints={waypoints} placing={mode === "plan" && placing} onPlace={addPoint}
            onSeek={next => { if (mode === "fly") seek(next); }} />

          <nav className="deck-map-tools deck-glass" aria-label="Map tools">
            <DeskButton name="focus" label="Focus selected aircraft" onClick={() => moveFocus("aircraft")} />
            <DeskButton name="fleet" label="Fit fleet" onClick={() => moveFocus("fleet")} />
            <DeskButton name="layers" label="Satellite basemap" active={satellite} onClick={() => setSatellite(value => !value)} />
            <DeskButton name="route" label="Recorded flight paths" active={tracksVisible} onClick={() => setTracksVisible(value => !value)} />
            <DeskButton name="traffic" label="Toggle traffic view" active={trafficVisible} onClick={() => setTrafficVisible(value => !value)} />
            <DeskButton name="camera" label="Toggle camera" active={cameraVisible} onClick={() => { setCameraVisible(value => !value); setExpanded(false); }} />
            <DeskButton name="compass" label="Tilt map" active={tilted} onClick={() => setTilted(value => !value)} />
          </nav>
          {trafficVisible && <TrafficView fleet={data.aircraft} selected={selected} sample={activeSample} onSelect={selectCraft} />}
          {cameraVisible && mode === "fly" && !inspect && activeSample && <section className="deck-camera deck-glass" data-expanded={expanded} aria-label="Simulated aircraft camera">
            <header className="deck-float-head"><DeckIcon name="camera" size={14} /><strong>DRONE CAMERA</strong><span>{aircraft?.id}</span>
              <DeskButton name={expanded ? "close" : "expand"} label={expanded ? "Reduce camera" : "Expand camera"} onClick={() => setExpanded(value => !value)} />
            </header>
            <SimulatedCamera sample={activeSample} expanded={expanded} />
          </section>}
          <div className="deck-map-caption deck-glass"><i data-link={link} />{replayActive ? "Recorded flight" : "Fleet simulation"}<span>{activeCount}/{data.aircraft.length} active</span></div>
        </section>
        <ReplayTimeline flight={selectedFlight} aircraft={aircraft} sample={activeSample} replay={replayActive}
          index={activeIndex} playing={isPlaying} speed={speed} loading={loading} error={loadError}
          onSeek={next => { if (mode === "plan") navigate("overview"); seek(next); }}
          onPlay={() => { if (mode === "plan") navigate("overview"); play(); }}
          onLive={goLive} onSpeed={setSpeed} />
      </div>
    </main>
    {inspect && aircraft && <FlightDiagnostics aircraft={aircraft} data={data} onClose={() => setInspect(false)} />}
  </div>;
}

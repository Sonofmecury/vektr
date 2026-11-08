"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import type {Flight, Snapshot, Telemetry} from "@/lib/types";
import {request} from "@/lib/api";
import {aircraftShape} from "./AircraftGlyph";
import {InspectionIcon} from "./InspectionIcon";
import {ReplayTimeline, formatElapsed} from "./DeckWidgets";
import {MissionMap, SimulatedCamera} from "./MissionMap";

function SampleTrend({samples, index, label, metric}: {samples: Telemetry[]; index: number; label: string; metric: (sample: Telemetry) => number}) {
  const width = 150;
  const x = (sample: number) => sample * width / Math.max(1, samples.length - 1);
  const y = (value: number) => 25 - value / 4.5;
  const path = samples.map((sample, i) => x(i) + "," + y(metric(sample))).join(" ");
  return <svg viewBox="0 0 150 27" role="img" aria-label={label + " over the recording"}>
    <path d="M0 3H150M0 14H150M0 25H150" stroke="#a9c9c432"/>
    <polyline points={path} stroke="currentColor" fill="none" strokeWidth="1.5"/>
    <path d={"M" + x(index) + " 0v27"} stroke="#e8efed" strokeDasharray="2 2"/>
  </svg>;
}

export function FlightHistoryView({data}: {data: Snapshot}) {
  const [chosen, setChosen] = useState("");
  const flightId = data.flights.some(row => row.id === chosen) ? chosen : data.flights[0]?.id ?? "";
  const [record, setRecord] = useState<{id: string; flight?: Flight; error?: string}>();
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [satellite, setSatellite] = useState(true);
  const [tilted, setTilted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [fit, setFit] = useState(0);
  const flight = record?.id === flightId ? record?.flight : undefined;
  const error = record?.id === flightId ? record?.error : undefined;
  const samples = flight?.samples;
  const last = Math.max(0, (samples?.length ?? 0) - 1);
  const current = samples?.[Math.min(index, last)];
  const aircraft = data.aircraft.find(row => row.id === flight?.aircraft_id);
  const fleet = useMemo(() => aircraft && samples?.[0] ? [{...aircraft, telemetry: samples[0]}] : [], [aircraft, samples]);
  const tracks = useMemo(() => flight ? [flight] : [], [flight]);
  const focus = useMemo(() => ({kind: "fleet" as const, revision: fit, rightRatio: camera && !expanded ? .36 : 0}), [fit, flight, camera, expanded]);

  useEffect(() => {
    if (!flightId) return;
    const controller = new AbortController();
    request<Flight>("/api/flights/" + encodeURIComponent(flightId), {signal: controller.signal})
      .then(result => {if (!controller.signal.aborted) setRecord({id: flightId, flight: result});})
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setRecord({id: flightId, error: failure instanceof Error ? failure.message : "Recording unavailable"});
      });
    return () => controller.abort();
  }, [flightId, attempt]);

  useEffect(() => {
    if (!playing || !samples || index >= last) return;
    const interval = Math.max(1, Date.parse(samples[index + 1].timestamp) - Date.parse(samples[index].timestamp));
    const timer = window.setTimeout(() => {
      setIndex(index + 1);
      if (index + 1 >= last) setPlaying(false);
    }, interval / speed);
    return () => window.clearTimeout(timer);
  }, [playing, samples, index, speed, last]);

  const seek = useCallback((sample: number) => {
    setPlaying(false);
    setIndex(sample);
  }, []);
  function togglePlay() {
    if (index >= last) setIndex(0);
    setPlaying(!playing && last > 0);
  }

  const rows = data.flights.filter(row => [row.id, row.aircraft_id, row.mission].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="wb-history">
    <section className="deck-map wb-history-map" aria-label="Flight replay map">
      <MissionMap fleet={fleet} selected={flight?.aircraft_id ?? ""} onSelect={() => setFit(v => v + 1)}
        tracks={tracks} replaySample={current} showTracks showRange satellite={satellite} tilted={tilted} focus={focus}
        waypoints={[]} placing={false} onPlace={() => {}} onSeek={seek}/>
      <div className="wb-map-heading wb-glass">
        <InspectionIcon name="plan" width={18} height={18}/>
        <div><span>RECORDED SIMULATION</span><h1>{flight?.mission || "Flight review"}</h1></div>
      </div>
      <div className="wb-map-tools wb-glass" aria-label="Replay map controls">
        <button type="button" className="wb-icon" title={satellite ? "Switch to street map" : "Switch to satellite map"} aria-label={satellite ? "Switch to street map" : "Switch to satellite map"} aria-pressed={satellite} onClick={() => setSatellite(v => !v)}><InspectionIcon name="layers"/></button>
        <button type="button" className="wb-icon" aria-label="Tilt map" title="Tilt map" aria-pressed={tilted} onClick={() => setTilted(v => !v)}>{tilted ? "3D" : "2D"}</button>
        <button type="button" className="wb-icon" aria-label="Fit flight path" title="Fit flight path" onClick={() => setFit(v => v + 1)}><InspectionIcon name="focus"/></button>
        <button type="button" className="wb-icon" aria-label="Toggle simulated camera" title="Toggle simulated camera" aria-pressed={camera} onClick={() => setCamera(v => !v)}><InspectionIcon name="camera"/></button>
      </div>
      {current && camera && <section className="wb-camera wb-glass" data-expanded={expanded} aria-label="Simulated camera">
        <header><InspectionIcon name="camera"/><strong>Simulated camera</strong><span>{flight?.aircraft_id}</span>
          <button type="button" className="wb-icon" aria-label={expanded ? "Restore camera size" : "Expand camera"} aria-pressed={expanded} onClick={() => setExpanded(v => !v)}><InspectionIcon name="expand" width={15} height={15}/></button>
        </header>
        <SimulatedCamera sample={current} expanded={expanded}/>
        <footer><span>{current.position.latitude.toFixed(4)}°, {current.position.longitude.toFixed(4)}°</span><time>{new Date(current.timestamp).toLocaleTimeString("en-GB", {timeZone: "UTC"})} UTC</time></footer>
      </section>}
      <div className="wb-map-key wb-glass"><i/> Flight path <i/> 1 km range</div>
    </section>
    <section className="wb-history-timeline" aria-label="Recording transport">
      <ReplayTimeline flight={flight} aircraft={aircraft} sample={current} replay index={index} playing={playing} speed={speed}
        loading={!!flightId && !flight && !error} error={error ?? ""} onSeek={seek} onPlay={togglePlay} onSpeed={setSpeed}/>
      {error && <button type="button" className="wb-control wb-retry" onClick={() => {setRecord(undefined); setAttempt(v => v + 1);}}>Retry recording</button>}
    </section>
    <aside className="wb-recordings">
      <section className="wb-glass wb-library">
        <header className="wb-panel-head"><InspectionIcon name="plan"/><h2>Recordings</h2><span>{rows.length}</span></header>
        <label className="wb-search"><InspectionIcon name="search"/><input aria-label="Search recordings" placeholder="Find a flight" value={query} onChange={e => setQuery(e.target.value)}/></label>
        <div className="wb-rows">{rows.map(row => {
          const craft = data.aircraft.find(item => item.id === row.aircraft_id);
          const shape = aircraftShape(craft?.kind ?? "");
          return <button type="button" key={row.id} aria-pressed={row.id === flightId} className="wb-row" onClick={() => {
            if (row.id !== flightId) {seek(0); setChosen(row.id); setRecord(undefined);}
          }}>
            {craft && <InspectionIcon name={shape === "fixed" ? "airframe" : shape}/>}
            <span><strong>{row.mission || row.id}</strong><small>{row.id} · {new Date(row.started_at).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"})}</small></span>
            <em>{formatElapsed(row.duration_s)}</em>
          </button>;
        })}{!rows.length && <p className="wb-empty">No matching recordings.</p>}</div>
      </section>
      {current && samples && <section className="wb-glass">
        <header className="wb-panel-head"><InspectionIcon name="gauge"/><h2>Recorded telemetry</h2></header>
        <dl className="wb-readouts">
          <div><dt>Battery</dt><dd>{current.battery.percentage}%</dd></div>
          <div><dt>Signal</dt><dd>{current.connectivity.signal_quality}%</dd></div>
          <div><dt>Link</dt><dd>{current.connectivity.status}</dd></div>
          <div><dt>Sensor</dt><dd>{current.sensor_status}</dd></div>
        </dl>
        <div className="wb-trends">
          <div><span>Battery</span><SampleTrend samples={samples} index={index} label="Battery level" metric={sample => sample.battery.percentage}/></div>
          <div><span>Signal</span><SampleTrend samples={samples} index={index} label="Signal quality" metric={sample => sample.connectivity.signal_quality}/></div>
        </div>
      </section>}
    </aside>
  </div>;
}

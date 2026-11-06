"use client";
import {useEffect, useMemo, useRef, useState} from "react";
import * as maplibregl from "maplibre-gl";
import type {Flight, Snapshot, Telemetry} from "@/lib/types";
import {request} from "@/lib/api";

function ReplayMap({samples, index}: {samples: Telemetry[]; index: number}) {
  const id = "replay-map";
  const markerRef = useRef<maplibregl.Marker | null>(null);
  useEffect(() => {
    if (!samples.length) return;
    maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    const map = new maplibregl.Map({container: id,
      style: {version: 8, sources: {base: {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"], tileSize: 256,
        attribution: '© <a href="https://www.esri.com">Esri</a>, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}}, layers: [{id:"base",type:"raster",source:"base"}]},
      center: [samples[0].position.longitude, samples[0].position.latitude], zoom: 12});
    const marker = new maplibregl.Marker({color: "#d9ae68"}).setLngLat([samples[0].position.longitude, samples[0].position.latitude]).addTo(map);
    const coords = samples.map(s => [s.position.longitude, s.position.latitude] as [number, number]);
    map.on("load", () => {
      map.addSource("track", {type:"geojson", data: {type:"Feature", properties:{}, geometry:{type:"LineString",coordinates:coords}}});
      map.addLayer({id:"track", type:"line", source:"track", paint:{"line-color":"#d9ae68","line-width":3,"line-opacity":0.85}});
      const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]); coords.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, {padding: 60, maxZoom: 13, duration: 0});
    });
    markerRef.current = marker;
    return () => {markerRef.current = null; map.remove();};
  }, [samples]);
  useEffect(() => {const s = samples[index]; if (s) markerRef.current?.setLngLat([s.position.longitude, s.position.latitude]);}, [index, samples]);
  return <div id={id} className="replay-map" aria-label="Recorded simulated flight path" />;
}

function AltitudeChart({samples, index}: {samples: Telemetry[]; index: number}) {
  if (!samples.length) return null;
  const values = samples.map(s => s.position.altitude_m);
  const min = Math.min(...values) - 5, max = Math.max(...values) + 5;
  const points = values.map((v, i) => `${(i/(values.length-1))*100},${55-((v-min)/(max-min))*48}`).join(" ");
  const x = index/(values.length-1)*100;
  return <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="replay-chart" role="img" aria-label="Recorded altitude over flight time"><path d="M0 58H100" stroke="#30404b" strokeWidth=".4"/><polyline points={points} fill="none" stroke="#d9ae68" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/><path d={`M${x} 4V58`} stroke="#e8eef2" strokeWidth=".5" strokeDasharray="1 1"/><circle cx={x} cy={55-((values[index]-min)/(max-min))*48} r="1.2" fill="#e8eef2"/></svg>;
}

export function FlightHistoryView({data}: {data: Snapshot}) {
  const [flightId, setFlightId] = useState(data.flights[0]?.id || "");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {let alive = true; setPlaying(false); setIndex(0); request<Flight>(`/api/flights/${flightId}`).then(f => {if (alive) setFlight(f);}); return () => {alive = false;};}, [flightId]);
  useEffect(() => {if (!playing || !flight?.samples?.length) return; const timer = window.setInterval(() => setIndex(i => {if (i >= flight.samples!.length-1) {setPlaying(false); return i;} return Math.min(flight.samples!.length-1, i+speed);}), 160); return () => window.clearInterval(timer);}, [playing, speed, flight]);
  const samples = useMemo(() => flight?.samples || [], [flight]);
  const current = samples[index];
  return <><section className="page-heading"><div><span className="eyebrow">HISTORY / REPLAY</span><h1>Flight review</h1><p>One timeline controls recorded position and altitude. All flights are deterministic simulation data.</p></div><span className="simulation-label">● RECORDED SIMULATION</span></section>
    <div className="history-layout"><section className="panel flight-index"><div className="panel-heading"><div><span className="eyebrow">FLIGHT SESSIONS</span><h2>Recordings</h2></div></div>{data.flights.map(f => <button key={f.id} type="button" className={`flight-item ${flightId===f.id?"selected":""}`} onClick={() => setFlightId(f.id)}><strong>{f.id}</strong><span>{f.aircraft_id} · {new Date(f.started_at).toLocaleDateString("en-GB")}</span><small>{Math.round(f.duration_s/60)} MIN · {f.sample_count} SAMPLES</small></button>)}</section>
    <div className="history-detail"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">GEOGRAPHIC REPLAY</span><h2>{flight?.id || "Loading flight"}</h2></div><span className="panel-meta">{flight?.aircraft_id}</span></div>{samples.length ? <ReplayMap samples={samples} index={index}/> : <div className="empty-state">Loading recorded path…</div>}</section>
      <section className="panel replay-controls"><div className="panel-heading"><div><span className="eyebrow">SYNCHRONIZED SERIES</span><h2>Altitude and timeline</h2></div><span className="panel-meta">{current ? new Date(current.timestamp).toLocaleTimeString("en-GB", {timeZone:"UTC"}) : "—"} UTC</span></div><AltitudeChart samples={samples} index={index}/><div className="replay-transport"><button type="button" onClick={() => setPlaying(v => !v)} disabled={!samples.length}>{playing ? "Pause" : "Play"}</button><input aria-label="Flight timeline" type="range" min="0" max={Math.max(0,samples.length-1)} value={index} onChange={e => {setPlaying(false); setIndex(Number(e.target.value));}}/><select aria-label="Playback speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></div><div className="replay-readout">{current ? <><span>ALTITUDE <strong>{current.position.altitude_m.toFixed(1)} m</strong></span><span>SPEED <strong>{current.ground_speed_mps.toFixed(1)} m/s</strong></span><span>BATTERY <strong>{current.battery.percentage}%</strong></span><span>GPS <strong>{current.gps_fix}</strong></span></> : null}</div></section></div></div></>;
}

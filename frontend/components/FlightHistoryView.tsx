"use client";
import {useEffect, useMemo, useRef, useState} from "react";
import * as maplibregl from "maplibre-gl";
import type {Flight, Snapshot, Telemetry} from "@/lib/types";
import {request} from "@/lib/api";

function ReplayMap({samples, index}: {samples: Telemetry[]; index: number}) {
  const id = "replay-map";
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  useEffect(() => {
    if (!samples.length) return;
    const map = new maplibregl.Map({container: id,
      style: {version: 8, sources: {base: {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"], tileSize: 256,
        attribution: '© <a href="https://www.esri.com">Esri</a>, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}}, layers: [{id:"base",type:"raster",source:"base"}]},
      center: [samples[0].position.longitude, samples[0].position.latitude], zoom: 12});
    const marker = new maplibregl.Marker({color: "#d78360"}).setLngLat([samples[0].position.longitude, samples[0].position.latitude]).addTo(map);
    const coords = samples.map(s => [s.position.longitude, s.position.latitude] as [number, number]);
    map.on("load", () => {
      map.addSource("track", {type:"geojson", data: {type:"Feature", properties:{}, geometry:{type:"LineString",coordinates:coords}}});
      map.addLayer({id:"track", type:"line", source:"track", paint:{"line-color":"#d78360","line-width":2,"line-opacity":0.45}});
      map.addSource("progress", {type:"geojson", data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:coords.slice(0,2)}}});
      map.addLayer({id:"progress",type:"line",source:"progress",paint:{"line-color":"#f2b294","line-width":4}});
      const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]); coords.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, {padding: 60, maxZoom: 13, duration: 0});
    });
    markerRef.current = marker; mapRef.current=map;
    return () => {markerRef.current = null;mapRef.current=null; map.remove();};
  }, [samples]);
  useEffect(() => {const s = samples[index]; if (s) markerRef.current?.setLngLat([s.position.longitude, s.position.latitude]);const source=mapRef.current?.getSource("progress") as maplibregl.GeoJSONSource|undefined;if(source)source.setData({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:samples.slice(0,Math.max(index+1,2)).map(row=>[row.position.longitude,row.position.latitude])}});}, [index, samples]);
  return <div id={id} className="replay-map" aria-label="Recorded simulated flight path" />;
}

function SeriesChart({samples, index, label, values, color, unit}: {samples: Telemetry[]; index: number; label:string; values:number[]; color:string; unit:string}) {
  if (!samples.length) return null;
  const min = Math.min(...values) - 5, max = Math.max(...values) + 5;
  const points = values.map((v, i) => `${(i/(values.length-1))*100},${55-((v-min)/(max-min))*48}`).join(" ");
  const x = index/(values.length-1)*100;
  return <div className="replay-series"><div><span>{label}</span><strong>{values[index].toFixed(label==="ALTITUDE"?1:0)} {unit}</strong></div><svg viewBox="0 0 100 60" preserveAspectRatio="none" className="replay-chart" role="img" aria-label={`${label.toLowerCase()} over flight time`}><path d="M0 58H100" stroke="#52605b" strokeWidth=".4"/><polyline points={points} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke"/><path d={`M${x} 4V58`} stroke="#e8eee7" strokeWidth=".5" strokeDasharray="1 1"/><circle cx={x} cy={55-((values[index]-min)/(max-min))*48} r="1.5" fill="#e8eee7"/></svg></div>;
}

export function FlightHistoryView({data}: {data: Snapshot}) {
  const [flightId, setFlightId] = useState(data.flights[0]?.id || "");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loadError,setLoadError]=useState("");
  useEffect(() => {let alive = true; setPlaying(false); setIndex(0);setFlight(null);setLoadError(""); if(!flightId)return;request<Flight>(`/api/flights/${flightId}`).then(f => {if (alive) setFlight(f);}).catch(e=>{if(alive)setLoadError(e instanceof Error?e.message:"Could not load flight")}); return () => {alive = false;};}, [flightId]);
  useEffect(() => {if (!playing || !flight?.samples?.length) return; const timer = window.setInterval(() => setIndex(i => {if (i >= flight.samples!.length-1) {setPlaying(false); return i;} return Math.min(flight.samples!.length-1, i+speed);}), 160); return () => window.clearInterval(timer);}, [playing, speed, flight]);
  const samples = useMemo(() => flight?.samples || [], [flight]);
  const current = samples[index];
  return <><section className="page-heading"><div><span className="eyebrow">HISTORY / REPLAY</span><h1>Flight review</h1><p>One timeline controls recorded position and altitude. All flights are deterministic simulation data.</p></div><span className="simulation-label">● RECORDED SIMULATION</span></section>
    <div className="history-layout"><section className="panel flight-index"><div className="panel-heading"><div><span className="eyebrow">FLIGHT SESSIONS</span><h2>Recordings</h2></div></div>{data.flights.map(f => <button key={f.id} type="button" className={`flight-item ${flightId===f.id?"selected":""}`} onClick={() => setFlightId(f.id)}><strong>{f.id}</strong><span>{f.mission||f.aircraft_id}</span><small>{f.aircraft_id} · {new Date(f.started_at).toLocaleDateString("en-GB")}</small></button>)}</section>
    <div className="history-detail"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">GEOGRAPHIC REPLAY / {flight?.mission||"SIMULATED MISSION"}</span><h2>{flight?.id || "Loading flight"}</h2></div><span className="panel-meta">{flight?.aircraft_id}</span></div>{samples.length ? <ReplayMap samples={samples} index={index}/> : <div className="empty-state">{loadError||"Loading recorded path…"}</div>}</section>
      <section className="panel replay-controls"><div className="panel-heading"><div><span className="eyebrow">SYNCHRONIZED SERIES</span><h2>Recorded telemetry</h2></div><span className="panel-meta">{current ? new Date(current.timestamp).toLocaleTimeString("en-GB", {timeZone:"UTC"}) : "—"} UTC</span></div>{samples.length>0&&<div className="replay-series-grid"><SeriesChart samples={samples} index={index} label="ALTITUDE" unit="m" color="#d78360" values={samples.map(s=>s.position.altitude_m)}/><SeriesChart samples={samples} index={index} label="BATTERY" unit="%" color="#9fc6a7" values={samples.map(s=>s.battery.percentage)}/><SeriesChart samples={samples} index={index} label="SIGNAL" unit="%" color="#a7bfc5" values={samples.map(s=>s.connectivity.signal_quality)}/></div>}<div className="replay-transport"><button type="button" onClick={() => setPlaying(v => !v)} disabled={!samples.length}>{playing ? "Pause" : "Play"}</button><input aria-label="Flight timeline" type="range" min="0" max={Math.max(0,samples.length-1)} value={index} onChange={e => {setPlaying(false); setIndex(Number(e.target.value));}}/><select aria-label="Playback speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></div><div className="replay-readout">{current ? <><span>POSITION <strong>{current.position.latitude.toFixed(4)}, {current.position.longitude.toFixed(4)}</strong></span><span>SPEED <strong>{current.ground_speed_mps.toFixed(1)} m/s</strong></span><span>LINK <strong>{current.connectivity.status}</strong></span><span>SENSOR <strong>{current.sensor_status}</strong></span></> : null}</div>{Boolean(flight?.events?.length)&&<div className="replay-events"><div className="replay-events-title">FLIGHT EVENTS / SELECT TO SEEK</div>{flight!.events!.map(event=><button key={`${event.category}-${event.sample_index}`} type="button" className={index>=event.sample_index?"passed":""} onClick={()=>{setPlaying(false);setIndex(event.sample_index)}}><span>{String(event.sample_index+1).padStart(2,"0")}</span><strong>{event.title}</strong><small>{new Date(event.timestamp).toLocaleTimeString("en-GB",{timeZone:"UTC"})} UTC</small></button>)}</div>}</section></div></div></>;
}

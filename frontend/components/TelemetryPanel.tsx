"use client";
import {useEffect, useState} from "react";
import type {Aircraft, Telemetry} from "@/lib/types";

function Plot({values}: {values: number[]}) {
  const min = Math.min(...values, 0), max = Math.max(...values, 1), span = max - min || 1;
  const points = values.map((v, i) => `${(i / Math.max(values.length-1, 1))*100},${38-((v-min)/span)*35}`).join(" ");
  return <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="telemetry-plot" role="img" aria-label="Recent altitude trend"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

export function TelemetryPanel({aircraft}: {aircraft: Aircraft | undefined}) {
  const telemetry = aircraft?.telemetry;
  const [points, setPoints] = useState<number[]>([]);
  useEffect(() => {setPoints([]);}, [aircraft?.id]);
  useEffect(() => {if (telemetry) setPoints(prev => [...prev.slice(-39), telemetry.position.altitude_m]);}, [telemetry]);
  if (!aircraft || !telemetry) return <div className="empty-state">Select an aircraft to inspect its telemetry.</div>;
  const rows: [string, string][] = [
    ["Altitude", `${telemetry.position.altitude_m.toFixed(0)} m`], ["Ground speed", `${telemetry.ground_speed_mps.toFixed(1)} m/s`],
    ["Heading", `${telemetry.heading_deg.toFixed(0)}°`], ["Battery", `${telemetry.battery.percentage}%`],
    ["Voltage", `${telemetry.battery.voltage_v.toFixed(1)} V`], ["Temperature", `${telemetry.battery.temperature_c.toFixed(1)}°C`],
    ["GPS fix", `${telemetry.gps_fix} · ${telemetry.gps_satellites} sats`], ["Signal", `${telemetry.connectivity.signal_quality}%`],
  ];
  return <div className="telemetry-body">
    <div className="telemetry-identity"><div><span className="eyebrow">SELECTED AIRCRAFT</span><h3>{aircraft.name}</h3><span>{aircraft.id} · {aircraft.model}</span></div><span className={`status-pill ${telemetry.status}`}>{telemetry.status}</span></div>
    <div className="telemetry-trend"><div><span className="eyebrow">ALTITUDE TREND</span><strong>{telemetry.position.altitude_m.toFixed(0)} <small>m</small></strong></div><Plot values={points.length > 1 ? points : [telemetry.position.altitude_m, telemetry.position.altitude_m]} /></div>
    <div className="telemetry-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="telemetry-foot"><span className={`signal-dot ${telemetry.connectivity.status}`} />{telemetry.connectivity.status} · updated {new Date(telemetry.timestamp).toLocaleTimeString("en-GB", {timeZone: "UTC"})} UTC</div>
  </div>;
}

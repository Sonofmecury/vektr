"use client";
import type {Aircraft, Snapshot} from "@/lib/types";
import {FleetMap} from "./FleetMap";
import {TelemetryPanel} from "./TelemetryPanel";

export function OverviewView({data, selected, onSelect, link}: {data: Snapshot; selected: string; onSelect: (id: string) => void; link: string}) {
  const fleet = data.aircraft;
  const active = fleet.filter(a => a.telemetry?.status === "active").length;
  const available = fleet.filter(a => a.telemetry?.status === "available").length;
  const attention = fleet.filter(a => a.telemetry?.status === "attention").length;
  const openAlerts = data.alerts.filter(a => a.state !== "resolved").length;
  const selectedAircraft = fleet.find(a => a.id === selected);
  return <div className="operation-overview">
    <div className="operation-title"><div><span className="eyebrow">VEKTR / OPERATIONS DESK</span><h1>Fleet picture</h1><p>Simulated civilian aircraft · Observation only</p></div><div className="operation-summary" aria-label="Fleet summary"><span><strong>{active}</strong>IN FLIGHT</span><span><strong>{available}</strong>AVAILABLE</span><span className={attention?"summary-attention":""}><strong>{attention}</strong>ATTENTION</span><span><strong>{openAlerts}</strong>OPEN ALERTS</span></div></div>
    <div className="operation-workspace">
      <section className="operation-fleet" aria-label="Fleet aircraft"><div className="operation-column-head"><span>FLEET / {String(fleet.length).padStart(2,"0")}</span><strong>Aircraft</strong><small>SELECT TO INSPECT</small></div><div className="operation-fleet-list">{fleet.map(a=><FleetRow key={a.id} aircraft={a} selected={selected===a.id} onSelect={()=>onSelect(a.id)}/>)}</div><div className="operation-fleet-foot"><span>READINESS</span><strong>{Math.round((fleet.length-attention)/Math.max(fleet.length,1)*100)}%</strong><small>Aircraft without active attention state</small></div></section>
      <section className="operation-map" aria-label="Fleet map"><div className="operation-map-head"><div><span className="eyebrow">GEOGRAPHIC PICTURE</span><h2>Operating area</h2></div><span className="panel-meta">NIGERIA / WGS84</span></div><div className="operation-map-frame"><FleetMap aircraft={fleet} selected={selected} onSelect={onSelect}/></div><div className="operation-map-foot"><span>SIMULATED POSITIONS</span><span>SELECT A MARKER OR AIRCRAFT TO INSPECT</span></div></section>
      <aside className="operation-detail" aria-label="Aircraft context"><div className="operation-column-head"><span>SELECTED / {selected}</span><strong>Aircraft context</strong><small>{link === "connected" ? "TELEMETRY STREAMING" : `LINK ${link.toUpperCase()}`}</small></div>{link!=="connected"&&<div className="stale-banner">Telemetry link {link}. Values may be stale.</div>}<TelemetryPanel aircraft={selectedAircraft}/><div className="operation-alerts"><div className="operation-alerts-head"><span>ACTIVE EXCEPTIONS</span><strong>{openAlerts}</strong></div><div className="activity-list">{data.alerts.length?data.alerts.slice(0,4).map(a=><div key={a.id} className="activity-item"><span className={`severity-marker ${a.severity}`}/><div><strong>{a.description}</strong><span>{a.aircraft_id} · {new Date(a.timestamp).toLocaleTimeString("en-GB",{timeZone:"UTC"})} UTC</span></div></div>):<div className="empty-state">No active exceptions in this scenario.</div>}</div></div></aside>
    </div>
  </div>;
}

export function FleetRow({aircraft, selected, onSelect}: {aircraft: Aircraft; selected: boolean; onSelect: () => void}) {
  const t = aircraft.telemetry;
  return <button type="button" onClick={onSelect} className={`fleet-row ${selected ? "selected" : ""}`}><span className={`fleet-row-icon ${t?.status || "available"}`}>✦</span><span className="fleet-row-name"><strong>{aircraft.name}</strong><small>{aircraft.id} · {aircraft.kind}</small></span><span className="fleet-row-battery">{t?.battery.percentage ?? "—"}%<small>BATTERY</small></span><span className={`status-pill ${t?.status || "available"}`}>{t?.status || "unknown"}</span></button>;
}

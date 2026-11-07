"use client";
import type {Aircraft, Snapshot} from "@/lib/types";
import {FleetMap} from "./FleetMap";
import {TelemetryPanel} from "./TelemetryPanel";
import dynamic from "next/dynamic";

const DroneShowcase = dynamic(() => import("./DroneShowcase").then(m => m.DroneShowcase), {ssr: false});

function Metric({label, value, unit, tone}: {label: string; value: string | number; unit?: string; tone?: string}) {
  return <div className="metric"><span>{label}</span><strong className={tone || ""}>{value}<small>{unit}</small></strong></div>;
}

export function OverviewView({data, selected, onSelect, link}: {data: Snapshot; selected: string; onSelect: (id: string) => void; link: string}) {
  const fleet = data.aircraft;
  const active = fleet.filter(a => a.telemetry?.status === "active").length;
  const available = fleet.filter(a => a.telemetry?.status === "available").length;
  const attention = fleet.filter(a => a.telemetry?.status === "attention").length;
  const openAlerts = data.alerts.filter(a => a.state !== "resolved").length;
  const selectedAircraft = fleet.find(a => a.id === selected);
  return <>
    <section className="page-heading overview-heading"><div className="overview-intro"><span className="eyebrow">VEKTR / OPERATIONS INTELLIGENCE</span><h1>Every aircraft.<br/><em>One clear picture.</em></h1><p>Explore simulated positions, fleet health, and flight evidence in one connected workspace.</p><span className="simulation-label">● ILLUSTRATIVE FLEET · NO AIRCRAFT CONTROL</span></div><DroneShowcase/></section>
    <section className="metric-strip" aria-label="Fleet metrics">
      <Metric label="TOTAL AIRCRAFT" value={fleet.length} />
      <Metric label="IN FLIGHT" value={active} tone="metric-positive" />
      <Metric label="AVAILABLE" value={available} />
      <Metric label="NEEDS ATTENTION" value={attention} tone={attention ? "metric-warning" : ""} />
      <Metric label="READINESS" value={Math.round((fleet.length-attention)/Math.max(fleet.length,1)*100)} unit="%" />
      <Metric label="OPEN ALERTS" value={openAlerts} tone={openAlerts ? "metric-warning" : ""} />
    </section>
    <div className="overview-grid">
      <div className="overview-main">
        <section className="panel map-panel"><div className="panel-heading"><div><span className="eyebrow">LIVE OPERATIONS MAP</span><h2>Where the fleet stands</h2></div><span className="panel-meta">NIGERIA · {fleet.length} AIRCRAFT</span></div><div className="map-frame"><FleetMap aircraft={fleet} selected={selected} onSelect={onSelect} /></div></section>
        <section className="panel fleet-panel"><div className="panel-heading"><div><span className="eyebrow">02 / REGISTRY</span><h2>Aircraft status</h2></div><span className="panel-meta">SELECT TO INSPECT</span></div><div className="fleet-list">{fleet.map(a => <FleetRow key={a.id} aircraft={a} selected={selected === a.id} onSelect={() => onSelect(a.id)} />)}</div></section>
      </div>
      <div className="overview-side">
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">03 / TELEMETRY</span><h2>Aircraft detail</h2></div><span className="panel-meta">{link === "connected" ? "STREAMING" : link.toUpperCase()}</span></div>{link !== "connected" && <div className="stale-banner">Telemetry link {link}. Values may be stale.</div>}<TelemetryPanel aircraft={selectedAircraft} /></section>
        <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">04 / ACTIVITY</span><h2>Recent alerts</h2></div><span className="panel-meta">{openAlerts} OPEN</span></div><div className="activity-list">{data.alerts.length ? data.alerts.slice(0, 5).map(a => <div key={a.id} className="activity-item"><span className={`severity-marker ${a.severity}`} /><div><strong>{a.description}</strong><span>{a.aircraft_id} · {new Date(a.timestamp).toLocaleTimeString("en-GB", {timeZone:"UTC"})} UTC</span></div></div>) : <div className="empty-state">No alerts in this scenario. Select a fault scenario to watch the system respond.</div>}</div></section>
      </div>
    </div>
  </>;
}

export function FleetRow({aircraft, selected, onSelect}: {aircraft: Aircraft; selected: boolean; onSelect: () => void}) {
  const t = aircraft.telemetry;
  return <button type="button" onClick={onSelect} className={`fleet-row ${selected ? "selected" : ""}`}><span className={`fleet-row-icon ${t?.status || "available"}`}>✦</span><span className="fleet-row-name"><strong>{aircraft.name}</strong><small>{aircraft.id} · {aircraft.kind}</small></span><span className="fleet-row-battery">{t?.battery.percentage ?? "—"}%<small>BATTERY</small></span><span className={`status-pill ${t?.status || "available"}`}>{t?.status || "unknown"}</span></button>;
}

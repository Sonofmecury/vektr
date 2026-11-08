"use client";

import {useEffect, useState, type ReactNode} from "react";
import dynamic from "next/dynamic";
import type {Snapshot} from "@/lib/types";
import {request} from "@/lib/api";
import {aircraftShape} from "./AircraftGlyph";
import {InspectionIcon, type InspectionIconName} from "./InspectionIcon";

const publicDemo = process.env.NEXT_PUBLIC_PUBLIC_DEMO === "true";
const Aircraft3DViewer = dynamic(() => import("./Aircraft3DViewer"), {
  ssr: false, loading: () => <div className="wb-stage-loading">Loading aircraft model…</div>,
});

function Panel({icon, title, meta, children}: {icon: InspectionIconName; title: string; meta?: ReactNode; children: ReactNode}) {
  return <section className="wb-glass">
    <header className="wb-panel-head"><InspectionIcon name={icon}/><h2>{title}</h2>{meta && <span>{meta}</span>}</header>
    {children}
  </section>;
}

function ViewHeader({icon, title, status, children}: {icon: InspectionIconName; title: string; status?: string; children?: ReactNode}) {
  return <header className="wb-view-head">
    <span className="wb-view-icon"><InspectionIcon name={icon} width={22} height={22}/></span>
    <div><h1>{title}</h1>{status && <p>{status}</p>}</div>
    {children && <div className="wb-view-controls">{children}</div>}
  </header>;
}

function Readouts({items}: {items: [string, ReactNode][]}) {
  return <dl className="wb-readouts">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function Pill({value}: {value: string}) {
  return <span className="wb-pill" data-value={value}>{value.replaceAll("_", " ")}</span>;
}

function aircraftIcon(kind: string) {
  const shape = aircraftShape(kind);
  return shape === "fixed" ? "airframe" : shape;
}

function date(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {timeZone: "UTC"});
}

export function FleetView({data, selected, onSelect}: {data: Snapshot; selected: string; onSelect: (id: string) => void}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("id");
  const [mode, setMode] = useState<"list" | "cards">("list");
  const filtered = data.aircraft.filter(a => `${a.id} ${a.name} ${a.model}`.toLowerCase().includes(query.toLowerCase()) &&
    (status === "all" || a.telemetry?.status === status)).sort((a, b) => sort === "battery"
      ? (a.telemetry?.battery.percentage ?? 0) - (b.telemetry?.battery.percentage ?? 0) : a.id.localeCompare(b.id));
  const craft = data.aircraft.find(a => a.id === selected) ?? data.aircraft[0];
  const telemetry = craft?.telemetry;
  return <div className="wb-fleet">
    <section className="wb-fleet-stage" aria-label="Aircraft inspection">
      {craft && <label className="inspection-mobile-picker"><InspectionIcon name="fleet"/> Aircraft
        <select aria-label="Select aircraft to inspect" value={craft.id} onChange={event => onSelect(event.target.value)}>
          {data.aircraft.map(aircraft => <option key={aircraft.id} value={aircraft.id}>{aircraft.name} · {aircraft.id}</option>)}
        </select>
      </label>}
      <Aircraft3DViewer immersive aircraft={craft} maintenance={data.maintenance.filter(m => m.aircraft_id === craft?.id)}/>
    </section>
    <aside className="wb-fleet-sidebar">
      <Panel icon="fleet" title="Aircraft registry" meta={filtered.length}>
        <div className="wb-fleet-filters">
          <label className="wb-search"><InspectionIcon name="search"/><input aria-label="Search aircraft" placeholder="Find an aircraft" value={query} onChange={e => setQuery(e.target.value)}/></label>
          <div className="wb-filter-line">
            <select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="available">Available</option><option value="attention">Needs attention</option></select>
            <select aria-label="Sort aircraft" value={sort} onChange={e => setSort(e.target.value)}><option value="id">By ID</option><option value="battery">Low battery</option></select>
            <button type="button" className="wb-icon" aria-pressed={mode === "cards"} aria-label="Toggle aircraft cards" title="Toggle aircraft cards" onClick={() => setMode(v => v === "list" ? "cards" : "list")}><InspectionIcon name="cards"/></button>
          </div>
        </div>
        <div className="wb-rows" data-mode={mode}>{filtered.map(a => <button key={a.id} type="button" className="wb-row" aria-pressed={craft?.id === a.id} onClick={() => onSelect(a.id)}>
          <InspectionIcon name={aircraftIcon(a.kind)}/><span><strong>{a.name}</strong><small>{a.id} · {a.model}</small></span>
          <em data-value={a.telemetry?.status}>{a.telemetry ? a.telemetry.battery.percentage + "%" : "—"}</em>
        </button>)}{!filtered.length && <p className="wb-empty">No matching aircraft.</p>}</div>
      </Panel>
      {craft && <Panel icon="cutaway" title="Airframe record" meta={<Pill value={telemetry?.status ?? "unknown"}/>}>
        <Readouts items={[
          ["Serial", craft.serial], ["Firmware", craft.firmware], ["Flight hours", craft.flight_hours.toFixed(1) + " h"],
          ["Battery health", craft.battery_health + "%"], ["Battery cycles", craft.battery_cycles], ["GPS", telemetry ? telemetry.gps_satellites + " sats" : "—"],
          ["Altitude", telemetry ? telemetry.position.altitude_m.toFixed(1) + " m" : "—"], ["Speed", telemetry ? telemetry.ground_speed_mps.toFixed(1) + " m/s" : "—"],
          ["Sensor", telemetry?.sensor_status ?? "—"], ["Heading", telemetry ? Math.round(telemetry.heading_deg) + "°" : "—"],
          ["Position", telemetry ? `${telemetry.position.latitude.toFixed(4)}°, ${telemetry.position.longitude.toFixed(4)}°` : "—"],
        ]}/>
      </Panel>}
    </aside>
  </div>;
}

function BarPanel({icon, title, unit, rows, max, tone}: {
  icon: InspectionIconName; title: string; unit: string; rows: {id: string; value: number; label: string}[]; max: number; tone: string;
}) {
  return <Panel icon={icon} title={title} meta={unit}>
    {rows.length ? <div className="wb-bars" data-tone={tone}>
      <div className="wb-bar-axis"><span>0</span><span>{Math.round(max / 2)}</span><span>{max}</span></div>
      {rows.map(row => <div className="wb-bar-row" key={row.id}><span>{row.id}</span>
        <div className="wb-bar-track"><i style={{width: Math.min(100, row.value / max * 100) + "%"}}/></div><strong>{row.label}</strong>
      </div>)}
    </div> : <p className="wb-empty">No events recorded.</p>}
  </Panel>;
}

export function AnalyticsView({data}: {data: Snapshot}) {
  const analytics = data.analytics;
  const hours = analytics.flight_hours_by_aircraft;
  const categories = analytics.alerts_by_category;
  return <div className="wb-page">
    <ViewHeader icon="analytics" title="Fleet performance" status="Simulated flight and service records"/>
    <div className="wb-instrument-strip">
      {([
        ["plan", "Completed flights", analytics.completed_flights, "flights"],
        ["gauge", "Average flight", analytics.average_flight_minutes, "min"],
        ["schedule", "Upcoming inspections", analytics.upcoming_inspections, "scheduled"],
        ["alerts", "Overdue inspections", analytics.overdue_inspections, "overdue"],
      ] as const).map(([icon, label, value, unit]) => <article className="wb-glass" key={label}>
        <span><InspectionIcon name={icon}/>{label}</span><strong>{value} <small>{unit}</small></strong>
      </article>)}
    </div>
    <div className="wb-chart-grid">
      <BarPanel icon="plan" title="Flight hours by aircraft" unit="HOURS" max={Math.max(10, Math.ceil(Math.max(0, ...hours.map(a => a.hours)) / 10) * 10)} tone="cyan"
        rows={hours.map(a => ({id: a.aircraft_id, value: a.hours, label: a.hours.toFixed(1) + " h"}))}/>
      <BarPanel icon="gauge" title="Battery health" unit="PERCENT" max={100} tone="green"
        rows={analytics.battery_health_by_aircraft.map(a => ({id: a.aircraft_id, value: a.health, label: a.health + "%"}))}/>
      <BarPanel icon="alerts" title="Alerts by category" unit="EVENTS" max={Math.max(2, Math.ceil(Math.max(0, ...categories.map(a => a.count)) / 2) * 2)} tone="amber"
        rows={categories.map(a => ({id: a.category, value: a.count, label: String(a.count)}))}/>
    </div>
  </div>;
}

export function MaintenanceView({data, token, refresh}: {data: Snapshot; token: string; refresh: () => Promise<void>}) {
  const [filter, setFilter] = useState("all");
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const rows = data.maintenance.filter(record => filter === "all" || record.status === filter);
  const record = rows.find(row => row.id === id) ?? rows[0];

  async function complete(recordId: string) {
    setPending(true);
    try {
      await request(`/api/maintenance/${recordId}`, {method: "PATCH", headers: {"Content-Type": "application/json", "X-Admin-Token": token},
        body: JSON.stringify({status: "completed", note: "Inspection completed in portfolio demo", technician: "Demo administrator"})});
      setMessage("Inspection saved.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally { setPending(false); }
  }

  return <div className="wb-page">
    <ViewHeader icon="schedule" title="Maintenance schedule" status={`${data.analytics.upcoming_inspections} upcoming · ${data.analytics.overdue_inspections} overdue`}>
      <select aria-label="Filter maintenance" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All records</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option></select>
    </ViewHeader>
    <div className="wb-queue">
      <Panel icon="schedule" title="Inspection queue" meta={rows.length}>
        <div className="wb-rows">{rows.map(row => <button key={row.id} type="button" className="wb-row" aria-pressed={record?.id === row.id} onClick={() => setId(row.id)}>
          <InspectionIcon name="cutaway"/><span><strong>{row.component}</strong><small>{row.aircraft_id} · {row.inspection_type}</small></span><em>{date(row.due_at)}</em>
        </button>)}{!rows.length && <p className="wb-empty">No inspections match this filter.</p>}</div>
      </Panel>
      {record && <Panel icon="cutaway" title={record.component} meta={<Pill value={record.status}/>}>
        <div className="wb-record-title">{record.inspection_type}</div>
        <Readouts items={[["Aircraft", record.aircraft_id], ["Due", date(record.due_at)], ["Technician", record.technician || "Unassigned"], ["Completed", record.completed_at ? date(record.completed_at) : "—"]]}/>
        {record.note && <p className="wb-note">{record.note}</p>}
        {!publicDemo && record.status !== "completed" && <div className="wb-actions"><button type="button" disabled={!token || pending} onClick={() => void complete(record.id)}>Complete inspection</button></div>}
      </Panel>}
    </div>
    <p className="wb-note" role="status">{message}</p>
  </div>;
}

export function AlertsView({data, token, refresh}: {data: Snapshot; token: string; refresh: () => Promise<void>}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const rows = data.alerts.filter(a => (filter === "all" || a.state === filter) && `${a.description} ${a.aircraft_id}`.toLowerCase().includes(query.toLowerCase()));
  const alert = rows.find(row => row.id === id) ?? rows[0];
  const sample = alert?.evidence.sample;

  async function update(alertId: string, state: "acknowledged" | "resolved") {
    setPending(true);
    try {
      await request(`/api/alerts/${alertId}`, {method: "PATCH", headers: {"Content-Type": "application/json", "X-Admin-Token": token},
        body: JSON.stringify({state, note: `${state} by demo administrator`})});
      setMessage(`Alert ${state}.`);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally { setPending(false); }
  }

  return <div className="wb-page">
    <ViewHeader icon="alerts" title="Alert center" status={`${data.alerts.filter(row => row.state === "open").length} open · ${data.alerts.length} total`}>
      <label className="wb-search"><InspectionIcon name="search"/><input aria-label="Search alerts" placeholder="Find an alert" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <select aria-label="Filter alerts" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All states</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select>
    </ViewHeader>
    <div className="wb-queue">
      <Panel icon="alerts" title="Event log" meta={rows.length}>
        <div className="wb-rows">{rows.map(row => <button key={row.id} type="button" className="wb-row" aria-pressed={alert?.id === row.id} onClick={() => setId(row.id)}>
          <i className="wb-severity" data-value={row.severity}/><span><strong>{row.description}</strong><small>{row.aircraft_id} · {row.category}</small></span><Pill value={row.state}/>
        </button>)}{!rows.length && <p className="wb-empty">No alerts match this filter. Run a fault scenario from Simulation to generate evidence.</p>}</div>
      </Panel>
      {alert && sample && <Panel icon="cutaway" title="Telemetry evidence" meta={<Pill value={alert.severity}/>}>
        <div className="wb-record-title">{alert.description}</div>
        <Readouts items={[["Aircraft", alert.aircraft_id], ["Category", alert.category], ["Recorded", new Date(alert.timestamp).toLocaleString("en-GB", {timeZone: "UTC"}) + " UTC"],
          ["Battery", sample.battery.percentage + "%"], ["Voltage", sample.battery.voltage_v + " V"], ["Temperature", sample.battery.temperature_c + " °C"],
          ["Signal", sample.connectivity.signal_quality + "%"], ["Link", sample.connectivity.status], ["Sensor", sample.sensor_status]]}/>
        {alert.note && <p className="wb-note">{alert.note}</p>}
        {!publicDemo && alert.state !== "resolved" && <div className="wb-actions">
          {alert.state === "open" && <button type="button" disabled={!token || pending} onClick={() => void update(alert.id, "acknowledged")}>Acknowledge</button>}
          <button type="button" disabled={!token || pending} onClick={() => void update(alert.id, "resolved")}>Resolve</button>
        </div>}
      </Panel>}
    </div>
    <p className="wb-note" role="status">{message}</p>
  </div>;
}

export function SystemView({data, link}: {data: Snapshot; link: string}) {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let active = true;
    const poll = () => request<Record<string, unknown>>("/api/system")
      .then(value => {if (active) setStatus(value);})
      .catch(() => {if (active) setStatus({api: "unavailable"});});
    void poll();
    const timer = window.setInterval(poll, 5000);
    return () => {active = false; window.clearInterval(timer);};
  }, []);
  const services = [
    ["Telemetry API", String(status?.api ?? "checking")],
    ["Database", String(status?.database ?? "checking")],
    ["Event stream", link],
    ["Fleet simulator", data.simulator.running ? "running" : "paused"],
  ];
  return <div className="wb-page">
    <ViewHeader icon="system" title="System health" status="Service checks refresh every five seconds"/>
    <div className="wb-queue">
      <Panel icon="system" title="Service status">
        <div className="wb-service">{services.map(([label, state]) => <div key={label}><span>{label}</span><Pill value={state}/></div>)}</div>
      </Panel>
      <Panel icon="gauge" title="Stream instrumentation">
        <Readouts items={[
          ["Recorded samples", String(status?.telemetry_samples ?? "—")],
          ["Data age", status?.telemetry_age_s == null ? "—" : String(status.telemetry_age_s) + " s"],
          ["Subscribers", String(status?.stream_subscribers ?? "—")], ["Processing errors", String(status?.processing_errors ?? "—")],
          ["Simulator tick", data.simulator.tick], ["Scenario", data.simulator.scenario],
        ]}/>
      </Panel>
    </div>
  </div>;
}

export function SettingsView({token, setToken}: {token: string; setToken: (token: string) => void}) {
  return <div className="wb-page">
    <ViewHeader icon="settings" title="Workspace settings" status="Vektr Ground Operating System"/>
    <div className="wb-queue">
      <Panel icon="cutaway" title="Workspace access" meta={<Pill value={publicDemo ? "public" : "local"}/>}>
        <div className="wb-settings">
          {publicDemo ? <p>Explore the simulated fleet and run scenarios. Alert and maintenance records are read-only on the public workspace.</p> : <>
            <p>Enter the configured backend <code>ADMIN_TOKEN</code> to update alerts and inspections. The token is held in this session’s memory.</p>
            <label>Admin token<input type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" placeholder="Configured backend token"/></label>
            <Pill value={token ? "token entered" : "read-only"}/>
          </>}
        </div>
      </Panel>
      <Panel icon="gauge" title="Simulation scope">
        <Readouts items={[["Aircraft", "Fictional fleet"], ["Telemetry", "Synthetic"], ["Permissions", "Observation and diagnostics"]]}/>
      </Panel>
    </div>
  </div>;
}

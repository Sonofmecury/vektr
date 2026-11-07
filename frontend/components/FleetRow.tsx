import type { Aircraft } from "@/lib/types";
import { AircraftGlyph } from "./AircraftGlyph";

export function FleetRow({ aircraft, selected, onSelect }: { aircraft: Aircraft; selected: boolean; onSelect: () => void }) {
  const telemetry = aircraft.telemetry;
  const status = telemetry?.status ?? "unknown";
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={selected ? "fleet-row selected" : "fleet-row"}>
    <span className={"fleet-row-icon " + status}><AircraftGlyph kind={aircraft.kind} /></span>
    <span className="fleet-row-name"><strong>{aircraft.name}</strong><small>{aircraft.id} · {aircraft.kind}</small></span>
    <span className="fleet-row-battery">{telemetry ? telemetry.battery.percentage + "%" : "—"}<small>BATTERY</small></span>
    <span className={"status-pill " + status}>{status}</span>
  </button>;
}

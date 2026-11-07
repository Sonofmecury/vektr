from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Aircraft, Alert, AuditEvent, Base, Flight, Maintenance, SessionLocal, TelemetrySample, engine, utcnow
from .simulator import FLEET, MISSIONS, Simulator, Telemetry, historic_flight_samples


def iso(value: datetime | None) -> str | None:
    return value.isoformat().replace("+00:00", "Z") if value else None


def as_utc(value: datetime) -> datetime:
    """SQLite drops timezone metadata; treat persisted demo times as UTC."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def seed(session: Session) -> None:
    if session.scalar(select(func.count()).select_from(Aircraft)):
        return
    now = utcnow()
    for i, craft in enumerate(FLEET):
        session.add(Aircraft(id=craft.id, name=craft.name, model=craft.model, kind=craft.kind,
                             serial=f"DEMO-{i+1:04d}-FICTIONAL", firmware=f"sim-{1+i//3}.2",
                             registered_at=now - timedelta(days=240+i*30), flight_hours=68+i*27,
                             battery_health=97-i*3, battery_cycles=48+i*19))
        session.add(Maintenance(id=f"MX-{i+1:03d}", aircraft_id=craft.id,
                                component=["Battery pack", "Motor assembly", "GPS module"][i%3],
                                inspection_type="Routine component inspection",
                                due_at=now + timedelta(days=5+i*4), status="scheduled",
                                technician=["T. Bello", "A. Yusuf", "S. Okafor"][i%3],
                                note="Fictional demo record"))
        start = now - timedelta(days=4+i, hours=2)
        samples = historic_flight_samples(i, start)
        session.add(Flight(id=f"FLT-{i+1:04d}", aircraft_id=craft.id, started_at=start,
                           ended_at=start + timedelta(seconds=89*8), samples=samples))
    session.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        seed(session)


def audit(session: Session, actor: str, action: str, target: str, detail: dict | None = None) -> None:
    session.add(AuditEvent(actor=actor, action=action, target=target, detail=detail or {}))


def evaluate_alerts(session: Session, samples: list[Telemetry], active_conditions: set[str], maintenance_due: bool = False) -> list[dict]:
    events: list[dict] = []
    current: set[str] = set()
    for sample in samples:
        conditions: list[tuple[str, str, str]] = []
        if sample.connectivity.status == "disconnected":
            conditions.append(("connectivity", "critical", "Telemetry link interrupted"))
        elif sample.connectivity.status == "delayed":
            conditions.append(("connectivity", "warning", "Telemetry delivery is delayed"))
        if sample.battery.percentage < 25:
            conditions.append(("battery", "warning", "Battery reserve below 25%"))
        if sample.sensor_status == "anomaly":
            conditions.append(("sensor", "warning", "Sensor consistency check failed"))
        if maintenance_due and sample.aircraft_id == "UAV-004":
            conditions.append(("maintenance", "warning", "Motor assembly inspection required"))
        for category, severity, description in conditions:
            key = f"{sample.aircraft_id}:{category}:{description}"
            current.add(key)
            if key in active_conditions:
                continue
            alert = Alert(id=f"AL-{uuid4().hex[:10].upper()}", aircraft_id=sample.aircraft_id,
                          timestamp=sample.timestamp, category=category, severity=severity,
                          description=description, state="open",
                          evidence={"sample": sample.model_dump(mode="json")}, note="")
            session.add(alert)
            events.append(alert_dict(alert))
    active_conditions.intersection_update(current)
    active_conditions.update(current)
    return events


def persist_tick(session: Session, samples: list[Telemetry], active_conditions: set[str], tick: int, scenario: str = "normal") -> list[dict]:
    for sample in samples:
        session.add(TelemetrySample(aircraft_id=sample.aircraft_id, timestamp=sample.timestamp,
                                    payload=sample.model_dump(mode="json")))
    events = evaluate_alerts(session, samples, active_conditions, scenario == "maintenance" and tick >= 5)
    if tick % 300 == 0:
        cutoff = utcnow() - timedelta(hours=24)
        session.query(TelemetrySample).filter(TelemetrySample.timestamp < cutoff).delete()
    session.commit()
    return events


def aircraft_dict(item: Aircraft, sample: Telemetry | None = None) -> dict:
    return {"id": item.id, "name": item.name, "model": item.model, "kind": item.kind,
            "serial": item.serial, "firmware": item.firmware, "registered_at": iso(item.registered_at),
            "flight_hours": item.flight_hours, "battery_health": item.battery_health,
            "battery_cycles": item.battery_cycles, "telemetry": sample.model_dump(mode="json") if sample else None}


def alert_dict(item: Alert) -> dict:
    return {"id": item.id, "aircraft_id": item.aircraft_id, "timestamp": iso(item.timestamp),
            "category": item.category, "severity": item.severity, "description": item.description,
            "state": item.state, "evidence": item.evidence, "note": item.note,
            "resolved_at": iso(item.resolved_at)}


def maintenance_dict(item: Maintenance) -> dict:
    return {"id": item.id, "aircraft_id": item.aircraft_id, "component": item.component,
            "inspection_type": item.inspection_type, "due_at": iso(item.due_at),
            "status": item.status, "technician": item.technician,
            "note": item.note, "completed_at": iso(item.completed_at)}


def flight_dict(item: Flight, include_samples: bool = False) -> dict:
    demo_index = next((i for i, craft in enumerate(FLEET) if craft.id == item.aircraft_id and item.id == f"FLT-{i+1:04d}"), None)
    result = {"id": item.id, "aircraft_id": item.aircraft_id, "started_at": iso(as_utc(item.started_at)),
              "ended_at": iso(as_utc(item.ended_at)), "duration_s": int((item.ended_at-item.started_at).total_seconds()),
              "source": item.source, "sample_count": len(item.samples)}
    if demo_index is not None:
        result["mission"] = MISSIONS[demo_index]
    if include_samples:
        samples = historic_flight_samples(demo_index, as_utc(item.started_at)) if demo_index is not None else item.samples
        result["samples"] = samples
        if demo_index is not None:
            events = [(0, "flight", "Flight recording started"), (89, "flight", "Flight recording completed")]
            if demo_index == 1:
                events.append((59, "connectivity", "Telemetry delivery delayed"))
            if demo_index == 2:
                events.append((43, "sensor", "Sensor consistency warning"))
            if demo_index == 3:
                events.append((84, "battery", "Battery reserve below 25%"))
            result["events"] = [{"sample_index": index, "category": category, "title": title,
                                 "timestamp": samples[index]["timestamp"]} for index, category, title in sorted(events)]
    return result


def analytics(session: Session) -> dict:
    aircraft = session.scalars(select(Aircraft).order_by(Aircraft.id)).all()
    flights = session.scalars(select(Flight)).all()
    alerts = session.scalars(select(Alert)).all()
    maintenance = session.scalars(select(Maintenance)).all()
    return {
        "flight_hours_by_aircraft": [{"aircraft_id": a.id, "hours": round(a.flight_hours + sum((f.ended_at-f.started_at).total_seconds()/3600 for f in flights if f.aircraft_id == a.id), 1)} for a in aircraft],
        "completed_flights": len(flights),
        "average_flight_minutes": round(sum((f.ended_at-f.started_at).total_seconds()/60 for f in flights)/len(flights), 1) if flights else 0,
        "alerts_by_category": [{"category": c, "count": sum(a.category == c for a in alerts)} for c in ("connectivity", "battery", "sensor", "maintenance")],
        "battery_health_by_aircraft": [{"aircraft_id": a.id, "health": a.battery_health} for a in aircraft],
        "upcoming_inspections": sum(m.status == "scheduled" and as_utc(m.due_at) >= utcnow() for m in maintenance),
        "overdue_inspections": sum(m.status == "scheduled" and as_utc(m.due_at) < utcnow() for m in maintenance),
    }

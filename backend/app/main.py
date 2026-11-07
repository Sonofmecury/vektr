from __future__ import annotations

import asyncio
import json
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text

from .models import Aircraft, Alert, AuditEvent, Flight, Maintenance, SessionLocal, TelemetrySample, utcnow
from .simulator import Scenario, Simulator
from .store import aircraft_dict, alert_dict, analytics, audit, flight_dict, init_db, maintenance_dict, persist_tick


class ScenarioCommand(BaseModel):
    scenario: Scenario


class SimulatorCommand(BaseModel):
    action: Literal["start", "pause", "resume", "reset"]
    speed: int | None = Field(default=None, ge=1, le=8)


class AlertUpdate(BaseModel):
    state: Literal["acknowledged", "resolved"]
    note: str = Field(default="", max_length=2000)


class MaintenanceUpdate(BaseModel):
    status: Literal["scheduled", "completed"]
    note: str = Field(default="", max_length=2000)
    technician: str = Field(default="Unassigned", max_length=80)


class Runtime:
    def __init__(self) -> None:
        self.simulator = Simulator()
        self.samples = self.simulator.step()
        self.conditions: set[str] = set()
        self.subscribers: set[asyncio.Queue] = set()
        self.last_tick = utcnow()
        self.tick_count = 0
        self.errors = 0

    def publish(self, event: dict) -> None:
        for subscriber in tuple(self.subscribers):
            if subscriber.full():
                try:
                    subscriber.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            subscriber.put_nowait(event)


runtime = Runtime()


async def tick_loop() -> None:
    while True:
        await asyncio.sleep(1)
        if not runtime.simulator.running:
            continue
        try:
            runtime.samples = runtime.simulator.step()
            runtime.last_tick = utcnow()
            runtime.tick_count += 1
            with SessionLocal() as session:
                alerts = persist_tick(session, runtime.samples, runtime.conditions, runtime.simulator.tick, runtime.simulator.scenario)
            runtime.publish({"type": "telemetry", "timestamp": runtime.last_tick.isoformat(),
                             "samples": [s.model_dump(mode="json") for s in runtime.samples], "alerts": alerts})
        except Exception:
            runtime.errors += 1


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    task = asyncio.create_task(tick_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Vektr Observation API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3001,http://127.0.0.1:3001").split(","),
                   allow_credentials=False, allow_methods=["GET", "POST", "PATCH"], allow_headers=["Content-Type", "X-Admin-Token"])


def admin_required(x_admin_token: str | None = Header(default=None)) -> None:
    configured = os.getenv("ADMIN_TOKEN", "")
    if not configured:
        raise HTTPException(status_code=503, detail="Administrative actions are disabled in this demo")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, configured):
        raise HTTPException(status_code=401, detail="Valid admin token required")


def demo_controls_required() -> None:
    if os.getenv("DEMO_CONTROLS_ENABLED", "true").lower() not in {"1", "true", "yes"}:
        raise HTTPException(status_code=403, detail="Demo controls are disabled")


def simulator_state() -> dict:
    sim = runtime.simulator
    return {"running": sim.running, "scenario": sim.scenario, "speed": sim.speed,
            "tick": sim.tick, "simulated": True}


@app.get("/api/snapshot")
def snapshot() -> dict:
    by_id = {s.aircraft_id: s for s in runtime.samples}
    with SessionLocal() as session:
        aircraft = session.scalars(select(Aircraft).order_by(Aircraft.id)).all()
        alerts = session.scalars(select(Alert).order_by(Alert.timestamp.desc()).limit(30)).all()
        maintenance = session.scalars(select(Maintenance).order_by(Maintenance.due_at).limit(30)).all()
        flights = session.scalars(select(Flight).order_by(Flight.started_at.desc()).limit(30)).all()
        return {"aircraft": [aircraft_dict(a, by_id.get(a.id)) for a in aircraft],
                "alerts": [alert_dict(a) for a in alerts], "maintenance": [maintenance_dict(m) for m in maintenance],
                "flights": [flight_dict(f) for f in flights], "simulator": simulator_state(),
                "analytics": analytics(session), "server_time": utcnow().isoformat()}


@app.get("/api/stream")
async def stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=1)
    runtime.subscribers.add(queue)

    async def generate():
        try:
            yield f"event: ready\ndata: {json.dumps({'type':'ready','timestamp':utcnow().isoformat()})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=10)
                    yield f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield f"event: heartbeat\ndata: {json.dumps({'timestamp':utcnow().isoformat()})}\n\n"
        finally:
            runtime.subscribers.discard(queue)

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


@app.post("/api/demo/scenario", dependencies=[Depends(demo_controls_required)])
def scenario(command: ScenarioCommand) -> dict:
    runtime.simulator.reset(command.scenario)
    runtime.conditions.clear()
    runtime.samples = runtime.simulator.step()
    runtime.publish({"type": "reset", "simulator": simulator_state()})
    return simulator_state()


@app.post("/api/demo/simulator", dependencies=[Depends(demo_controls_required)])
def control(command: SimulatorCommand) -> dict:
    if command.action == "reset":
        runtime.simulator.reset(runtime.simulator.scenario)
        runtime.conditions.clear()
    elif command.action == "pause":
        runtime.simulator.running = False
    else:
        runtime.simulator.running = True
    if command.speed is not None:
        runtime.simulator.speed = command.speed
    runtime.publish({"type": "state", "simulator": simulator_state()})
    return simulator_state()


@app.get("/api/flights/{flight_id}")
def flight_detail(flight_id: str) -> dict:
    with SessionLocal() as session:
        item = session.get(Flight, flight_id)
        if not item:
            raise HTTPException(status_code=404, detail="Flight not found")
        return flight_dict(item, include_samples=True)


@app.get("/api/aircraft/{aircraft_id}/telemetry")
def telemetry_history(aircraft_id: str, limit: int = Query(default=120, ge=1, le=500)) -> list:
    with SessionLocal() as session:
        rows = session.scalars(select(TelemetrySample).where(TelemetrySample.aircraft_id == aircraft_id)
                               .order_by(TelemetrySample.timestamp.desc()).limit(limit)).all()
        return [r.payload for r in reversed(rows)]


@app.patch("/api/alerts/{alert_id}", dependencies=[Depends(admin_required)])
def update_alert(alert_id: str, update: AlertUpdate) -> dict:
    with SessionLocal() as session:
        item = session.get(Alert, alert_id)
        if not item:
            raise HTTPException(status_code=404, detail="Alert not found")
        if item.state == "resolved":
            raise HTTPException(status_code=409, detail="Resolved alerts cannot be changed")
        item.state = update.state
        item.note = update.note
        if update.state == "resolved":
            item.resolved_at = utcnow()
        audit(session, "admin", f"alert.{update.state}", alert_id)
        session.commit()
        return alert_dict(item)


@app.patch("/api/maintenance/{record_id}", dependencies=[Depends(admin_required)])
def update_maintenance(record_id: str, update: MaintenanceUpdate) -> dict:
    with SessionLocal() as session:
        item = session.get(Maintenance, record_id)
        if not item:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        item.status = update.status
        item.note = update.note
        item.technician = update.technician
        item.completed_at = utcnow() if update.status == "completed" else None
        audit(session, "admin", "maintenance.update", record_id, {"status": update.status})
        session.commit()
        return maintenance_dict(item)


@app.get("/api/system")
def system() -> dict:
    with SessionLocal() as session:
        session.execute(text("SELECT 1"))
        sample_count = session.scalar(select(func.count()).select_from(TelemetrySample)) or 0
        recent_audit = session.scalars(select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(10)).all()
    age = (utcnow() - runtime.last_tick).total_seconds()
    return {"api": "online", "database": "online", "simulator": simulator_state(),
            "stream_subscribers": len(runtime.subscribers), "telemetry_samples": sample_count,
            "telemetry_age_s": round(age, 1), "processing_errors": runtime.errors,
            "recent_audit": [{"timestamp": e.timestamp.isoformat(), "action": e.action, "target": e.target} for e in recent_audit]}

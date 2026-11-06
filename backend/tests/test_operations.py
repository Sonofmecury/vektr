from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app import main, store
from app.models import Alert, Base, TelemetrySample
from app.simulator import Simulator


def test_simulation_replays_identically_and_faults_are_specific():
    at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    first = Simulator()
    second = Simulator()
    assert [s.model_dump() for s in first.step(at)] == [s.model_dump() for s in second.step(at)]
    first.reset("connectivity")
    rows = [first.step(at) for _ in range(9)]
    assert rows[-1][0].connectivity.status == "disconnected"
    assert all(s.connectivity.status == "connected" for s in rows[-1][1:])
    second.reset("sensor")
    rows = [second.step(at) for _ in range(7)]
    assert rows[-1][2].sensor_status == "anomaly"


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(store, "engine", engine)
    monkeypatch.setattr(store, "SessionLocal", sessions)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr(main, "runtime", main.Runtime())
    monkeypatch.setenv("ADMIN_TOKEN", "test-secret")
    with TestClient(main.app) as api:
        yield api, sessions
    engine.dispose()


def test_snapshot_replay_and_admin_boundary(client):
    api, sessions = client
    snapshot = api.get("/api/snapshot")
    assert snapshot.status_code == 200
    body = snapshot.json()
    assert len(body["aircraft"]) == 6
    assert body["analytics"]["completed_flights"] == 6
    flight = api.get(f"/api/flights/{body['flights'][0]['id']}")
    assert len(flight.json()["samples"]) == 90
    record = body["maintenance"][0]["id"]
    endpoint = f"/api/maintenance/{record}"
    payload = {"status": "completed", "note": "Inspected", "technician": "Test operator"}
    assert api.patch(endpoint, json=payload).status_code == 401
    changed = api.patch(endpoint, json=payload, headers={"X-Admin-Token": "test-secret"})
    assert changed.status_code == 200
    assert changed.json()["status"] == "completed"
    assert api.get("/api/system").json()["database"] == "online"


def test_fault_alerts_are_evidence_backed_and_deduplicated(client):
    api, sessions = client
    command = api.post("/api/demo/scenario", json={"scenario": "battery"})
    assert command.status_code == 200
    with sessions() as session:
        for tick in range(12):
            samples = main.runtime.simulator.step()
            store.persist_tick(session, samples, main.runtime.conditions, tick + 1)
        alerts = session.scalars(select(Alert).where(Alert.category == "battery")).all()
        assert len(alerts) == 1
        assert alerts[0].aircraft_id == "UAV-002"
        assert alerts[0].evidence["sample"]["battery"]["percentage"] < 25
        assert session.scalar(select(func.count()).select_from(TelemetrySample)) >= 72

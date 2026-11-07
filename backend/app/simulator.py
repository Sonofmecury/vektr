from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from pydantic import BaseModel, Field

Scenario = Literal["normal", "connectivity", "battery", "sensor", "maintenance"]


class Position(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    altitude_m: float = Field(ge=0)


class Battery(BaseModel):
    percentage: int = Field(ge=0, le=100)
    voltage_v: float = Field(ge=0)
    temperature_c: float


class Connectivity(BaseModel):
    status: Literal["connected", "delayed", "disconnected"]
    signal_quality: int = Field(ge=0, le=100)


class Telemetry(BaseModel):
    aircraft_id: str
    timestamp: datetime
    position: Position
    ground_speed_mps: float = Field(ge=0)
    vertical_speed_mps: float
    heading_deg: float = Field(ge=0, lt=360)
    battery: Battery
    gps_satellites: int = Field(ge=0)
    gps_fix: Literal["3D", "2D", "none"]
    connectivity: Connectivity
    sensor_status: Literal["nominal", "anomaly"]
    status: Literal["active", "attention", "available"]


@dataclass(frozen=True)
class AircraftSeed:
    id: str
    name: str
    model: str
    kind: str
    latitude: float
    longitude: float
    phase: float


FLEET = (
    AircraftSeed("UAV-001", "Aster One", "Aster M4", "Multirotor inspection", 9.0765, 7.3986, 0.0),
    AircraftSeed("UAV-002", "Meridian Two", "Meridian V2", "VTOL mapping", 9.1185, 7.4580, 0.8),
    AircraftSeed("UAV-003", "Kestrel Three", "Kestrel F8", "Fixed-wing survey", 9.0635, 7.4890, 1.6),
    AircraftSeed("UAV-004", "Aster Four", "Aster M4", "Multirotor inspection", 9.0270, 7.4250, 2.4),
    AircraftSeed("UAV-005", "Atlas Five", "Atlas C2", "Infrastructure survey", 9.1120, 7.3430, 3.2),
    AircraftSeed("UAV-006", "Meridian Six", "Meridian V2", "VTOL mapping", 9.0380, 7.3510, 4.0),
)

MISSIONS = (
    "Perimeter inspection", "Linear corridor survey", "Grid mapping",
    "Asset orbit inspection", "Infrastructure transect", "Regional transit",
)


def historic_flight_samples(craft_index: int, start: datetime) -> list[dict]:
    """Six distinct, reproducible demo flights with synchronized fault states."""
    simulator = Simulator()
    craft = FLEET[craft_index]
    samples: list[dict] = []
    for index in range(90):
        t = index / 89
        sample = simulator.step(start + timedelta(seconds=index * 8))[craft_index].model_dump(mode="json")
        if craft_index == 0:
            angle = t * math.tau - math.pi / 3
            x = .043 * math.copysign(abs(math.cos(angle)) ** .35, math.cos(angle))
            y = .028 * math.copysign(abs(math.sin(angle)) ** .35, math.sin(angle))
        elif craft_index == 1:
            leg = t * 2 if t <= .5 else (1 - t) * 2
            x = -.055 + .11 * leg
            y = -.027 + .055 * leg + .003 * math.sin(t * math.pi * 6)
        elif craft_index == 2:
            lane = min(4, int(t * 5))
            within = t * 5 % 1
            x = -.052 + lane * .026
            y = -.039 + (1 - within if lane % 2 else within) * .078
        elif craft_index == 3:
            angle = t * math.pi * 5
            x = .014 * math.cos(angle)
            y = .014 * math.sin(angle)
        elif craft_index == 4:
            x = -.06 + .12 * t
            y = -.025 + .055 * math.sin(t * math.pi * .85)
        else:
            x = -.075 + .15 * t
            y = -.035 + .07 * t + .018 * math.sin(t * math.tau)
        anomaly = (craft_index == 1 and 59 <= index <= 69) or (craft_index == 2 and 43 <= index <= 54)
        battery = max(19, 92 - int(t * (73 if craft_index == 3 else 57 + craft_index * 3)))
        altitude = (52 if craft_index == 3 else 115 + craft_index * 12) + 19 * math.sin(t * math.pi) + 3 * math.sin(t * math.pi * 7)
        sample["position"] = {"latitude": round(craft.latitude + y, 6), "longitude": round(craft.longitude + x, 6), "altitude_m": round(altitude, 1)}
        sample["ground_speed_mps"] = round((5.8 if craft_index == 3 else 12 + craft_index * 1.4) + 1.7 * math.sin(t * math.pi * 4), 1)
        sample["battery"]["percentage"] = battery
        sample["battery"]["voltage_v"] = round(19.8 + battery * .041, 2)
        sample["connectivity"] = {"status": "delayed" if craft_index == 1 and anomaly else "connected", "signal_quality": 38 if craft_index == 1 and anomaly else 88 - round(8 * t)}
        sample["sensor_status"] = "anomaly" if craft_index == 2 and anomaly else "nominal"
        sample["status"] = "attention" if anomaly or battery < 25 else "active"
        samples.append(sample)
    return samples


class Simulator:
    """Deterministic, read-only synthetic telemetry. Tick number is its seed."""

    def __init__(self) -> None:
        self.tick = 0
        self.scenario: Scenario = "normal"
        self.running = True
        self.speed = 1

    def reset(self, scenario: Scenario = "normal") -> None:
        self.tick = 0
        self.scenario = scenario
        self.running = True

    def step(self, timestamp: datetime | None = None) -> list[Telemetry]:
        if self.running:
            self.tick += self.speed
        now = timestamp or datetime.now(timezone.utc)
        result: list[Telemetry] = []
        for i, craft in enumerate(FLEET):
            angle = self.tick * 0.045 + craft.phase
            active = i < 4
            # Routine pack rotations keep a long-running demo above the warning threshold.
            battery = max(54, 92 - int(self.tick * (0.013 + i * 0.0015)))
            if self.scenario == "battery" and i == 1:
                battery = max(11, 48 - self.tick * 3)
            signal = max(35, 93 - int(8 * abs(math.sin(angle / 2))))
            connection = "connected"
            if self.scenario == "connectivity" and i == 0:
                signal = max(0, 82 - self.tick * 9)
                connection = "disconnected" if self.tick >= 9 else "delayed" if self.tick >= 5 else "connected"
            sensor = "anomaly" if self.scenario == "sensor" and i == 2 and self.tick >= 7 else "nominal"
            attention = connection != "connected" or battery < 25 or sensor == "anomaly" or (self.scenario == "maintenance" and i == 3 and self.tick >= 5)
            result.append(Telemetry(
                aircraft_id=craft.id, timestamp=now,
                position=Position(latitude=craft.latitude + 0.015 * math.sin(angle), longitude=craft.longitude + 0.019 * math.cos(angle), altitude_m=round(112 + 16 * math.sin(angle * 0.5), 1) if active else 0),
                ground_speed_mps=round(12 + 2 * math.cos(angle), 1) if active else 0,
                vertical_speed_mps=round(0.36 * math.cos(angle * 0.5), 2) if active else 0,
                heading_deg=round((math.degrees(angle) + 90) % 360, 1),
                battery=Battery(percentage=battery, voltage_v=round(19.8 + battery * 0.041, 2), temperature_c=round(29 + i * 0.6 + 2 * math.sin(angle), 1)),
                gps_satellites=13 + i % 4, gps_fix="3D",
                connectivity=Connectivity(status=connection, signal_quality=signal),
                sensor_status=sensor,
                status="attention" if attention else "active" if active else "available",
            ))
        return result

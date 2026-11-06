from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Aircraft(Base):
    __tablename__ = "aircraft"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(40))
    serial: Mapped[str] = mapped_column(String(40), unique=True)
    firmware: Mapped[str] = mapped_column(String(30))
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    flight_hours: Mapped[float] = mapped_column(Float, default=0)
    battery_health: Mapped[int] = mapped_column(Integer, default=100)
    battery_cycles: Mapped[int] = mapped_column(Integer, default=0)
    samples: Mapped[list[TelemetrySample]] = relationship(back_populates="aircraft")


class TelemetrySample(Base):
    __tablename__ = "telemetry_samples"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    aircraft_id: Mapped[str] = mapped_column(ForeignKey("aircraft.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    aircraft: Mapped[Aircraft] = relationship(back_populates="samples")


class Flight(Base):
    __tablename__ = "flights"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    aircraft_id: Mapped[str] = mapped_column(ForeignKey("aircraft.id"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    samples: Mapped[list] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(30), default="simulated")


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    aircraft_id: Mapped[str] = mapped_column(ForeignKey("aircraft.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    category: Mapped[str] = mapped_column(String(40))
    severity: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(String(200))
    state: Mapped[str] = mapped_column(String(20), default="open")
    evidence: Mapped[dict] = mapped_column(JSON)
    note: Mapped[str] = mapped_column(Text, default="")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Maintenance(Base):
    __tablename__ = "maintenance"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    aircraft_id: Mapped[str] = mapped_column(ForeignKey("aircraft.id"), index=True)
    component: Mapped[str] = mapped_column(String(80))
    inspection_type: Mapped[str] = mapped_column(String(80))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    technician: Mapped[str] = mapped_column(String(80), default="Unassigned")
    note: Mapped[str] = mapped_column(Text, default="")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    actor: Mapped[str] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(80))
    target: Mapped[str] = mapped_column(String(80))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./uavhub.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

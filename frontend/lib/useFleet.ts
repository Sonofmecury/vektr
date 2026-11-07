"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {API, getSnapshot} from "./api";
import type {Snapshot, Telemetry} from "./types";

type LinkState = "connected" | "reconnecting" | "delayed" | "disconnected";

export function useFleet() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [link, setLink] = useState<LinkState>("reconnecting");
  const [error, setError] = useState<string | null>(null);
  const lastMessage = useRef(0);
  const refresh = useCallback(async () => {
    try { setSnapshot(await getSnapshot()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "API unavailable"); }
  }, []);

  useEffect(() => {
    void refresh();
    const source = new EventSource(`${API}/api/stream`);
    source.addEventListener("ready", () => {lastMessage.current = Date.now(); setLink("connected"); void refresh();});
    source.addEventListener("heartbeat", () => {lastMessage.current = Date.now(); setLink("connected");});
    source.addEventListener("telemetry", (event) => {
      const message = JSON.parse((event as MessageEvent).data) as {samples: Telemetry[]; alerts: Snapshot["alerts"]};
      if (!Array.isArray(message.samples) || !Array.isArray(message.alerts)) return;
      lastMessage.current = Date.now(); setLink("connected");
      setSnapshot(prev => prev ? {...prev, aircraft: prev.aircraft.map(a => ({...a, telemetry: message.samples.find(s => s.aircraft_id === a.id) || a.telemetry})),
        alerts: [...message.alerts, ...prev.alerts].slice(0, 50), simulator: {...prev.simulator, tick: prev.simulator.tick + 1}} : prev);
    });
    source.addEventListener("reset", () => {void refresh();});
    source.addEventListener("state", () => {void refresh();});
    source.onerror = () => setLink("reconnecting");
    const timer = window.setInterval(() => {
      if (!lastMessage.current) return;
      const age = Date.now() - lastMessage.current;
      setLink(age > 20000 ? "disconnected" : age > 5000 ? "delayed" : "connected");
    }, 1000);
    return () => {source.close(); window.clearInterval(timer);};
  }, [refresh]);

  return {snapshot, link, error, refresh};
}

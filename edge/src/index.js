import {DurableObject} from "cloudflare:workers";

const fleet = [
  ["UAV-001", "Aster One", "Aster M4", "Multirotor inspection", 9.0765, 7.3986, 0],
  ["UAV-002", "Meridian Two", "Meridian V2", "VTOL mapping", 10.5105, 7.4165, 0.8],
  ["UAV-003", "Kestrel Three", "Kestrel F8", "Fixed-wing survey", 9.8965, 8.8583, 1.6],
  ["UAV-004", "Aster Four", "Aster M4", "Multirotor inspection", 6.5244, 3.3792, 2.4],
  ["UAV-005", "Atlas Five", "Atlas C2", "Infrastructure survey", 7.3775, 3.947, 3.2],
  ["UAV-006", "Meridian Six", "Meridian V2", "VTOL mapping", 11.9964, 8.5167, 4],
];
const scenarios = new Set(["normal", "connectivity", "battery", "sensor", "maintenance"]);
const json = (value, status = 200) => Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
const error = (message, status = 400) => json({detail: message}, status);
const round = (value, places = 1) => Number(value.toFixed(places));
const iso = (value) => new Date(value).toISOString();
const stateFor = (s) => ({...s.sim, simulated: true});

function samplesFor(tick, scenario, timestamp) {
  return fleet.map((craft, i) => {
    const [id, , , , latitude, longitude, phase] = craft;
    const angle = tick * 0.045 + phase;
    const active = i < 4;
    let battery = Math.max(9, 92 - Math.trunc(tick * (0.013 + i * 0.0015)));
    if (scenario === "battery" && i === 1) battery = Math.max(11, 48 - tick * 3);
    let signal = Math.max(35, 93 - Math.trunc(8 * Math.abs(Math.sin(angle / 2))));
    let connection = "connected";
    if (scenario === "connectivity" && i === 0) {
      signal = Math.max(0, 82 - tick * 9);
      connection = tick >= 9 ? "disconnected" : tick >= 5 ? "delayed" : "connected";
    }
    const sensor = scenario === "sensor" && i === 2 && tick >= 7 ? "anomaly" : "nominal";
    const attention = connection !== "connected" || battery < 25 || sensor === "anomaly" ||
      (scenario === "maintenance" && i === 3 && tick >= 5);
    return {
      aircraft_id: id, timestamp,
      position: {latitude: latitude + 0.015 * Math.sin(angle), longitude: longitude + 0.019 * Math.cos(angle),
        altitude_m: active ? round(112 + 16 * Math.sin(angle * 0.5)) : 0},
      ground_speed_mps: active ? round(12 + 2 * Math.cos(angle)) : 0,
      vertical_speed_mps: active ? round(0.36 * Math.cos(angle * 0.5), 2) : 0,
      heading_deg: round(((angle * 180 / Math.PI + 90) % 360 + 360) % 360),
      battery: {percentage: battery, voltage_v: round(19.8 + battery * 0.041, 2),
        temperature_c: round(29 + i * 0.6 + 2 * Math.sin(angle))},
      gps_satellites: 13 + i % 4, gps_fix: "3D",
      connectivity: {status: connection, signal_quality: signal}, sensor_status: sensor,
      status: attention ? "attention" : active ? "active" : "available",
    };
  });
}

function initialState() {
  const now = Date.now();
  return {created: now, lastTick: now, sim: {running: true, scenario: "normal", speed: 1, tick: 1},
    samples: samplesFor(1, "normal", iso(now)), alerts: [], conditions: [], history: [],
    maintenance: fleet.map((craft, i) => ({id: `MX-${String(i + 1).padStart(3, "0")}`,
      aircraft_id: craft[0], component: ["Battery pack", "Motor assembly", "GPS module"][i % 3],
      inspection_type: "Routine component inspection", due_at: iso(now + (5 + i * 4) * 86400000),
      status: "scheduled", technician: ["T. Bello", "A. Yusuf", "S. Okafor"][i % 3],
      note: "Fictional demo record", completed_at: null}))};
}

function flightsFor(s) {
  const missions = ["Perimeter inspection", "Linear corridor survey", "Grid mapping", "Asset orbit inspection", "Infrastructure transect", "Regional transit"];
  return fleet.map((craft, i) => {
    const start = s.created - (4 + i) * 86400000 - 7200000;
    return {id: `FLT-${String(i + 1).padStart(4, "0")}`, aircraft_id: craft[0],
      started_at: iso(start), ended_at: iso(start + 89 * 8000), duration_s: 89 * 8,
      source: "simulated", mission: missions[i], sample_count: 90};
  });
}

function replaySamplesFor(flight, i) {
  const craft = fleet[i];
  const start = Date.parse(flight.started_at);
  return Array.from({length: 90}, (_, index) => {
    const t = index / 89;
    const base = samplesFor(index + 1, "normal", iso(start + index * 8000))[i];
    let x, y;
    if (i === 0) { // Perimeter with deliberately rounded corners.
      const angle = t * Math.PI * 2 - Math.PI / 3;
      x = .043 * Math.sign(Math.cos(angle)) * Math.pow(Math.abs(Math.cos(angle)), .35);
      y = .028 * Math.sign(Math.sin(angle)) * Math.pow(Math.abs(Math.sin(angle)), .35);
    } else if (i === 1) { // Out-and-back corridor.
      const leg = t <= .5 ? t * 2 : (1 - t) * 2;
      x = -.055 + .11 * leg;
      y = -.027 + .055 * leg + .003 * Math.sin(t * Math.PI * 6);
    } else if (i === 2) { // Parallel mapping transects.
      const lane = Math.min(4, Math.floor(t * 5));
      const within = (t * 5) % 1;
      x = -.052 + lane * .026;
      y = -.039 + (lane % 2 ? 1 - within : within) * .078;
    } else if (i === 3) { // Tight orbit around one surveyed asset.
      const angle = t * Math.PI * 5;
      x = .014 * Math.cos(angle);
      y = .014 * Math.sin(angle);
    } else if (i === 4) { // Two infrastructure legs and a bend.
      x = -.06 + .12 * t;
      y = -.025 + .055 * Math.sin(t * Math.PI * .85);
    } else { // Long regional sweep.
      x = -.075 + .15 * t;
      y = -.035 + .07 * t + .018 * Math.sin(t * Math.PI * 2);
    }
    const anomaly = (i === 1 && index >= 59 && index <= 69) || (i === 2 && index >= 43 && index <= 54);
    const battery = Math.max(19, 92 - Math.floor(t * (i === 3 ? 73 : 57 + i * 3)));
    const position = {latitude: round(craft[4] + y, 6), longitude: round(craft[5] + x, 6),
      altitude_m: round((i === 3 ? 52 : 115 + i * 12) + 19 * Math.sin(t * Math.PI) + 3 * Math.sin(t * Math.PI * 7))};
    return {...base, position, ground_speed_mps: round((i === 3 ? 5.8 : 12 + i * 1.4) + 1.7 * Math.sin(t * Math.PI * 4)),
      battery: {...base.battery, percentage: battery, voltage_v: round(19.8 + battery * .041, 2)},
      connectivity: {status: i === 1 && anomaly ? "delayed" : "connected", signal_quality: i === 1 && anomaly ? 38 : 88 - Math.round(8 * t)},
      sensor_status: i === 2 && anomaly ? "anomaly" : "nominal",
      status: anomaly || battery < 25 ? "attention" : "active"};
  });
}

function replayEventsFor(i, samples) {
  const events = [{sample_index: 0, category: "flight", title: "Flight recording started"},
    {sample_index: 89, category: "flight", title: "Flight recording completed"}];
  if (i === 1) events.push({sample_index: 59, category: "connectivity", title: "Telemetry delivery delayed"});
  if (i === 2) events.push({sample_index: 43, category: "sensor", title: "Sensor consistency warning"});
  if (i === 3) events.push({sample_index: 84, category: "battery", title: "Battery reserve below 25%"});
  return events.sort((a,b) => a.sample_index - b.sample_index).map(event => ({...event, timestamp: samples[event.sample_index].timestamp}));
}

function snapshotFor(s) {
  const flights = flightsFor(s);
  const aircraft = fleet.map((craft, i) => ({id: craft[0], name: craft[1], model: craft[2], kind: craft[3],
    serial: `DEMO-${String(i + 1).padStart(4, "0")}-FICTIONAL`, firmware: `sim-${1 + Math.trunc(i / 3)}.2`,
    registered_at: iso(s.created - (240 + i * 30) * 86400000), flight_hours: 68 + i * 27,
    battery_health: 97 - i * 3, battery_cycles: 48 + i * 19, telemetry: s.samples[i]}));
  const categories = ["connectivity", "battery", "sensor", "maintenance"];
  return {aircraft, alerts: [...s.alerts].reverse().slice(0, 30), maintenance: s.maintenance,
    flights: [...flights].reverse(), simulator: stateFor(s), server_time: iso(Date.now()),
    analytics: {flight_hours_by_aircraft: aircraft.map((a) => ({aircraft_id: a.id, hours: round(a.flight_hours + 712 / 3600)})),
      completed_flights: flights.length, average_flight_minutes: round(712 / 60),
      alerts_by_category: categories.map((category) => ({category, count: s.alerts.filter((a) => a.category === category).length})),
      battery_health_by_aircraft: aircraft.map((a) => ({aircraft_id: a.id, health: a.battery_health})),
      upcoming_inspections: s.maintenance.filter((m) => m.status === "scheduled" && Date.parse(m.due_at) >= Date.now()).length,
      overdue_inspections: s.maintenance.filter((m) => m.status === "scheduled" && Date.parse(m.due_at) < Date.now()).length}};
}

function alertsFor(s) {
  const current = [];
  const events = [];
  for (const sample of s.samples) {
    const conditions = [];
    if (sample.connectivity.status === "disconnected") conditions.push(["connectivity", "critical", "Telemetry link interrupted"]);
    else if (sample.connectivity.status === "delayed") conditions.push(["connectivity", "warning", "Telemetry delivery is delayed"]);
    if (sample.battery.percentage < 25) conditions.push(["battery", "warning", "Battery reserve below 25%"]);
    if (sample.sensor_status === "anomaly") conditions.push(["sensor", "warning", "Sensor consistency check failed"]);
    if (s.sim.scenario === "maintenance" && sample.aircraft_id === "UAV-004" && s.sim.tick >= 5)
      conditions.push(["maintenance", "warning", "Motor assembly inspection required"]);
    for (const [category, severity, description] of conditions) {
      const key = `${sample.aircraft_id}:${category}:${description}`;
      current.push(key);
      if (s.conditions.includes(key)) continue;
      const alert = {id: `AL-${crypto.randomUUID().slice(0, 10).toUpperCase()}`, aircraft_id: sample.aircraft_id,
        timestamp: sample.timestamp, category, severity, description, state: "open",
        evidence: {sample}, note: "", resolved_at: null};
      s.alerts.push(alert);
      events.push(alert);
    }
  }
  s.conditions = current;
  s.alerts = s.alerts.slice(-50);
  return events;
}

export class FleetRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.clients = new Set();
    this.timer = null;
    this.intervalCount = 0;
    this.ticking = false;
    this.errors = 0;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.state = await ctx.storage.get("runtime") || initialState();
      if (!await ctx.storage.get("runtime")) await ctx.storage.put("runtime", this.state);
    });
  }

  async persist() { await this.ctx.storage.put("runtime", this.state); }

  broadcast(type, payload) {
    const frame = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      try { client.enqueue(new TextEncoder().encode(frame)); }
      catch { this.clients.delete(client); }
    }
  }

  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const s = this.state;
      if (!s.sim.running) return;
      s.sim.tick += s.sim.speed;
      s.lastTick = Date.now();
      s.samples = samplesFor(s.sim.tick, s.sim.scenario, iso(s.lastTick));
      s.history.push(...s.samples);
      s.history = s.history.slice(-720);
      const alerts = alertsFor(s);
      await this.persist();
      this.broadcast("telemetry", {type: "telemetry", timestamp: iso(s.lastTick), samples: s.samples, alerts});
    } finally {this.ticking = false;}
  }

  ensureTimer() {
    if (!this.timer) this.timer = setInterval(() => {
      if (this.clients.size) {
        this.intervalCount += 1;
        if (this.state.sim.running) void this.tick().catch(() => {this.errors += 1;});
        if (this.intervalCount % 3 === 0) this.broadcast("heartbeat", {timestamp: iso(Date.now())});
      }
      else {clearInterval(this.timer); this.timer = null;}
    }, 1000);
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    const path = url.pathname;
    const s = this.state;
    if (path === "/api/snapshot" && request.method === "GET") return json(snapshotFor(s));
    if (path === "/api/stream" && request.method === "GET") {
      const room = this;
      let client;
      const stream = new ReadableStream({
        start(controller) {
          client = controller;
          room.clients.add(controller);
          controller.enqueue(new TextEncoder().encode(`event: ready\ndata: ${JSON.stringify({type: "ready", timestamp: iso(Date.now())})}\n\n`));
          room.ensureTimer();
        },
        cancel() {room.clients.delete(client);},
      });
      return new Response(stream, {headers: {"Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform"}});
    }
    if (path === "/api/demo/scenario" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!scenarios.has(body.scenario)) return error("Unknown demo scenario");
      s.sim = {running: true, scenario: body.scenario, speed: 1, tick: 1};
      s.conditions = [];
      s.samples = samplesFor(1, body.scenario, iso(Date.now()));
      await this.persist();
      this.broadcast("reset", {type: "reset", simulator: stateFor(s)});
      return json(stateFor(s));
    }
    if (path === "/api/demo/simulator" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!["start", "pause", "resume", "reset"].includes(body.action)) return error("Unknown simulator action");
      if (body.speed !== undefined && (!Number.isInteger(body.speed) || body.speed < 1 || body.speed > 8)) return error("Speed must be 1–8");
      if (body.action === "reset") {s.sim.tick = 1; s.conditions = []; s.samples = samplesFor(1, s.sim.scenario, iso(Date.now()));}
      s.sim.running = body.action !== "pause";
      if (body.speed !== undefined) s.sim.speed = body.speed;
      await this.persist();
      this.broadcast("state", {type: "state", simulator: stateFor(s)});
      return json(stateFor(s));
    }
    const flightMatch = /^\/api\/flights\/(FLT-\d{4})$/.exec(path);
    if (flightMatch && request.method === "GET") {
      const flight = flightsFor(s).find((f) => f.id === flightMatch[1]);
      if (!flight) return error("Flight not found", 404);
      const i = fleet.findIndex((craft) => craft[0] === flight.aircraft_id);
      const start = Date.parse(flight.started_at);
      const samples = replaySamplesFor(flight, i);
      return json({...flight, samples, events: replayEventsFor(i, samples)});
    }
    const aircraftMatch = /^\/api\/aircraft\/(UAV-\d{3})\/telemetry$/.exec(path);
    if (aircraftMatch && request.method === "GET") {
      if (!fleet.some((craft) => craft[0] === aircraftMatch[1])) return error("Aircraft not found", 404);
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 120)));
      return json(s.history.filter((sample) => sample.aircraft_id === aircraftMatch[1]).slice(-limit));
    }
    if (path === "/api/system" && request.method === "GET") return json({api: "online", database: "online",
      simulator: stateFor(s), stream_subscribers: this.clients.size, telemetry_samples: s.history.length,
      telemetry_age_s: round((Date.now() - s.lastTick) / 1000), processing_errors: this.errors, recent_audit: []});
    if (request.method === "PATCH" && (path.startsWith("/api/alerts/") || path.startsWith("/api/maintenance/")))
      return error("Administrative actions are disabled in this public demo", 503);
    return error("Not found", 404);
  }
}

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      const id = env.FLEET.idFromName("public-demo");
      return env.FLEET.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

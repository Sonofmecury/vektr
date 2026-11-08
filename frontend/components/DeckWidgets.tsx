import type { Aircraft, Flight, Telemetry } from "@/lib/types";
import { DeckIcon, type DeckIconName } from "./DeckIcon";
import { AircraftGlyph } from "./AircraftGlyph";

export function formatElapsed(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
}

export function elapsedFrom(samples: Telemetry[], index: number) {
  return samples[index] ? (Date.parse(samples[index].timestamp) - Date.parse(samples[0].timestamp)) / 1000 : 0;
}

function Dial({ label, value, unit, min, max, color, signed = false }: {
  label: string; value: number; unit: string; min: number; max: number; color: string; signed?: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -126 + ratio * 252;
  return <div className="deck-gauge">
    <span>{label}</span>
    <svg viewBox="0 0 108 92" role="img" aria-label={label + ": " + value.toFixed(unit === "m/s" ? 1 : 0) + " " + unit}>
      <path d="M23 72a39 39 0 1 1 62 0" pathLength={100} fill="none" stroke="#535456" strokeWidth="3" />
      <path d="M23 72a39 39 0 1 1 62 0" pathLength={100} fill="none" stroke={color} strokeWidth="3" strokeDasharray={ratio * 100 + " 100"} />
      {Array.from({ length: 11 }, (_, i) => <line key={i} x1="54" y1="13" x2="54" y2={i % 5 === 0 ? 20 : 17} transform={"rotate(" + (-126 + i * 25.2) + " 54 49)"} stroke="#999b9e" />)}
      <path d="M54 12l-3 7h6Z" transform={"rotate(" + angle + " 54 49)"} fill={color} />
      <text x="54" y="48" className="dial-value">{signed && value > 0 ? "+" : ""}{value.toFixed(unit === "m/s" ? 1 : 0)}</text>
      <text x="54" y="63" className="dial-unit">{unit}</text>
    </svg>
  </div>;
}

function Attitude({ sample }: { sample: Telemetry }) {
  const angle = Math.atan2(sample.vertical_speed_mps, Math.max(1, sample.ground_speed_mps)) * 180 / Math.PI;
  return <div className="deck-gauge">
    <span>Climb angle</span>
    <div className="deck-horizon" role="img" aria-label={"Estimated climb angle " + angle.toFixed(1) + " degrees"}>
      <div className="deck-horizon-world" style={{ transform: "translateY(" + Math.max(-20, Math.min(20, angle * 2)) + "px)" }} />
      <svg viewBox="0 0 80 80" aria-hidden="true"><path d="M16 40h17l7 5 7-5h17M30 26h20m-15 7h10m-10 18h10m-15 7h20" fill="none" stroke="white" strokeWidth="1.35" /><circle cx="40" cy="40" r="2" fill="#ffd797" /></svg>
      <span>{angle.toFixed(1)}°</span>
    </div>
  </div>;
}

function HeadingDial({ heading }: { heading: number }) {
  return <div className="deck-gauge">
    <span>Heading</span>
    <svg viewBox="0 0 108 92" role="img" aria-label={"Heading " + Math.round(heading) + " degrees"}>
      <circle cx="54" cy="46" r="36" fill="#222326" stroke="#dedede" strokeWidth="1.5" />
      {Array.from({ length: 24 }, (_, i) => <line key={i} x1="54" y1="11" x2="54" y2={i % 6 === 0 ? 17 : 14} stroke="#b7b9bc" transform={"rotate(" + i * 15 + " 54 46)"} />)}
      <text x="54" y="25" className="dial-cardinal">N</text><text x="54" y="73" className="dial-cardinal">S</text>
      <text x="29" y="49" className="dial-cardinal">W</text><text x="79" y="49" className="dial-cardinal">E</text>
      <path d="M54 29l8 28-8-5-8 5z" transform={"rotate(" + heading + " 54 46)"} fill="#d88b5f" stroke="#fff1dd" strokeWidth="1" />
      <circle cx="54" cy="46" r="2" fill="#fff" />
      <text x="54" y="91" className="dial-unit">{Math.round(heading)}°</text>
    </svg>
  </div>;
}

export function Instruments({ sample, elapsed, replay }: { sample?: Telemetry; elapsed: number; replay: boolean }) {
  if (!sample) return <p className="deck-empty">Waiting for aircraft telemetry.</p>;
  return <>
    <div className="deck-instrument-strip">
      <span>{replay ? "Flight time" : "Link"} <strong data-link={sample.connectivity.status}>{replay ? formatElapsed(elapsed) : sample.connectivity.status}</strong></span>
      <span>Battery <strong>{sample.battery.percentage}%</strong></span>
    </div>
    <div className="deck-gauges">
      <Attitude sample={sample} />
      <HeadingDial heading={sample.heading_deg} />
      <Dial label="Altitude" value={sample.position.altitude_m} min={0} max={200} unit="m" color="#e4e9ec" />
      <Dial label="Ground speed" value={sample.ground_speed_mps} min={0} max={24} unit="m/s" color="#9bca79" />
      <Dial label="Signal quality" value={sample.connectivity.signal_quality} min={0} max={100} unit="%" color="#80cadd" />
      <Dial label="Vertical speed" value={sample.vertical_speed_mps} min={-2} max={2} unit="m/s" color="#dfb183" signed />
    </div>
  </>;
}

export function TrafficView({ fleet, selected, sample, onSelect }: {
  fleet: Aircraft[]; selected: string; sample?: Telemetry; onSelect: (id: string) => void;
}) {
  if (!sample) return null;
  const { latitude, longitude } = sample.position;
  const dots = fleet.flatMap(craft => {
    const telemetry = craft.id === selected ? sample : craft.telemetry;
    if (!telemetry) return [];
    return [{
      craft,
      x: (telemetry.position.longitude - longitude) * Math.cos(latitude * Math.PI / 180) * 111.32,
      y: (telemetry.position.latitude - latitude) * 110.57,
      attention: telemetry.status === "attention",
    }];
  });
  const range = Math.max(1, Math.ceil(Math.max(0, ...dots.map(dot => Math.max(Math.abs(dot.x), Math.abs(dot.y)))) / 25) * 25);
  return <section className="deck-glass deck-traffic" aria-label="Relative aircraft positions">
    <div className="deck-float-head"><DeckIcon name="traffic" size={13} /><strong>TRAFFIC VIEW</strong><span>±{range} km</span></div>
    <svg viewBox="0 0 160 86" role="group" aria-label="Aircraft relative to the selected aircraft">
      <path d="M80 7V79M10 43H150M10 25H150M10 61H150M45 7V79M115 7V79" stroke="#eef5f526" fill="none" strokeWidth=".65" />
      <circle cx="80" cy="43" r="24" fill="none" stroke="#eef5f530" strokeDasharray="2 3" />
      <text x="80" y="9" textAnchor="middle" fill="#bfc6cb" fontSize="6">N</text>
      {dots.map(({ craft, x, y, attention }) => <g key={craft.id} role="button" tabIndex={0} aria-label={"Locate " + craft.name}
        onClick={() => onSelect(craft.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(craft.id); } }}
        transform={"translate(" + (80 + x / range * 64) + " " + (43 - y / range * 32) + ")"}>
        <title>{craft.name} · {Math.hypot(x, y).toFixed(1)} km</title>
        <circle r="8" fill="transparent" />
        <circle r={craft.id === selected ? 4 : 3} fill={craft.id === selected ? "#79b4ff" : attention ? "#f3a16b" : "#7cdbbe"} stroke={craft.id === selected ? "#e9f3ff" : "none"} />
      </g>)}
    </svg>
  </section>;
}

export function ReplayTimeline({ flight, aircraft, sample, replay, index, playing, speed, loading, error, onSeek, onPlay, onLive, onSpeed }: {
  flight?: Flight; aircraft?: Aircraft; sample?: Telemetry; replay: boolean; index: number; playing: boolean; speed: number;
  loading: boolean; error: string; onSeek: (index: number) => void; onPlay: () => void; onLive?: () => void; onSpeed: (speed: number) => void;
}) {
  const samples = flight?.samples ?? [];
  const last = Math.max(0, samples.length - 1);
  const duration = elapsedFrom(samples, last);
  const elapsed = elapsedFrom(samples, index);
  const height = Math.max(20, Math.ceil(Math.max(0, ...samples.map(s => s.position.altitude_m)) / 20) * 20);
  const x = (i: number) => duration > 0 ? elapsedFrom(samples, i) / duration * 600 : 0;
  const y = (altitude: number) => 83 - altitude / height * 71;
  const points = samples.map((s, i) => x(i) + "," + y(s.position.altitude_m)).join(" ");
  const controls: [DeckIconName, string, () => void][] = [
    ["start", "First sample", () => onSeek(0)],
    ["back", "Previous sample", () => onSeek(Math.max(0, index - 1))],
    [playing ? "pause" : "play", playing ? "Pause replay" : "Play replay", onPlay],
    ["next", "Next sample", () => onSeek(Math.min(last, index + 1))],
    ["end", "Last sample", () => onSeek(last)],
  ];
  return <section className="deck-timeline" aria-label="Flight replay">
    <div className="deck-transport">
      <div className="deck-transport-buttons">{controls.map(([icon, label, action]) => <button key={icon} type="button" disabled={!samples.length} aria-label={label} title={label} onClick={action}><DeckIcon name={icon} size={14} /></button>)}</div>
      <div className="deck-transport-data">
        <span>{replay ? formatElapsed(elapsed) : "LIVE"}</span>
        {sample && <><span>{Math.round(sample.heading_deg)}°</span><span>{sample.ground_speed_mps.toFixed(1)} m/s</span><span>{Math.round(sample.position.altitude_m)} m</span><span>{sample.vertical_speed_mps.toFixed(2)} m/s ↑</span></>}
      </div>
      <div className="deck-transport-end">
        <select aria-label="Replay speed" value={speed} onChange={event => onSpeed(Number(event.target.value))}>
          {[1, 4, 8, 16, 32].map(rate => <option key={rate} value={rate}>{rate}×</option>)}
        </select>
        {onLive && <button type="button" onClick={onLive} disabled={!replay} title="Return to live telemetry"><DeckIcon name="live" size={13} /> Live</button>}
      </div>
    </div>
    <div className="deck-timeline-body">
      <div className="deck-mission-tree">
        <strong>{aircraft && <AircraftGlyph kind={aircraft.kind} size={14} />}{aircraft?.name ?? "Aircraft"}</strong>
        <span><DeckIcon name="route" size={13} />{flight?.mission ?? "Recorded mission"}</span>
        <small>{flight?.id ?? "—"} · {formatElapsed(duration)}</small>
      </div>
      <div className="deck-profile">
        {samples.length ? <>
          <div className="deck-profile-axis"><span>{height} m</span><span>{height / 2} m</span><span>0 m</span></div>
          <div className="deck-profile-plot">
            <svg viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 12H600M0 47.5H600M0 83H600M120 0V90M240 0V90M360 0V90M480 0V90" stroke="#ffffff2b" fill="none" vectorEffect="non-scaling-stroke" />
              <polyline points={points} fill="none" stroke="#8c73c8" strokeWidth="6" vectorEffect="non-scaling-stroke" />
              <polyline points={points} fill="none" stroke="#f2a55e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              {flight?.events?.map(event => <path key={event.sample_index + event.category} d={"M" + x(event.sample_index) + " 0V90"} stroke="#d6a36980" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />)}
              {replay && <line x1={x(index)} x2={x(index)} y1="0" y2="90" stroke="#7eafff" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            </svg>
            <input aria-label="Flight playback position" type="range" min={0} max={last} value={index} onChange={event => onSeek(Number(event.target.value))} />
          </div>
          <div className="deck-time-axis"><span>00:00</span><span>{formatElapsed(duration / 2)}</span><span>{formatElapsed(duration)}</span></div>
        </> : <p className="deck-empty">{loading ? "Loading recorded flight…" : error || "No recording for this aircraft."}</p>}
      </div>
    </div>
    {!!flight?.events?.length && <div className="deck-event-strip" aria-label="Replay events">
      {flight.events.map(event => <button key={event.category + event.sample_index} type="button" onClick={() => onSeek(event.sample_index)}
        title={event.title}><i />{formatElapsed(elapsedFrom(samples, event.sample_index))} {event.title}</button>)}
    </div>}
  </section>;
}

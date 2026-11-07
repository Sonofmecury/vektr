"use client";

import { useEffect, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { PerspectiveCamera, Shape, Vector2 } from "three";
import { request } from "@/lib/api";
import type { Aircraft, Maintenance, Telemetry } from "@/lib/types";
import { aircraftShape } from "./AircraftGlyph";
import { DeckIcon } from "./DeckIcon";

type Part = "airframe" | "motors" | "battery" | "sensor";
type SelectPart = (part: Part) => (event: ThreeEvent<MouseEvent>) => void;

const parts: Record<Part, string> = {
  airframe: "Airframe",
  motors: "Propulsion",
  battery: "Battery module",
  sensor: "Sensor pod",
};

const hullProfile = [[.04,-1.9],[.11,-1.5],[.19,-.85],[.33,-.25],[.39,.45],[.36,.99],[.25,1.55],[.14,1.82],[.035,1.94]]
  .map(([radius, station]) => new Vector2(radius, station));

function sweptSurface(points: [number, number][]) {
  const shape = new Shape();
  shape.moveTo(...points[0]);
  points.slice(1).forEach(point => shape.lineTo(...point));
  shape.closePath();
  return shape;
}

const wing = sweptSurface([[0,.74],[1.07,.55],[2.92,-.13],[3.07,-.31],[2.79,-.5],[.92,-.57],[0,-.62]]);
const stabilizer = sweptSurface([[0,.28],[.5,.15],[1.06,-.14],[1.05,-.31],[0,-.39]]);
const fin = sweptSurface([[0,0],[.72,0],[.53,.63],[.31,.67]]);
const surfaceOptions = { depth: .038, bevelEnabled: true, bevelSize: .035, bevelThickness: .026, bevelSegments: 2, steps: 1, curveSegments: 8 };

function Paint({ active, dark = false }: { active: boolean; dark?: boolean }) {
  return <meshPhysicalMaterial color={active ? "#83b8a8" : dark ? "#293845" : "#8b9eaa"}
    roughness={dark ? .43 : .29} metalness={.56} clearcoat={.3} clearcoatRoughness={.36}
    emissive={active ? "#2d7951" : "#000000"} emissiveIntensity={active ? .2 : 0} />;
}

function Rotor({ active, index = 0 }: { active: boolean; index?: number }) {
  return <group rotation={[0,index * .83,0]}>
    <mesh castShadow><cylinderGeometry args={[.13,.16,.19,32]} /><Paint active={active} dark /></mesh>
    <mesh position={[0,.13,0]}><cylinderGeometry args={[.095,.09,.08,24]} /><Paint active={active} /></mesh>
    <RoundedBox args={[.9,.025,.081]} radius={.012} smoothness={3} position={[0,.17,0]} rotation={[0,0,.055]}>
      <Paint active={active} dark />
    </RoundedBox>
    <RoundedBox args={[.081,.025,.9]} radius={.012} smoothness={3} position={[0,.17,0]} rotation={[.055,0,0]}>
      <Paint active={active} dark />
    </RoundedBox>
    {[[-.42,0],[.42,0],[0,-.42],[0,.42]].map(([x,z]) => <mesh key={x + ":" + z} position={[x,.175,z]}>
      <boxGeometry args={[.045,.014,.045]} /><meshStandardMaterial color={active ? "#b6f3c6" : "#b6a986"} />
    </mesh>)}
  </group>;
}

function Battery({ active }: { active: boolean }) {
  return <group>
    <RoundedBox args={[.6,.15,.71]} radius={.035} smoothness={4}>
      <meshPhysicalMaterial color={active ? "#4d9a6e" : "#3c4d5c"} roughness={.27} metalness={.44} transparent={active} opacity={active ? .6 : 1} />
    </RoundedBox>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[-.24 + i * .12,.08,0]}>
      <boxGeometry args={[.026,.009,.59]} />
      <meshStandardMaterial color={active ? "#a8f4bc" : "#8494a0"} emissive={active ? "#4a9d62" : "#000"} emissiveIntensity={.65} />
    </mesh>)}
    {active && <mesh><boxGeometry args={[.63,.17,.74,4,2,5]} /><meshBasicMaterial color="#8eebad" wireframe transparent opacity={.27} /></mesh>}
    <mesh position={[0,.086,.26]}><boxGeometry args={[.17,.012,.04]} /><meshStandardMaterial color="#91edac" emissive="#56bd75" emissiveIntensity={.5} /></mesh>
  </group>;
}

function Sensor({ active }: { active: boolean }) {
  return <group>
    <mesh castShadow><sphereGeometry args={[.19,30,20]} /><Paint active={active} dark /></mesh>
    <mesh position={[0,-.03,.145]} rotation={[Math.PI / 2,0,0]}>
      <cylinderGeometry args={[.108,.13,.08,30]} /><Paint active={active} />
    </mesh>
    <mesh position={[0,-.03,.192]}>
      <sphereGeometry args={[.072,26,14]} /><meshPhysicalMaterial color="#0b1929" metalness={.65} roughness={.05} clearcoat={1} />
    </mesh>
  </group>;
}

function WingAircraft({ selected, select, vtol }: { selected: Part; select: SelectPart; vtol: boolean }) {
  return <group>
    <mesh castShadow rotation={[Math.PI/2,0,0]} onClick={select("airframe")}>
      <latheGeometry args={[hullProfile,48]} /><Paint active={selected === "airframe"} />
    </mesh>
    <mesh position={[0,.31,.51]} scale={[.29,.135,.57]} castShadow onClick={select("airframe")}>
      <sphereGeometry args={[1,40,22]} /><meshPhysicalMaterial color="#243845" metalness={.65} roughness={.2} clearcoat={.85} />
    </mesh>
    {[-1,1].map(side => <group key={side}>
      <group scale={[side,1,1]}>
        <mesh position={[.04,.026,0]} rotation={[Math.PI/2,0,0]} castShadow onClick={select("airframe")}>
          <extrudeGeometry args={[wing,surfaceOptions]} /><Paint active={selected === "airframe"} />
        </mesh>
        <mesh position={[.04,.035,-1.54]} rotation={[Math.PI/2,0,0]} castShadow onClick={select("airframe")}>
          <extrudeGeometry args={[stabilizer,surfaceOptions]} /><Paint active={selected === "airframe"} />
        </mesh>
        <mesh position={[2.96,.019,-.27]}>
          <sphereGeometry args={[.038,16,10]} /><meshStandardMaterial color={side < 0 ? "#ea6854" : "#65e7a5"} emissive={side < 0 ? "#ca3022" : "#2ba573"} emissiveIntensity={1.7} />
        </mesh>
      </group>
      <mesh position={[side*.49,-.49,-.39]} rotation={[0,0,Math.PI/2]} castShadow>
        <cylinderGeometry args={[.155,.155,.072,24]} /><meshStandardMaterial color="#181d24" roughness={.8} />
      </mesh>
      <mesh position={[side*.34,-.3,-.39]} rotation={[0,0,side*.63]}>
        <cylinderGeometry args={[.035,.035,.38,16]} /><Paint active={false} />
      </mesh>
    </group>)}
    <mesh position={[0,.06,-1.82]} rotation={[0,Math.PI/2,0]} castShadow onClick={select("airframe")}>
      <extrudeGeometry args={[fin,surfaceOptions]} /><Paint active={selected === "airframe"} />
    </mesh>
    {vtol ? [-1,1].map((side, i) => <group key={side} position={[side*1.4,.095,-.13]} onClick={select("motors")}>
      <RoundedBox args={[.23,.22,1.37]} radius={.08} smoothness={4}><Paint active={selected === "motors"} dark /></RoundedBox>
      {[-.61,.61].map((z,j) => <group key={z} position={[0,.14,z]}><Rotor active={selected === "motors"} index={i+j} /></group>)}
    </group>) : <group position={[0,0,1.91]} rotation={[Math.PI/2,0,0]} onClick={select("motors")}>
      <Rotor active={selected === "motors"} />
    </group>}
    <group position={[0,.29,-.57]} onClick={select("battery")}><Battery active={selected === "battery"} /></group>
    <group position={[0,-.28,.88]} onClick={select("sensor")}><Sensor active={selected === "sensor"} /></group>
  </group>;
}

function Multirotor({ selected, select }: { selected: Part; select: SelectPart }) {
  return <group>
    <RoundedBox args={[.75,.24,1.44]} position={[0,.06,0]} radius={.095} smoothness={5} castShadow onClick={select("airframe")}>
      <Paint active={selected === "airframe"} />
    </RoundedBox>
    <RoundedBox args={[.65,.13,1.23]} position={[0,.16,.02]} radius={.06} smoothness={4} onClick={select("airframe")}>
      <Paint active={selected === "airframe"} dark />
    </RoundedBox>
    {[-1,1].flatMap(side => [-1,1].map((fore, index) => <group key={side + ":" + fore}>
      <RoundedBox args={[1.4,.115,.16]} radius={.04} smoothness={3} position={[side*.67,.07,fore*.52]} rotation={[0,-side*fore*.59,0]} castShadow onClick={select("airframe")}>
        <Paint active={selected === "airframe"} dark />
      </RoundedBox>
      <group position={[side*1.2,.11,fore*.86]} onClick={select("motors")}><Rotor active={selected === "motors"} index={index + side} /></group>
      <mesh position={[side*.5,-.26,fore*.44]} rotation={[0,0,-side*.24]}>
        <cylinderGeometry args={[.036,.04,.43,16]} /><Paint active={false} dark />
      </mesh>
      <mesh position={[side*1.3,.045,fore*.86]}><sphereGeometry args={[.028,16,10]} /><meshStandardMaterial color={side < 0 ? "#f17b64" : "#8efcc1"} emissive={side < 0 ? "#be3026" : "#32b17b"} emissiveIntensity={1.5} /></mesh>
    </group>))}
    {[-1,1].map(side => <RoundedBox key={side} args={[.07,.07,1.19]} radius={.03} smoothness={3} position={[side*.55,-.48,0]} castShadow><Paint active={false} dark /></RoundedBox>)}
    <group position={[0,.27,-.18]} onClick={select("battery")}><Battery active={selected === "battery"} /></group>
    <group position={[0,-.13,.61]} onClick={select("sensor")}><Sensor active={selected === "sensor"} /></group>
  </group>;
}

function Runway() {
  return <group position={[0,-.64,0]}>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[48,48]} /><meshStandardMaterial color="#14202a" roughness={.74} metalness={.31} /></mesh>
    <gridHelper args={[48,32,"#43525d","#283a45"]} position={[0,.008,0]} />
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0,.012,-14+i*4]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[.14,1.65]} /><meshStandardMaterial color="#a0a8a5" roughness={.7} />
    </mesh>)}
    {[-1,1].map(side => <mesh key={side} position={[side*4.2,.011,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[.06,45]} /><meshStandardMaterial color="#78908d" />
    </mesh>)}
  </group>;
}

function StageFraming() {
  const { camera, invalidate, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    camera.zoom = Math.max(.85, Math.min(1.56, size.width / Math.max(1, size.height) * .63));
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, size.height, size.width]);
  return null;
}

function SignalTrend({ history }: { history: Telemetry[] }) {
  if (history.length < 2) return <p className="diag-no-trend">Collecting signal samples</p>;
  const points = history.map((sample,i) => i / (history.length-1) * 140 + "," + (39-sample.connectivity.signal_quality * .34)).join(" ");
  return <svg viewBox="0 0 140 42" role="img" aria-label="Recent aircraft link signal quality">
    <path d="M0 39H140M0 22H140M0 5H140" stroke="#adcfca26" fill="none" />
    <polyline points={points} fill="none" stroke="#a6edc2" strokeWidth="1.45" />
  </svg>;
}

export default function Aircraft3DViewer({ aircraft, maintenance }: { aircraft?: Aircraft; maintenance: Maintenance[] }) {
  const [selected, setSelected] = useState<Part>("battery");
  const [history, setHistory] = useState<{ id: string; rows: Telemetry[] } | null>(null);
  const aircraftId = aircraft?.id;
  const telemetry = aircraft?.telemetry;
  const form = aircraftShape(aircraft?.kind ?? "");
  const inspection = maintenance.find(record => record.status !== "completed");
  const choose: SelectPart = part => event => { event.stopPropagation(); setSelected(part); };

  useEffect(() => {
    if (!aircraftId) return;
    const abort = new AbortController();
    request<Telemetry[]>("/api/aircraft/" + encodeURIComponent(aircraftId) + "/telemetry?limit=45", { signal: abort.signal })
      .then(rows => { if (!abort.signal.aborted) setHistory({ id: aircraftId, rows }); })
      .catch(() => {});
    return () => abort.abort();
  }, [aircraftId]);

  const signalSamples = history?.id === aircraftId ? history?.rows ?? [] : [];
  const details: Record<Part, string> = {
    airframe: aircraft ? aircraft.model + " · " + aircraft.flight_hours.toFixed(1) + " recorded flight hours" : "Select an aircraft to inspect.",
    motors: "Inspect the propeller and motor assembly. The simulator does not provide motor RPM.",
    battery: telemetry ? telemetry.battery.percentage + "% charge · " + aircraft?.battery_health + "% health · " + aircraft?.battery_cycles + " cycles" : "Waiting for battery telemetry.",
    sensor: telemetry ? "Sensor " + telemetry.sensor_status + " · " + telemetry.gps_satellites + " GPS satellites" : "Waiting for payload telemetry.",
  };

  return <section className="airframe-inspection" aria-label="Interactive aircraft model and diagnostics">
    <div className="airframe-stage">
      <Canvas camera={{ position: form === "multirotor" ? [3.9,2.3,4.6] : [5.3,3.6,6.6], fov: 37 }}
        key={form} dpr={[1,1.5]} frameloop="demand" shadows
        fallback={<div className="airframe-fallback">3D rendering requires WebGL. Aircraft diagnostics remain available.</div>}>
        <color attach="background" args={["#101921"]} />
        <fog attach="fog" args={["#101921",12,30]} />
        <StageFraming />
        <ambientLight intensity={.9} />
        <directionalLight position={[3,6,4]} intensity={2.75} castShadow shadow-mapSize={[1024,1024]} />
        <directionalLight position={[-4,3,-5]} intensity={2.15} color="#9ec5f3" />
        <pointLight position={[-1,1,4]} intensity={7} color="#e1aa70" distance={8} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} color="#d8e8fa" position={[0,4,1]} scale={[8,4,1]} rotation={[Math.PI/2,0,0]} />
          <Lightformer form="rect" intensity={2} color="#9ac2fa" position={[-5,2,-1]} scale={[4,7,1]} rotation={[0,Math.PI/2,0]} />
          <Lightformer form="rect" intensity={1.4} color="#f1be8a" position={[4,2,-3]} scale={[5,3,1]} rotation={[0,-Math.PI/2,0]} />
        </Environment>
        <Runway />
        <group rotation={[0,-.23,0]}>
          {form === "multirotor" ? <Multirotor selected={selected} select={choose} /> : <WingAircraft selected={selected} select={choose} vtol={form === "vtol"} />}
        </group>
        <ContactShadows position={[0,-.62,0]} opacity={.62} scale={10} blur={2.6} far={3} resolution={256} frames={1} />
        <OrbitControls enablePan={false} minDistance={3.5} maxDistance={13} maxPolarAngle={Math.PI/2.05} />
      </Canvas>
      <div className="airframe-identity diag-glass"><span>SIMULATED AIRCRAFT</span><strong>{aircraft?.id ?? "AIRFRAME"}</strong><p>{aircraft?.kind ?? "Component inspection"}</p></div>
      <div className="airframe-link diag-glass">
        <div className="diag-label"><DeckIcon name="live" size={14} /> Link quality <strong>{telemetry?.connectivity.signal_quality ?? "—"}%</strong></div>
        <SignalTrend history={signalSamples} />
        <div className="diag-mini"><span>{telemetry?.connectivity.status ?? "No link"}</span><span>{telemetry?.gps_fix ?? "—"} GPS</span></div>
      </div>
      <div className="airframe-hint">Drag to orbit · Scroll to zoom · Select a component</div>
    </div>
    <nav className="airframe-parts" aria-label="Model components">
      {(Object.keys(parts) as Part[]).map(part => <button key={part} type="button" aria-pressed={selected === part} onClick={() => setSelected(part)}>{parts[part]}</button>)}
    </nav>
    <div className="airframe-metrics">
      <article className="diag-glass"><div className="diag-label"><DeckIcon name="inspect" size={14} /> {parts[selected]}</div>
        <strong>{aircraft?.name ?? "Aircraft profile"}</strong><p>{details[selected]}</p>
        <div className="diag-mini"><span>Firmware</span><span>{aircraft?.firmware ?? "—"}</span></div>
      </article>
      <article className="diag-glass"><div className="diag-label"><DeckIcon name="gauge" size={14} /> Battery module</div>
        <strong className="diag-number">{telemetry?.battery.percentage ?? "—"}<small>%</small></strong>
        <div className="diag-battery"><i style={{ width: (telemetry?.battery.percentage ?? 0) + "%" }} /></div>
        <div className="diag-mini"><span>{telemetry?.battery.voltage_v.toFixed(1) ?? "—"} V</span><span>{telemetry?.battery.temperature_c.toFixed(1) ?? "—"} °C</span><span>{aircraft?.battery_cycles ?? "—"} cycles</span></div>
      </article>
      <article className="diag-glass"><div className="diag-label"><DeckIcon name="checklist" size={14} /> Inspection</div>
        <strong>{inspection?.component ?? "No pending inspection"}</strong>
        <p>{inspection?.inspection_type ?? "Selected aircraft maintenance record"}</p>
        <div className="diag-mini"><span>{inspection?.status ?? "Clear"}</span><span>{inspection ? new Date(inspection.due_at).toLocaleDateString("en-GB") : "—"}</span></div>
      </article>
    </div>
  </section>;
}

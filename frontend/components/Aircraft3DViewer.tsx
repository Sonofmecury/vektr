"use client";

import { Component, Suspense, useEffect, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Edges, Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { Group, PCFShadowMap, PerspectiveCamera, Shape, Vector2, Vector3 } from "three";
import { request } from "@/lib/api";
import type { Aircraft, Maintenance, Telemetry } from "@/lib/types";
import { aircraftShape } from "./AircraftGlyph";
import { DeckIcon } from "./DeckIcon";
import { InspectionIcon } from "./InspectionIcon";
import { ApronSurface, InspectionModel, modelAnchors, type InspectionPart } from "./InspectionModel";

type Part = InspectionPart;
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

function Runway({immersive, textured = immersive}: {immersive: boolean; textured?: boolean}) {
  return <group position={[0,-.64,0]}>
    {textured ? <ApronSurface/> : <>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[48,48]} /><meshStandardMaterial color={immersive ? "#252527" : "#14202a"} roughness={.74} metalness={.31} /></mesh>
      {!immersive && <gridHelper args={[48,32,"#43525d","#283a45"]} position={[0,.008,0]} />}
    </>}
    {immersive && [-1, 1].flatMap(side => Array.from({length: 9}, (_, i) => (
      <mesh key={side + ":" + i} position={[side * 4.2, .035, -19 + i * 4.8]}>
        <boxGeometry args={[.15,.065,.1]}/>
        <meshStandardMaterial color="#C87442" emissive="#C87442" emissiveIntensity={.68}/>
      </mesh>
    )))}
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0,.012,-14+i*4]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[.14,1.65]} /><meshStandardMaterial color={immersive ? "#777775" : "#a0a8a5"} roughness={.7} />
    </mesh>)}
    {[-1,1].map(side => <mesh key={side} position={[side*4.2,.011,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[.06,45]} /><meshStandardMaterial color={immersive ? "#56585b" : "#78908d"} />
    </mesh>)}
  </group>;
}

function StageFraming({immersive}: {immersive: boolean}) {
  const { camera, invalidate, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    camera.zoom = Math.max(.85, Math.min(1.56, size.width / Math.max(1, size.height) * .63));
    if (immersive && size.width > 680) {
      camera.zoom = Math.min(1.53, Math.max(1.05, size.width / size.height * .91));
      camera.setViewOffset(size.width, size.height, 0, Math.round(size.height * .048), size.width, size.height);
    } else {
      if (immersive) camera.zoom = Math.min(.82, size.width / Math.max(1, size.height) * .84);
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, immersive, invalidate, size.height, size.width]);
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

const anchors: Record<ReturnType<typeof aircraftShape>, Record<Part, [number, number, number]>> = {
  multirotor: {airframe: [0,.2,.18], motors: [1.2,.28,.86], battery: [0,.42,-.18], sensor: [0,-.13,.8]},
  fixed: {airframe: [0,.33,.31], motors: [0,.03,2.11], battery: [0,.43,-.57], sensor: [0,-.27,1.1]},
  vtol: {airframe: [0,.33,.31], motors: [1.4,.37,.48], battery: [0,.43,-.57], sensor: [0,-.27,1.1]},
};

function ComponentAnchor({position, label}: {position: [number, number, number]; label: RefObject<HTMLSpanElement | null>}) {
  const anchor = useRef<Group>(null);
  const point = useRef(new Vector3());
  useFrame(({camera, size}) => {
    if (!anchor.current || !label.current) return;
    anchor.current.getWorldPosition(point.current).project(camera);
    const {x, y, z} = point.current;
    label.current.style.visibility = z < 1 && z > -1 && Math.abs(x) < .85 && Math.abs(y) < .9 ? "visible" : "hidden";
    label.current.style.left = (x + 1) * size.width / 2 + "px";
    label.current.style.top = (1 - y) * size.height / 2 + "px";
  });
  return <group ref={anchor} position={position}/>;
}

class SceneFallback extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {return this.state.failed ? this.props.fallback : this.props.children;}
}

function BatteryProfile({samples}: {samples: Telemetry[]}) {
  if (samples.length < 2) return null;
  const rows = samples.slice(-24);
  return <svg className="inspection-charge-trend" viewBox="0 0 144 29" preserveAspectRatio="none" role="img" aria-label="Recent battery charge history">
    {rows.map((sample, index) => {
      const height = Math.max(2, sample.battery.percentage * .27);
      return <rect key={index} x={index * 6} y={29 - height} width="3.5" height={height} rx=".8" fill="currentColor" opacity={.45 + .5 * index / rows.length}/>;
    })}
  </svg>;
}

function PackCutaway({highlighted}: {highlighted: boolean}) {
  const accent = highlighted ? "#B8D98A" : "#8FA4BA";
  return <group rotation={[0,Math.PI/2,0]}>
    <RoundedBox args={[.86,.17,.43]} radius={.023} smoothness={3}>
      <meshPhysicalMaterial color="#20282B" transparent opacity={.21} roughness={.32} metalness={.12} clearcoat={.38} depthWrite={false}/>
      <Edges threshold={24} color={accent} transparent opacity={highlighted ? .6 : .36}/>
    </RoundedBox>
    {[-.27, -.09, .09, .27].map(x => <mesh key={x} rotation={[Math.PI/2,0,0]} position={[x, .012, 0]}>
      <cylinderGeometry args={[.053,.053,.32,16]}/>
      <meshStandardMaterial color="#5D6359" roughness={.42} metalness={.42} emissive={accent} emissiveIntensity={highlighted ? .11 : .025}/>
      <Edges threshold={29} color={accent} transparent opacity={.38}/>
    </mesh>)}
    <mesh position={[0,-.035,.18]}>
      <boxGeometry args={[.72,.018,.038]}/>
      <meshStandardMaterial color="#515753" metalness={.56} roughness={.41}/>
    </mesh>
  </group>;
}

function BatterySchematic() {
  return <svg className="inspection-battery-art" viewBox="0 0 130 80" aria-hidden="true" fill="none">
    <g stroke="currentColor" strokeWidth=".9" strokeLinejoin="round">
      <path d="m12 35 62-23 43 23-61 24-44-24Zm0 0v19l44 23 61-23V35M56 59v18"/>
      <path opacity=".5" d="m19 37 55-20 35 19-53 20-37-19Zm-2 4v10l34 18V58m10 3v10l51-19V41M24 47v7m6-4v7m6-4v7m6-4v7m6-4v7"/>
      <path fill="currentColor" fillOpacity=".15" d="m24 35 47-17 32 18-47 18-32-19Z"/>
      <path d="m33 32 31 18m-22-22 31 18m-22-21 31 18m-22-22 31 18m-21-21 31 18m-62 6 47-18m-37 24 47-18"/>
      <path opacity=".65" d="M68 64l34-13m-33 9 33-13M80 60v-5m8 2v-5m8 2v-5"/>
    </g>
  </svg>;
}

export default function Aircraft3DViewer({ aircraft, maintenance, immersive = false }: { aircraft?: Aircraft; maintenance: Maintenance[]; immersive?: boolean }) {
  const [selected, setSelected] = useState<Part>("battery");
  const [history, setHistory] = useState<{ id: string; rows: Telemetry[] } | null>(null);
  const componentLabel = useRef<HTMLSpanElement>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [cutaway, setCutaway] = useState(false);
  const aircraftId = aircraft?.id;
  const telemetry = aircraft?.telemetry;
  const charge = telemetry?.battery.percentage;
  const reserve = charge == null ? "unknown" : charge < 25 ? "low" : "nominal";
  const form = aircraftShape(aircraft?.kind ?? "");
  const inspection = maintenance.find(record => record.status !== "completed");
  const useAsset = immersive && form !== "vtol";
  const anchor = useAsset ? modelAnchors[form][selected] : anchors[form][selected];
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

  const fallbackAircraft = form === "multirotor"
    ? <Multirotor selected={selected} select={choose} />
    : <WingAircraft selected={selected} select={choose} vtol={form === "vtol"} />;

  return <section className="airframe-inspection" aria-label="Interactive aircraft model and diagnostics">
    <div className="airframe-stage">
      <Canvas camera={{position: immersive ? [4.1,2.55,6.35] : form === "multirotor" ? [3.9,2.3,4.6] : [5.3,3.6,6.6], fov: 37}}
        dpr={[1,1.5]} frameloop="demand" shadows={immersive ? {type: PCFShadowMap} : true}
        fallback={<div className="airframe-fallback">3D rendering requires WebGL. Aircraft diagnostics remain available.</div>}>
        <color attach="background" args={[immersive ? "#07090C" : "#101921"]} />
        <fog attach="fog" args={[immersive ? "#07090C" : "#101921",10,29]} />
        <StageFraming immersive={immersive} />
        <ambientLight intensity={immersive ? .23 : .9} />
        <directionalLight position={immersive ? [-3,7,4] : [3,6,4]} intensity={immersive ? 2.15 : 2.75} color={immersive ? "#F3EEE9" : "#d5e3f0"}
          castShadow shadow-mapSize={[1024,1024]} shadow-radius={immersive ? 3 : 1} shadow-normalBias={immersive ? .025 : 0} />
        <directionalLight position={[-4,3,-5]} intensity={immersive ? 1.62 : 2.15} color={immersive ? "#D5DBE3" : "#a1bfde"} />
        <pointLight position={[-2,1,4]} intensity={immersive ? 5 : 7} color={immersive ? "#D0A789" : "#dba273"} distance={8} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={immersive ? 2.4 : 2.2} color={immersive ? "#E9EDF2" : "#d8e8fa"} position={[0,4,1]} scale={[8,4,1]} rotation={[Math.PI/2,0,0]} />
          <Lightformer form="rect" intensity={immersive ? 1.35 : 2} color={immersive ? "#CDD5DE" : "#9ac2fa"} position={[-5,2,-1]} scale={[4,7,1]} rotation={[0,Math.PI/2,0]} />
          <Lightformer form="rect" intensity={immersive ? .85 : 1.6} color={immersive ? "#DDCBC0" : "#f1be8a"} position={[4,2,-3]} scale={[5,3,1]} rotation={[0,-Math.PI/2,0]} />
        </Environment>
        <SceneFallback fallback={<Runway immersive={immersive} textured={false}/>}>
          <Suspense fallback={<Runway immersive={immersive} textured={false}/>}><Runway immersive={immersive}/></Suspense>
        </SceneFallback>
        <group rotation={[0, immersive ? -.43 : -.23, 0]}>
          {useAsset ? <SceneFallback key={form} fallback={fallbackAircraft}>
            <Suspense fallback={fallbackAircraft}>
              <InspectionModel type={form} selected={selected} cutaway={cutaway} onSelect={setSelected}/>
            </Suspense>
          </SceneFallback> : fallbackAircraft}
          {useAsset && cutaway && <group position={modelAnchors[form].battery} onClick={choose("battery")}>
            <PackCutaway highlighted={selected === "battery"}/>
          </group>}
          {immersive && aircraft && <ComponentAnchor position={anchor} label={componentLabel}/>}
        </group>
        {!immersive && <ContactShadows position={[0,-.62,0]} opacity={.62} scale={10} blur={2.6} far={3} resolution={256} frames={1} />}
        <OrbitControls ref={controls} enablePan={false} minDistance={3.5} maxDistance={13} maxPolarAngle={Math.PI/2.05} />
      </Canvas>
      {immersive && <>
        {aircraft && <span className="airframe-model-tag" data-highlight={cutaway && selected === "battery"} ref={componentLabel} aria-hidden="true"><i/>{parts[selected]}</span>}
        <div className="inspection-title"><span>SIMULATED AIRCRAFT / INSPECTION</span><h1>{aircraft?.id ?? "AIRFRAME"}</h1><p>{aircraft?.kind ?? "Component inspection"}</p></div>
        <div className="inspection-view-tools" role="group" aria-label="Aircraft view">
          {useAsset && <><button type="button" aria-pressed={!cutaway} onClick={() => setCutaway(false)}>Surface</button>
          <button type="button" data-action="cutaway" aria-pressed={cutaway} onClick={() => {setSelected("battery");setCutaway(true);}}><InspectionIcon name="cutaway"/> Cutaway</button></>}
          <button type="button" title="Reset aircraft view" aria-label="Reset aircraft view" onClick={() => controls.current?.reset()}><InspectionIcon name="reset"/></button>
        </div>
        <div className="inspection-side">
          <div className="inspection-link inspection-card">
            <div className="inspection-label"><InspectionIcon name="link"/> Telemetry link <strong>{telemetry ? telemetry.connectivity.signal_quality + "%" : "—"}</strong></div>
            <SignalTrend history={signalSamples}/>
            <div className="inspection-link-meta"><span data-link={telemetry?.connectivity.status}><i/>{telemetry?.connectivity.status ?? "No link"}</span><span>{telemetry?.gps_fix ?? "—"} GPS</span></div>
          </div>
          <div className="inspection-samples inspection-card">
            <div className="inspection-label"><InspectionIcon name="battery"/> Recent charge</div>
            <BatteryProfile samples={signalSamples}/>
            <div className="inspection-link-meta"><span>{telemetry ? telemetry.battery.percentage + "% now" : "Awaiting samples"}</span><span>{Math.min(24,signalSamples.length)} samples</span></div>
          </div>
        </div>
        <div className="airframe-hint">Drag to orbit · Scroll to zoom{cutaway && useAsset ? " · Illustrative cutaway" : ""}</div>
      </>}
      {!immersive && <><div className="airframe-identity diag-glass"><span>SIMULATED AIRCRAFT</span><strong>{aircraft?.id ?? "AIRFRAME"}</strong><p>{aircraft?.kind ?? "Component inspection"}</p></div>
      <div className="airframe-link diag-glass">
        <div className="diag-label"><DeckIcon name="live" size={14} /> Link quality <strong>{telemetry?.connectivity.signal_quality ?? "—"}%</strong></div>
        <SignalTrend history={signalSamples} />
        <div className="diag-mini"><span>{telemetry?.connectivity.status ?? "No link"}</span><span>{telemetry?.gps_fix ?? "—"} GPS</span></div>
      </div>
      <div className="airframe-hint">Drag to orbit · Scroll to zoom · Select a component</div></>}
    </div>
    {immersive ? <div className="inspection-console">
      <nav className="inspection-segments" aria-label="Model components">
        {(Object.keys(parts) as Part[]).map(part => <button key={part} type="button" aria-pressed={selected === part} onClick={() => setSelected(part)}><InspectionIcon name={part}/>{parts[part]}</button>)}
      </nav>
      <div className="inspection-instruments">
        <article className="inspection-card">
          <div className="inspection-label"><InspectionIcon name={selected}/> Component profile</div>
          <strong>{aircraft?.name ?? "Aircraft profile"}</strong>
          <p>{details[selected]}</p>
          <dl><div><dt>Firmware</dt><dd>{aircraft?.firmware ?? "—"}</dd></div><div><dt>Sensor</dt><dd>{telemetry?.sensor_status ?? "—"}</dd></div></dl>
        </article>
        <article className="inspection-card inspection-power" data-reserve={reserve}>
          <div className="inspection-label"><InspectionIcon name="battery"/> Battery module</div>
          <div className="inspection-power-main">
            <div><strong>{telemetry?.battery.percentage ?? "—"}<small>%</small></strong><span>State of charge</span></div>
            <BatterySchematic/>
          </div>
          <meter aria-label="Battery charge" min={0} max={100} value={telemetry?.battery.percentage ?? 0}/>
          <dl><div><dt>Voltage</dt><dd>{telemetry?.battery.voltage_v.toFixed(1) ?? "—"} V</dd></div><div><dt>Temp</dt><dd>{telemetry?.battery.temperature_c.toFixed(1) ?? "—"} °C</dd></div><div><dt>Cycles</dt><dd>{aircraft?.battery_cycles ?? "—"}</dd></div></dl>
        </article>
        <article className="inspection-card inspection-history">
          <div className="inspection-label"><InspectionIcon name="schedule"/> Service record</div>
          <strong>{inspection?.component ?? "No pending inspection"}</strong>
          <p>{inspection?.inspection_type ?? "Selected aircraft maintenance record"}</p>
          <dl><div><dt>{inspection?.status ?? "Clear"}</dt><dd>{inspection ? new Date(inspection.due_at).toLocaleDateString("en-GB") : "—"}</dd></div></dl>
        </article>
      </div>
    </div> : <><nav className="airframe-parts" aria-label="Model components">
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
    </>}
  </section>;
}

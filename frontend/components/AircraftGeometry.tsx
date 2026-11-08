import { RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Shape, Vector2 } from "three";
import type { InspectionPart } from "./InspectionModel";

export type SelectPart = (part: InspectionPart) => (event: ThreeEvent<MouseEvent>) => void;

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

export function WingAircraft({ selected, select, vtol }: { selected?: InspectionPart; select?: SelectPart; vtol: boolean }) {
  return <group>
    <mesh castShadow rotation={[Math.PI/2,0,0]} onClick={select?.("airframe")}>
      <latheGeometry args={[hullProfile,48]} /><Paint active={selected === "airframe"} />
    </mesh>
    <mesh position={[0,.31,.51]} scale={[.29,.135,.57]} castShadow onClick={select?.("airframe")}>
      <sphereGeometry args={[1,40,22]} /><meshPhysicalMaterial color="#243845" metalness={.65} roughness={.2} clearcoat={.85} />
    </mesh>
    {[-1,1].map(side => <group key={side}>
      <group scale={[side,1,1]}>
        <mesh position={[.04,.026,0]} rotation={[Math.PI/2,0,0]} castShadow onClick={select?.("airframe")}>
          <extrudeGeometry args={[wing,surfaceOptions]} /><Paint active={selected === "airframe"} />
        </mesh>
        <mesh position={[.04,.035,-1.54]} rotation={[Math.PI/2,0,0]} castShadow onClick={select?.("airframe")}>
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
    <mesh position={[0,.06,-1.82]} rotation={[0,Math.PI/2,0]} castShadow onClick={select?.("airframe")}>
      <extrudeGeometry args={[fin,surfaceOptions]} /><Paint active={selected === "airframe"} />
    </mesh>
    {vtol ? [-1,1].map((side, i) => <group key={side} position={[side*1.4,.095,-.13]} onClick={select?.("motors")}>
      <RoundedBox args={[.23,.22,1.37]} radius={.08} smoothness={4}><Paint active={selected === "motors"} dark /></RoundedBox>
      {[-.61,.61].map((z,j) => <group key={z} position={[0,.14,z]}><Rotor active={selected === "motors"} index={i+j} /></group>)}
    </group>) : <group position={[0,0,1.91]} rotation={[Math.PI/2,0,0]} onClick={select?.("motors")}>
      <Rotor active={selected === "motors"} />
    </group>}
    <group position={[0,.29,-.57]} onClick={select?.("battery")}><Battery active={selected === "battery"} /></group>
    <group position={[0,-.28,.88]} onClick={select?.("sensor")}><Sensor active={selected === "sensor"} /></group>
  </group>;
}

export function Multirotor({ selected, select }: { selected?: InspectionPart; select?: SelectPart }) {
  return <group>
    <RoundedBox args={[.75,.24,1.44]} position={[0,.06,0]} radius={.095} smoothness={5} castShadow onClick={select?.("airframe")}>
      <Paint active={selected === "airframe"} />
    </RoundedBox>
    <RoundedBox args={[.65,.13,1.23]} position={[0,.16,.02]} radius={.06} smoothness={4} onClick={select?.("airframe")}>
      <Paint active={selected === "airframe"} dark />
    </RoundedBox>
    {[-1,1].flatMap(side => [-1,1].map((fore, index) => <group key={side + ":" + fore}>
      <RoundedBox args={[1.4,.115,.16]} radius={.04} smoothness={3} position={[side*.67,.07,fore*.52]} rotation={[0,-side*fore*.59,0]} castShadow onClick={select?.("airframe")}>
        <Paint active={selected === "airframe"} dark />
      </RoundedBox>
      <group position={[side*1.2,.11,fore*.86]} onClick={select?.("motors")}><Rotor active={selected === "motors"} index={index + side} /></group>
      <mesh position={[side*.5,-.26,fore*.44]} rotation={[0,0,-side*.24]}>
        <cylinderGeometry args={[.036,.04,.43,16]} /><Paint active={false} dark />
      </mesh>
      <mesh position={[side*1.3,.045,fore*.86]}><sphereGeometry args={[.028,16,10]} /><meshStandardMaterial color={side < 0 ? "#f17b64" : "#8efcc1"} emissive={side < 0 ? "#be3026" : "#32b17b"} emissiveIntensity={1.5} /></mesh>
    </group>))}
    {[-1,1].map(side => <RoundedBox key={side} args={[.07,.07,1.19]} radius={.03} smoothness={3} position={[side*.55,-.48,0]} castShadow><Paint active={false} dark /></RoundedBox>)}
    <group position={[0,.27,-.18]} onClick={select?.("battery")}><Battery active={selected === "battery"} /></group>
    <group position={[0,-.13,.61]} onClick={select?.("sensor")}><Sensor active={selected === "sensor"} /></group>
  </group>;
}

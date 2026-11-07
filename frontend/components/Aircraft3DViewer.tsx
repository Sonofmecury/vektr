"use client";
import {useState} from "react";
import {Canvas} from "@react-three/fiber";
import {OrbitControls, ContactShadows} from "@react-three/drei";
import type {ThreeEvent} from "@react-three/fiber";

type Part = "airframe" | "motors" | "battery" | "sensor";
const parts: Record<Part, {title:string; detail:string}> = {
  airframe: {title:"Airframe", detail:"Generic civilian quadcopter frame. Inspect the central body and four arms."},
  motors: {title:"Propulsion", detail:"Four independent motors and rotors are represented. This view is illustrative, not an airworthiness model."},
  battery: {title:"Battery bay", detail:"The removable power module sits above the center of mass. Operational battery values come from the selected aircraft record."},
  sensor: {title:"Sensor pod", detail:"A downward observation pod represents survey payload health. No camera feed or targeting capability is included."},
};

function Aircraft({selected, onSelect}: {selected:Part; onSelect:(p:Part)=>void}) {
  const select = (part:Part) => (event:ThreeEvent<MouseEvent>) => {event.stopPropagation(); onSelect(part);};
  const material = (part:Part) => ({color:selected===part?"#47b492":"#637c86",metalness:.62,roughness:.37});
  const arms = [[-1,-1],[1,-1],[-1,1],[1,1]];
  return <group rotation={[0,.35,0]}>
    <mesh onClick={select("airframe")} castShadow><boxGeometry args={[1.5,.22,.82]}/><meshStandardMaterial {...material("airframe")}/></mesh>
    <mesh position={[0,.18,0]} onClick={select("airframe")} castShadow><boxGeometry args={[1.05,.18,.6]}/><meshStandardMaterial color="#253b44" metalness={.7} roughness={.35}/></mesh>
    {arms.map(([x,z],i)=><mesh key={i} position={[x*.63,0,z*.63]} rotation={[0,-Math.atan2(z,x),0]} onClick={select("airframe")} castShadow><boxGeometry args={[1.8,.11,.13]}/><meshStandardMaterial {...material("airframe")}/></mesh>)}
    {arms.map(([x,z],i)=><group key={`motor-${i}`} position={[x*1.27,.06,z*1.27]} onClick={select("motors")}>
      <mesh castShadow><cylinderGeometry args={[.16,.19,.3,24]}/><meshStandardMaterial {...material("motors")}/></mesh>
      <mesh position={[0,.19,0]}><cylinderGeometry args={[.12,.12,.04,24]}/><meshStandardMaterial color="#142c33" metalness={.7}/></mesh>
      <mesh position={[0,.23,0]} rotation={[0,i*.53,0]}><boxGeometry args={[1.03,.018,.065]}/><meshStandardMaterial color={selected==="motors"?"#efc986":"#9bb5b9"} transparent opacity={.82}/></mesh>
      <mesh position={[0,.23,0]} rotation={[0,Math.PI/2+i*.53,0]}><boxGeometry args={[1.03,.018,.065]}/><meshStandardMaterial color={selected==="motors"?"#efc986":"#9bb5b9"} transparent opacity={.82}/></mesh>
    </group>)}
    <mesh position={[0,.38,0]} onClick={select("battery")} castShadow><boxGeometry args={[.65,.25,.47]}/><meshStandardMaterial {...material("battery")}/></mesh>
    <mesh position={[0,-.25,.3]} onClick={select("sensor")} castShadow><sphereGeometry args={[.19,24,16]}/><meshStandardMaterial {...material("sensor")}/></mesh>
    <mesh position={[0,-.29,.48]} onClick={select("sensor")}><circleGeometry args={[.095,24]}/><meshStandardMaterial color="#0b222b" metalness={.2} roughness={.1}/></mesh>
    {[-1,1].map(x=><mesh key={x} position={[x*.48,-.33,0]} castShadow><boxGeometry args={[.05,.46,.05]}/><meshStandardMaterial color="#405963"/></mesh>)}
  </group>;
}

export default function Aircraft3DViewer() {
  const [selected,setSelected]=useState<Part>("airframe");
  return <div className="viewer-layout"><div className="viewer-canvas"><Canvas camera={{position:[3.9,2.8,4.7],fov:42}} shadows dpr={[1,1.5]}>
    <color attach="background" args={["#e6f5ef"]}/><ambientLight intensity={1.5}/><directionalLight position={[3,6,4]} intensity={3.2} castShadow shadow-mapSize={[1024,1024]}/><pointLight position={[-3,1,-3]} intensity={1.4} color="#69c9bf"/>
    <Aircraft selected={selected} onSelect={setSelected}/><ContactShadows position={[0,-.73,0]} opacity={.35} scale={7} blur={2.6}/><OrbitControls enablePan={false} minDistance={3.1} maxDistance={8} maxPolarAngle={Math.PI*.8}/>
  </Canvas><span className="viewer-hint">DRAG TO ROTATE · SCROLL TO ZOOM · SELECT A COMPONENT</span></div>
  <div className="viewer-details"><div><span className="eyebrow">SELECTED COMPONENT</span><h3>{parts[selected].title}</h3><p>{parts[selected].detail}</p></div><div className="viewer-parts">{(Object.keys(parts) as Part[]).map(part=><button key={part} type="button" className={selected===part?"active":""} onClick={()=>setSelected(part)}>{parts[part].title}</button>)}</div></div></div>;
}

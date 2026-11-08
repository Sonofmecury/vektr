"use client";
import {Suspense, useEffect, useRef, useState} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {Html, OrbitControls} from "@react-three/drei";
import type {Group} from "three";
import {Multirotor, WingAircraft} from "./AircraftGeometry";
import {InspectionModel, SceneFallback} from "./InspectionModel";

export type ShowcaseModel = "concept" | "multirotor" | "vtol" | "fixed";

const showcaseCamera = {position: [4.9, 3.25, 5.8] as [number, number, number], fov: 38};

function Drone({reduced}: {reduced:boolean}) {
  const body = useRef<Group>(null);
  const rotors = useRef<Group[]>([]);
  useFrame(({clock}, delta) => {
    if (body.current) {
      body.current.position.y = reduced ? 0 : Math.sin(clock.elapsedTime * 1.25) * .045;
    }
    if (!reduced) rotors.current.forEach((rotor, i) => { if (rotor) rotor.rotation.y += delta * (i % 2 ? -12 : 12); });
  });
  return <group ref={body} rotation={[.08,-.25,0]}>
    <mesh castShadow scale={[1,.2,.56]}><sphereGeometry args={[.9,40,24]}/><meshStandardMaterial color="#e5e8e2" metalness={.48} roughness={.31}/></mesh>
    <mesh position={[0,.15,0]} castShadow scale={[.88,.12,.47]}><sphereGeometry args={[.9,40,24]}/><meshStandardMaterial color="#243d43" metalness={.55} roughness={.26}/></mesh>
    <mesh position={[0,.248,-.02]}><boxGeometry args={[.54,.014,.15]}/><meshStandardMaterial color="#a5c6bc" emissive="#175a55" emissiveIntensity={.23}/></mesh>
    <mesh position={[0,-.14,.48]} rotation={[.2,0,0]}><sphereGeometry args={[.18,24,16]}/><meshStandardMaterial color="#364a50" metalness={.55} roughness={.25}/></mesh>
    <mesh position={[0,-.16,.62]}><sphereGeometry args={[.09,24,16]}/><meshStandardMaterial color="#101c20" metalness={.5} roughness={.08}/></mesh>
    {[-1,1].map(x=><mesh key={`vent-${x}`} position={[x*.56,.125,0]} rotation={[0,0,x*.13]}><boxGeometry args={[.1,.012,.32]}/><meshStandardMaterial color="#a4b7b3" metalness={.65} roughness={.33}/></mesh>)}
    {([-1,1] as const).flatMap((x)=> ([-1,1] as const).map(z=>{
      const i=(x+1)+(z+1)/2;
      return <group key={`${x}-${z}`}>
        <mesh position={[x*.77,.01,z*.63]} rotation={[0,-x*z*.66,0]} castShadow><boxGeometry args={[1.05,.105,.15]}/><meshStandardMaterial color="#d3e0e0" metalness={.52} roughness={.32}/></mesh>
        <group position={[x*1.27,.07,z*1.13]}>
          <mesh castShadow><cylinderGeometry args={[.145,.17,.19,28]}/><meshStandardMaterial color="#244651" metalness={.7} roughness={.25}/></mesh>
          <mesh position={[0,.13,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.45,.023,8,48]}/><meshStandardMaterial color="#718689" metalness={.6} roughness={.36}/></mesh>
          <group ref={el=>{if(el)rotors.current[i]=el}} position={[0,.16,0]}>
            <mesh><boxGeometry args={[.88,.012,.065]}/><meshStandardMaterial color="#c5e9e5" transparent opacity={.7}/></mesh>
            <mesh rotation={[0,Math.PI/2,0]}><boxGeometry args={[.88,.012,.065]}/><meshStandardMaterial color="#c5e9e5" transparent opacity={.7}/></mesh>
          </group>
        </group>
      </group>;
    }))}
    {[-1,1].map(x=><group key={x} position={[x*.42,-.23,0]}><mesh><boxGeometry args={[.055,.37,.055]}/><meshStandardMaterial color="#617c82"/></mesh><mesh position={[0,-.18,0]}><boxGeometry args={[.35,.04,.06]}/><meshStandardMaterial color="#617c82"/></mesh></group>)}
  </group>;
}

function FleetModel({model}: {model: Exclude<ShowcaseModel, "concept">}) {
  const fallback = model === "multirotor" ? <Multirotor /> : <WingAircraft vtol={model === "vtol"} />;
  return <group scale={model === "multirotor" ? 1 : .65} rotation={[0, -.4, 0]}>
    {model === "vtol" ? fallback : <SceneFallback key={model} fallback={fallback}>
      <Suspense fallback={<Html center><span className="public-aircraft-status" role="status">Loading aircraft…</span></Html>}>
        <group position={[0, .36, 0]}><InspectionModel type={model} /></group>
      </Suspense>
    </SceneFallback>}
  </group>;
}

export function DroneShowcase({model}: {model: ShowcaseModel}) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {threshold: .05});
    if (root.current) observer.observe(root.current);
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);
  const unavailable = <p className="public-aircraft-placeholder">3D view unavailable on this device.</p>;
  return <div ref={root} className="public-aircraft-scene">
    <SceneFallback fallback={unavailable}>
      <Canvas camera={showcaseCamera} dpr={[1, 1.5]}
        frameloop={visible && !reduced && model === "concept" ? "always" : "demand"} fallback={unavailable}>
        <ambientLight intensity={2.1} />
        <directionalLight position={[4, 6, 4]} intensity={3} />
        <pointLight position={[-3, 2, -3]} intensity={2} color="#dfb08a" />
        {model === "concept" ? <Drone reduced={reduced} /> : <FleetModel model={model} />}
        <OrbitControls enablePan={false} enableZoom={false} enableDamping={!reduced} />
      </Canvas>
    </SceneFallback>
  </div>;
}

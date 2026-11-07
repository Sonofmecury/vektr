"use client";
import {useRef} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import type {Group} from "three";

function Drone() {
  const body = useRef<Group>(null);
  const rotors = useRef<Group[]>([]);
  useFrame(({clock}, delta) => {
    if (body.current) {
      body.current.position.y = Math.sin(clock.elapsedTime * 1.45) * .055;
      body.current.rotation.y += delta * .18;
    }
    rotors.current.forEach((rotor, i) => { if (rotor) rotor.rotation.y += delta * (i % 2 ? -16 : 16); });
  });
  return <group ref={body} rotation={[.08,-.25,0]}>
    <mesh castShadow><boxGeometry args={[1.25,.23,.7]}/><meshStandardMaterial color="#e8eff0" metalness={.55} roughness={.27}/></mesh>
    <mesh position={[0,.18,0]} castShadow><boxGeometry args={[.98,.18,.53]}/><meshStandardMaterial color="#173c48" metalness={.48} roughness={.28}/></mesh>
    <mesh position={[0,.28,-.03]}><boxGeometry args={[.55,.035,.18]}/><meshStandardMaterial color="#5ad6b5" emissive="#0b5b52" emissiveIntensity={.55}/></mesh>
    <mesh position={[0,-.16,.41]} rotation={[.18,0,0]}><boxGeometry args={[.48,.24,.18]}/><meshStandardMaterial color="#243e4b" metalness={.65} roughness={.22}/></mesh>
    <mesh position={[0,-.24,.54]}><circleGeometry args={[.09,24]}/><meshStandardMaterial color="#0b151c" metalness={.6} roughness={.1}/></mesh>
    {([-1,1] as const).flatMap((x)=> ([-1,1] as const).map(z=>{
      const i=(x+1)+(z+1)/2;
      return <group key={`${x}-${z}`}>
        <mesh position={[x*.77,.01,z*.63]} rotation={[0,-x*z*.66,0]} castShadow><boxGeometry args={[1.05,.105,.15]}/><meshStandardMaterial color="#d3e0e0" metalness={.52} roughness={.32}/></mesh>
        <group position={[x*1.27,.07,z*1.13]}>
          <mesh castShadow><cylinderGeometry args={[.145,.17,.19,28]}/><meshStandardMaterial color="#244651" metalness={.7} roughness={.25}/></mesh>
          <mesh position={[0,.13,0]}><torusGeometry args={[.45,.025,8,48]}/><meshStandardMaterial color="#7b9ca2" metalness={.75} roughness={.35}/></mesh>
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

export function DroneShowcase() {
  return <div className="drone-showcase" aria-label="Animated illustrative quadcopter model">
    <div className="drone-scene"><Canvas camera={{position:[3.9,2.45,4.8],fov:38}} dpr={[1,1.5]}><ambientLight intensity={2.3}/><directionalLight position={[4,6,4]} intensity={3.1}/><pointLight position={[-3,2,-3]} intensity={4} color="#65e2c6"/><Drone/><OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={.3}/></Canvas></div>
    <div className="drone-showcase-label"><span>VEKTR / AIRFRAME 01</span><strong>Fleet intelligence in motion.</strong></div>
  </div>;
}

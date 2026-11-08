"use client";

import {useEffect, useMemo, useRef} from "react";
import {useGLTF, useTexture} from "@react-three/drei";
import {Box3, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, RepeatWrapping, Vector3, type Object3D} from "three";
import {useFrame, useThree, type ThreeEvent} from "@react-three/fiber";

export type InspectionPart = "airframe" | "motors" | "battery" | "sensor";
type Airframe = "fixed" | "multirotor";

const paths: Record<Airframe, string> = {
  fixed: "/media/aircraft/kestrel.glb",
  multirotor: "/media/aircraft/aster.glb",
};

export const modelAnchors: Record<Airframe, Record<InspectionPart, [number, number, number]>> = {
  fixed: {airframe: [0,.02,.6], motors: [0,-.23,-1.68], battery: [0,.07,.03], sensor: [0,-.32,.85]},
  multirotor: {airframe: [0,.36,.04], motors: [.99,.19,.99], battery: [0,.28,-.25], sensor: [0,-.28,.32]},
};

function classify(node: Object3D, type: Airframe): InspectionPart {
  for (let item: Object3D | null = node; item; item = item.parent) {
    if (/^prop(?:-|$)/.test(item.name)) return "motors";
  }
  if (type === "multirotor" && node.name === "quadcopter-drone_10") return "sensor";
  return "airframe";
}

export function InspectionModel({type, selected, cutaway, onSelect}: {
  type: Airframe; selected: InspectionPart; cutaway: boolean; onSelect: (part: InspectionPart) => void;
}) {
  const {scene} = useGLTF(paths[type], false);
  const invalidate = useThree(state => state.invalidate);
  const progress = useRef(0);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const bounds = new Box3().setFromObject(root);
    const scale = (type === "fixed" ? 6.6 : 3.48) / bounds.getSize(new Vector3()).x;
    const center = bounds.getCenter(new Vector3());
    const materials: {surface: MeshStandardMaterial; part: InspectionPart; shell: boolean}[] = [];
    const edges = new LineBasicMaterial({color: "#A7B0BA", transparent: true, opacity: 0});
    const outlines: LineSegments[] = [];

    root.traverse(node => {
      if (!(node instanceof Mesh) || !(node.material instanceof MeshStandardMaterial)) return;
      const surface = node.material.clone();
      const part = classify(node, type);
      node.userData.inspectionPart = part;
      node.castShadow = true;
      node.receiveShadow = true;
      if (surface.name === "shell") {
        surface.color.set("#73777C");
        surface.metalness = .47;
        surface.roughness = .39;
      }
      if (surface.name === "accent") surface.color.set("#34383C");
      if (part === "motors") {
        surface.color.multiplyScalar(.71);
        surface.roughness = .58;
        surface.metalness = .28;
      }
      if (surface.name === "canopy" || surface.name === "glass") {
        surface.color.set("#22252A");
        surface.roughness = .14;
        surface.metalness = .18;
      }
      node.material = surface;
      materials.push({surface, part, shell: surface.name === "shell" || surface.name === "accent"});
      if (["shell", "alloy", "accent", "steel"].includes(surface.name)) {
        const outline = new LineSegments(new EdgesGeometry(node.geometry, 24), edges);
        outline.visible = false;
        outline.raycast = () => {};
        outlines.push(outline);
        node.add(outline);
      }
    });

    root.scale.setScalar(scale);
    root.position.set(-center.x * scale, -.63 - bounds.min.y * scale, -center.z * scale);
    return {root, materials, outlines, edges};
  }, [scene, type]);

  useEffect(() => {
    for (const {surface, part} of model.materials) {
      if (part !== "motors") continue;
      surface.emissive.set(selected === "motors" ? "#8FA4BA" : "#000000");
      surface.emissiveIntensity = selected === "motors" ? .24 : 0;
    }
    invalidate();
  }, [model, selected, cutaway, invalidate]);

  useFrame((_, delta) => {
    const target = cutaway ? 1 : 0;
    const difference = target - progress.current;
    if (!difference) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    progress.current += Math.sign(difference) * Math.min(Math.abs(difference), reduced ? 1 : Math.max(.045, delta * 5));
    const blend = progress.current;
    for (const {surface, shell} of model.materials) {
      if (!shell) continue;
      const transparent = blend > 0;
      if (surface.transparent !== transparent) {
        surface.transparent = transparent;
        surface.depthWrite = !transparent;
        surface.needsUpdate = true;
      }
      surface.opacity = 1 - blend * .87;
    }
    model.edges.opacity = blend * .63;
    for (const outline of model.outlines) outline.visible = blend > 0;
    if (blend !== target) invalidate();
  });

  useEffect(() => () => {
    model.materials.forEach(({surface}) => surface.dispose());
    model.outlines.forEach(outline => outline.geometry.dispose());
    model.edges.dispose();
  }, [model]);

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (event.delta <= 4) onSelect(event.object.userData.inspectionPart ?? "airframe");
  }
  return <primitive object={model.root} onClick={select}/>;
}

export function ApronSurface() {
  const map = useTexture("/media/aircraft/apron.webp");
  const texture = useMemo(() => {
    const copy = map.clone();
    copy.wrapS = copy.wrapT = RepeatWrapping;
    copy.repeat.set(9,9);
    copy.colorSpace = "srgb";
    copy.anisotropy = 8;
    copy.needsUpdate = true;
    return copy;
  }, [map]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
    <planeGeometry args={[48,48]}/>
    <meshPhysicalMaterial map={texture} color="#29282A" metalness={.06} roughness={.81} clearcoat={.16} clearcoatRoughness={.63} envMapIntensity={.34}/>
  </mesh>;
}

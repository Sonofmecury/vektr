"use client";

import dynamic from "next/dynamic";
import {useState} from "react";
import {AircraftGlyph} from "./AircraftGlyph";
import type {ShowcaseModel} from "./DroneShowcase";

const DroneShowcase = dynamic(() => import("./DroneShowcase").then(module => module.DroneShowcase), {
  ssr: false,
  loading: () => <p className="public-aircraft-placeholder" role="status">Preparing 3D viewer…</p>,
});

const models = [
  {id: "concept", name: "Concept quad", kind: "Multirotor concept"},
  {id: "multirotor", name: "Aster M4", kind: "Multirotor inspection"},
  {id: "vtol", name: "Meridian V2", kind: "VTOL mapping"},
  {id: "fixed", name: "Kestrel F8", kind: "Fixed-wing survey"},
] as const;

export function PublicDrone() {
  const [model, setModel] = useState<ShowcaseModel>("concept");

  return <div className="public-aircraft-viewer">
    <div className="public-aircraft-selector" role="group" aria-label="Choose an aircraft model">
      {models.map(({id, name, kind}) => (
        <button key={id} type="button" aria-pressed={id === model} aria-controls="public-aircraft-preview"
          onClick={() => setModel(id)}>
          <AircraftGlyph kind={kind} size={23} />
          <span><strong>{name}</strong><small>{kind}</small></span>
        </button>
      ))}
    </div>
    <div className="public-hero-art" id="public-aircraft-preview">
      <DroneShowcase model={model} />
      <div className="public-aircraft-caption">Drag to rotate</div>
    </div>
  </div>;
}

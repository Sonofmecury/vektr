"use client";
import {useEffect, useRef, useState} from "react";
import * as maplibregl from "maplibre-gl";
import type {Aircraft} from "@/lib/types";

export function FleetMap({aircraft, selected, onSelect}: {aircraft: Aircraft[]; selected: string; onSelect: (id: string) => void}) {
  const [basemap, setBasemap] = useState<"streets" | "satellite">("streets");
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const previousSelection = useRef(selected);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const fitFleet = () => {
    if (!map.current) return;
    const bounds = new maplibregl.LngLatBounds();
    aircraft.forEach(a => {if (a.telemetry) bounds.extend([a.telemetry.position.longitude,a.telemetry.position.latitude]);});
    if (!bounds.isEmpty()) map.current.fitBounds(bounds,{padding: window.innerWidth < 650 ? 38 : 80,maxZoom:6.2,duration:750});
  };

  useEffect(() => {
    if (!element.current || map.current) return;
    maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    const instance = new maplibregl.Map({
      container: element.current,
      style: {version: 8, sources: {base: {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"], tileSize: 256,
        attribution: '© <a href="https://www.esri.com">Esri</a>, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}},
        layers: [{id: "base", type: "raster", source: "base"}]},
      center: [7.5, 9.1], zoom: 5.2, minZoom: 3.5, attributionControl: {},
    });
    instance.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
    const positions = aircraft.map(a => a.telemetry?.position).filter(p => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (positions.length) {
      const bounds = new maplibregl.LngLatBounds();
      positions.forEach(p => bounds.extend([p!.longitude,p!.latitude]));
      instance.fitBounds(bounds, {padding: window.innerWidth < 650 ? 38 : 85, maxZoom: 6.2, duration: 0});
    }
    map.current = instance;
    return () => {markers.current.forEach(m => m.remove()); markers.current.clear(); instance.remove(); map.current = null;};
  // The first snapshot determines the overview extent; telemetry updates move markers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const source = map.current?.getSource("base") as maplibregl.RasterTileSource | undefined;
    source?.setTiles([basemap === "streets"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]);
  }, [basemap]);

  useEffect(() => {
    if (!map.current) return;
    for (const craft of aircraft) {
      const t = craft.telemetry;
      if (!t) continue;
      let marker = markers.current.get(craft.id);
      if (!marker) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "aircraft-marker";
        button.setAttribute("aria-label", `Select ${craft.name}`);
        const glyph = document.createElement("span");
        glyph.className = "aircraft-marker-glyph";
        glyph.textContent = "➤";
        const label = document.createElement("span");
        label.className = "aircraft-marker-label";
        label.textContent = craft.id;
        button.append(glyph, label);
        button.onclick = () => onSelectRef.current(craft.id);
        marker = new maplibregl.Marker({element: button, anchor: "center"}).setLngLat([t.position.longitude, t.position.latitude]).addTo(map.current);
        markers.current.set(craft.id, marker);
      }
      marker.setLngLat([t.position.longitude, t.position.latitude]);
      const button = marker.getElement();
      button.dataset.status = t.status;
      button.dataset.selected = String(selected === craft.id);
      const glyph = button.querySelector(".aircraft-marker-glyph") as HTMLElement | null;
      if (glyph) glyph.style.transform = `rotate(${t.heading_deg + 45}deg)`;
    }
    if (previousSelection.current !== selected) {
      const craft = aircraft.find(a => a.id === selected);
      if (craft?.telemetry) map.current.flyTo({center: [craft.telemetry.position.longitude, craft.telemetry.position.latitude], zoom: Math.max(map.current.getZoom(), 7.3), duration: 900});
      previousSelection.current = selected;
    }
  }, [aircraft, selected]);

  return <div className="fleet-map-wrap"><div ref={element} className="fleet-map" role="region" aria-label="Simulated aircraft positions" />
    <div className="map-layer-switch" role="group" aria-label="Map controls"><button type="button" aria-pressed={basemap === "streets"} onClick={()=>setBasemap("streets")}>Street</button><button type="button" aria-pressed={basemap === "satellite"} onClick={()=>setBasemap("satellite")}>Satellite</button><button type="button" onClick={fitFleet} aria-label="Fit all aircraft on map">Fit fleet</button></div>
    <div className="map-scale-note"><span className="map-scale-dot"/> SIX SIMULATED AIRCRAFT · NIGERIA</div>
  </div>;
}

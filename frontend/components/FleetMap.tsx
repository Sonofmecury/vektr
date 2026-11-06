"use client";
import {useEffect, useRef} from "react";
import * as maplibregl from "maplibre-gl";
import type {Aircraft} from "@/lib/types";

export function FleetMap({aircraft, selected, onSelect}: {aircraft: Aircraft[]; selected: string; onSelect: (id: string) => void}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!element.current || map.current) return;
    maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    const instance = new maplibregl.Map({
      container: element.current,
      style: {version: 8, sources: {base: {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"], tileSize: 256,
        attribution: '© <a href="https://www.esri.com">Esri</a>, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}},
        layers: [{id: "base", type: "raster", source: "base"}]},
      center: [7.5, 9.1], zoom: 5.2, minZoom: 3.5, attributionControl: {},
    });
    instance.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
    if (window.innerWidth < 650) instance.jumpTo({center: [6.1, 9.2], zoom: 4.3});
    else instance.fitBounds([[3.2, 6.2], [8.9, 12.3]], {padding: 24, maxZoom: 5.4, duration: 0});
    map.current = instance;
    return () => {markers.current.forEach(m => m.remove()); markers.current.clear(); instance.remove(); map.current = null;};
  }, []);

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
        button.innerHTML = '<span class="aircraft-marker-glyph">✦</span>';
        button.onclick = () => onSelectRef.current(craft.id);
        marker = new maplibregl.Marker({element: button, anchor: "center"}).setLngLat([t.position.longitude, t.position.latitude]).addTo(map.current);
        markers.current.set(craft.id, marker);
      }
      marker.setLngLat([t.position.longitude, t.position.latitude]);
      const button = marker.getElement();
      button.dataset.status = t.status;
      button.dataset.selected = String(selected === craft.id);
      const glyph = button.querySelector("span") as HTMLElement | null;
      if (glyph) glyph.style.transform = `rotate(${t.heading_deg}deg)`;
    }
  }, [aircraft, selected]);

  return <div ref={element} className="fleet-map" role="region" aria-label="Simulated aircraft positions" />;
}

"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibre from "@/lib/maplibre";
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { Aircraft, Flight, Telemetry } from "@/lib/types";
import { makeAircraftGlyph } from "./AircraftGlyph";

export type Coordinate = [longitude: number, latitude: number];

const TILE_ROOT = "https://server.arcgisonline.com/ArcGIS/rest/services";
const SATELLITE = TILE_ROOT + "/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const STREETS = TILE_ROOT + "/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

function mapStyle(satellite: boolean): maplibre.StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      imagery: {
        type: "raster",
        tiles: [satellite ? SATELLITE : STREETS],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Imagery © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics and the GIS User Community',
      },
    },
    layers: [
      { id: "ground", type: "background", paint: { "background-color": "#191e1a" } },
      { id: "imagery", type: "raster", source: "imagery", paint: { "raster-brightness-max": 0.76, "raster-saturation": -0.25 } },
    ],
  };
}

export function positionOf(sample: Telemetry): Coordinate {
  return [sample.position.longitude, sample.position.latitude];
}

type MapProps = {
  fleet: Aircraft[];
  selected: string;
  onSelect: (id: string) => void;
  tracks: Flight[];
  replaySample?: Telemetry;
  showTracks: boolean;
  showRange: boolean;
  satellite: boolean;
  tilted: boolean;
  focus: { kind: "fleet" | "aircraft"; revision: number };
  waypoints: Coordinate[];
  placing: boolean;
  onPlace: (point: Coordinate) => void;
  onSeek: (index: number) => void;
};

function addOverlays(map: maplibre.Map) {
  for (const id of ["tracks", "plan", "waypoints", "range"]) {
    map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  map.addLayer({
    id: "range-fill", type: "fill", source: "range",
    paint: { "fill-color": "#88c887", "fill-opacity": .15 },
  });
  map.addLayer({
    id: "range-boundary", type: "line", source: "range",
    paint: { "line-color": "#a2d593", "line-width": 1.3, "line-opacity": .85, "line-dasharray": [2, 2] },
  });
  map.addLayer({
    id: "route-halo", type: "line", source: "tracks", filter: ["==", ["get", "selected"], true],
    paint: { "line-color": "#6f5ace", "line-width": 9, "line-opacity": 0.52 },
  });
  map.addLayer({
    id: "flight-routes", type: "line", source: "tracks",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["case", ["get", "selected"], "#f7a54f", "#c48749"],
      "line-width": ["case", ["get", "selected"], 3, 1.7],
      "line-opacity": ["case", ["get", "selected"], 1, 0.72],
    },
  });
  map.addLayer({
    id: "draft-route", type: "line", source: "plan",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#67dcbe", "line-width": 3, "line-dasharray": [2, 1.5] },
  });
  map.addLayer({
    id: "route-points", type: "circle", source: "waypoints",
    paint: {
      "circle-radius": 7, "circle-color": ["case", ["==", ["get", "draft"], true], "#17524a", "#744c27"],
      "circle-stroke-color": ["case", ["==", ["get", "draft"], true], "#81e9ca", "#f9ad62"], "circle-stroke-width": 1.5,
    },
  });
  map.addLayer({
    id: "route-point-labels", type: "symbol", source: "waypoints",
    layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 9, "text-allow-overlap": true },
    paint: { "text-color": "#ffffff" },
  });
}

export function MissionMap(props: MapProps) {
  const { fleet, selected, tracks, replaySample, showTracks, showRange, satellite, tilted, focus, waypoints, placing } = props;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibre.Map | null>(null);
  const markers = useRef(new Map<string, maplibre.Marker>());
  const actions = useRef({ onSelect: props.onSelect, onPlace: props.onPlace, onSeek: props.onSeek, placing });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    actions.current = { onSelect: props.onSelect, onPlace: props.onPlace, onSeek: props.onSeek, placing };
  }, [props.onSelect, props.onPlace, props.onSeek, placing]);

  useEffect(() => {
    if (!container.current) return;
    let map: maplibre.Map;
    try {
      map = new maplibre.Map({
        container: container.current, style: mapStyle(true), center: [7.3986, 9.0765], zoom: 12,
        maxPitch: 65, maxZoom: 19, attributionControl: false, cooperativeGestures: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibre.AttributionControl({ compact: true }));
    map.addControl(new maplibre.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.once("style.load", () => {
      addOverlays(map);
      setReady(true);
    });
    map.on("click", ({ lngLat, point }) => {
      if (actions.current.placing) {
        actions.current.onPlace([lngLat.lng, lngLat.lat]);
        return;
      }
      if (!map.getLayer("route-points")) return;
      const waypoint = map.queryRenderedFeatures(point, { layers: ["route-points"] })[0];
      const index = waypoint?.properties.sample_index;
      if (typeof index === "number") actions.current.onSeek(index);
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    const activeMarkers = markers.current;
    return () => {
      resize.disconnect();
      activeMarkers.forEach(marker => marker.remove());
      activeMarkers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource<maplibre.RasterTileSource>("imagery");
    if (ready) source?.setTiles([satellite ? SATELLITE : STREETS]);
  }, [ready, satellite]);

  useEffect(() => {
    if (ready) mapRef.current?.easeTo({ pitch: tilted ? 48 : 0, duration: 350 });
  }, [ready, tilted]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = placing ? "crosshair" : "";
  }, [placing, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const routes: Feature<LineString>[] = [];
    const points: Feature<Point>[] = [];
    if (showTracks) for (const flight of tracks) {
      const coords = flight.samples?.map(positionOf) ?? [];
      if (coords.length < 2) continue;
      const active = flight.aircraft_id === selected;
      routes.push({ type: "Feature", properties: { selected: active }, geometry: { type: "LineString", coordinates: coords } });
      if (active) {
        const start = coords[0];
        const end = coords[coords.length - 1];
        const closed = Math.hypot(start[0] - end[0], start[1] - end[1]) < .001;
        for (let i = 0; i < (closed ? 5 : 6); i++) {
          const index = Math.round(i * (coords.length - 1) / 5);
          points.push({ type: "Feature", properties: { label: i === 0 ? (closed ? "S/E" : "S") : i === 5 ? "E" : String(i), sample_index: index },
            geometry: { type: "Point", coordinates: coords[index] } });
        }
      }
    }
    waypoints.forEach((point, i) => points.push({
      type: "Feature", properties: { label: String(i + 1), draft: true }, geometry: { type: "Point", coordinates: point },
    }));
    const plan: FeatureCollection<LineString> = {
      type: "FeatureCollection",
      features: waypoints.length > 1
        ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: waypoints } }]
        : [],
    };
    void map.getSource<maplibre.GeoJSONSource>("tracks")?.setData({ type: "FeatureCollection", features: routes });
    void map.getSource<maplibre.GeoJSONSource>("waypoints")?.setData({ type: "FeatureCollection", features: points });
    void map.getSource<maplibre.GeoJSONSource>("plan")?.setData(plan);
  }, [ready, selected, showTracks, tracks, waypoints]);

  useEffect(() => {
    const source = mapRef.current?.getSource<maplibre.GeoJSONSource>("range");
    if (!ready || !source) return;
    const sample = replaySample ?? fleet.find(craft => craft.id === selected)?.telemetry;
    const features: Feature<Polygon>[] = [];
    if (sample && showRange) {
      const [lng, lat] = positionOf(sample);
      const longitudeStep = 1 / (111.32 * Math.max(.01, Math.cos(lat * Math.PI / 180)));
      const latitudeStep = 1 / 110.57;
      const ring = Array.from({ length: 65 }, (_, i) => {
        const angle = (i % 64) / 64 * Math.PI * 2;
        return [lng + longitudeStep * Math.cos(angle), lat + latitudeStep * Math.sin(angle)];
      });
      features.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } });
    }
    void source.setData({ type: "FeatureCollection", features });
  }, [fleet, ready, replaySample, selected, showRange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const craft of fleet) {
      const sample = craft.id === selected && replaySample ? replaySample : craft.telemetry;
      if (!sample) continue;
      seen.add(craft.id);
      let marker = markers.current.get(craft.id);
      if (!marker) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mission-marker";
        button.setAttribute("aria-label", "Select " + craft.name);
        const icon = document.createElement("span");
        icon.className = "mission-marker-glyph";
        icon.append(makeAircraftGlyph(craft.kind));
        const info = document.createElement("span");
        info.className = "mission-marker-info";
        button.append(icon, info);
        button.onclick = event => {
          event.stopPropagation();
          actions.current.onSelect(craft.id);
        };
        marker = new maplibre.Marker({ element: button, anchor: "center" }).setLngLat(positionOf(sample)).addTo(map);
        markers.current.set(craft.id, marker);
      }
      marker.setLngLat(positionOf(sample));
      const button = marker.getElement();
      button.dataset.selected = String(craft.id === selected);
      button.dataset.status = sample.status;
      button.setAttribute("aria-pressed", String(craft.id === selected));
      const icon = button.querySelector<HTMLElement>(".mission-marker-glyph");
      if (icon) icon.style.transform = "rotate(" + sample.heading_deg + "deg)";
      const label = button.querySelector<HTMLElement>(".mission-marker-info");
      if (label) label.textContent = craft.name + "\n" + Math.round(sample.position.altitude_m) + " m · " + sample.ground_speed_mps.toFixed(1) + " m/s";
    }
    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }, [fleet, selected, replaySample]);

  // Fitting is an explicit action. Keep the current map extent while telemetry streams.
  const cameraData = useRef({ fleet, selected, tracks });
  useEffect(() => { cameraData.current = { fleet, selected, tracks }; }, [fleet, selected, tracks]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { fleet, selected, tracks } = cameraData.current;
    const bounds = new maplibre.LngLatBounds();
    const group = focus.kind === "fleet" ? fleet : fleet.filter(craft => craft.id === selected);
    group.forEach(craft => { if (craft.telemetry) bounds.extend(positionOf(craft.telemetry)); });
    if (focus.kind === "aircraft") {
      tracks.find(flight => flight.aircraft_id === selected)?.samples?.forEach(sample => bounds.extend(positionOf(sample)));
    } else {
      tracks.forEach(flight => flight.samples?.forEach(sample => bounds.extend(positionOf(sample))));
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: map.getContainer().clientWidth < 550 ? 48 : 94, maxZoom: 12.9, duration: 450 });
  }, [ready, focus]);

  return <div className="mission-map-canvas" ref={container} role="region" aria-label="Satellite operations map">
    {failed && <p className="deck-map-error">The map requires WebGL. Fleet instruments and recorded telemetry are still available.</p>}
  </div>;
}

export function SimulatedCamera({ sample, expanded }: { sample: Telemetry; expanded: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibre.Map | null>(null);
  const initial = useRef(sample);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const start = initial.current;
    let map: maplibre.Map;
    try {
      map = new maplibre.Map({
        container: container.current, style: mapStyle(true), interactive: false,
        center: positionOf(start), zoom: 16, bearing: start.heading_deg, pitch: 63,
        attributionControl: false, fadeDuration: 0, maxPitch: 70,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    mapRef.current?.jumpTo({
      center: positionOf(sample), bearing: sample.heading_deg, pitch: expanded ? 66 : 62,
      zoom: Math.min(17, 16.4 - Math.log2(Math.max(50, sample.position.altitude_m) / 100)),
    });
  }, [sample, expanded]);

  return <div className="deck-camera-image">
    <div ref={container} className="deck-camera-map" aria-hidden="true" />
    {failed ? <p className="deck-map-error">Camera preview requires WebGL.</p> : <div className="deck-camera-hud" aria-hidden="true">
      <span>{sample.ground_speed_mps.toFixed(1)} <small>M/S</small></span><i /><span>{Math.round(sample.position.altitude_m)} <small>M ALT</small></span>
      <b>{Math.round(sample.heading_deg)}°</b>
    </div>}
    <span className="deck-camera-credit">Simulated view · Esri imagery</span>
  </div>;
}

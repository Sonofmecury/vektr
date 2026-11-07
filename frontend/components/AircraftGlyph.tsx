import type { Aircraft } from "@/lib/types";

const silhouettes = {
  multirotor: "M8 8l4 3 4-3m-8 8 4-3 4 3M12 9v6 M5.5 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm13 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm-13 13a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm13 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  fixed: "M12 2c.8 0 1.3.8 1.3 1.8v5l8 5v2l-8-2.7v4.7l2.3 1.7v1.3L12 20l-3.6.8v-1.3l2.3-1.7v-4.7l-8 2.7v-2l8-5v-5C10.7 2.8 11.2 2 12 2Z",
  vtol: "M12 2 14 6v3l7 3v2l-7-1v4l2 2v2l-4-1.5L8 21v-2l2-2v-4l-7 1v-2l7-3V6l2-4ZM5 8v9m14-9v9",
};

export function aircraftShape(kind: Aircraft["kind"]) {
  const type = kind.toLowerCase();
  if (type.includes("fixed")) return "fixed";
  if (type.includes("vtol")) return "vtol";
  return "multirotor";
}

export function AircraftGlyph({ kind, size = 17 }: { kind: Aircraft["kind"]; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={silhouettes[aircraftShape(kind)]} />
  </svg>;
}

export function makeAircraftGlyph(kind: Aircraft["kind"]) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.45");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", silhouettes[aircraftShape(kind)]);
  svg.append(path);
  return svg;
}

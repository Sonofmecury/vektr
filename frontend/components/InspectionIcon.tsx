import type {SVGProps} from "react";

const geometry = {
  overview: "M3 13h4l3-6 3 10 3-4h5M3 7V5h3m12 0h3v2M3 17v2h3m12 0h3v-2",
  plan: "M6 17h8a2.5 2.5 0 0 0 0-5h-4a2.5 2.5 0 0 1 0-5h8M3 17a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Zm15-10a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z",
  fleet: "M5 5h4m6 0h4v4m0 6v4h-4m-6 0H5v-4m0-6V5m7 2 2 4 4 1-4 1-2 4-2-4-4-1 4-1 2-4Z",
  flights: "M4 6v5h5M4.5 10A8 8 0 1 1 6 17.5M11 8l5 4-5 4Z",
  analytics: "M4 5v14h16M7 15l4-5 4 2 5-6M8 19v-2m4 2v-4m4 4v-5",
  maintenance: "M14 4a5 5 0 0 0-6 6l-4 4.4a2.5 2.5 0 0 0 3.6 3.6L12 14a5 5 0 0 0 6-6l-3 3-2.5-2.5L14 4ZM17 16l3 3",
  alerts: "M11 4.8a1.1 1.1 0 0 1 2 0l7.2 12.6A1.1 1.1 0 0 1 19.2 19H4.8a1.1 1.1 0 0 1-1-1.6L11 4.8Zm1 4.2v4.3m0 2.7v.3",
  system: "M5 6h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 6h2l1.5-3 2.5 6 1.5-3H17",
  settings: "M4 7h6m4 0h6M4 17h10m4 0h2m-8-12v4m4 6v4M4 12h2m3 0h11",
  airframe: "M12 3c.8 0 1.2.8 1.3 1.7l.6 5.6 6.4 3.6v1.7l-6.7-1.7v3.4l2.1 2.1v1.2L12 19.5l-3.7 1.1v-1.2l2.1-2.1v-3.4l-6.7 1.7v-1.7l6.4-3.6.6-5.6C10.8 3.8 11.2 3 12 3Z",
  multirotor: "M8 8l2.5 2.5m3 0L16 8m-8 8 2.5-2.5m3 0L16 16M5.5 5.5h2v2h-2zm11 0h2v2h-2zm-11 11h2v2h-2zm11 0h2v2h-2zM10.5 10.5h3v3h-3z",
  vtol: "M12 3l1.4 2.8v4l5.6 2.7v1.5l-5.6-1V17l2 1.7v1.4l-3.4-1-3.4 1v-1.4l2-1.7v-4l-5.6 1v-1.5l5.6-2.7v-4L12 3Zm-7.3 5v8m14.6-8v8",
  motors: "M12 10c-5-7-8-5-7-2 .6 2 3.2 3.3 5 4m4 0c8-3 7-6 4-6-2 .1-3.8 2.6-5 4m-2 4c-1 8 2 9 3 6 .7-1.9-.6-4.8-1.3-6M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z",
  battery: "M4.5 7h13A1.5 1.5 0 0 1 19 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7ZM21 10v4m-8-5-2 3h3l-2 3",
  sensor: "M5 7h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm3 0 2-2h4l2 2m-7 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
  link: "M5 18v-3m4 3v-5m4 5v-8m4 8V7m4 11V4",
  reset: "M5 5v5h5M5.5 9A7.5 7.5 0 1 1 5 15",
  cutaway: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9m-4-6 2 1m4 .5 2-1",
  schedule: "M6 6h12a1 1 0 0 1 1 1v12H5V7a1 1 0 0 1 1-1Zm2-3v5m8-5v5M5 10h14m-9 5 1.5 1.5L15 13",
  search: "M8 5H5v3m11-3h3v3M5 16v3h3m7-4 4 4m-3-8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  chevron: "m7 9 5 5 5-5",
  gauge: "M4 17a8 8 0 1 1 16 0M12 14l3-4m-8 4h1m8 0h1m-5-7v1",
  cards: "M5 5h5v5H5zm9 0h5v5h-5zM5 14h5v5H5zm9 0h5v5h-5z",
  layers: "m12 4 8 4-8 4-8-4 8-4Zm-8 8 8 4 8-4m-16 4 8 4 8-4",
  focus: "M8 4H4v4m12-4h4v4M4 16v4h4m8 0h4v-4m-8-7v6m-3-3h6",
  camera: "M5 7h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm11 4 4-2v6l-4-2",
  expand: "M9 5H5v4m10-4h4v4M5 15v4h4m6 0h4v-4",
} as const;

export type InspectionIconName = keyof typeof geometry;

export function InspectionIcon({name, ...props}: SVGProps<SVGSVGElement> & {name: InspectionIconName}) {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d={geometry[name]}/>
  </svg>;
}

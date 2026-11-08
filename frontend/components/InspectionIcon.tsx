import type {SVGProps} from "react";

const geometry = {
  overview: "M3 12h5l2-5 4 10 2-5h5M3 6V4h3m12 0h3v2M3 18v2h3m12 0h3v-2",
  plan: "M5 17h9a2.5 2.5 0 0 0 0-5h-4a2.5 2.5 0 0 1 0-5h8M3 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm14-10a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z",
  fleet: "m12 4 3 6 6 2-6 1-3 6-3-6-6-1 6-2 3-6ZM3 5h3M3 5v3m18-3h-3m3 0v3",
  flights: "M4 5v6h6M4.5 10A8 8 0 1 1 6 18m6-10v5l3 2",
  analytics: "M4 4v16h16M7 15l4-5 4 2 5-7M8 20v-2m4 2v-4m4 4v-5",
  maintenance: "M13 5a4.6 4.6 0 0 0-6 5.6l-3.7 4a2.5 2.5 0 0 0 3.5 3.5l4-4a4.6 4.6 0 0 0 5.8-5.9l-2.7 2.7-2.5-2.5L13 5Zm2 11 4 4",
  alerts: "M12 3 2.8 19h18.4L12 3Zm0 6.5v4.7m0 2.1v.4",
  system: "M4 6h16v12H4zM7 12h2l1.5-3 2.5 6 1.5-3H17",
  settings: "M4 7h16M4 17h16M9 4v6m6 4v6M4 12h2m12 0h2",
  airframe: "m12 3 2 7 7 4v2l-7-2v4l2 2v1l-4-1-4 1v-1l2-2v-4l-7 2v-2l7-4 2-7Z",
  motors: "M12 10c-5-7-8-5-7-2 .6 2 3.2 3.3 5 4m4 0c8-3 7-6 4-6-2 .1-3.8 2.6-5 4m-2 4c-1 8 2 9 3 6 .7-1.9-.6-4.8-1.3-6M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z",
  battery: "M3 7h16v10H3zM19 10h2v4h-2m-7-5-2 3h4l-2 3",
  sensor: "M4 7h16v10H4zM8 7l2-2h4l2 2m-7 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
  link: "M5 19v-3m4 3v-6m4 6v-9m4 9V7m4 12V4",
  reset: "M5 5v5h5M5.5 9A7.5 7.5 0 1 1 5 15",
  cutaway: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9m-4-6 2 1m4 .5 2-1",
  schedule: "M5 6h14v15H5zM8 3v5m8-5v5M5 10h14m-9 5 1.5 1.5L15 13",
} as const;

export type InspectionIconName = keyof typeof geometry;

export function InspectionIcon({name, ...props}: SVGProps<SVGSVGElement> & {name: InspectionIconName}) {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d={geometry[name]}/>
  </svg>;
}

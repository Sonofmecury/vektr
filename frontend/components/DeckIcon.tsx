import type { ReactNode } from "react";

const paths = {
  search: "M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm4-2 4 4",
  filter: "M3 5h18l-7 8v5l-4 2v-7Z",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  focus: "M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4m-4-12v8m-4-4h8",
  fleet: "M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M8 9h1m6 1h1m-5 5h1",
  route: "M5 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm14-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 17h8a2.5 2.5 0 0 0 0-5H9a2.5 2.5 0 0 1 0-5h8",
  camera: "M4 7h12v11H4zM16 10l4-2v9l-4-2M7 7l2-3h3l2 3",
  traffic: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M8 8a5.7 5.7 0 0 0 0 8m8-8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14m14-14a10 10 0 0 1 0 14",
  gauge: "M4 17a8 8 0 1 1 16 0M12 14l4-5M5 14h2m10 0h2M12 5v2",
  checklist: "M8 5H5v16h14V5h-3M9 3h6v4H9zm-1 10 2 2 5-5m-7 8h8",
  alert: "m12 3 9 17H3l9-17Zm0 6v4m0 3v.1",
  inspect: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5L12 12l8-4.5M12 12v9",
  play: "m8 5 11 7-11 7Z",
  pause: "M8 5v14m8-14v14",
  back: "M5 5v14m13-13-9 6 9 6Z",
  next: "M19 5v14M6 6l9 6-9 6Z",
  start: "M3 5v14m10-13-8 6 8 6Zm8 0-8 6 8 6Z",
  end: "M21 5v14M3 6l8 6-8 6Zm8 0 8 6-8 6Z",
  live: "M3 12h4l2-5 4 10 2-5h6",
  close: "m6 6 12 12M6 18 18 6",
  expand: "M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4",
  chevron: "m8 10 4 4 4-4",
  plus: "M12 5v14M5 12h14",
  undo: "M9 6 4 11l5 5m-5-5h10a5 5 0 0 1 5 5v2",
  chart: "M4 4v16h16M7 15l4-5 4 2 5-6",
  home: "m3 10 9-7 9 7m-16-1v12h14V9m-9 12v-6h4v6",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm4-13-2 6-6 2 2-6Z",
} satisfies Record<string, string>;

export type DeckIconName = keyof typeof paths;

export function DeckIcon({ name, size = 16 }: { name: DeckIconName; size?: number }): ReactNode {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>;
}

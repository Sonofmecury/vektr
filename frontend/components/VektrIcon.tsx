import type {ReactNode} from "react";

export type VektrIconName = "overview"|"plan"|"fleet"|"live"|"flights"|"analytics"|"maintenance"|"alerts"|"system"|"settings";

const drawings:Record<VektrIconName,ReactNode> = {
  plan:<><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h8a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h8"/></>,
  overview:<><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></>,
  fleet:<><path d="M12 3l7 4v10l-7 4-7-4V7zM5 7l7 4 7-4M12 11v10"/></>,
  live:<><circle cx="12" cy="12" r="2"/><path d="M7.5 7.5a6.36 6.36 0 000 9M16.5 7.5a6.36 6.36 0 010 9M4.5 4.5a10.6 10.6 0 000 15M19.5 4.5a10.6 10.6 0 010 15"/></>,
  flights:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2M3 12h2"/></>,
  analytics:<><path d="M3 20h18M5 16l4-5 4 2 6-8M5 20v-4M9 20v-9M13 20v-7M19 20V5"/></>,
  maintenance:<><path d="M14 5a5 5 0 00-6 6l-5 5a2 2 0 003 3l5-5a5 5 0 006-6l-3 3-3-3z"/></>,
  alerts:<><path d="M12 3L2 21h20L12 3zM12 9v5M12 18v.1"/></>,
  system:<><circle cx="12" cy="12" r="9"/><path d="M3 12h4l2-4 4 8 2-4h6"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></>,
};

export function VektrIcon({name,size=17}: {name:VektrIconName;size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{drawings[name]}</svg>;
}

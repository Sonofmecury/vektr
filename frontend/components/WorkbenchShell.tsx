"use client";

import {useEffect, useRef, useState, type ReactNode} from "react";
import type {Snapshot} from "@/lib/types";
import {DeckIcon} from "./DeckIcon";
import {VektrIcon, type VektrIconName} from "./VektrIcon";
import {VektrLogo, VektrWordmark} from "./VektrLogo";

const shortLabels: Partial<Record<VektrIconName, string>> = {
  overview: "Fly", plan: "Plan", flights: "Replay", analytics: "Analysis", maintenance: "Service", system: "System",
};

type Props = {
  view: string; clock: string; link: string; data: Snapshot | null;
  pages: readonly (readonly [VektrIconName, string])[];
  scenarios: readonly (readonly [string, string])[];
  navigate: (view: string) => void; openSearch: () => void;
  chooseScenario: (scenario: string) => Promise<void>;
  control: (action: string) => Promise<void>;
  children: ReactNode;
};

export function WorkbenchShell({view, clock, link, data, pages, scenarios, navigate, openSearch, chooseScenario, control, children}: Props) {
  const [pending, setPending] = useState(false);
  const simulationMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent | KeyboardEvent) {
      const menu = simulationMenu.current;
      if (!menu?.open) return;
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !menu.contains(event.target as Node)) {
        menu.open = false;
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setPending(true);
    try { await action(); } finally { setPending(false); }
  }
  return <div className="workbench-shell">
    <header className="wb-top">
      <a href="/" className="wb-brand" aria-label="Vektr homepage"><VektrLogo size={25}/><VektrWordmark width={72}/></a>
      <div className="wb-crumb"><span>OPERATIONS</span><strong>{pages.find(([id]) => id === view)?.[1] ?? "Workspace"}</strong></div>
      <div className="wb-top-tools">
        <button type="button" className="wb-icon" aria-label="Search workspace" title="Search workspace" onClick={openSearch}><DeckIcon name="search" size={18}/></button>
        <details className="wb-simulation" ref={simulationMenu}>
          <summary className="wb-control"><DeckIcon name="settings" size={15}/> Simulation <DeckIcon name="chevron" size={12}/></summary>
          <div className="wb-menu wb-glass">
            <label>Demo scenario<select disabled={pending || !data} value={data?.simulator.scenario ?? "normal"} onChange={e => void run(() => chooseScenario(e.target.value))}>
              {scenarios.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>
            <div><button type="button" disabled={pending || !data} onClick={() => void run(() => control(data?.simulator.running ? "pause" : "resume"))}>{data?.simulator.running ? "Pause" : "Resume"}</button>
            <button type="button" disabled={pending || !data} onClick={() => void run(() => control("reset"))}>Reset</button></div>
          </div>
        </details>
        <span className="wb-link" data-state={link} title={link}><i/>{link}</span>
        <time className="wb-clock">{clock} <span>UTC</span></time>
      </div>
    </header>
    <nav className="wb-rail" aria-label="Operations workspaces">
      {pages.map(([id, label]) => <button type="button" key={id} title={label} aria-label={label} aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}>
        <VektrIcon name={id}/><span>{shortLabels[id] ?? label}</span>
        {id === "alerts" && data?.alerts.some(alert => alert.state !== "resolved") && <i/>}
      </button>)}
    </nav>
    <main className="wb-main">{children}</main>
  </div>;
}

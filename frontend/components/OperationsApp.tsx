"use client";
import {useCallback, useEffect, useMemo, useState} from "react";
import {request} from "@/lib/api";
import {useFleet} from "@/lib/useFleet";
import {FlightDeck} from "./FlightDeck";
import {FlightHistoryView} from "./FlightHistoryView";
import {AlertsView, AnalyticsView, FleetView, MaintenanceView, SettingsView, SystemView} from "./OtherViews";
import {VektrLogo} from "./VektrLogo";
import {VektrIcon} from "./VektrIcon";

const NAV = [
  ["overview", "Fly workspace"], ["plan", "Mission plan"], ["fleet", "Fleet"],
  ["flights", "Flight History"], ["analytics", "Analytics"],
  ["maintenance", "Maintenance"], ["alerts", "Alerts"],
  ["system", "System Health"], ["settings", "Settings"],
] as const;
const SCENARIOS = [
  ["normal", "Normal operations"], ["connectivity", "Connectivity degradation"],
  ["battery", "Battery health warning"], ["sensor", "Sensor anomaly"], ["maintenance", "Maintenance review"],
] as const;

function pathFor(view:string) {return view==="overview"?"/platform":`/platform/${view}`;}

export function OperationsApp({view:initialView}: {view:string}) {
  const {snapshot, link, error, refresh} = useFleet();
  const [view,setView] = useState(initialView);
  const [selected,setSelected] = useState("UAV-001");
  const [token,setToken] = useState("");
  const [palette,setPalette] = useState(false);
  const [search,setSearch] = useState("");
  const [mobileNav,setMobileNav] = useState(false);
  const [message,setMessage] = useState("");
  const [clock,setClock] = useState("");

  const navigate = useCallback((next:string) => {setView(next);setPalette(false);setMobileNav(false);window.history.pushState({},"",pathFor(next));},[]);
  useEffect(()=>{const handler=()=>{const tail=window.location.pathname.split("/").filter(Boolean).at(-1);setView(tail==="platform"?"overview":tail||"overview");};window.addEventListener("popstate",handler);return()=>window.removeEventListener("popstate",handler);},[]);
  useEffect(()=>{const tick=()=>setClock(new Date().toLocaleTimeString("en-GB",{timeZone:"UTC",hour12:false}));tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setPalette(v=>!v);}if(e.key==="Escape")setPalette(false);};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[]);

  const results = useMemo(()=> {
    const q=search.toLowerCase();
    const pages=NAV.filter(([,label])=>label.toLowerCase().includes(q)).map(([id,label])=>({id,label,kind:"PAGE"}));
    const aircraft=(snapshot?.aircraft||[]).filter(a=>`${a.name} ${a.id}`.toLowerCase().includes(q)).map(a=>({id:a.id,label:`${a.name} · ${a.id}`,kind:"AIRCRAFT"}));
    return [...pages,...aircraft].slice(0,12);
  },[search,snapshot]);

  async function chooseScenario(scenario:string) {try{await request("/api/demo/scenario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenario})});setMessage(`Scenario loaded: ${scenario.replaceAll("_"," ")}`);await refresh();}catch(e){setMessage(e instanceof Error?e.message:"Scenario failed");}}
  async function control(action:string) {try{await request("/api/demo/simulator",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});await refresh();}catch(e){setMessage(e instanceof Error?e.message:"Simulator control failed");}}

  const isDeck = view === "overview" || view === "live" || view === "plan";

  return <>{isDeck && snapshot ? <FlightDeck data={snapshot} mode={view === "plan" ? "plan" : "fly"}
    selected={selected} onSelect={setSelected} link={link} clock={clock} navigate={navigate}
    chooseScenario={chooseScenario} control={control} scenarios={SCENARIOS} pages={NAV}/> : <div className="app-shell">
    <aside className={`sidebar ${mobileNav?"open":""}`}><div className="brand"><div className="brand-symbol"><VektrLogo size={38}/></div><div><strong>vektr<span>.</span></strong><span>FLEET INTELLIGENCE</span></div></div><div className="workspace-tag"><span className="workspace-avatar">V</span><div><strong>Operations workspace</strong><span>Fictional civilian fleet</span></div><span>⌄</span></div><div className="nav-caption">WORKSPACE</div><nav aria-label="Primary navigation">{NAV.map(([id,label])=><button key={id} type="button" className={`nav-item ${view===id?"active":""}`} onClick={()=>navigate(id)}><span className="nav-icon" aria-hidden="true"><VektrIcon name={id}/></span><span>{label}</span>{id==="alerts"&&snapshot?.alerts.some(a=>a.state!=="resolved")&&<i/>}</button>)}</nav><div className="sidebar-foot"><div className="demo-badge"><span className="pulse-dot"/>SIMULATION ACTIVE</div><p>Observation and diagnostics only<br/>No aircraft control functions</p><div className="sidebar-version">VEKTR / 0.3</div></div></aside>
    <div className="app-main"><header className="topbar"><button type="button" className="mobile-menu" onClick={()=>setMobileNav(v=>!v)} aria-label="Toggle navigation">☰</button><div className="breadcrumb"><span>VEKTR</span><b>/</b><strong>{NAV.find(([id])=>id===view)?.[1]||"Overview"}</strong></div><button type="button" className="search-trigger" onClick={()=>{setSearch("");setPalette(true);}}><span>⌕</span> Search aircraft, flights, views <kbd>⌘ K</kbd></button><div className={`connection-indicator ${link}`}><span className="signal-dot"/>{link}</div><div className="utc-clock">{clock} <span>UTC</span></div></header>
      <div className="demo-control-bar"><span className="control-label">DEMO SCENARIO</span><select aria-label="Select demo scenario" value={snapshot?.simulator.scenario||"normal"} onChange={e=>void chooseScenario(e.target.value)}>{SCENARIOS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><span className="control-separator"/><button type="button" onClick={()=>void control(snapshot?.simulator.running?"pause":"resume")}>{snapshot?.simulator.running?"Ⅱ Pause":"▷ Resume"}</button><button type="button" onClick={()=>void control("reset")}>↺ Reset</button><span className="demo-control-note">All aircraft and events are simulated</span></div>
      <main className="content">{error&&!snapshot?<div className="error-state"><h1>Live service unavailable</h1><p>The fleet data could not load. Please retry the connection.</p><code>{error}</code><button onClick={()=>void refresh()}>Retry connection</button></div>:snapshot?<>
        {view==="fleet"&&<FleetView data={snapshot} selected={selected} onSelect={setSelected}/>}
        {view==="flights"&&<FlightHistoryView data={snapshot}/>}
        {view==="analytics"&&<AnalyticsView data={snapshot}/>}
        {view==="maintenance"&&<MaintenanceView data={snapshot} token={token} refresh={refresh}/>}
        {view==="alerts"&&<AlertsView data={snapshot} token={token} refresh={refresh}/>}
        {view==="system"&&<SystemView data={snapshot} link={link}/>}
        {view==="settings"&&<SettingsView token={token} setToken={setToken}/>}
      </>:<div className="loading-state"><span className="pulse-dot"/> Connecting to simulated fleet…</div>}
      </main></div></div>}
    {message&&<div className="toast" role="status" onClick={()=>setMessage("")}>{message} <span>×</span></div>}
    {palette&&<div className="palette-scrim" onMouseDown={()=>setPalette(false)}><div className="palette" role="dialog" aria-modal="true" aria-label="Global search" onMouseDown={e=>e.stopPropagation()}><input autoFocus aria-label="Search" placeholder="Search views or aircraft…" value={search} onChange={e=>setSearch(e.target.value)}/><div>{results.length?results.map(r=><button key={`${r.kind}-${r.id}`} type="button" onClick={()=>{if(r.kind==="AIRCRAFT"){setSelected(r.id);navigate("fleet");}else navigate(r.id);}}><span>{r.kind}</span><strong>{r.label}</strong><em>↵</em></button>):<p>No results</p>}</div><footer>Press Esc to close · select a result to navigate</footer></div></div>}
  </>;
}

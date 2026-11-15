import {VektrLogo, VektrWordmark} from "@/components/VektrLogo";
import "../public-site.css";

export const metadata = {title: "Vektr case study"};

const walkthrough = [
  {name: "Inspect an aircraft", href: "/platform/fleet", detail: "Select an aircraft, then compare the component view with its battery and service records."},
  {name: "Review a recorded flight", href: "/platform/flights", detail: "Scrub the flight and watch the map position and telemetry update together."},
  {name: "Explore connection loss", href: "/platform", detail: "Open Demo guide and run the connection-loss scenario. Watch Aster One retain its last received position while the simulator keeps running."},
];

export default function CaseStudyPage() {
  return <div className="public-site">
    <header className="public-header">
      <a className="public-brand" href="/" aria-label="Vektr home"><VektrLogo size={31}/><VektrWordmark/></a>
      <a className="primary-action" href="/platform">Open console <span aria-hidden="true">↗</span></a>
    </header>
    <main className="case-study">
      <header>
        <h1>Vektr case study</h1>
        <p>Vektr is a portfolio simulation of a fleet console for civilian drone operations. Its operator needs to identify an aircraft, see whether its readings are current, and reconstruct what happened during a flight.</p>
        <p>Product direction by <a href="https://github.com/Sonofmecury">Sonofmecury</a>, with AI-assisted implementation. The project brief and design reviews covered the fleet workflow, flight replay, map controls, and aircraft inspection.</p>
      </header>
      <section aria-labelledby="vektr-walkthrough">
        <h2 id="vektr-walkthrough">Walk through the demo</h2>
        <div className="capability-list">
          {walkthrough.map(({name, href, detail}, index) => <a href={href} key={name}>
            <span className="capability-index">{index + 1}</span>
            <span><strong>{name}</strong><small>{detail}</small></span>
            <span className="capability-arrow" aria-hidden="true">↗</span>
          </a>)}
        </div>
      </section>
      <section aria-labelledby="vektr-architecture">
        <h2 id="vektr-architecture">Architecture</h2>
        <ol aria-label="Telemetry and replay data flow">
          {["Deterministic fleet simulator", "Cloudflare Worker and Durable Object", "Event stream and recorded flights", "Map, aircraft workspace, and replay"].map((step, index) =>
            <li key={step}>{index > 0 && <span aria-hidden="true">→ </span>}{step}</li>
          )}
        </ol>
        <p>The selected aircraft and replay sample coordinate the map, instruments, and recording timeline. The aircraft inspector pairs a model with telemetry and fictional maintenance history.</p>
      </section>
      <section aria-labelledby="vektr-findings">
        <h2 id="vektr-findings">What changed after review</h2>
        <p>The first simulation kept updating aircraft readings after a radio link dropped. The revised display keeps the last received values, labels their timestamp, and makes the camera unavailable while that aircraft is disconnected. The simulator stream has its own status.</p>
        <p>The mobile layout puts aircraft identity and exceptions above the map. Map, Aircraft, and Replay panels give visitors direct access to each view.</p>
        <p>Aircraft, flight records, and camera views are simulated. The public demo shares one scenario across visitors. Evaluation to date has used browser walkthroughs and simulator checks.</p>
      </section>
    </main>
  </div>;
}

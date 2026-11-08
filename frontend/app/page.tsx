import { PublicDrone } from "@/components/PublicDrone";
import { PublicMotion } from "@/components/PublicMotion";
import { VektrLogo, VektrWordmark } from "@/components/VektrLogo";
import "./public-site.css";

const capabilities = [
  {
    title: "Fleet operations",
    description: "See aircraft positions, link quality and active exceptions in one map workspace.",
    href: "/platform",
  },
  {
    title: "Aircraft health",
    description: "Inspect battery, component status and maintenance records for a selected aircraft.",
    href: "/platform/fleet",
  },
  {
    title: "Flight replay",
    description: "Review recorded routes with synchronized altitude, battery and signal data.",
    href: "/platform/flights",
  },
];

export default function Page() {
  return (
    <div className="public-site">
      <PublicMotion />
      <header className="public-header">
        <a className="public-brand" href="/" aria-label="Vektr home">
          <VektrLogo size={31} /><VektrWordmark />
        </a>
        <nav aria-label="Site navigation">
          <a href="#system">Platform</a>
          <a href="#airframe">Aircraft</a>
          <a href="#evidence">Flight replay</a>
        </nav>
        <a className="primary-action" href="/platform">Open console <span aria-hidden="true">↗</span></a>
      </header>

      <main>
        <section className="public-hero" aria-labelledby="public-title">
          <div className="public-hero-copy">
            <p className="public-kicker">Unmanned systems · Fleet intelligence</p>
            <h1 id="public-title">See your fleet<br />in the field.</h1>
            <p className="public-lead">Aircraft position, health and flight history in one operations console.</p>
            <div className="public-actions">
              <a className="primary-action" href="/platform">Explore the platform <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <p className="hero-caption">Concept imagery<br /><span>Simulated civilian fleet</span></p>
        </section>

        <section id="system" className="system-story">
          <div className="section-intro">
            <p className="public-kicker">01 / Platform</p>
            <h2>One picture of the fleet.</h2>
            <p>Follow aircraft across the map, understand what needs attention, and reconstruct flights from the recorded telemetry.</p>
          </div>
          <div className="capability-list">
            {capabilities.map(({ title, description, href }, index) => (
              <a key={href} href={href}>
                <span className="capability-index">0{index + 1}</span>
                <span><strong>{title}</strong><small>{description}</small></span>
                <span className="capability-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </section>

        <section id="airframe" className="story-section airframe-story">
          <div className="section-intro">
            <p className="public-kicker">02 / Aircraft</p>
            <h2>Inspect the airframe.</h2>
            <p>Switch between aircraft and drag to inspect each one in 3D. Open the fleet console for component readings and service history.</p>
            <a className="section-link" href="/platform/fleet">Open fleet <span aria-hidden="true">↗</span></a>
          </div>
          <PublicDrone />
        </section>

        <section id="evidence" className="story-section evidence-story">
          <div className="section-intro">
            <p className="public-kicker">03 / Flight history</p>
            <h2>Review what happened.</h2>
            <p>Scrub a recorded flight to connect its location, altitude, battery and signal readings at the same point in time.</p>
            <a className="section-link" href="/platform/flights">Open flight replay <span aria-hidden="true">↗</span></a>
          </div>
          <div className="evidence-graphic">
            <div className="evidence-head"><span>FLIGHT PATH</span><span>ILLUSTRATIVE</span></div>
            <svg viewBox="0 0 620 270" role="img" aria-label="Illustrative flight path with a selected point">
              <defs>
                <pattern id="flight-grid" width="31" height="31" patternUnits="userSpaceOnUse">
                  <path d="M31 0H0V31" fill="none" stroke="#363636" />
                </pattern>
              </defs>
              <rect width="620" height="270" fill="url(#flight-grid)" />
              <path d="M34 216C111 223 99 150 172 169S223 52 295 102 387 178 445 102 510 54 584 64" fill="none" stroke="var(--kit-primary-edge)" strokeWidth="2" />
              <circle cx="445" cy="102" r="8" fill="#151515" stroke="var(--kit-primary-light)" strokeWidth="3" />
              <path d="M445 112V270" stroke="#aaa" strokeDasharray="3 6" />
            </svg>
            <div className="evidence-foot"><span>ROUTE / POSITION</span><span>SELECTED SAMPLE</span></div>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <a className="public-brand" href="/" aria-label="Vektr home">
          <VektrLogo size={27} /><VektrWordmark />
        </a>
        <p>Portfolio simulation · Observation only</p>
        <a href="/platform">Open console ↗</a>
      </footer>
    </div>
  );
}

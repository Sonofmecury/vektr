import type { Metadata } from "next";
import "./globals.css";
import "./vektr.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  title: "Vektr — Fleet intelligence in motion",
  description: "Simulated UAV fleet observation, diagnostics and historical analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

import { setWorkerUrl } from "maplibre-gl";

if (typeof window !== "undefined") {
  // Next emits the ES module worker as a separate, hashed asset.
  setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
}

export * from "maplibre-gl";

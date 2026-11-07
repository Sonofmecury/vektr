import type { Snapshot } from "./types";

export const API = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.port !== "3001"
    ? window.location.origin : "http://127.0.0.1:8000");
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {cache: "no-store", ...init});
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}
export const getSnapshot = () => request<Snapshot>("/api/snapshot");

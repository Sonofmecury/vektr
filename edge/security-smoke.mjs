import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const cwd = path.dirname(fileURLToPath(import.meta.url));
const socket = net.createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
socket.close();
await once(socket, "close");
const state = await mkdtemp(path.join(os.tmpdir(), "vektr-smoke-"));
const wrangler = path.join(cwd, "node_modules", "wrangler", "bin", "wrangler.js");
const child = spawn(process.execPath, [wrangler, "dev", "--local",
  "--ip", "127.0.0.1", "--port", String(port), "--persist-to", state],
{ cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => { logs = (logs + String(chunk)).slice(-12000); });
}
let startError;
child.on("error", (error) => { startError = error; });
const origin = `http://127.0.0.1:${port}`;
function request(route, options = {}) {
  return fetch(origin + route, { ...options, signal: AbortSignal.timeout(3000) });
}
try {
  let status;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline && child.exitCode === null && !startError) {
    const response = await request("/api/system").catch(() => undefined);
    if (response?.ok) {
      status = await response.json();
      break;
    }
    await wait(300);
  }
  assert.equal(status?.api, "online", String(startError || "Worker did not start"));
  const site = await request("/");
  assert.equal(site.status, 200);
  assert.match(await site.text(), /Vektr/i);
  const snapshot = await request("/api/snapshot");
  assert.equal(snapshot.status, 200);
  assert.equal((await snapshot.json()).aircraft.length, 6);
  const admin = await request("/api/maintenance/fixture", { method: "PATCH" });
  assert.equal(admin.status, 503, "Administrative writes are disabled in the public Worker");
  const unknown = await request("/api/nonexistent");
  assert.equal(unknown.status, 404);
  console.log("Worker smoke checks passed: static site, durable state, public admin boundary, missing route.");
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (child.exitCode === null && !startError) {
    const closed = once(child, "close");
    child.kill();
    await Promise.race([closed, wait(2500)]);
  }
  await rm(state, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

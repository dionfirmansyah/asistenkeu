#!/usr/bin/env node
/**
 * tools/start_all.mjs - jalankan Vite (dev) dan server patch SPP sekaligus.
 * Ctrl+C di jendela ini menghentikan keduanya.
 *
 *   npm run start
 */
import { spawn, spawnSync } from "node:child_process";

const isWin = process.platform === "win32";

const jobs = [
  // --strictPort: kalau 5173 sedang dipakai, Vite gagal jalan alih-alih pindah ke 5174.
  // Server patch hanya mengizinkan origin 5173/4173 (lihat ALLOWED_ORIGINS).
  { name: "web", args: ["run", "dev", "--", "--strictPort"] },
  { name: "spp", args: ["run", "patch_server"] },
];

const children = [];
let stopping = false;

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (!c.pid) continue;
    if (isWin) {
      // /T mematikan seluruh pohon proses (npm -> node/vite), bukan hanya npm.
      spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      c.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 300);
}

for (const job of jobs) {
  const child = spawn("npm", job.args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    windowsHide: true,
  });
  children.push(child);

  const prefix = `[${job.name}] `;
  const pipe = (stream, out) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) out.write(prefix + line + "\n");
    });
    stream.on("end", () => {
      if (buf) out.write(prefix + buf + "\n");
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("exit", (code) => {
    console.log(`${prefix}berhenti (kode ${code ?? 0}).`);
    stopAll(code ?? 0); // salah satu mati -> matikan yang lain
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
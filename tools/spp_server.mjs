#!/usr/bin/env node
/**
 * spp_server.mjs - Server patch lokal untuk tombol "Ekspor Register SPP (.smd)"
 * di website ASISTENKEU. Thin wrapper di atas tools/spp_patch.mjs.
 *
 * Hanya mendengar di 127.0.0.1:8743 (tidak keluar dari komputer).
 * Hanya memakai modul bawaan Node (tanpa dependensi baru).
 *
 *   node tools/spp_server.mjs            # jalan di foreground (lihat log)
 *   tools/jalankan_server_spp.bat        # klik 2x (Windows)
 *
 * Endpoint:
 *   GET  /api/status     -> { ok, driver, nodeBits }
 *   POST /api/patch-spp  -> { fileName, smdBase64, edits, inserts?, password? }
 *                            { ok, applied, verified, inserted, mismatches, smdBase64, outName }
 *                            atau { ok: false, error }
 */

import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(resolve(fileURLToPath(import.meta.url), ".."), "..");
const CLI = join(ROOT, "tools", "spp_patch.mjs");
const HOST = "127.0.0.1";
const PORT = 8743;
const BODY_LIMIT = 80 * 1024 * 1024; // .smd kecil; 80MB sangat longgar
const PATCH_TIMEOUT_MS = 180000;

// Origin website yang boleh memanggil server ini. Tambahkan domain lain bila
// website di-deploy ke alamat lain. Halaman dari origin lain tidak akan bisa
// membaca respons server.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const nodeBits = () =>
  process.arch === "x64" ? 64 : process.arch === "ia32" ? 32 : process.arch;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Access-Control-Max-Age", "600");
}

function findAccessDriver() {
  try {
    const res = spawnSync("reg", ["query", "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
    });
    if (res.status !== 0 || !res.stdout) return null;
    const names = [];
    for (const line of String(res.stdout).split(/\r?\n/)) {
      const m = /^\s*(.+?)\s{2,}REG_SZ\s+/.exec(line);
      if (m) names.push(m[1]);
    }
    return names.find((n) => n.includes("Microsoft Access Driver") && n.toLowerCase().includes(".mdb")) || null;
  } catch {
    return null;
  }
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > BODY_LIMIT) {
        reject(new Error("ukuran request melebihi batas 80MB."));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function namaFileHasil() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `asistenkeu_${dd}${mm}${yyyy}.smd`;
}

function handlePatch(payload) {
  const { fileName, smdBase64, edits, inserts, password } = payload || {};
  if (typeof fileName !== "string" || !fileName.trim()) throw new Error("field fileName wajib diisi.");
  if (typeof smdBase64 !== "string" || !smdBase64.length) throw new Error("field smdBase64 wajib diisi.");
  if (!Array.isArray(edits)) throw new Error("field edits harus array.");

  const dir = mkdtempSync(join(tmpdir(), "spp_srv_"));
  try {
    // Nama file sama dengan sourceFile agar CLI tidak mencetak peringatan palsu.
    const smdPath = join(dir, basename(fileName));
    const editsPath = join(dir, "patch.edit.json");
    const outPath = join(dir, namaFileHasil());
    writeFileSync(smdPath, Buffer.from(smdBase64, "base64"));
    writeFileSync(editsPath, JSON.stringify({
      tool: "asistenkeu-spp-patch",
      version: 1,
      sourceFile: basename(fileName),
      edits,
      ...(inserts !== undefined ? { inserts } : {}),
    }));

    const args = [CLI, "--smd", smdPath, "--edits", editsPath, "--out", outPath, "--json"];
    if (typeof password === "string" && password) args.push("--password", password);
    const r = spawnSync(process.execPath, args, {
      cwd: ROOT,
      encoding: "utf8",
      timeout: PATCH_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
    const out = String(r.stdout || "") + String(r.stderr || "");
    const m = /^RESULT (\{.*\})$/m.exec(out);
    if (r.status === 0 && m) {
      const result = JSON.parse(m[1]);
      const smdOut = readFileSync(outPath);
      return { ...result, smdBase64: smdOut.toString("base64") };
    }
    const tail = out.trim().split(/\r?\n/).slice(-6).join(" ").slice(0, 600);
    throw new Error(tail ? `patch gagal: ${tail}` : `patch gagal (exit ${r.status}).`);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* abai */ }
  }
}

const server = createServer(async (req, res) => {
  setCors(req, res);

  // Preflight dari browser: cukup jawab 204 dengan header CORS di atas.
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    if (req.method === "GET" && url.pathname === "/api/status") {
      const driver = findAccessDriver();
      send(res, 200, { ok: !!driver, driver, nodeBits: nodeBits() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/patch-spp") {
      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch (e) {
        send(res, 400, { ok: false, error: e instanceof Error ? e.message : "body bukan JSON." });
        return;
      }
      try {
        const t0 = Date.now();
        const result = handlePatch(payload);
        console.log(`[${new Date().toISOString()}] patch ${payload?.fileName || "?"} ok (applied=${result.applied}, inserted=${result.inserted}, ${Date.now() - t0}ms)`);
        send(res, 200, result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`[${new Date().toISOString()}] patch GAGAL: ${msg.slice(0, 200)}`);
        send(res, 200, { ok: false, error: msg });
      }
      return;
    }
    send(res, 404, { ok: false, error: "endpoint tidak dikenal." });
  } catch (e) {
    send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, HOST, () => {
  const driver = findAccessDriver();
  console.log(`Server patch SPP jalan di http://${HOST}:${PORT}`);
  console.log(`Driver Access: ${driver || "TIDAK DITEMUKAN - pasang Access Database Engine"}`);
  console.log(`Node: ${nodeBits()}-bit. Berhentikan dengan Ctrl+C.`);
});
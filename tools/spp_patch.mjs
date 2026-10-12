#!/usr/bin/env node
/**
 * spp_patch.mjs - Terapkan edit Register SPP (JSON dari ASISTENKEU) ke file .SMD.
 *
 * Alur:
 *   1. Baca JSON ekspor dari aplikasi ASISTENKEU (tombol "Ekspor JSON edit").
 *   2. Dekode .SMD: XOR dengan keystream 32-byte (port persis dari js/core/engine.js
 *      `decodeSmd`) menjadi database Microsoft Access (Jet4/MDB).
 *   3. Terapkan tiap edit sebagai UPDATE lewat paket npm `odbc` (node-odbc) +
 *      Microsoft Access ODBC driver, lalu verifikasi hasilnya dengan SELECT.
 *      CATATAN TEKNIS: driver Access ODBC TIDAK mendukung SQLDescribeParam
 *      (error IM001), sehingga jalur parameter `?` node-odbc tidak bisa dipakai
 *      (berbeda dengan pyodbc yang tidak bergantung padanya). Sebagai gantinya
 *      nilai di-*inline* sebagai literal SQL yang dibentuk dengan ketat: nama
 *      tabel/kolom hanya dari whitelist, teks selalu lolos escape tanda kutip
 *      ganda, angka wajib finite, tanggal wajib lolos validasi kalender, dan
 *      karakter NUL ditolak - jadi nilai tidak bisa keluar dari liternya.
 *   4. Enkode ulang ke .SMD (XOR simetris) dan tulis sebagai file BARU di
 *      folder export/smd/ (atau lokasi --out). File .SMD asli tidak pernah diubah.
 *
 * Kebutuhan: Windows, Node.js 20+, `npm install` (paket `odbc`), dan Microsoft Access
 * Database Engine Redistributable (gratis; bitness harus sama dengan Node).
 * Cek driver yang terdaftar: `reg query "HKLM\SOFTWARE\ODBC\ODBCINST.INI\ODBC Drivers"`.
 *
 * Catatan password Jet/Access:
 *   File .SMD Siskeudes punya DUA lapis yang berbeda:
 *     - enkripsi XOR .SMD (ditangani xorStream() di bawah - ini SELALU
 *       dibuka otomatis dan bukan ini sumber error "Not a valid password"), dan
 *     - kemungkinan password tingkat Jet/Access pada database MDB hasil dekode
 *       (independen dari XOR; ditegakkan ketat oleh driver ODBC Microsoft,
 *       tapi sering diabaikan oleh pustaka pembaca MDB pihak ketiga seperti
 *       mdb-reader yang dipakai ASISTENKEU di browser - itu sebabnya file yang
 *       sama bisa "berhasil" dibaca di browser tapi ditolak di sini).
 *   Bila muncul error -1905 "Not a valid password", itu soal password Jet di
 *   atas, BUKAN soal bitness driver - gunakan --password, atau --keep-temp lalu
 *   buka file .mdb yang tersisa secara manual untuk memastikan.
 *
 * Contoh:
 *   npm run edit_spp
 *     (tanpa argumen: --edits = *.edit.json terbaru di export/, --smd = sourceFile
 *      dari JSON di ./ atau dataset/, password dibaca otomatis dari header file)
 *   npm run edit_spp -- --out hasil.smd --dry-run
 *   node tools/spp_patch.mjs --smd a.smd --edits a.edit.json --password rahasia
 *   node tools/spp_patch.mjs --smd a.smd --edits a.edit.json --keep-temp
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import odbc from "odbc";
import MDBReader from "mdb-reader";

// Port persis KEY_EVEN + KEY_ODD dari js/core/engine.js (siklus 32 byte, XOR simetris).
const KEY_EVEN = Buffer.from([
  0xbd, 0xde, 0xef, 0xf7, 0xfb, 0x7d, 0x3e, 0x9f,
  0xcf, 0xe7, 0xf3, 0xf9, 0xfc, 0xfe, 0xff, 0xff,
]);
const KEYSTREAM = Buffer.concat([KEY_EVEN, Buffer.alloc(16, 0xff)]);
const JET4_MAGIC = Buffer.from("Standard Jet DB", "latin1"); // dicek pada offset 4 hasil dekode

// Whitelist tabel/kolom - nama tabel & kolom tidak bisa di-parameterize,
// jadi hanya nama ini yang diizinkan dari JSON (nilai selalu di-parameterize).
const TABLES = {
  Ta_SPP: {
    keys: ["No_SPP"],
    cols: new Set(["Keterangan", "Jumlah"]),
  },
  Ta_SPPBukti: {
    keys: ["No_SPP", "No_Bukti"],
    cols: new Set(["Nm_Penerima", "Keterangan", "Tgl_Bukti", "Nilai", "Sumberdana", "link_bukti"]),
  },
};

// Whitelist INSERT - hanya dipakai server lokal (tools/spp_server.mjs) untuk
// baris pajak baru (pajakManual dari aplikasi). CLI manual tidak memakainya.
const INSERT_TABLES = {
  Ta_SPPPot: new Set(["Tahun", "Kd_Desa", "No_SPP", "Kd_Keg", "No_Bukti", "Kd_Rincian", "Nilai", "Billing_Pajak"]),
};
const INSERT_KEYS = {
  Ta_SPPPot: ["No_SPP", "No_Bukti", "Kd_Rincian"],
};

/** Error yang sudah "dipoles" - dicetak sebagai `ERROR: <pesan>` lalu exit(1). */
class Fail extends Error {}
const fail = (msg) => {
  throw new Fail(msg);
};

// --- util teks (paritas gaya repr() Python supaya pesan identik) -------------
const strVal = (v) => (v === null || v === undefined ? "" : String(v));

function repr(v) {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (v instanceof Date) return `'${fmtDateVal(v)}'`;
  if (typeof v === "string") return `'${v}'`;
  if (Array.isArray(v)) return `[${v.map(repr).join(", ")}]`;
  if (typeof v === "object") {
    return `{${Object.entries(v).map(([k, x]) => `'${k}': ${repr(x)}`).join(", ")}}`;
  }
  return String(v);
}

/** `stem` ala pathlib.Path: nama file tanpa ekstensi terakhir. */
function stemName(name) {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}

/** Nilai kolom DATE/TIMESTAMP dari driver datang sebagai string 'YYYY-MM-DD[ ...]'. */
function fmtDateVal(v) {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

/** Gabungkan pesan error odbc (error.message + array odbcErrors) jadi satu teks. */
function odbcErrorText(e) {
  const parts = [];
  if (e && e.message) parts.push(String(e.message));
  if (e && Array.isArray(e.odbcErrors)) {
    for (const oe of e.odbcErrors) {
      parts.push(`${oe.state || ""}:${oe.code} ${oe.message || ""}`);
    }
  }
  const text = parts.join(" | ").trim();
  return text || String(e);
}

const nodeBits = () =>
  process.arch === "x64" ? 64 : process.arch === "ia32" ? 32 : process.arch;

// --- kode inti (port dari spp_patch.py) --------------------------------------
function xorStream(data) {
  // XOR dengan keystream berulang 32-byte (simetris: dekode == enkode).
  const out = Buffer.allocUnsafe(data.length);
  for (let off = 0; off < data.length; off += 32) {
    const len = Math.min(32, data.length - off);
    for (let i = 0; i < len; i++) out[off + i] = data[off + i] ^ KEYSTREAM[i];
  }
  return out;
}

function hasJetMagic(dec) {
  if (dec.length < 24 || dec.readUInt32LE(0) !== 0x00000100) return false;
  return dec.subarray(4, 4 + JET4_MAGIC.length).equals(JET4_MAGIC);
}

// --- pembentuk literal SQL --------------------------------------------------
// Driver Access ODBC tidak mendukung SQLDescribeParam, jadi parameter `?`
// node-odbc tidak bisa dipakai. Nilai di-inline sebagai literal dengan aturan
// ketat berikut supaya tidak ada ruang untuk SQL injection/kesalahan tipe.

function sqlText(val) {
  const s = typeof val === "boolean" ? (val ? "True" : "False") : String(val);
  if (s.includes("\u0000")) fail(`nilai mengandung karakter NUL yang tidak diizinkan: ${repr(val)}.`);
  // Literal teks Access: kutip ganda menjadi '' (satu-satunya karakter khusus).
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlNumber(val) {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) fail(`bukan angka yang valid: ${repr(val)}.`);
  return String(num); // String() selalu memakai titik desimal, bukan koma locale
}

function sqlLiteral(field, val) {
  // Bentuk literal SET untuk satu kolom (port konversi tipe conv_value Python).
  if (val === null || val === undefined || (field === "Tgl_Bukti" && val === "")) return "NULL";
  if (field === "Tgl_Bukti") {
    const iso = String(val).slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) fail(`nilai Tgl_Bukti tidak valid: ${repr(val)} (diharapkan YYYY-MM-DD).`);
    const [, y, mo, d] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
      fail(`nilai Tgl_Bukti tidak valid: ${repr(val)} (tanggal tidak ada).`);
    }
    return `#${iso}#`; // literal tanggal khas Access
  }
  if (field === "Nilai" || field === "Jumlah") return sqlNumber(val);
  if (typeof val === "object") fail(`nilai ${field} harus skalar: ${repr(val)}.`);
  return sqlText(val);
}

function sqlKeyVal(val) {
  // Nilai kunci WHERE - teks (No_SPP/No_Bukti) atau angka; NULL = tidak akan
  // pernah cocok (sama seperti pyodbc yang membind None ke kunci).
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return sqlNumber(val);
  if (typeof val === "object") fail(`kunci harus skalar: ${repr(val)}.`);
  return sqlText(val);
}

function loadEdits(path) {
  // Baca + validasi JSON ekspor; kembalikan [sourceFile, daftar edit terurut].
  let payload;
  try {
    payload = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    if (e instanceof Fail) throw e;
    fail(e && e.code && e.code !== "SyntaxError"
      ? `tidak dapat membaca file JSON: ${e.message}`
      : `file JSON tidak valid: ${e.message}`);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.tool !== "asistenkeu-spp-patch") {
    fail("file JSON bukan hasil ekspor 'Ekspor JSON edit' ASISTENKEU (field tool tidak cocok).");
  }
  if (payload.version !== 1) {
    fail(`versi JSON tidak didukung: ${repr(payload.version)} (diharapkan 1).`);
  }
  const raw = payload.edits;
  if (!Array.isArray(raw) || raw.length === 0) {
    fail("tidak ada baris edit pada JSON (array 'edits' kosong).");
  }

  const edits = [];
  for (let i = 0; i < raw.length; i++) {
    const idx = i + 1;
    const e = raw[i];
    if (!e || typeof e !== "object" || Array.isArray(e)) fail(`edit #${idx} bukan objek.`);
    const { table, keys, sets } = e;
    if (!TABLES[table]) fail(`edit #${idx}: tabel ${repr(table)} tidak dikenal/diizinkan.`);
    const need = [...TABLES[table].keys].sort();
    if (!keys || typeof keys !== "object" || Array.isArray(keys) ||
        JSON.stringify(Object.keys(keys).sort()) !== JSON.stringify(need)) {
      fail(`edit #${idx}: kunci ${repr(keys)} harus berisi ${repr(need)}.`);
    }
    if (!sets || typeof sets !== "object" || Array.isArray(sets) || Object.keys(sets).length === 0) {
      fail(`edit #${idx}: 'sets' kosong.`);
    }
    const bad = Object.keys(sets).filter((c) => !TABLES[table].cols.has(c)).sort();
    if (bad.length) fail(`edit #${idx}: kolom ${repr(bad)} tidak dapat diedit pada ${table}.`);
    for (const k of TABLES[table].keys) {
      if (!String(keys[k]).trim()) fail(`edit #${idx}: kunci ${repr(k)} kosong.`);
    }
    edits.push([table, keys, sets]);
  }
  const rawIns = payload.inserts;
  const inserts = [];
  if (rawIns !== undefined) {
    if (!Array.isArray(rawIns)) fail("field 'inserts' harus array bila ada.");
    for (let i = 0; i < rawIns.length; i++) {
      const idx = i + 1;
      const ins = rawIns[i];
      if (!ins || typeof ins !== "object" || Array.isArray(ins)) fail(`insert #${idx} bukan objek.`);
      const { table, values } = ins;
      if (!INSERT_TABLES[table]) fail(`insert #${idx}: tabel ${repr(table)} tidak dikenal/diizinkan untuk INSERT.`);
      if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).length === 0) {
        fail(`insert #${idx}: 'values' kosong.`);
      }
      const bad = Object.keys(values).filter((c) => !INSERT_TABLES[table].has(c)).sort();
      if (bad.length) fail(`insert #${idx}: kolom ${repr(bad)} tidak dapat diisi pada ${table}.`);
      for (const k of INSERT_KEYS[table]) {
        if (!String(values[k] ?? "").trim()) fail(`insert #${idx}: kunci ${repr(k)} kosong.`);
      }
      // Validasi tipe sedini mungkin dengan pembentuk literal yang sama.
      for (const c of Object.keys(values)) sqlLiteral(c, values[c]);
      inserts.push([table, values]);
    }
  }
  return [payload.sourceFile, edits, inserts];
}

function findAccessDriver() {
  // node-odbc tidak punya daftar driver - baca registri ODBC (tampilan 64-bit,
  // sesuai bitness Node) lalu saring persis seperti versi Python.
  const res = spawnSync("reg", ["query", "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (res.status !== 0 || !res.stdout) return null;
  const names = [];
  for (const line of res.stdout.split(/\r?\n/)) {
    const m = /^\s*(.+?)\s{2,}REG_SZ\s+/.exec(line);
    if (m) names.push(m[1]);
  }
  return names.find((n) => n.includes("Microsoft Access Driver") && n.toLowerCase().includes(".mdb")) || null;
}

function usage() {
  return [
    "Pemakaian:",
    "  npm run edit_spp                  mode otomatis - tanpa argumen",
    "  npm run edit_spp -- [opsi]        atau: node tools/spp_patch.mjs [opsi]",
    "",
    "Terapkan edit Register SPP dari JSON ASISTENKEU ke salinan file .SMD baru.",
    "",
    "Tanpa argumen, tool memakai default:",
    "  --edits    : file *.edit.json terbaru di export/json/ (folder ekspor aplikasi)",
    "               atau export/ (folder lama)",
    "  --smd      : field sourceFile dari JSON, dicari di ./ lalu dataset/",
    "  --password : dibaca otomatis dari header file (lewat mdb-reader)",
    "",
    "Bila ada lebih dari satu kandidat file dan dijalankan dari terminal,",
    "ditampilkan menu pilihan (Enter = pilihan pertama/terbaru, q = batal).",
    "Paksa menu walau bukan terminal dengan SPP_MENU=1 (boleh lewat pipe stdin).",
    "",
    "Opsi:",
    "  --smd FILE        file .SMD Siskeudes (sumber, tidak diubah)",
    "                    (default: sourceFile dari JSON → ./ atau dataset/)",
    "  --edits FILE      file JSON hasil 'Ekspor JSON edit' ASISTENKEU",
    "                    (default: *.edit.json terbaru di export/)",
    "  --out FILE        nama file .SMD hasil",
    "                    (default: export/smd/<sumber>-perbaikan.smd)",
    "  --dry-run         cetak rencana UPDATE tanpa mengubah apa pun",
  "  --json            cetak satu baris RESULT {json} untuk dibaca server lokal",
    "  --password SANDI  paksa password Jet/Access tertentu (default: otomatis dari",
    "                    header; beda dari enkripsi XOR .SMD - lihat pesan error)",
    "  --keep-temp       jangan hapus file .mdb sementara setelah selesai/gagal -",
    "                    berguna untuk membuka manual di Access dan memastikan isi hasil dekode",
    "  -h, --help        tampilkan bantuan ini",
  ].join("\n");
}

function parseCli(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        smd: { type: "string" },
        edits: { type: "string" },
        out: { type: "string" },
        password: { type: "string", default: "" },
        "dry-run": { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        "keep-temp": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    }));
  } catch (e) {
    fail(`${e.message}\n\n${usage()}`);
  }
  if (values.help) {
    console.log(usage());
    process.exit(0);
  }
  return values;
}

// Terminal interaktif, atau dipaksa dengan SPP_MENU=1 (mis. `echo 2 | SPP_MENU=1 npm run edit_spp`).
const isInteractive = () =>
  !!(process.stdin.isTTY && process.stdout.isTTY) || process.env.SPP_MENU === "1";

/** Parser jawaban menu - dipisah dari readline supaya bisa diuji tanpa terminal. */
export function parsePilihan(raw, n) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "") return 0;                    // Enter → pilihan pertama (terbaru)
  if (s === "q" || s === "batal") return -1; // batal
  if (/^\d+$/.test(s)) {
    const v = Number(s);
    if (v >= 1 && v <= n) return v - 1;
  }
  return null;                               // tidak valid
}

/**
 * Tampilkan menu kandidat; di terminal interaktif ditanyakan, selain itu pakai [1].
 * Jawaban dibaca lewat antrean 'line' (bukan rl.question) supaya baris yang tiba
 * di antara dua pertanyaan atau dalam satu chunk tidak pernah hilang, dan EOF/Ctrl+C
 * berujung batal - bukan proses yang keluar diam-diam.
 */
async function pilihMenu(judul, items) {
  console.log(judul);
  items.forEach((it, i) => console.log(`  [${i + 1}] ${it.label}${it.info ? "  (" + it.info + ")" : ""}`));
  if (!isInteractive()) {
    console.log("(bukan terminal interaktif - memakai [1])");
    return 0;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const antrian = [];
  let tertutup = false;
  let tunggu = null;
  const serah = (v) => {
    const t = tunggu;
    tunggu = null;
    if (t) t(v);
  };
  rl.on("line", (l) => (tunggu ? serah(l) : antrian.push(l)));
  rl.on("close", () => {
    tertutup = true;
    serah(null); // EOF / Ctrl+C → batal
  });
  rl.on("SIGINT", () => rl.close());
  const ambilJawab = () =>
    new Promise((res) => {
      if (antrian.length) return res(antrian.shift());
      if (tertutup) return res(null);
      tunggu = res;
    });
  try {
    for (;;) {
      process.stdout.write(`Pilih nomor [1-${items.length}] (Enter = 1, q = batal): `);
      const jawab = await ambilJawab();
      if (jawab === null) return -1;
      const p = parsePilihan(jawab, items.length);
      if (p === -1) return -1;
      if (p === null) { console.log("Nomor tidak valid."); continue; }
      return p;
    }
  } finally {
    rl.close();
  }
}

/** Ringkasan singkat isi file edit untuk ditampilkan di menu. */
function peekEditsInfo(p) {
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    const n = Array.isArray(j?.edits) ? j.edits.length : 0;
    const src = j?.sourceFile ? basename(String(j.sourceFile)) : "?";
    const at = j?.exportedAt ? String(j.exportedAt).slice(0, 16).replace("T", " ") : "?";
    const valid = j?.tool === "asistenkeu-spp-patch" && j?.version === 1;
    return `${n} edit, sumber ${src}, ${at}${valid ? "" : ", JSON TIDAK VALID"}`;
  } catch (_) {
    return "JSON TIDAK VALID";
  }
}

async function findEditsFile() {
  // Default: pilih dari *.edit.json di export/json/ (hasil ekspor aplikasi) +
  // export/ (folder lama), urut terbaru dulu.
  const dirs = ["export/json", "export"];
  const cands = [];
  for (const d of dirs) {
    let entries;
    try {
      entries = readdirSync(d).filter((n) => /\.edit\.json$/i.test(n));
    } catch (_) {
      continue; // folder belum ada - lewati
    }
    for (const n of entries) {
      const p = join(d, n);
      let mtime = 0;
      try { mtime = statSync(p).mtimeMs; } catch (_) { /* file hilang di tengah jalan - biarkan */ }
      cands.push({ p, mtime });
    }
  }
  if (!cands.length) {
    fail("tidak ada file *.edit.json di export/json/ atau export/ - ekspor JSON edit dulu dari aplikasi, atau beri --edits <file>.");
  }
  cands.sort((a, b) => b.mtime - a.mtime);
  if (cands.length === 1) return cands[0].p;
  const pilih = await pilihMenu(
    `Terdapat ${cands.length} file edit di export/:`,
    cands.map((c) => ({ label: c.p, info: peekEditsInfo(c.p) }))
  );
  if (pilih < 0) fail("Dibatalkan oleh user.");
  if (pilih > 0) console.log(`Memakai: ${cands[pilih].p}`);
  return cands[pilih].p;
}

async function resolveSmdFile(sourceName) {
  // Default: sourceFile dari JSON, dicari di ./ lalu dataset/.
  if (!sourceName) {
    fail("JSON tidak menyimpan field sourceFile - beri --smd <file.smd> secara manual.");
  }
  const base = basename(String(sourceName));
  const cands = [String(sourceName), join("dataset", base)];
  const ada = cands.filter((c) => existsSync(c) && statSync(c).isFile());
  if (!ada.length) {
    fail(`file .SMD sumber '${base}' tidak ditemukan (dicoba: ${cands.join(", ")}) - beri --smd <file.smd>.`);
  }
  if (ada.length === 1) return ada[0];
  const pilih = await pilihMenu(
    `File .SMD sumber '${base}' ditemukan di beberapa lokasi:`,
    ada.map((p) => ({ label: p }))
  );
  if (pilih < 0) fail("Dibatalkan oleh user.");
  if (pilih > 0) console.log(`Memakai: ${ada[pilih]}`);
  return ada[pilih];
}

async function main() {
  const args = parseCli(process.argv.slice(2));

  const editsPath = args.edits || await findEditsFile();
  const [sourceName, edits, inserts] = loadEdits(editsPath);

  let src;
  if (args.smd) {
    src = args.smd;
    if (!existsSync(src) || !statSync(src).isFile()) fail(`file .SMD tidak ditemukan: ${src}`);
  } else {
    src = await resolveSmdFile(sourceName);
  }

  let raw;
  try {
    raw = readFileSync(src);
  } catch (e) {
    fail(`tidak dapat membaca file .SMD: ${e.message}`);
  }
  const dec = xorStream(raw);
  if (!hasJetMagic(dec)) {
    fail("header Jet4 tidak ditemukan setelah dekode - file ini kemungkinan bukan .SMD Siskeudes.");
  }

  const base = basename(src);
  if (sourceName && basename(String(sourceName)).toLowerCase() !== base.toLowerCase()) {
    console.log(`PERINGATAN: JSON diekspor dari '${sourceName}' tetapi file .SMD sumber adalah '${base}'.`);
    console.log("Pastikan keduanya file SPP yang sama; kunci baris yang tidak cocok akan dilewati/ditolak driver.\n");
  }

  const outPath = args.out || join("export", "smd", `${stemName(base)}-perbaikan.smd`);

  // --- dry-run: cukup cetak rencana SQL, tanpa menyentuh apa pun ---
  if (args["dry-run"]) {
    console.log(`DRY-RUN - ${edits.length} rencana UPDATE + ${inserts.length} INSERT pada ${base} (tidak ada file yang diubah):`);
    edits.forEach(([table, keys, sets], i) => {
      const where = TABLES[table].keys.map((k) => `[${k}]=${repr(keys[k])}`).join(" AND ");
      const setpart = Object.keys(sets).map((c) => `[${c}]=${repr(sets[c])}`).join(", ");
      console.log(`  [${i + 1}] UPDATE ${table} SET ${setpart} WHERE ${where}`);
    });
    inserts.forEach(([table, values], i) => {
      console.log(`  [ins-${i + 1}] INSERT ${table} ${repr(values)}`);
    });
    console.log(`\nOutput (bila dijalankan tanpa --dry-run): ${outPath}`);
    return;
  }

  // --- password Jet otomatis dari header (bila --password tidak diisi) ---
  let password = args.password;
  if (!password) {
    try {
      const auto = new MDBReader(dec).getPassword();
      if (auto) {
        password = auto;
        console.log("Password Jet terdeteksi otomatis dari header file.");
      }
    } catch (_) {
      // Baca header gagal - biarkan kosong; jalur koneksi akan menjelaskan masalahnya.
    }
  }
  // --- odbc + driver Access ---
  const driver = findAccessDriver();
  if (!driver) {
    fail(
      `Microsoft Access ODBC driver tidak ditemukan (bitness Node: ${nodeBits()}-bit).\n` +
      "  Pasang Microsoft Access Database Engine Redistributable (gratis) dengan bitness yang SAMA:\n" +
      "  https://www.microsoft.com/en-us/download/details.aspx?id=54920\n" +
      `  (pilih AccessDatabaseEngine.exe x86 untuk Node ${nodeBits()}-bit, atau AccessDatabaseEngine_X64.exe untuk Node 64-bit)`
    );
  }

  // .bak bila output menimpa file sumber
  if (resolve(outPath).toLowerCase() === resolve(src).toLowerCase()) {
    const bak = `${src}.bak.smd`;
    if (!existsSync(bak)) {
      writeFileSync(bak, raw);
      console.log(`File sumber ditimpa - cadangan dibuat: ${basename(bak)}`);
    }
  }

  let tmpPath, tmpDir = null;
  if (args["keep-temp"]) {
    // Ditulis di sebelah file output, dengan nama yang jelas, dan TIDAK dihapus
    // di finally - supaya bisa dibuka manual di Microsoft Access untuk memastikan
    // apakah file ini benar-benar minta password atau tidak.
    tmpPath = join(dirname(outPath), `${stemName(basename(outPath))}-debug.mdb`);
  } else {
    tmpDir = mkdtempSync(join(tmpdir(), "spp_patch_"));
    tmpPath = join(tmpDir, "db.mdb");
  }

  let applied = 0;
  let verified = 0;
  let inserted = 0;
  const mismatches = [];
  let newData = null;
  let conn = null;

  try {
    mkdirSync(dirname(tmpPath), { recursive: true });
    writeFileSync(tmpPath, dec);

    let connStr = `Driver={${driver}};DBQ=${tmpPath};`;
    if (password) connStr += `PWD=${password};`;

    try {
      conn = await odbc.connect(connStr);
    } catch (e) {
      const detail = odbcErrorText(e);
      if (/valid password/i.test(detail) || detail.includes("-1905")) {
        if (password) {
          fail(
            `password ditolak oleh database (${detail}).\n` +
            "  Ini BUKAN masalah bitness. Kemungkinan:\n" +
            "    1) password salah - cari ulang dengan tool pembuka password Jet/MDB;\n" +
            "    2) password benar tetapi hasil dekode XOR korup (byte di sekitar header\n" +
            "       keamanan Jet rusak), sehingga Jet Engine salah membaca hash password.\n" +
            "       Jalankan ulang dengan --keep-temp lalu buka file .mdb yang tersisa\n" +
            "       langsung di Microsoft Access untuk memastikan mana yang benar."
          );
        }
        fail(
          "database .SMD ini dilindungi password tingkat Jet/Access, TERPISAH dari enkripsi\n" +
          "  XOR .SMD yang sudah berhasil didekode di atas (header Jet4 valid). Ini bukan\n" +
          "  masalah bitness driver.\n" +
          "  Langkah: cari tahu password Jet-nya (coba tool pembuka password Jet/MDB terhadap\n" +
          "  file .mdb - jalankan ulang perintah ini dengan --keep-temp untuk mendapatkan file\n" +
          "  tersebut), lalu jalankan ulang dengan --password <password>."
        );
      }
      fail(
        `gagal membuka database lewat ODBC (${detail}).\n` +
        `  Kemungkinan bitness driver Access tidak sama dengan Node ${nodeBits()}-bit -\n` +
        "  pasang Access Database Engine Redistributable yang cocok."
      );
    }

    try {
      await conn.beginTransaction();
      for (let i = 0; i < edits.length; i++) {
        const [table, keys, sets] = edits[i];
        const idx = i + 1;
        const keyCols = TABLES[table].keys;
        const setCols = Object.keys(sets);
        const wherePart = keyCols.map((k) => `[${k}] = ${sqlKeyVal(keys[k])}`).join(" AND ");

        const sql = `UPDATE ${table} SET ` +
          setCols.map((c) => `[${c}] = ${sqlLiteral(c, sets[c])}`).join(", ") +
          ` WHERE ${wherePart}`;

        const result = await conn.query(sql);
        const n = Number(result.count || 0); // SQLRowCount - sama dengan cur.rowcount pyodbc
        if (n !== 1) {
          console.log(`  LEWATI [${idx}] ${table} kunci=${repr(keys)}: baris tidak ditemukan (rowcount=${n}).`);
          continue;
        }
        applied++;

        // Verifikasi: baca ulang kolom yang diubah.
        const sel = `SELECT ${setCols.map((c) => `[${c}]`).join(", ")} FROM ${table} ` +
          `WHERE ${wherePart}`;
        const rows = await conn.query(sel);
        const row = rows[0];
        let ok = row !== undefined && row !== null;
        if (ok) {
          for (const c of setCols) {
            const got = row[c];
            const want = sets[c];
            if (c === "Nilai" || c === "Jumlah") {
              ok = got !== null && got !== undefined &&
                Math.abs(Number(got) - Number(want)) < 0.005;
            } else if (c === "Tgl_Bukti") {
              ok = got !== null && got !== undefined &&
                fmtDateVal(got) === String(want).slice(0, 10);
            } else {
              ok = strVal(got) === strVal(want);
            }
            if (!ok) {
              mismatches.push(`[${idx}] ${table} ${c}: tersimpan ${repr(got)}, diharapkan ${repr(want)}`);
              break;
            }
          }
        }
        if (ok) verified++;
        console.log(`  OK [${idx}] UPDATE ${table} ${repr(keys)} -> ${setCols.length} kolom`);
      }
      for (let i = 0; i < inserts.length; i++) {
        const [table, values] = inserts[i];
        const cols = Object.keys(values);
        const sql = `INSERT INTO ${table} (${cols.map((c) => `[${c}]`).join(", ")}) VALUES (${cols.map((c) => sqlLiteral(c, values[c])).join(", ")})`;
        const result = await conn.query(sql);
        if (Number(result.count || 0) < 1) {
          mismatches.push(`[ins-${i + 1}] ${table}: baris tidak tersimpan (rowcount=${Number(result.count || 0)}).`);
          continue;
        }
        inserted++;
        const whereIns = INSERT_KEYS[table].map((k) => `[${k}] = ${sqlKeyVal(values[k])}`).join(" AND ");
        const cek = await conn.query(`SELECT [Nilai] FROM ${table} WHERE ${whereIns}`);
        const got = cek[0]?.Nilai;
        if (got === null || got === undefined || Math.abs(Number(got) - Number(values.Nilai)) >= 0.005) {
          mismatches.push(`[ins-${i + 1}] ${table}: verifikasi Nilai gagal (tersimpan ${repr(got)}).`);
          inserted--;
        } else {
          console.log(`  OK [ins-${i + 1}] INSERT ${table} ${repr(values.No_SPP)} / ${repr(values.No_Bukti)}`);
        }
      }
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* abai */ }
      throw e;
    } finally {
      try { await conn.close(); } catch (_) { /* abai */ }
    }

    newData = readFileSync(tmpPath);
  } finally {
    if (args["keep-temp"]) {
      console.log(`File .mdb sementara disimpan (--keep-temp): ${tmpPath}`);
    } else if (tmpDir) {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* abai */ }
    }
  }

  if (applied === 0) {
    fail("tidak ada baris yang cocok - file .SMD tidak ditulis. Periksa apakah file dan JSON berasal dari register SPP yang sama.");
  }

  try {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, xorStream(newData));
  } catch (e) {
    fail(`gagal menulis file hasil: ${e.message}`);
  }

  console.log("");
  console.log(`Selesai: ${applied}/${edits.length} UPDATE diterapkan, ${verified} baris terverifikasi.`);
  if (mismatches.length) {
    console.log(`PERINGATAN - ${mismatches.length} baris hasilnya tidak sama dengan nilai yang diminta:`);
    for (const m of mismatches) console.log("  " + m);
  }
  if (args.json) console.log(`RESULT ${JSON.stringify({ ok: true, applied, verified, inserted, mismatches, outName: basename(outPath) })}`);
  console.log(`File hasil : ${outPath}`);
  console.log(`File asli  : ${src} (tidak diubah)`);
  console.log("Impor file hasil ini ke Siskeudes untuk memperbarui register SPP-nya.");
}

function reportFatal(e) {
  if (e instanceof Fail) {
    console.log("ERROR: " + e.message);
  } else {
    // Error odbc: tampilkan juga detail diagnosa driver (state + kode + pesan).
    const detail = e && Array.isArray(e.odbcErrors) ? odbcErrorText(e)
      : e && e.message ? e.message : String(e);
    console.log("ERROR: " + detail);
    if (process.env.DEBUG) console.log(e);
  }
  process.exit(1);
}

// Jalankan hanya bila dieksekusi langsung; saat di-import (uji parsePilihan), diam.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(reportFatal);
}

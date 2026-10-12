export interface SimulasiGaris {
  label: string;
  ket: string;
  amt: number;
}

export interface SimulasiRec {
  id: string;
  ts: number;
  uraian: string;
  kat: string;
  katLabel: string;
  nilai: number;
  npwp: string;
  ppnBasis: "excl" | "incl";
  rates: Record<string, number>;
  lines: SimulasiGaris[];
  pot: number;
  potBulat: number;
}

const STORE = "asistenkeu_simulasi_v1";

export const newSimId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "sim" + Date.now() + Math.random().toString(16).slice(2);

export function loadSimulasiList(): SimulasiRec[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || "null") as unknown;
    if (!Array.isArray(raw)) return [];
    return (raw as SimulasiRec[]).filter((x) => x && typeof x === "object" && typeof x.id === "string");
  } catch {
    return [];
  }
}

function persist(list: SimulasiRec[]): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {
    /* abaikan: penyimpanan penuh */
  }
}

export function saveSimulasi(rec: SimulasiRec): SimulasiRec[] {
  const list = [rec, ...loadSimulasiList().filter((x) => x.id !== rec.id)];
  persist(list);
  return list;
}

export function deleteSimulasi(id: string): SimulasiRec[] {
  const list = loadSimulasiList().filter((x) => x.id !== id);
  persist(list);
  return list;
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rpCetak = (n: number): string =>
  "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

const tglCetak = (ts: number): string => {
  const d = new Date(ts);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Sama dengan roundUp100 di kalkulator: bulatkan ke atas ke kelipatan Rp100. */
const bulat100 = (n: number): number => {
  const r = Math.round(n);
  return r % 100 === 0 ? r : r + (100 - (r % 100));
};

/** Dokumen cetak simulasi — dibuka via window.open lalu window.print(). */
export function buildSimulasiPrintDoc(r: SimulasiRec): string {
  const dibayar = r.nilai - r.pot;
  const dibayarBulat = r.nilai - r.potBulat;
  const rows = r.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.ket)}</td><td class="n">${rpCetak(l.amt)}</td></tr>`,
    )
    .join("");
  const bulat =
    r.potBulat !== r.pot
      ? `<h2>Saran pembulatan (kelipatan Rp100)</h2>
      <table><tbody>
      ${r.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="n">${rpCetak(bulat100(l.amt))}</td></tr>`).join("")}
      <tr class="t"><td>Total dibulatkan</td><td class="n">${rpCetak(r.potBulat)}</td></tr>
      <tr class="t"><td>Dibayarkan</td><td class="n">${rpCetak(dibayarBulat)}</td></tr>
      </tbody></table>
      <p>Selisih pembulatan: ${rpCetak(r.potBulat - r.pot)}</p>`
      : "";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Simulasi Potongan Pajak — ${esc(r.uraian || "-")}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:24px}
h1{font-size:16px;margin:0 0 2px}.sub{color:#555;margin:0 0 12px}
table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #999;padding:5px 8px;text-align:left}
th{background:#eee}.n{text-align:right;font-variant-numeric:tabular-nums}.t td{font-weight:bold}
h2{font-size:13px;margin:14px 0 0}.meta td{border:none;padding:2px 8px 2px 0}.foot{margin-top:16px;color:#555;font-size:11px}
@media print{body{margin:0}@page{size:A4;margin:14mm}}
</style>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
</head><body>
<h1>Simulasi Potongan Pajak</h1>
<p class="sub">Dicetak ${tglCetak(Date.now())} · ASISTENKEU (simulasi, bukan bukti potong resmi)</p>
<table class="meta"><tbody>
<tr><td><b>Uraian</b></td><td>${esc(r.uraian || "-")}</td></tr>
<tr><td><b>Kategori</b></td><td>${esc(r.katLabel)}</td></tr>
<tr><td><b>Nilai belanja</b></td><td>${rpCetak(r.nilai)}</td></tr>
<tr><td><b>Status NPWP</b></td><td>${esc(r.npwp === "ya" ? "Punya NPWP" : r.npwp === "tidak" ? "Tidak punya NPWP" : "Tidak berlaku")}</td></tr>
</tbody></table>
<h2>Rincian potongan</h2>
<table><thead><tr><th>Potongan</th><th>Nilai</th></tr></thead><tbody>${rows}
<tr class="t"><td>Total potongan</td><td class="n">${rpCetak(r.pot)}</td></tr>
<tr class="t"><td>Dibayarkan</td><td class="n">${rpCetak(dibayar)}</td></tr>
</tbody></table>
${bulat}
<p class="foot">Tarif mengikuti pengaturan kalkulator saat simulasi disimpan. Verifikasi ke peraturan pajak terbaru sebelum memungut.</p>
</body></html>`;
}

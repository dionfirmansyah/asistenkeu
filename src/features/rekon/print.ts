import type { Rekon } from "./RekonView";

const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const nfRp = (v: unknown): string =>
  "Rp " + Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const idDateLong = (s: string) => { if (!s) return ""; const d = new Date(s + "T00:00:00"); return isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };

const REKON_PRINT_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:10px;padding:14px 20px}
.header{text-align:center;margin-bottom:10px}
.header .title-main{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
.header .title-sub{font-size:11px;font-weight:bold;text-transform:uppercase}
.header .title-year{font-size:11px;font-weight:bold}
.header-divider{border-top:2px solid #000;border-bottom:1px solid #000;height:4px;margin:6px 0 10px}
table{width:100%;border-collapse:collapse;margin-bottom:10px}
thead tr th{background:#f0f0f0;text-align:center;font-size:10px;font-weight:bold;padding:5px 4px;vertical-align:middle;border:1px solid #000}
tbody td{padding:4px 5px;vertical-align:top;border:1px solid #000}
.col-no{width:4%;text-align:center}.col-uraian{text-align:left}.col-nilai{width:22%;text-align:right}
.row-total td{font-weight:bold;font-size:10px;background:#f0f0f0}
.row-sub td{font-weight:bold;background:#fff}
.note{font-size:10px;margin-bottom:10px}
.footer{margin-top:14px}.footer-place{text-align:right;margin-bottom:6px}
.ttd-row{display:table;width:100%}
.ttd-mengetahui{display:table-cell;width:60%;vertical-align:top}
.ttd-pembuat{display:table-cell;width:40%;vertical-align:top;text-align:center}
.ttd-label{font-size:10px;font-weight:bold;margin-bottom:2px}
.ttd-jabatan{font-size:10px;margin-bottom:50px}
.ttd-nama{font-size:10px;font-weight:bold;text-decoration:underline;margin-bottom:2px}
.ttd-jabatan-bawah{font-size:10px}
@media print{ @page {
    margin: 14mm 12mm 24mm 12mm;
  }}`;

function sisiLabel(r: Rekon, sisi: string): string {
  if (sisi === "bku") return "Kas Siskeudes (BKU)";
  if (sisi === "brankas") return "Brankas";
  return r.sumber.find((d) => d.id === sisi)?.nama || "(sumber dihapus)";
}

export function buildRekonPrintDoc(r: Rekon): string {
  // Cerminan hitungan Ringkasan di layar (jaga agar tetap sama).
  let adjBku = 0, adjBrankas = 0;
  const adjPerSumber = new Map<string, number>();
  for (const i of r.items) {
    const v = i.arah === "+" ? i.nilai : -i.nilai;
    if (i.sisi === "bku") adjBku += v;
    else if (i.sisi === "brankas") adjBrankas += v;
    else adjPerSumber.set(i.sisi, (adjPerSumber.get(i.sisi) ?? 0) + v);
  }
  const bkuAdj = Math.round(r.bku) + adjBku;
  const brankasAdj = Math.round(r.brankas) + adjBrankas;
  const selisih = bkuAdj - brankasAdj;

  const det = (base: number, adj: number) =>
    adj !== 0 ? ` (${nfRp(base)} ${adj > 0 ? "+" : "−"} ${nfRp(Math.abs(adj))})` : "";

  const ringkasRows =
    `<tr><td class="col-uraian">Saldo BKU (disesuaikan)${esc(det(r.bku, adjBku))}</td><td class="col-nilai">${nfRp(bkuAdj)}</td></tr>` +
    `<tr><td class="col-uraian">Brankas / tunai (disesuaikan)${esc(det(r.brankas, adjBrankas))}</td><td class="col-nilai">${nfRp(brankasAdj)}</td></tr>` +
    `<tr class="row-total"><td class="col-uraian">Selisih</td><td class="col-nilai">${selisih === 0 ? "SESUAI (Rp 0)" : "SELISIH " + nfRp(selisih)}</td></tr>`;

  const sumberRows = r.sumber.length
    ? `<table><thead><tr><th class="col-uraian">Pelacakan sumber dana lainnya (di luar selisih)</th><th class="col-nilai">Nilai</th></tr></thead><tbody>` +
      r.sumber.map((d) => {
        const adj = adjPerSumber.get(d.id) ?? 0;
        return `<tr><td class="col-uraian">${esc(d.nama.trim() || "(tanpa nama)")}${esc(det(d.saldo, adj))}</td><td class="col-nilai">${nfRp(Math.round(d.saldo) + adj)}</td></tr>`;
      }).join("") +
      `</tbody></table>`
    : "";

  const itemRows = r.items.length
    ? `<table><thead><tr><th class="col-no">NO</th><th class="col-uraian">JENIS / URAIAN / BUKTI / TANGGAL</th><th>MEMPENGARUHI</th><th>NILAI (Rp)</th></tr></thead><tbody>` +
      r.items.map((it, ix) => {
        const ket = [it.jenis, it.uraian, it.bukti, it.tglItem].filter((x) => String(x || "").trim()).join(" — ");
        const tanda = it.arah === "+" ? "+" : "−";
        return `<tr><td class="col-no">${ix + 1}</td><td class="col-uraian">${esc(ket)}</td><td>${esc(sisiLabel(r, it.sisi))}</td><td class="col-nilai">${tanda} ${nfRp(Math.abs(it.nilai))}</td></tr>`;
      }).join("") +
      `</tbody></table>`
    : "";

  const desa = r.doc.desa.trim();
  const pemeriksa = r.doc.pemeriksa.trim();
  const ttd = pemeriksa
    ? `<div class="ttd-row"><div class="ttd-mengetahui"><div class="ttd-label">Mengetahui :</div><div class="ttd-jabatan">Kepala Desa ${esc(desa)}</div><div style="height:10px"></div><div class="ttd-nama">${esc(r.doc.kades)}</div><div class="ttd-jabatan-bawah">Kepala Desa ${esc(desa)}</div></div><div class="ttd-pembuat"><div class="ttd-label">Diperiksa oleh :</div><div class="ttd-jabatan">Pemeriksa</div><div style="height:10px"></div><div class="ttd-nama">${esc(pemeriksa)}</div><div class="ttd-jabatan-bawah">Pemeriksa</div></div></div>
       <div class="ttd-row" style="margin-top:10px"><div class="ttd-mengetahui"></div><div class="ttd-pembuat"><div class="ttd-label">Dibuat oleh :</div><div class="ttd-jabatan">Desa ${esc(desa)}</div><div class="ttd-nama">${esc(r.doc.pptkd)}</div><div class="ttd-jabatan-bawah">Dibuat oleh</div></div></div>`
    : `<div class="ttd-row"><div class="ttd-mengetahui"><div class="ttd-label">Mengetahui :</div><div class="ttd-jabatan">Kepala Desa ${esc(desa)}</div><div style="height:10px"></div><div class="ttd-nama">${esc(r.doc.kades)}</div></div><div class="ttd-pembuat"><div class="ttd-label">Dibuat oleh :</div><div class="ttd-jabatan">Desa ${esc(desa)}</div><div class="ttd-nama">${esc(r.doc.pptkd)}</div></div></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.judul || "Berita Acara Rekonsiliasi Kas")}</title><style>${REKON_PRINT_CSS}</style></head><body>
<div class="header"><div class="title-main">Berita Acara Rekonsiliasi Kas</div><div class="title-sub">Desa ${esc(desa || "-")}${r.doc.kec.trim() ? " Kecamatan " + esc(r.doc.kec.trim()) : ""}</div><div class="title-year">${esc(r.judul || "")}${r.periode.trim() ? " — Periode " + esc(r.periode.trim()) : ""}</div></div>
<div class="header-divider"></div>
<table><thead><tr><th class="col-uraian">Ringkasan</th><th class="col-nilai">Nilai</th></tr></thead><tbody>${ringkasRows}</tbody></table>
${sumberRows}
${itemRows}
${r.doc.catatan.trim() ? `<div class="note"><b>Catatan:</b> ${esc(r.doc.catatan.trim())}</div>` : ""}
<div class="footer">
<div class="footer-place">${esc(desa)}${r.doc.tanggal ? ", " + idDateLong(r.doc.tanggal) : ""}</div>
<div style="height:10px"></div>
${ttd}
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
</body></html>`;
}

import type { RpdDoc, RpdEntry } from "@/lib/storage/idb";
import type { RabFlatRow } from "@/types/smd";
import { rekName, rpdPrintKegCode, rpdPrintKegName } from "./print";

export interface RpdItemLike {
  key: string;
  kegKd: string;
  rincId: string;
  r: RabFlatRow;
  price: number;
  vol: number;
  amt: number;
}

const excelEsc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nat = (a: string, b: string): number => String(a).localeCompare(String(b), "id", { numeric: true });
const nfRpd = (v: unknown): string => Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** Ekspor Excel (.xls berisi HTML table): tata letak sama dengan print-out. */
export function buildRpdExcelDoc(
  meta: RpdDoc,
  opt: { entries: RpdEntry[]; kegs: Map<string, string>; items: Map<string, RpdItemLike> },
): string {
  const { kegs, items } = opt;
  const entries = opt.entries.slice().sort((a, b) => (a.bln ?? 99) - (b.bln ?? 99) || nat(a.key, b.key));
  const byKeg = new Map<string, Map<string, Array<{ p: RpdEntry; it: RpdItemLike }>>>();
  for (const p of entries) {
    const it = items.get(p.key);
    if (!it) continue;
    let m = byKeg.get(it.kegKd);
    if (!m) byKeg.set(it.kegKd, (m = new Map()));
    const arr = m.get(it.rincId) ?? [];
    arr.push({ p, it });
    m.set(it.rincId, arr);
  }
  const kegAsMap = new Map<string, { name: string }>([...kegs.entries()].map(([kd, name]) => [kd, { name }]));
  let no = 1;
  let grand = 0;
  let body = "";
  const row = (cells: Array<{ v: unknown; cls?: string }>, cls?: string) =>
    `<tr class="${cls || ""}">` + cells.map((c) => `<td class="${c.cls || ""}">${c.v}</td>`).join("") + "</tr>";

  for (const kd of [...byKeg.keys()].sort(nat)) {
    const rincMap = byKeg.get(kd)!;
    const firstList = [...rincMap.values()].find((v) => v.length) || [];
    const firstIt = firstList[0]?.it || null;
    let kegTotal = 0;
    for (const list of rincMap.values()) for (const { p } of list) kegTotal += p.amt;
    body += row([
      { v: "", cls: "c-no" }, { v: excelEsc(rpdPrintKegCode(kd, firstIt)), cls: "c-kode" },
      { v: excelEsc(rpdPrintKegName(kd, firstIt, kegAsMap)), cls: "c-ura" },
      { v: "", cls: "c-sd" }, { v: "", cls: "c-vol" }, { v: "", cls: "c-hrg" },
      { v: kegTotal, cls: "c-jml num" },
    ], "r-keg");
    for (const rid of [...rincMap.keys()].sort(nat)) {
      const all = rincMap.get(rid)!;
      body += row([
        { v: "", cls: "c-no" }, { v: excelEsc(rid), cls: "c-kode" },
        { v: excelEsc(all[0]?.it.r.Nama_Rincian || "(tanpa nama rincian)"), cls: "c-ura" },
        { v: "", cls: "c-sd" }, { v: "", cls: "c-vol" }, { v: "", cls: "c-hrg" },
        { v: all.reduce((s, { p }) => s + p.amt, 0), cls: "c-jml num" },
      ], "r-rinc");
      const byJenis = new Map<string, Array<{ p: RpdEntry; it: RpdItemLike }>>();
      for (const e of all) {
        const jk = e.it.r.Kd_Rincian || "-";
        const arr = byJenis.get(jk) ?? [];
        arr.push(e);
        byJenis.set(jk, arr);
      }
      const multi = byJenis.size > 1;
      for (const jk of [...byJenis.keys()].sort(nat)) {
        const list = byJenis.get(jk)!.slice().sort(
          (a, b) => nat(a.it.r.No_Urut || "", b.it.r.No_Urut || "") || (a.p.bln ?? 99) - (b.p.bln ?? 99),
        );
        if (multi)
          body += row([
            { v: "", cls: "c-no" }, { v: excelEsc(jk), cls: "c-kode" }, { v: excelEsc(rekName(jk)), cls: "c-ura" },
            { v: "", cls: "c-sd" }, { v: "", cls: "c-vol" }, { v: "", cls: "c-hrg" },
            { v: list.reduce((s, { p }) => s + p.amt, 0), cls: "c-jml num" },
          ], "r-jenis");
        for (const { p, it } of list) {
          grand += p.amt;
          body += row([
            { v: no++, cls: "c-no num" }, { v: "", cls: "c-kode" }, { v: excelEsc(it.r.Uraian), cls: "c-ura" },
            { v: excelEsc(it.r.SumberDana || "-"), cls: "c-sd" },
            { v: excelEsc(nfRpd(p.vol) + (it.r.Satuan ? " " + it.r.Satuan : "")), cls: "c-vol" },
            { v: it.price, cls: "c-hrg num" }, { v: p.amt, cls: "c-jml num" },
          ], "r-item");
        }
      }
    }
  }
  const head1 = `<tr><th class="c-no" rowspan="2">NO</th><th class="c-kode" rowspan="2">KODE</th><th class="c-ura" rowspan="2">URAIAN</th><th colspan="4">RENCANA</th></tr>`;
  const head2 = `<tr><th class="c-sd">SUMBER DANA</th><th class="c-vol">VOLUME</th><th class="c-hrg">HARGA SATUAN (Rp)</th><th class="c-jml">JUMLAH (Rp)</th></tr>`;
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><title>${excelEsc(meta.judul || "RPD")}</title><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>RPD</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>
    table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:10pt}
    th{background:#eef4e2;border:1px solid #000;padding:4px 6px;text-align:center}
    td{border:1px solid #b9c4a6;padding:3px 6px;vertical-align:top}
    .num{mso-number-format:"\\#\\,\\#\\#0";text-align:right}
    td.c-no{width:4%;text-align:center}td.c-kode{width:11%}td.c-ura{width:38%}td.c-sd{width:11%;text-align:center}td.c-vol{width:12%}td.c-hrg{width:12%}td.c-jml{width:12%}
    tr.r-keg td{font-weight:bold;background:#f7faf0}tr.r-rinc td{font-weight:600;background:#fbfdf7}tr.r-jenis td{font-style:italic}
    tr.total td{font-weight:bold;background:#eef4e2;border:1px solid #000}
    .t{font-size:13pt;font-weight:bold;text-transform:uppercase}.s{font-size:11pt;font-weight:bold;text-transform:uppercase}.y{font-size:11pt;font-weight:bold}
  </style></head><body>
  <p class="t">${excelEsc(meta.judul || "RENCANA PENGGUNAAN DANA")}</p>
  <p class="s">Desa ${excelEsc(meta.desa || "-")} Kecamatan ${excelEsc(meta.kecamatan || "-")}</p>
  <p class="y">Tahun Anggaran ${excelEsc(meta.tahun || "-")}</p>
  <table><thead>${head1}${head2}</thead><tbody>${body}
  <tr class="total"><td class="c-no"></td><td class="c-kode"></td><td class="c-ura" style="text-align:center">JUMLAH</td><td class="c-sd"></td><td class="c-vol"></td><td class="c-hrg"></td><td class="c-jml num">${grand}</td></tr>
  </tbody></table></body></html>`;
}

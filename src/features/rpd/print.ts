import { nf0 } from "@/lib/engine/format";
import { vt, cleanName } from "@/lib/engine/util";
import type { RpdEntry, RpdDoc } from "@/lib/storage/idb";
import type { RabFlatRow } from "@/types/smd";

export interface Ridx {
  keg: Map<string, { kd?: string; name: string }>;
  items: Map<string, { key: string; kegKd: string; rincId: string; r: RabFlatRow; price: number; vol: number; amt: number }>;
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nat = (a: string, b: string): number => String(a).localeCompare(String(b), "id", { numeric: true });
const nfRpd = (v: unknown): string => Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const idDateLong = (s: string) => { if (!s) return ""; const d = new Date(s + "T00:00:00"); return isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };

const RPD_PRINT_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:10px;padding:14px 20px}
.header{text-align:center;margin-bottom:10px}
.header .title-main{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
.header .title-sub{font-size:11px;font-weight:bold;text-transform:uppercase}
.header .title-year{font-size:11px;font-weight:bold}
.header-divider{border-top:2px solid #000;border-bottom:1px solid #000;height:4px;margin:6px 0 10px}
table{width:100%;border-collapse:collapse;margin-bottom:10px}
thead tr th{background:#f0f0f0;text-align:center!important;font-size:10px;font-weight:bold;padding:5px 4px;vertical-align:middle;border:1px solid #000}
tbody td{padding:4px 5px;vertical-align:top;border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none}
tbody td.col-data{border:1px solid #000}
tbody tr.row-first-in-group td.col-left{border-top:1px solid #000}
tbody tr.row-last-in-group td.col-left{border-bottom:1px solid #000}
tbody tr.row-first-in-group.row-last-in-group td.col-left{border:1px solid #000}
.row-sub-kegiatan td{font-weight:bold;background:#fff;border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;border-bottom:none;padding:4px 5px}
.row-item-group td{font-weight:bold;background:#fff;border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;border-bottom:none;padding:3px 5px 3px 12px}
.col-no{width:4%;text-align:center}.col-kode{width:11%;text-align:left}.col-uraian{width:38%;text-align:left}
.col-sat{width:7%;text-align:center}.col-vol{width:10%;text-align:center}.col-harga{width:15%;text-align:right}.col-jml{width:15%;text-align:right}
.row-total td{font-weight:bold;font-size:10px;border:1px solid #000;padding:4px 5px;background:#f0f0f0}
.footer{margin-top:14px}.footer-place{text-align:right;margin-bottom:6px}
.ttd-row{display:table;width:100%}
.ttd-mengetahui{display:table-cell;width:70%;vertical-align:top}
.ttd-pembuat{display:table-cell;width:30%;vertical-align:top;text-align:center}
.ttd-label{font-size:10px;font-weight:bold;margin-bottom:2px}
.ttd-jabatan{font-size:10px;margin-bottom:50px}
.ttd-nama{font-size:10px;font-weight:bold;text-decoration:underline;margin-bottom:2px}
.ttd-jabatan-bawah{font-size:10px}
.ttd-two-col{display:table;width:100%;margin-top:4px}
.ttd-col{display:table-cell;width:50%;text-align:center;vertical-align:top}
.row-jenis td{background:#fff;border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;border-bottom:none;padding:3px 5px}
@media print{ @page {
    margin: 14mm 12mm 24mm 12mm;
  }}`;

export function rpdPrintKegCode(kd: string, it: any) {
  const src = vt(it?.r?.ID_Keg || kd).replace(/\.+$/, "");
  let parts = src.split(".").filter(Boolean);
  if (!it?.r?.ID_Keg && parts.length > 3) parts = parts.slice(-3);
  if (parts.length >= 3) return [String(Number(parts[0]) || 0), String(Number(parts[1]) || 0), String(Number(parts[2]) || 0).padStart(2, "0")].join(".");
  return src;
}
export function rpdPrintKegName(kd: string, it: any, keg: Map<string, { name: string }>) {
  const code = vt(it?.r?.ID_Keg || "").replace(/\.+$/, "");
  return cleanName(it?.r?.Nama_Kegiatan || keg.get(kd)?.name || "").replace(new RegExp("^" + code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.?\\s*"), "").replace(/^\d+(?:\.\d+){2,}\.?\s*/, "");
}
/* Nama rekening belanja (Level 5/6). Tidak ada di file SMD, jadi dibawa di sini.
   Sumber: Daftar Parameter Rekening APBDesa Kab. Kotabaru TA 2026 (SiskeuDes).
   Bila tahun/kabupaten berbeda, samakan dengan bagan rekening yang dipakai. */
const REK_NAMA = {
  // 5.1 Belanja Pegawai
  "5.1.1.01.": "Penghasilan Tetap Kepala Desa",
  "5.1.1.02.": "Tunjangan Kepala Desa",
  "5.1.1.99.": "Penerimaan Lain-lain Kepala Desa yang Sah",
  "5.1.2.01.": "Penghasilan Tetap Perangkat Desa",
  "5.1.2.02.": "Tunjangan Perangkat Desa",
  "5.1.2.99.": "Penerimaan Lain-lain Perangkat Desa yang Sah",
  "5.1.3.01.": "Jaminan Kesehatan Kepala Desa",
  "5.1.3.02.": "Jaminan Kesehatan Perangkat Desa",
  "5.1.3.03.": "Jaminan Ketenagakerjaan Kepala Desa",
  "5.1.3.04.": "Jaminan Ketenagakerjaan Perangkat Desa",
  "5.1.4.01.": "Tunjangan Kedudukan BPD",
  "5.1.4.02.": "Tunjangan Kinerja BPD",
  // 5.2 Belanja Barang dan Jasa
  "5.2.1.01.": "Belanja Alat Tulis Kantor dan Benda Pos",
  "5.2.1.02.": "Belanja Perlengkapan Alat-alat Listrik",
  "5.2.1.03.": "Belanja Perlengkapan Alat Rumah Tangga dan Bahan Kebersihan",
  "5.2.1.04.": "Belanja Bahan Bakar Minyak/Gas/Isi Ulang Tabung Pemadam Kebakaran",
  "5.2.1.05.": "Belanja Barang Cetak dan Penggandaan",
  "5.2.1.06.": "Belanja Barang Konsumsi (Makan/Minum)",
  "5.2.1.07.": "Belanja Bahan Material",
  "5.2.1.08.": "Belanja Bendera/Umbul-umbul/Spanduk",
  "5.2.1.09.": "Belanja Pakaian Dinas/Seragam/Atribut",
  "5.2.1.10.": "Belanja Bahan Obat-obatan",
  "5.2.1.11.": "Belanja Pakan Hewan, Obat-obatan Hewan",
  "5.2.1.12.": "Belanja Pupuk/Obat-obatan Pertanian",
  "5.2.1.99.": "Belanja Barang Perlengkapan Lainnya",
  "5.2.2.01.": "Belanja Jasa Honorarium Tim Pelaksana Kegiatan",
  "5.2.2.02.": "Belanja Jasa Honorarium Pembantu Tugas Umum Desa/Operator",
  "5.2.2.03.": "Belanja Jasa Honorarium/Insentif Pelayanan Desa",
  "5.2.2.04.": "Belanja Jasa Honorarium Tenaga Ahli/Profesi/Konsultan/Narasumber",
  "5.2.2.05.": "Belanja Jasa Honorarium Petugas",
  "5.2.2.06.": "Belanja Jasa Honorarium PKPKD dan PPKD",
  "5.2.2.07.": "Belanja Jasa Honorarium Staf Administrasi BPD",
  "5.2.2.08.": "Belanja Jasa Uang Saku Pelatihan/Seminar/Bimbingan Teknis",
  "5.2.2.99.": "Belanja Jasa Honorarium Lainnya",
  "5.2.3.01.": "Belanja Perjalanan Dinas Dalam Kabupaten/Kota",
  "5.2.3.02.": "Belanja Perjalanan Dinas Luar Kabupaten/Kota",
  "5.2.3.03.": "Belanja Kursus Pelatihan",
  "5.2.4.01.": "Belanja Jasa Sewa Bangunan/Gedung/Ruang",
  "5.2.4.02.": "Belanja Jasa Sewa Peralatan/Perlengkapan",
  "5.2.4.03.": "Belanja Jasa Sewa Sarana Mobilitas",
  "5.2.4.99.": "Belanja Jasa Sewa Lainnya",
  "5.2.5.01.": "Belanja Jasa Langganan Listrik",
  "5.2.5.02.": "Belanja Jasa Langganan Air Bersih",
  "5.2.5.03.": "Belanja Jasa Langganan Majalah/Surat Kabar",
  "5.2.5.04.": "Belanja Jasa Langganan Telepon",
  "5.2.5.05.": "Belanja Jasa Langganan Internet",
  "5.2.5.06.": "Belanja Jasa Kurir/Pos/Giro",
  "5.2.5.07.": "Belanja Jasa Perpanjangan Ijin/Pajak",
  "5.2.5.08.": "Belanja Insentif/Operasional RT/RW",
  "5.2.5.99.": "Belanja Operasional Perkantoran lainnya",
  "5.2.6.01.": "Belanja Pemeliharaan Mesin dan Peralatan Berat",
  "5.2.6.02.": "Belanja Pemeliharaan Kendaraan Bermotor",
  "5.2.6.03.": "Belanja Pemeliharaan Peralatan",
  "5.2.6.04.": "Belanja Pemeliharaan Bangunan",
  "5.2.6.05.": "Belanja Pemeliharaan Jalan",
  "5.2.6.06.": "Belanja Pemeliharaan Jembatan",
  "5.2.6.07.": "Belanja Pemeliharaan Irigasi/Saluran Sungai/Embung/Air Bersih",
  "5.2.6.08.": "Belanja Pemeliharaan Jaringan dan Instalasi (Listrik, telepon, internet, komunikasi dll)",
  "5.2.6.99.": "Belanja Pemeliharaan Lainnya",
  "5.2.7.01.": "Belanja Bahan Perlengkapan untuk Diserahkan kepada Masyarakat",
  "5.2.7.02.": "Belanja Bantuan Mesin/Peralatan/Kendaraan untuk Diserahkan kepada Masyarakat",
  "5.2.7.03.": "Belanja Bantuan Bangunan untuk Diserahkan kepada Masyarakat",
  "5.2.7.04.": "Belanja Beasiswa Berprestasi/Masyarakat Miskin",
  "5.2.7.05.": "Belanja Bantuan Bibit Tanaman/Hewan/Ikan",
  "5.2.7.99.": "Belanja Barang untuk Diserahkan kepada Masyarakat Lainnya",
  // 5.3 Belanja Modal
  "5.3.1.01.": "Belanja Modal Pembebasan/Pembelian Tanah",
  "5.3.1.02.": "Belanja Modal Pembayaran Honorarium Tim Tanah",
  "5.3.1.03.": "Belanja Modal Pengukuran dan Pembuatan Sertifikat Tanah",
  "5.3.1.04.": "Belanja Modal Pengurukan dan Pematangan Tanah",
  "5.3.1.05.": "Belanja Modal Perjalanan Pengadaan Tanah",
  "5.3.1.99.": "Belanja Modal Pengadaan Tanah Lainnya",
  "5.3.2.01.": "Belanja Modal Pembayaran Honor Tim Pelaksana Kegiatan (PM)",
  "5.3.2.02.": "Belanja Modal Peralatan Elektronik dan Alat Studio",
  "5.3.2.03.": "Belanja Modal Peralatan Komputer",
  "5.3.2.04.": "Belanja Modal Peralatan Mebelair dan Aksesoris Ruangan",
  "5.3.2.05.": "Belanja Modal Peralatan Dapur",
  "5.3.2.06.": "Belanja Modal Peralatan Alat Ukur",
  "5.3.2.07.": "Belanja Modal Peralatan Rambu-rambu/Patok Tanah",
  "5.3.2.08.": "Belanja Modal Peralatan Khusus Kesehatan",
  "5.3.2.09.": "Belanja Modal Peralatan Khusus Pertanian/Peternakan/Perikanan",
  "5.3.2.10.": "Belanja Modal Mesin",
  "5.3.2.11.": "Belanja Modal Pengadaan Alat-alat Berat",
  "5.3.2.99.": "Belanja Modal Peralatan, Mesin dan Alat Berat Lainnya",
  "5.3.3.01.": "Belanja Modal Honor Tim Pengadaan (Kendaraan)",
  "5.3.3.02.": "Belanja Modal Kendaraan Darat Bermotor",
  "5.3.3.03.": "Belanja Modal Kendaaran Darat Tidak Bermotor",
  "5.3.3.04.": "Belanja Modal Kendaraan Air Bermotor",
  "5.3.3.05.": "Belanja Modal Kendaraan Air Tidak Bermotor",
  "5.3.3.99.": "Belanja Modal Kendaraan Lainnya",
  "5.3.4.01.": "Belanja Modal Gedung, Bangunan, Taman - Honor Pelaksana Kegiatan",
  "5.3.4.02.": "Belanja Modal Gedung, Bangunan, Taman - Upah Tenaga Kerja",
  "5.3.4.03.": "Belanja Modal Gedung, Bangunan, Taman - Bahan Baku/Material",
  "5.3.4.04.": "Belanja Modal Gedung, Bangunan, Taman - Sewa Peralatan",
  "5.3.4.05.": "Belanja Modal Gedung, Bangunan, Taman - Administrasi Kegiatan",
  "5.3.5.01.": "Belanja Modal Jalan - Honor Tim Pelaksana Kegiatan",
  "5.3.5.02.": "Belanja Modal Jalan - Upah Tenaga Kerja",
  "5.3.5.03.": "Belanja Modal Jalan - Bahan Baku/Material",
  "5.3.5.04.": "Belanja Modal Jalan - Sewa Peralatan",
  "5.3.5.05.": "Belanja Modal Jalan - Administrasi Kegiatan",
  "5.3.6.01.": "Belanja Modal Jembatan - Honor Pelaksana Kegiatan",
  "5.3.6.02.": "Belanja Modal Jembatan - Upah Tenaga Kerja",
  "5.3.6.03.": "Belanja Modal Jembatan - Bahan Baku/Material",
  "5.3.6.04.": "Belanja Modal Jembatan - Sewa Peralatan",
  "5.3.6.05.": "Belanja Modal Jembatan - Administrasi Kegiatan",
  "5.3.7.01.": "Belanja Modal Irigasi/Embung/Drainase/dll - Honor Tim Pelaksana Kegiatan",
  "5.3.7.02.": "Belanja Modal Irigasi/Embung/Drainase/dll - Upah Tenaga Kerja",
  "5.3.7.03.": "Belanja Modal Irigasi/Embung/Drainase/dll - Bahan Baku/Material",
  "5.3.7.04.": "Belanja Modal Irigasi/Embung/Drainase/dll - Sewa Peralatan",
  "5.3.7.05.": "Belanja Modal Irigasi/Embung/Drainase/dll - Administrasi Kegiatan",
  "5.3.8.01.": "Belanja Modal Jaringan/Instalasi - Honor Tim Pelaksana Kegiatan",
  "5.3.8.02.": "Belanja Modal Jaringan/Instalasi - Upah Tenaga Kerja",
  "5.3.8.03.": "Belanja Modal Jaringan/Instalasi - Bahan Baku/Material",
  "5.3.8.04.": "Belanja Modal Jaringan/Instalasi - Sewa Peralatan",
  "5.3.8.05.": "Belanja Modal Jaringan/Instalasi - Administrasi Kegiatan",
  "5.3.9.01.": "Belanja Khusus Pendidikan dan Perpustakaan",
  "5.3.9.02.": "Belanja Khusus Olahraga",
  "5.3.9.03.": "Belanja Modal Khusus Kesenian/Kebudayaan/Keagamaan",
  "5.3.9.04.": "Belanja Modal Tumbuhan/Tanaman",
  "5.3.9.05.": "Belanja Modal Hewan",
  "5.3.9.99.": "Belanja Modal Lainnya",
  // 5.4 Belanja Tidak Terduga
  "5.4.1.01.": "Belanja Tidak Terduga"
};
const REK: Record<string, string> = REK_NAMA; const rekNama = (kd: string) => REK[kd] || ("Jenis belanja " + kd);

function buildRpdPrintRows(entries: RpdEntry[], ridx: Ridx) {
  const { keg, items } = ridx;
  const byKeg = new Map();

  // Kelompokkan berdasarkan kegiatan → rincian kegiatan
  for (const p of entries) {
    const it = items.get(p.key);
    if (!it) continue;

    if (!byKeg.has(it.kegKd)) {
      byKeg.set(it.kegKd, new Map());
    }

    const rincMap = byKeg.get(it.kegKd);

    if (!rincMap.has(it.rincId)) {
      rincMap.set(it.rincId, []);
    }

    rincMap.get(it.rincId).push({ p, it });
  }

  let no = 1;
  let grand = 0;
  let body = "";

  // ============================================================
  // KEGIATAN
  // ============================================================
  for (const kd of [...byKeg.keys()].sort(nat)) {
    const rincMap = byKeg.get(kd);

    const firstList =
      [...rincMap.values()].find(v => v.length) || [];

    const firstIt = firstList[0]?.it || null;

    let kegTotal = 0;

    for (const list of rincMap.values()) {
      for (const { p } of list) {
        kegTotal += p.amt;
      }
    }

    // ------------------------------------------------------------
    // Baris kegiatan
    // ------------------------------------------------------------
    body +=
      `<tr class="row-sub-kegiatan">` +
        `<td class="col-no"></td>` +
        `<td class="col-kode"><strong>${esc(rpdPrintKegCode(kd, firstIt))}</strong></td>` +
        `<td colspan="4" style="font-weight:bold;border-left:none;border-right:none">` +
          `${esc(rpdPrintKegName(kd, firstIt, keg))}` +
        `</td>` +
        `<td class="col-data col-jml" ` +
          `style="text-align:right;font-weight:bold;border-top:1px solid #000;border-bottom:none">` +
          `${nf0(kegTotal)}` +
        `</td>` +
      `</tr>`;

    // ============================================================
    // RINCIAN KEGIATAN
    // ============================================================
    for (const rid of [...rincMap.keys()].sort(nat)) {
      const all = rincMap.get(rid);

      const rincTotal = (all as any[]).reduce((s: number, { p }: any) => s + p.amt, 0);

      // ----------------------------------------------------------
      // Baris rincian kegiatan
      // ----------------------------------------------------------
      body +=
        `<tr class="row-item-group">` +
          `<td class="col-no"></td>` +
          `<td class="col-kode" style="padding-left:10px;text-align:right">` +
            `<strong>${esc(rid)}</strong>` +
          `</td>` +
          `<td colspan="4" style="font-weight:bold;padding-left:10px;border-left:none;border-right:none">` +
            `${esc(all[0]?.it.r.Nama_Rincian || "(tanpa nama rincian)")}` +
          `</td>` +
          `<td class="col-data col-jml" ` +
            `style="text-align:right;font-weight:bold;border-top:1px solid #000;border-bottom:none">` +
            `${nf0(rincTotal)}` +
          `</td>` +
        `</tr>`;

      // ==========================================================
      // CEK JUMLAH JENIS BELANJA
      // ==========================================================
      const byJenis = new Map();

      for (const e of all) {
        const jk = e.it.r.Kd_Rincian || "-";

        if (!byJenis.has(jk)) {
          byJenis.set(jk, []);
        }

        byJenis.get(jk).push(e);
      }

      const jenisBelanjaCount = byJenis.size;

      // ==========================================================
      // JIKA HANYA ADA 1 JENIS BELANJA
      // ==========================================================
      if (jenisBelanjaCount === 1) {

        // Tidak membuat baris "Jenis Belanja".
        // Langsung tampilkan item belanja.
        const list = [...(all as any[])].sort(
          (a: any, b: any) =>
            nat(a.it.r.No_Urut || "", b.it.r.No_Urut || "") || (a.p.bln ?? 99) - (b.p.bln ?? 99),
        );

        (list as any[]).forEach(({ p, it }: any, idx: number) => {
          grand += p.amt;

          const cls =
            "row-detail" +
            (idx === 0 ? " row-first-in-group" : "") +
            (idx === list.length - 1 ? " row-last-in-group" : "");

          body +=
            `<tr class="${cls}">` +
              `<td class="col-no col-left" style="text-align:center">` +
                `${no++}` +
              `</td>` +

              `<td class="col-kode col-left"></td>` +

              `<td class="col-uraian col-left" style="padding-left:36px">` +
                `• ${esc(it.r.Uraian)}` +
              `</td>` +

              `<td class="col-data col-sat" style="text-align:center">` +
                `${esc(it.r.SumberDana || "-")}` +
              `</td>` +

              `<td class="col-data col-vol" style="text-align:center">` +
                `${nfRpd(p.vol)} ${esc(it.r.Satuan || "")}` +
              `</td>` +

              `<td class="col-data col-harga" style="text-align:right">` +
                `${nf0(it.price)}` +
              `</td>` +

              `<td class="col-data col-jml" style="text-align:right">` +
                `${nf0(p.amt)}` +
              `</td>` +
            `</tr>`;
        });

      // ==========================================================
      // JIKA ADA LEBIH DARI 1 JENIS BELANJA
      // ==========================================================
      } else {

        for (const jk of [...byJenis.keys()].sort(nat)) {
          const list = byJenis
            .get(jk)
            .slice()
            .sort(
              (a: any, b: any) =>
                nat(
                  a.it.r.No_Urut || "",
                  b.it.r.No_Urut || ""
                ) ||
                (a.p.bln ?? 99) - (b.p.bln ?? 99)
            );

          const jenisTotal = (list as any[]).reduce((s: number, { p }: any) => s + p.amt, 0);

          // ------------------------------------------------------
          // Baris jenis belanja
          // ------------------------------------------------------
          body +=
            `<tr class="row-jenis">` +
              `<td class="col-no"></td>` +

              `<td class="col-kode" ` +
                `style="padding-left:20px;text-align:right">` +
                `${esc(jk)}` +
              `</td>` +

              `<td colspan="4" ` +
                `style="font-style:italic;font-weight:bold;padding-left:20px;border-left:none;border-right:none">` +
                `${esc(rekNama(jk))}` +
              `</td>` +

              `<td class="col-data col-jml" ` +
                `style="text-align:right;font-weight:bold;border-top:1px solid #000;border-bottom:none">` +
                `${nf0(jenisTotal)}` +
              `</td>` +
            `</tr>`;

          // ------------------------------------------------------
          // Item belanja
          // ------------------------------------------------------
          (list as any[]).forEach(({ p, it }: any, idx: number) => {
            grand += p.amt;

            const cls =
              "row-detail" +
              (idx === 0 ? " row-first-in-group" : "") +
              (idx === list.length - 1 ? " row-last-in-group" : "");

            body +=
              `<tr class="${cls}">` +

                `<td class="col-no col-left" style="text-align:center">` +
                  `${no++}` +
                `</td>` +

                `<td class="col-kode col-left"></td>` +

                `<td class="col-uraian col-left" style="padding-left:36px">` +
                  `• ${esc(it.r.Uraian)}` +
                `</td>` +

                `<td class="col-data col-sat" style="text-align:center">` +
                  `${esc(it.r.SumberDana || "-")}` +
                `</td>` +

                `<td class="col-data col-vol" style="text-align:center">` +
                  `${nfRpd(p.vol)} ${esc(it.r.Satuan || "")}` +
                `</td>` +

                `<td class="col-data col-harga" style="text-align:right">` +
                  `${nf0(it.price)}` +
                `</td>` +

                `<td class="col-data col-jml" style="text-align:right">` +
                  `${nf0(p.amt)}` +
                `</td>` +

              `</tr>`;
          });
        }
      }
    }
  }

  return {
    body,
    grand
  };
}

export function buildRpdPrintDoc(meta: RpdDoc, opt: { entries: RpdEntry[]; ridx: Ridx; note?: string; label?: string }) {
  const { body, grand } = buildRpdPrintRows(opt.entries, opt.ridx);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(meta.judul)}</title><style>${RPD_PRINT_CSS}</style></head><body>
<div class="header"><div class="title-main">${esc(meta.judul)}</div><div class="title-sub">Desa ${esc(meta.desa)} Kecamatan ${esc(meta.kecamatan)}</div><div class="title-year">Tahun Anggaran ${esc(meta.tahun)}</div>${opt.note ? `<div style="font-size:10px;margin-top:3px">${esc(opt.note)}</div>` : ""}</div>
<div class="header-divider"></div>
<table><thead>
<tr><th class="col-no" rowspan="2">NO</th><th class="col-kode" rowspan="2">KODE</th><th class="col-uraian" rowspan="2">URAIAN</th><th colspan="4">${esc(opt.label || "RENCANA")}</th></tr>
<tr><th class="col-sat">SUMBER DANA</th><th class="col-vol">VOLUME</th><th class="col-harga">HARGA SATUAN (Rp)</th><th class="col-jml">JUMLAH (Rp)</th></tr>
</thead><tbody>${body}
<tr class="row-total"><td colspan="6" style="text-align:center;padding-right:8px;font-size:12px;font-weight:bold">JUMLAH</td><td style="text-align:right;font-size:12px;font-weight:bold">Rp ${nf0(grand)}</td></tr>
</tbody></table>
<div class="footer">
<div class="footer-place">${esc(meta.desa)}, ${idDateLong(meta.tanggal)}</div>
<div style="height:10px"></div>
<div class="ttd-row">
<div class="ttd-mengetahui"><div class="ttd-label">Mengetahui :</div><div class="ttd-jabatan">Kepala Desa ${esc(meta.desa)}</div><div style="height:10px"></div><div class="ttd-nama">${esc(meta.kades)}</div><div class="ttd-jabatan-bawah">Kepala Desa ${esc(meta.desa)}</div></div>
<div class="ttd-pembuat"><div class="ttd-label">Pembuat Daftar :</div><div class="ttd-two-col" style="margin-top:4px"><div class="ttd-col"><div class="ttd-jabatan">Kepala Urusan Keuangan<br>Desa ${esc(meta.desa)}</div><div class="ttd-nama">${esc(meta.kaur)}</div><div class="ttd-jabatan-bawah">Kepala Urusan Keuangan</div></div></div></div>
</div></div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
</body></html>`;
}






export const rekName = rekNama;


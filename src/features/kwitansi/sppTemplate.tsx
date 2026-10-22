import { terbilang, rupiah } from "./format";
import type { KwitansiData, SppTemplateData } from "./types";

const e = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const rup = (n: number): string => rupiah(Number.isFinite(n) ? Math.trunc(n) : 0);

const ddmmyyyy = (iso?: string): string => {
  if (!iso) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}${m[2]}${m[1]}`;
};

const foot = (waktu?: string, halaman = 1): string =>
  `<div class="spp-foot"><span class="spp-tag">Printed by Siskeudes</span><span>${e(waktu ?? "-")}</span><span class="spp-pg">Halaman ${halaman}</span></div>`;

const head = (desa?: string, tahun?: number, judul?: string): string => {
  const d = e(desa ?? "-");
  const j = e(judul ?? "SURAT PERMINTAAN PEMBAYARAN");
  return `<div class="spp-hd"><div class="spp-a">PEMERINTAH DESA ${d}</div><div class="spp-b">${j}</div><div class="spp-a">TAHUN ANGGARAN ${tahun ?? "-"}</div></div>`;
};

export type SppTemplate = "spp-1" | "spp-2" | "sptjb" | "semua";

export const TEMPLATE_LABEL: Record<SppTemplate, string> = {
  "spp-1": "SPP-1",
  "spp-2": "SPP-2",
  sptjb: "SPTJB",
  semua: "SEMUA",
};

interface SheetProps {
  d: SppTemplateData;
  kwitansi?: KwitansiData;
}

/** Halaman 1: Surat pengantar SPP (portrait) */
export function SppSheet1({ d, kwitansi }: SheetProps): React.JSX.Element {
  const jumlah = kwitansi?.jumlah ?? 0;
  const tglDikeluarkan = kwitansi?.tanggal ? ddmmyyyy(kwitansi.tanggal) : (d.tanggal ?? "-");
  return (
    <section className="spp-sheet">
      <div dangerouslySetInnerHTML={{ __html: head(d.desa, d.tahun) }} />
      <hr className="spp-rule" />
      <div className="spp-c">NOMOR : &nbsp;{e(d.nomor ?? "-")}</div>
      <div className="spp-c">SURAT PENGANTAR</div>
      <div className="spp-kepada"><div>Kepada Yth.</div><div>KEPALA DESA {e(d.desa ?? "-")}</div><div>Di tempat</div></div>
      <div className="spp-para">
        Dengan memperhatikan Peraturan Desa Nomor &nbsp;{e(d.perdes?.nomor ?? "-")} &nbsp;Tanggal &nbsp;{e(d.perdes?.tanggal ?? "-")} kami mengajukan permintaan pembayaran sebagai berikut :
      </div>
      <div className="spp-k1">
        <div className="spp-kv"><span>a.&nbsp; Bidang</span><span>:</span><span>{e(d.bidang ?? "-")}</span></div>
        <div className="spp-kv"><span>b.&nbsp; Sub Bidang</span><span>:</span><span>{e(d.subBidang ?? "-")}</span></div>
        <div className="spp-kv"><span>c.&nbsp; Kegiatan</span><span>:</span><span>{e(d.kegiatan ?? "-")}</span></div>
        <div className="spp-kv"><span>d.&nbsp; Tahun Anggaran</span><span>:</span><span>{d.tahun ?? "-"}</span></div>
        <div className="spp-kv"><span>e.&nbsp; Keperluan</span><span>:</span><span>{e(d.keperluan ?? "-")}</span></div>
        <div className="spp-kv"><span>f.&nbsp; Jumlah Diminta</span><span>:</span><span>Rp.<span className="spp-amt">{rup(jumlah)}</span><span className="spp-terb">( {terbilang(jumlah)} Rupiah)</span></span></div>
      </div>
      <div className="spp-ttd1">{d.desa}, &nbsp;{tglDikeluarkan}<br />Pelaksana Kegiatan,<div className="spp-gap"></div>{e(d.pelaksana ?? "-")}</div>
      <div dangerouslySetInnerHTML={{ __html: foot(d.cetak?.spp1, 1) }} />
    </section>
  );
}

/** Halaman 2: Rincian SPP (landscape) */
export function SppSheet2({ d }: { d: SppTemplateData }): React.JSX.Element {
  const rows = d.rincian ?? [];
  const rowsHtml = rows.map(
    (r, i) =>
      `<tr><td class="spp-m">${i + 1}</td><td class="spp-m">${e(r.kode)}</td><td>${e(r.uraian)}</td><td class="spp-n">${rup(r.pagu)}</td><td class="spp-n">${rup(r.lalu)}</td><td class="spp-n">${rup(r.skrg)}</td><td class="spp-n">${rup(r.jml)}</td><td class="spp-n">${rup(r.sisa)}</td></tr>`,
  ).join("");
  const totals = {
    pagu: rows.reduce((s, r) => s + r.pagu, 0),
    lalu: rows.reduce((s, r) => s + r.lalu, 0),
    skrg: rows.reduce((s, r) => s + r.skrg, 0),
    jml: rows.reduce((s, r) => s + r.jml, 0),
    sisa: rows.reduce((s, r) => s + r.sisa, 0),
  };
  const ttdHtml = (d.ttd ?? []).map((t) => `<div class="spp-ttd-row"><div>${e(t.aksi)}</div><div class="spp-jab">${e(t.jabatan)}</div><div class="spp-gap"></div><div>${e(t.nama)}</div></div>`).join("");
  return (
    <section className="spp-sheet land">
      <div dangerouslySetInnerHTML={{ __html: head(d.desa, d.tahun) }} />
      <div className="spp-info2">
        <div className="spp-kv"><span>1. Bidang</span><span>:</span><span>{e(d.bidang ?? "-")}</span></div>
        <div className="spp-kv"><span>2. Sub Bidang</span><span>:</span><span>{e(d.subBidang ?? "-")}</span></div>
        <div className="spp-kv"><span>3. Kegiatan</span><span>:</span><span>{e(d.kegiatan ?? "-")}</span></div>
        <div className="spp-kv"><span>4. Waktu Pelaksanaan</span><span>:</span><span>{e(d.waktu ?? "-")}</span></div>
        <div className="spp-nomor">Nomor &nbsp;: &nbsp;{e(d.nomor ?? "-")}</div>
      </div>
      <div className="spp-box">
        <table className="spp-tbl">
          <colgroup>
            <col style={{ width: "5%" }} /><col style={{ width: "9%" }} /><col style={{ width: "33%" }} /><col style={{ width: "10.6%" }} /><col style={{ width: "10.6%" }} /><col style={{ width: "10.6%" }} /><col style={{ width: "10.6%" }} /><col style={{ width: "10.6%" }} />
          </colgroup>
          <tr className="spp-tbl-head1">
            <th rowSpan={2}>No.</th>
            <th rowSpan={2}>Kode</th>
            <th rowSpan={2}>Uraian</th>
            <th>Pagu<br />Anggaran</th>
            <th>Pencairan s.d<br />Yang Lalu</th>
            <th>Permintaan<br />Sekarang</th>
            <th>Jumlah Sampai<br />Saat Ini</th>
            <th>Sisa Dana</th>
          </tr>
          <tr className="spp-tbl-head2">
            <th>( Rp )</th>
            <th>( Rp )</th>
            <th>( Rp )</th>
            <th>( Rp )</th>
            <th>( Rp )</th>
          </tr>
          <tr className="spp-tbl-head3">
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
            <th>6</th>
            <th>7</th>
            <th>8</th>
          </tr>
          {rowsHtml}
          <tr className="spp-tot">
            <td></td>
            <td></td>
            <td>Jumlah</td>
            <td>{rup(totals.pagu)}</td>
            <td>{rup(totals.lalu)}</td>
            <td>{rup(totals.skrg)}</td>
            <td>{rup(totals.jml)}</td>
            <td>{rup(totals.sisa)}</td>
          </tr>
        </table>
        <div className="spp-sg">
          <div className="spp-tgl">{d.desa}, &nbsp;{d.tanggal ?? "-"}</div>
          <div className="spp-row">{ttdHtml}
            <div><div>Pelaksana Kegiatan,</div><div className="spp-jab"></div><div className="spp-gap"></div><div>{e(d.pelaksana ?? "-")}</div></div>
          </div>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: foot(d.cetak?.spp2, 2) }} />
    </section>
  );
}

/** Halaman 3: SPTJB (portrait) */
export function SppSheet3({ d }: { d: SppTemplateData }): React.JSX.Element {
  const rows = d.penerimaDetail ?? [];
  const prow = rows.map(
    (p, i) =>
      `<tr><td class="spp-m">${i + 1}</td><td>${e(p.nama)}<br />${e(p.alamat)}<small>${e(p.bukti)}</small></td><td>${e(p.uraian)}</td><td style="vertical-align:bottom">${e(p.rekening)}</td><td class="spp-n">${rup(p.jumlah)}</td></tr>`,
  ).join("");
  const total = rows.reduce((s, p) => s + p.jumlah, 0);
  return (
    <section className="spp-sheet">
      <div className="spp-top3"><span className="spp-nomor">Nomor &nbsp;: &nbsp;{e(d.nomor ?? "-")}</span></div>
      <div dangerouslySetInnerHTML={{ __html: head(d.desa, d.tahun, "PERNYATAAN TANGGUNG JAWAB BELANJA") }} />
      <div className="spp-box">
        <div className="spp-in3">
          <div className="spp-kv"><span>1. Bidang</span><span>:</span><span>{e(d.bidang ?? "-")}</span></div>
          <div className="spp-kv"><span>2. Sub Bidang</span><span>:</span><span>{e(d.subBidang ?? "-")}</span></div>
          <div className="spp-kv"><span>3. Kegiatan</span><span>:</span><span>{e(d.kegiatan ?? "-")}</span></div>
        </div>
        <table className="spp-t3">
          <colgroup>
            <col style={{ width: "7%" }} /><col style={{ width: "26%" }} /><col style={{ width: "34%" }} /><col style={{ width: "14%" }} /><col style={{ width: "19%" }} />
          </colgroup>
          <tr>
            <th>No.</th>
            <th>Penerima</th>
            <th>Uraian</th>
            <th>Rekening<br />Penerima</th>
            <th>Jumlah<br />( Rp )</th>
          </tr>
          {prow}
          <tr className="spp-tot">
            <td colSpan={4}>Total</td>
            <td>{rup(total)}</td>
          </tr>
        </table>
        <div className="spp-stmt">
          Bukti-bukti pengeluaran atau belanja tersebut diatas sebagaimana terlampir, untuk kelengkapan administrasi dan pemeriksaan sesuai dengan peraturan perundang-undangan yang berlaku.<br />Demikian surat pernyataan ini dibuat dengan sebenarnya.
          <div className="spp-ttd1">{d.desa}, &nbsp;{d.tanggal ?? "-"}<br />Pelaksana Kegiatan,<div className="spp-gap"></div>{e(d.pelaksana ?? "-")}</div>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: foot(d.cetak?.sptjb, 3) }} />
    </section>
  );
}

/** Semua halaman (SPP-1 + SPP-2 + SPTJB) */
export function SppAll({ d, kwitansis }: { d: SppTemplateData; kwitansis: KwitansiData[] }): React.JSX.Element {
  return (
    <>
      <SppSheet1 d={d} kwitansi={kwitansis[0]} />
      <SppSheet2 d={d} />
      <SppSheet3 d={d} />
    </>
  );
}

/** Render template sesuai pilihan */
export function renderSppTemplate({
  template,
  d,
  kwitansis,
}: {
  template: SppTemplate;
  d: SppTemplateData;
  kwitansis: KwitansiData[];
}): React.JSX.Element {
  if (template === "spp-1") return <SppSheet1 d={d} kwitansi={kwitansis[0]} />;
  if (template === "spp-2") return <SppSheet2 d={d} />;
  if (template === "sptjb") return <SppSheet3 d={d} />;
  return <SppAll d={d} kwitansis={kwitansis} />;
}

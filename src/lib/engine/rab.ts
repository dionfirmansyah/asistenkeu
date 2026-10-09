import type { RabFlatRow, RabIssues, SmdTables } from "@/types/smd";
import { K, KIND, cleanName, groupBy, isPseudo, norm, num, vt } from "./util";

export function buildRabFlat(t: SmdTables): { flat: RabFlatRow[]; issues: RabIssues } {
  const rows = (n: string) => t[n] || [];
  const bid = new Map(rows("Ta_Bidang").map((r) => [K(r.Kd_Desa, r.Kd_Bid), r]));
  const sub = new Map(rows("Ta_SubBidang").map((r) => [K(r.Kd_Desa, r.Kd_Sub), r]));
  const keg = new Map(rows("Ta_Kegiatan").map((r) => [K(r.Kd_Desa, r.Kd_Keg), r]));
  const out = new Map(rows("Ta_KegiatanOutput").map((r) => [K(r.Kd_Desa, r.Kd_Keg, r.No_ID), r]));
  const lanj = new Map(rows("Ta_Lanj_Kegiatan").map((r) => [K(r.Kd_Desa, r.Kd_Keg, r.Kd_SubRinci), r]));
  const rab = new Map(rows("Ta_RAB").map((r) => [K(r.Kd_Desa, r.Kd_Keg, r.Kd_Rincian, r.Kd_SubRinci), r]));

  const flat: RabFlatRow[] = [];
  const issues: RabIssues = { noKeg: [], noSub: [], noBid: [], noRincianName: [], noRabHeader: [], lanjFallback: 0 };

  for (const r of rows("Ta_RABRinci")) {
    const kd = vt(r.Kd_Rincian);
    const jenis = KIND[kd[0]] || "LAINNYA";
    const pseudo = isPseudo(r.Kd_Keg);
    const k = keg.get(K(r.Kd_Desa, r.Kd_Keg)) || null;
    const s = k ? sub.get(K(r.Kd_Desa, k.Kd_Sub)) || null : null;
    const b = s ? bid.get(K(r.Kd_Desa, s.Kd_Bid)) || null : null;
    // Level 4: nama rincian kegiatan. Kd_SubRinci (RAB) == No_ID (KegiatanOutput)
    const o = out.get(K(r.Kd_Desa, r.Kd_Keg, r.Kd_SubRinci)) || null;
    let namaRincian = o ? norm(o.Nama_Paket) : "";
    if (!namaRincian && !pseudo) {
      const l = lanj.get(K(r.Kd_Desa, r.Kd_Keg, r.Kd_SubRinci));
      if (l && norm(l.Nama_Paket)) {
        namaRincian = norm(l.Nama_Paket);
        issues.lanjFallback++;
      }
    }
    const head = rab.get(K(r.Kd_Desa, r.Kd_Keg, r.Kd_Rincian, r.Kd_SubRinci)) || null;

    const row: RabFlatRow = {
      Tahun: vt(r.Tahun), Kd_Desa: vt(r.Kd_Desa), Jenis: jenis, Pseudo: pseudo,
      Kd_Bid: b ? vt(b.Kd_Bid) : "", Nama_Bidang: b ? norm(b.Nama_Bidang) : "",
      Kd_Sub: s ? vt(s.Kd_Sub) : k ? vt(k.Kd_Sub) : "", Nama_SubBidang: s ? norm(s.Nama_SubBidang) : "",
      Kd_Keg: vt(r.Kd_Keg), ID_Keg: k ? vt(k.ID_Keg) : "",
      Nama_Kegiatan: k ? cleanName(k.Nama_Kegiatan) : "", Nama_Kegiatan_Asli: k ? norm(k.Nama_Kegiatan) : "",
      Kd_Rincian: kd,
      Kd_SubRinci: vt(r.Kd_SubRinci),
      Nama_Rincian: namaRincian,
      No_Urut: vt(r.No_Urut), Uraian: norm(r.Uraian), Satuan: norm(r.Satuan), SumberDana: norm(r.SumberDana),
      JmlSatuan: num(r.JmlSatuan), HrgSatuan: num(r.HrgSatuan), Anggaran: num(r.Anggaran),
      JmlSatuanPAK: num(r.JmlSatuanPAK), HrgSatuanPAK: num(r.HrgSatuanPAK),
      AnggaranPAK: num(r.AnggaranPAK), AnggaranStlhPAK: num(r.AnggaranStlhPAK),
      Selisih: num(r.AnggaranStlhPAK) - num(r.Anggaran),
      upah_pktd: r.upah_pktd === true ? "Ya" : r.upah_pktd === false ? "Tidak" : vt(r.upah_pktd),
      Kode_SBU: vt(r.Kode_SBU), tagging_pby: vt(r.tagging_pby),
      Nm_PPTKD: k ? norm(k.Nm_PPTKD) : "", Jbt_PPTKD: k ? norm(k.Jbt_PPTKD) : "",
      Lokasi: o && norm(o.Lokasi) ? norm(o.Lokasi) : k ? norm(k.Lokasi) : "",
      Waktu: k ? norm(k.Waktu) : "", Keluaran: k ? norm(k.Keluaran) : "",
      Pola_Kegiatan: o ? norm(o.Pola_Kegiatan) : "", Sifat: o ? norm(o.Sifat) : "",
      Volume_Output: o ? num(o.Volume) : null, Satuan_Output: o ? norm(o.Satuan) : "",
      _hasHead: !!head,
    };
    flat.push(row);

    if (!pseudo) {
      if (!k) issues.noKeg.push(row);
      else if (!s) issues.noSub.push(row);
      else if (!b) issues.noBid.push(row);
      if (!namaRincian) issues.noRincianName.push(row);
    }
    if (!head) issues.noRabHeader.push(row);
  }

  flat.sort(
    (a, b) =>
      a.Kd_Keg.localeCompare(b.Kd_Keg, "id", { numeric: true }) ||
      a.Kd_SubRinci.localeCompare(b.Kd_SubRinci, "id", { numeric: true }) ||
      a.Kd_Rincian.localeCompare(b.Kd_Rincian, "id", { numeric: true }) ||
      a.No_Urut.localeCompare(b.No_Urut, "id", { numeric: true }),
  );
  flat.forEach((r, i) => {
    r._id = i;
    r._q = null;
  });
  return { flat, issues };
}

export { groupBy };

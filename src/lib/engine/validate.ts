import type { RabFlatRow, RabIssues, Row, SmdTables, ValidationIssue } from "@/types/smd";
import { K, cleanName, groupBy, norm, num, vt } from "./util";

const SAMPLE = (a: RabFlatRow[]) =>
  a.slice(0, 40).map((r) => `${r.Kd_Keg} ${r.Kd_Rincian} #${r.Kd_SubRinci}/${r.No_Urut} — ${r.Uraian}`);

export function validate(t: SmdTables, flat: RabFlatRow[], issues: RabIssues): ValidationIssue[] {
  const res: ValidationIssue[] = [];
  const add = (level: ValidationIssue["level"], group: string, text: string, detail?: string[]) =>
    res.push({ level, group, text, detail: detail || [] });
  const rr = t["Ta_RABRinci"] || [];
  const rab = t["Ta_RAB"] || [];
  const fmt = (n: number) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  const sum = (a: Row[], c: string) => a.reduce((s, r) => s + num(r[c]), 0);

  if (!rr.length) add("ERROR", "Sumber", "Tabel Ta_RABRinci tidak ditemukan atau kosong");
  if (!rab.length) add("ERROR", "Sumber", "Tabel Ta_RAB tidak ditemukan atau kosong");

  // 1-3 total RAB vs RABRinci
  const totals: Array<[string, string]> = [
    ["Anggaran", "Anggaran (Semula)"],
    ["AnggaranPAK", "AnggaranPAK (Perubahan)"],
    ["AnggaranStlhPAK", "AnggaranStlhPAK (Menjadi)"],
  ];
  for (const [c, lbl] of totals) {
    const a = sum(rab, c);
    const b = sum(rr, c);
    if (Math.abs(a - b) < 1) add("PASS", "Total", `Total ${lbl} sesuai: Ta_RAB = Ta_RABRinci = Rp ${fmt(a)}`);
    else add("ERROR", "Total", `Total ${lbl} berbeda: Ta_RAB Rp ${fmt(a)} ≠ Ta_RABRinci Rp ${fmt(b)} (selisih Rp ${fmt(a - b)})`);
  }

  // total per baris header (RAB vs jumlah item)
  const itemSum = new Map<string, number[]>();
  for (const r of rr) {
    const k = K(r.Kd_Desa, r.Kd_Keg, r.Kd_Rincian, r.Kd_SubRinci);
    const x = itemSum.get(k) || [0, 0, 0];
    x[0] += num(r.Anggaran);
    x[1] += num(r.AnggaranPAK);
    x[2] += num(r.AnggaranStlhPAK);
    itemSum.set(k, x);
  }
  const hdrBad: string[] = [];
  for (const h of rab) {
    const x = itemSum.get(K(h.Kd_Desa, h.Kd_Keg, h.Kd_Rincian, h.Kd_SubRinci)) || [0, 0, 0];
    if (Math.abs(x[0] - num(h.Anggaran)) > 1 || Math.abs(x[1] - num(h.AnggaranPAK)) > 1 || Math.abs(x[2] - num(h.AnggaranStlhPAK)) > 1)
      hdrBad.push(`${vt(h.Kd_Keg)} ${vt(h.Kd_Rincian)} #${vt(h.Kd_SubRinci)}`);
  }
  add(hdrBad.length ? "ERROR" : "PASS", "Total", hdrBad.length ? `${hdrBad.length} baris Ta_RAB tidak sama dengan jumlah item Ta_RABRinci` : "Setiap baris Ta_RAB sama dengan jumlah item Ta_RABRinci-nya", hdrBad.slice(0, 50));

  // 4 duplikasi
  const dupOf = (rows: Row[], keys: string[]) => {
    const c = new Map<string, number>();
    for (const r of rows) {
      const k = K(...keys.map((x) => r[x]));
      c.set(k, (c.get(k) || 0) + 1);
    }
    return [...c].filter((x) => x[1] > 1).map((x) => x[0].replaceAll("¦", " / "));
  };
  const d1 = dupOf(rr, ["Kd_Keg", "Kd_Rincian", "Kd_SubRinci", "No_Urut"]);
  add(d1.length ? "ERROR" : "PASS", "Duplikasi", d1.length ? `${d1.length} kunci ganda pada Ta_RABRinci (Kd_Keg, Kd_Rincian, Kd_SubRinci, No_Urut)` : "Tidak ada kunci ganda pada Ta_RABRinci (Kd_Keg, Kd_Rincian, Kd_SubRinci, No_Urut)", d1.slice(0, 50));
  const d2 = dupOf(rab, ["Kd_Keg", "Kd_Rincian", "Kd_SubRinci"]);
  add(d2.length ? "ERROR" : "PASS", "Duplikasi", d2.length ? `${d2.length} kunci ganda pada Ta_RAB` : "Tidak ada kunci ganda pada Ta_RAB (Kd_Keg, Kd_Rincian, Kd_SubRinci)", d2.slice(0, 50));
  const d3 = dupOf(t["Ta_KegiatanOutput"] || [], ["Kd_Keg", "No_ID"]);
  add(d3.length ? "ERROR" : "PASS", "Duplikasi", d3.length ? `${d3.length} kunci ganda pada Ta_KegiatanOutput` : "Tidak ada kunci ganda pada Ta_KegiatanOutput (Kd_Keg, No_ID)", d3.slice(0, 50));

  // 5 volume × harga (semula & setelah PAK)
  const cut = <T>(arr: T[], n = 40): T[] => arr.slice(0, n);
  const b1 = rr.filter((r) => Math.abs(num(r.Anggaran) - num(r.JmlSatuan) * num(r.HrgSatuan)) > 0.5);
  add(b1.length ? "WARNING" : "PASS", "Hitungan", b1.length ? `${b1.length} baris: Anggaran ≠ JmlSatuan × HrgSatuan` : "Anggaran = JmlSatuan × HrgSatuan pada seluruh baris", cut(b1).map((r) => `${vt(r.Kd_Keg)} ${vt(r.Kd_Rincian)} — ${norm(r.Uraian)}`));
  const b2 = rr.filter((r) => Math.abs(num(r.AnggaranStlhPAK) - num(r.JmlSatuanPAK) * num(r.HrgSatuanPAK)) > 0.5);
  add(b2.length ? "WARNING" : "PASS", "Hitungan", b2.length ? `${b2.length} baris: AnggaranStlhPAK ≠ JmlSatuanPAK × HrgSatuanPAK` : "AnggaranStlhPAK = JmlSatuanPAK × HrgSatuanPAK pada seluruh baris", cut(b2).map((r) => `${vt(r.Kd_Keg)} ${vt(r.Kd_Rincian)} — ${norm(r.Uraian)}`));
  const b3 = rr.filter((r) => Math.abs(num(r.AnggaranStlhPAK) - (num(r.Anggaran) + num(r.AnggaranPAK))) > 0.5);
  add(b3.length ? "ERROR" : "PASS", "Hitungan", b3.length ? `${b3.length} baris: AnggaranStlhPAK ≠ Anggaran + AnggaranPAK` : "AnggaranStlhPAK = Anggaran + AnggaranPAK pada seluruh baris (AnggaranPAK adalah selisih perubahan)", cut(b3).map((r) => `${vt(r.Kd_Keg)} ${vt(r.Kd_Rincian)} — ${norm(r.Uraian)}`));
  const neg = rr.filter((r) => num(r.AnggaranPAK) < 0);
  if (neg.length) add("INFO", "Hitungan", `${neg.length} baris memiliki perubahan negatif (anggaran berkurang)`, cut(neg).map((r) => `${vt(r.Kd_Keg)} ${norm(r.Uraian)} : Rp ${fmt(num(r.AnggaranPAK))}`));

  // 6-7 parent
  add(issues.noKeg.length ? "ERROR" : "PASS", "Induk", issues.noKeg.length ? `${issues.noKeg.length} item belanja tanpa kegiatan induk (Ta_Kegiatan)` : "Semua item belanja memiliki kegiatan induk", SAMPLE(issues.noKeg));
  add(issues.noSub.length ? "ERROR" : "PASS", "Induk", issues.noSub.length ? `${issues.noSub.length} item belanja: kegiatan tidak terhubung ke Sub Bidang` : "Semua kegiatan terhubung ke Sub Bidang", SAMPLE(issues.noSub));
  add(issues.noBid.length ? "ERROR" : "PASS", "Induk", issues.noBid.length ? `${issues.noBid.length} item belanja: Sub Bidang tidak terhubung ke Bidang` : "Semua Sub Bidang terhubung ke Bidang", SAMPLE(issues.noBid));
  add(issues.noRincianName.length ? "WARNING" : "PASS", "Induk", issues.noRincianName.length ? `${issues.noRincianName.length} item belanja tanpa Nama Rincian Kegiatan (Ta_KegiatanOutput.Nama_Paket tidak ditemukan)` : "Semua item belanja memiliki Nama Rincian Kegiatan (dari Ta_KegiatanOutput.Nama_Paket)", SAMPLE(issues.noRincianName));
  if (issues.lanjFallback) add("INFO", "Induk", `${issues.lanjFallback} nama rincian diambil dari Ta_Lanj_Kegiatan (cadangan)`);
  add(issues.noRabHeader.length ? "ERROR" : "PASS", "Induk", issues.noRabHeader.length ? `${issues.noRabHeader.length} item Ta_RABRinci tidak memiliki baris induk di Ta_RAB` : "Semua item Ta_RABRinci memiliki baris induk di Ta_RAB", SAMPLE(issues.noRabHeader));

  // Rincian kegiatan tanpa RAB & sebaliknya
  const rabKeys = new Set(rab.map((r) => K(r.Kd_Desa, r.Kd_Keg, r.Kd_SubRinci)));
  const orphanOut = (t["Ta_KegiatanOutput"] || []).filter((o) => !rabKeys.has(K(o.Kd_Desa, o.Kd_Keg, o.No_ID)));
  add(orphanOut.length ? "WARNING" : "PASS", "Induk", orphanOut.length ? `${orphanOut.length} rincian kegiatan (Ta_KegiatanOutput) tanpa data RAB` : "Semua rincian kegiatan (Ta_KegiatanOutput) memiliki data RAB", cut(orphanOut).map((o) => `${vt(o.Kd_Keg)} #${vt(o.No_ID)} — ${norm(o.Nama_Paket)}`));
  const kegAll = new Set(flat.map((r) => r.Kd_Keg));
  const kegNoRab = (t["Ta_Kegiatan"] || []).filter((k) => !kegAll.has(vt(k.Kd_Keg)));
  add(kegNoRab.length ? "WARNING" : "PASS", "Induk", kegNoRab.length ? `${kegNoRab.length} kegiatan tanpa RAB` : "Semua kegiatan memiliki data RAB", kegNoRab.map((k) => `${vt(k.Kd_Keg)} — ${norm(k.Nama_Kegiatan)}`));

  // Nilai Ta_KegiatanOutput vs jumlah RAB
  const rabByOut = new Map<string, number[]>();
  for (const r of rab) {
    const k = K(r.Kd_Desa, r.Kd_Keg, r.Kd_SubRinci);
    const x = rabByOut.get(k) || [0, 0, 0];
    x[0] += num(r.Anggaran);
    x[1] += num(r.AnggaranPAK);
    x[2] += num(r.AnggaranStlhPAK);
    rabByOut.set(k, x);
  }
  const outBad: string[] = [];
  for (const o of t["Ta_KegiatanOutput"] || []) {
    const x = rabByOut.get(K(o.Kd_Desa, o.Kd_Keg, o.No_ID));
    if (!x) continue;
    if (Math.abs(x[2] - num(o.AnggaranStlhPAK)) > 1 || Math.abs(x[0] - num(o.Anggaran)) > 1)
      outBad.push(`${vt(o.Kd_Keg)} #${vt(o.No_ID)} ${norm(o.Nama_Paket)}: KegiatanOutput Rp ${fmt(num(o.AnggaranStlhPAK))} vs RAB Rp ${fmt(x[2])}`);
  }
  add(outBad.length ? "WARNING" : "PASS", "Total", outBad.length ? `${outBad.length} rincian kegiatan: nilai Ta_KegiatanOutput ≠ jumlah RAB` : "Nilai setiap rincian kegiatan (Ta_KegiatanOutput) sama dengan jumlah RAB-nya", cut(outBad));

  // Pagu kegiatan vs RAB
  const rabByKeg = new Map<string, number[]>();
  for (const r of rab) {
    const x = rabByKeg.get(vt(r.Kd_Keg)) || [0, 0];
    x[0] += num(r.Anggaran);
    x[1] += num(r.AnggaranStlhPAK);
    rabByKeg.set(vt(r.Kd_Keg), x);
  }
  const pagu: string[] = [];
  for (const k of t["Ta_Kegiatan"] || []) {
    const x = rabByKeg.get(vt(k.Kd_Keg));
    if (!x) continue;
    if (Math.abs(x[1] - num(k.Pagu_PAK)) > 1)
      pagu.push(`${vt(k.Kd_Keg)} ${cleanName(k.Nama_Kegiatan)}: Pagu PAK Rp ${fmt(num(k.Pagu_PAK))} vs RAB Rp ${fmt(x[1])} (selisih Rp ${fmt(x[1] - num(k.Pagu_PAK))})`);
  }
  add(pagu.length ? "WARNING" : "PASS", "Total", pagu.length ? `${pagu.length} kegiatan: Pagu_PAK di Ta_Kegiatan ≠ jumlah AnggaranStlhPAK di RAB` : "Pagu_PAK setiap kegiatan sama dengan jumlah RAB-nya", pagu);

  // 8 PAK tanpa pasangan
  const pakOnly = flat.filter((r) => r.Anggaran === 0 && r.AnggaranPAK !== 0);
  const pakOnlyTot = pakOnly.reduce((s, r) => s + r.AnggaranStlhPAK, 0);
  add("INFO", "PAK", `${pakOnly.length} item hanya ada pada PAK (Semula = 0, total Menjadi Rp ${fmt(pakOnlyTot)}). Ini ditambahkan saat perubahan, mis. kegiatan dari SiLPA. Tetap dihitung.`);
  const gone = flat.filter((r) => r.Anggaran !== 0 && r.AnggaranStlhPAK === 0);
  if (gone.length) add("INFO", "PAK", `${gone.length} item dihapus pada PAK (Menjadi = 0)`, cut(gone).map((r) => `${r.Kd_Keg} — ${r.Uraian}`));
  const unpaired = flat.filter((r) => r.Anggaran === 0 && r.AnggaranPAK === 0 && r.AnggaranStlhPAK !== 0);
  add(unpaired.length ? "WARNING" : "PASS", "PAK", unpaired.length ? `${unpaired.length} item memiliki Menjadi ≠ 0 tetapi Semula dan Perubahan = 0` : "Tidak ada data PAK yang tidak terpetakan", cut(unpaired).map((r) => `${r.Kd_Keg} — ${r.Uraian}`));

  // 9 SiLPA
  const silpaRows = flat.filter((r) => /silpa/i.test(r.Nama_Rincian) || /silpa/i.test(r.Uraian));
  const silpaBelanja = silpaRows.filter((r) => r.Jenis === "BELANJA");
  const silpaRincian = new Set(silpaBelanja.map((r) => K(r.Kd_Keg, r.Kd_SubRinci)));
  add("PASS", "SiLPA", `Data SiLPA tetap dihitung: ${silpaRincian.size} rincian kegiatan SiLPA (${silpaBelanja.length} item belanja) senilai Rp ${fmt(silpaBelanja.reduce((s, r) => s + r.AnggaranStlhPAK, 0))} (Menjadi)`);

  // Sumber dana
  const sd = groupBy(flat.filter((r) => !r.Pseudo), (r) => K(r.Kd_Keg, r.Kd_SubRinci));
  const mixed = [...sd].filter(([, v]) => new Set(v.map((x) => x.SumberDana)).size > 1);
  if (mixed.length)
    add("INFO", "Sumber Dana", `${mixed.length} rincian kegiatan memakai lebih dari satu sumber dana; analisis sumber dana memakai sumber dana tiap item.`, mixed.map(([, v]) => `${v[0].Kd_Keg} #${v[0].Kd_SubRinci} — ${v[0].Nama_Rincian}: ${[...new Set(v.map((x) => x.SumberDana))].join(", ")}`));
  const noSd = flat.filter((r) => !r.SumberDana);
  add(noSd.length ? "WARNING" : "PASS", "Sumber Dana", noSd.length ? `${noSd.length} item tanpa Sumber Dana` : "Semua item memiliki Sumber Dana", cut(noSd).map((r) => `${r.Kd_Keg} — ${r.Uraian}`));
  const noPp = flat.filter((r) => !r.Pseudo && !r.Nm_PPTKD);
  add(noPp.length ? "WARNING" : "PASS", "PPTKD", noPp.length ? `${noPp.length} item belanja tanpa PPTKD` : "Semua item belanja memiliki PPTKD (dari Ta_Kegiatan.Nm_PPTKD)", cut(noPp).map((r) => `${r.Kd_Keg} — ${r.Uraian}`));

  // 10 info struktural
  const lainnya = flat.filter((r) => r.Jenis === "LAINNYA");
  add(lainnya.length ? "WARNING" : "PASS", "Pemetaan", lainnya.length ? `${lainnya.length} item dengan kode rekening tidak dikenal (bukan 4/5/6)` : "Semua kode rekening terpetakan ke Pendapatan/Belanja/Pembiayaan", cut(lainnya).map((r) => `${r.Kd_Rincian} — ${r.Uraian}`));
  add("INFO", "Pemetaan", 'Nama rekening jenis/sub-jenis belanja (Level 5 dan 6, mis. "Belanja Modal Gedung, Bangunan dan Taman") tidak tersimpan di file SMD (tidak ada tabel referensi rekening). Aplikasi hanya menampilkan kodenya.');
  add("INFO", "Pemetaan", "Kode rekening pada file ini (mis. 5.3.5.) dapat berbeda dengan cetakan RAB Siskeudes (mis. 5.3.4.) karena perbedaan versi bagan rekening. Aplikasi memakai kode dari database apa adanya.");
  add("INFO", "Ringkasan", `rab_flat: ${flat.length} baris (belanja ${flat.filter((r) => r.Jenis === "BELANJA").length}, pendapatan ${flat.filter((r) => r.Jenis === "PENDAPATAN").length}, pembiayaan ${flat.filter((r) => r.Jenis === "PEMBIAYAAN").length})`);
  return res;
}

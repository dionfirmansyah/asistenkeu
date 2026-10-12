import { describe, expect, it } from "vitest";
import { buildRekonPrintDoc } from "./print";
import type { Rekon } from "./RekonView";

const base: Rekon = {
  id: "r1",
  judul: "Rekon <b>Januari</b>",
  periode: "Januari 2026",
  bku: 1000000,
  sumber: [{ id: "s1", nama: "Dana Talangan", saldo: 500000 }],
  brankas: 900000,
  items: [
    { jenis: "Pajak belum disetor", uraian: "PPh", bukti: "B-1", tglItem: "2026-01-05", nilai: 100000, sisi: "bku", arah: "-" },
    { jenis: "Lainnya", uraian: "Tambahan", bukti: "", tglItem: "", nilai: 50000, sisi: "s1", arah: "+" },
  ],
  doc: { desa: "Desa A", kec: "Kec B", tanggal: "2026-01-31", kades: "Pak Kades", pptkd: "Bu PPTKD", pemeriksa: "", catatan: "" },
};

describe("buildRekonPrintDoc", () => {
  it("mencerminkan hitungan Ringkasan dan meng-escape input", () => {
    const html = buildRekonPrintDoc(base);
    expect(html).not.toContain("<b>Januari</b>");
    expect(html).toContain("Berita Acara Rekonsiliasi Kas");
    expect(html).toContain("Rp 900.000"); // bku 1.000.000 - 100.000
    expect(html).toContain("Rp 900.000"); // brankas tetap
    expect(html).toContain("SESUAI (Rp 0)");
    expect(html).toContain("Rp 550.000"); // talangan 500.000 + 50.000
    expect(html).toContain("window.print()");
  });

  it("menampilkan selisih dan blok pemeriksa bila ada", () => {
    const html = buildRekonPrintDoc({
      ...base,
      brankas: 800000,
      doc: { ...base.doc, pemeriksa: "Pak Periksa", catatan: "Ada kurang" },
    });
    expect(html).toContain("SELISIH");
    expect(html).toContain("Rp 100.000");
    expect(html).toContain("Pak Periksa");
    expect(html).toContain("Ada kurang");
  });
});

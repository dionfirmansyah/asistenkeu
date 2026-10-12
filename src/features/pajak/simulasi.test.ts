import { describe, expect, it } from "vitest";
import { buildSimulasiPrintDoc, type SimulasiRec } from "./simulasi";

const rec: SimulasiRec = {
  id: "sim1",
  ts: 1760044800000,
  uraian: 'Belanja ATK <b>"penting"</b>',
  kat: "barang",
  katLabel: "Pembelian Barang",
  nilai: 3000000,
  npwp: "ya",
  ppnBasis: "excl",
  rates: { ppn: 11, pph22: 1.5 },
  lines: [
    { label: "PPN 11%", ket: "PPN 11%", amt: 330000 },
    { label: "PPh 22 1,5%", ket: "PPh 22 1,5%", amt: 45000 },
  ],
  pot: 375000,
  potBulat: 375000,
};

describe("buildSimulasiPrintDoc", () => {
  it("meng-escape input user dan memuat total", () => {
    const html = buildSimulasiPrintDoc(rec);
    expect(html).not.toContain('<b>"penting"</b>');
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("Rp 375.000");
    expect(html).toContain("Rp 2.625.000");
    expect(html).toContain("window.print()");
  });

  it("menampilkan blok pembulatan bila total dibulatkan berbeda", () => {
    const html = buildSimulasiPrintDoc({ ...rec, potBulat: 375100 });
    expect(html).toContain("Saran pembulatan");
    expect(html).toContain("Rp 375.100");
  });
});

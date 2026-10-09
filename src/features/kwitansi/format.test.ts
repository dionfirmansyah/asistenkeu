import { describe, expect, it } from "vitest";
import { dibayarkan, rupiah, stempelCetak, tanggalIndonesia, terbilang } from "./format";

describe("rupiah", () => {
  it("format sesuai PRD", () => {
    expect(rupiah(7350000)).toBe("7.350.000,00");
    expect(rupiah(0)).toBe("0,00");
    expect(rupiah(1000)).toBe("1.000,00");
  });
});

describe("terbilang", () => {
  it("keenam contoh PRD", () => {
    expect(terbilang(0)).toBe("Nol Rupiah");
    expect(terbilang(1000)).toBe("Seribu Rupiah");
    expect(terbilang(1000000)).toBe("Satu Juta Rupiah");
    expect(terbilang(111000)).toBe("Seratus Sebelas Ribu Rupiah");
    expect(terbilang(2500000)).toBe("Dua Juta Lima Ratus Ribu Rupiah");
    expect(terbilang(7350000)).toBe("Tujuh Juta Tiga Ratus Lima Puluh Ribu Rupiah");
  });
  it("seratus dan seribu", () => {
    expect(terbilang(100)).toBe("Seratus Rupiah");
    expect(terbilang(1100)).toBe("Seribu Seratus Rupiah");
  });
});

describe("tanggal dan stempel", () => {
  it("tanggalIndonesia", () => {
    expect(tanggalIndonesia("2026-03-17", "LANGKANG LAMA")).toBe("LANGKANG LAMA, 17 Maret 2026");
  });
  it("stempelCetak", () => {
    expect(stempelCetak("2026-10-08T19:03:19")).toBe("08/10/2026 19.03.19");
  });
});

describe("dibayarkan", () => {
  it("boleh negatif (peringatan di layar, tetap render)", () => {
    const d = {
      nomor: "x", desa: "", kabupaten: "", sumberDana: "", diterimaDari: "", jumlah: 1000,
      uraian: "", kegiatan: { kode: "", nama: "" }, rekening: { kode: "", nama: "" },
      potongan: { ppn: 500, pph: 600, lainnya: 0 }, kota: "", tanggal: "",
      pemberi: { jabatan: "", nama: "" }, penerima: { nama: "" },
    };
    expect(dibayarkan(d)).toBe(-100);
  });
});

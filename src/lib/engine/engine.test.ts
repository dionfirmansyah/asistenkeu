import { describe, expect, it } from "vitest";
import { buildRabFlat } from "./rab";
import { decodeSmd, hasJetMagic } from "./decode";
import { validate } from "./validate";
import { nf0, rp, tgl } from "./format";

describe("decodeSmd", () => {
  it("XOR simetris (decode(encode(x)) === x)", () => {
    const raw = new Uint8Array([0, 1, 2, 250, 255, 100, 50, 10, 200, 128, 7, 3, 60, 90, 30, 70, 5, 9, 11, 13]);
    const once = decodeSmd(raw);
    expect(decodeSmd(once)).toEqual(raw);
  });

  it("hasJetMagic menolak buffer kecil", () => {
    expect(hasJetMagic(new Uint8Array(4))).toBe(false);
  });
});

describe("format", () => {
  it("format rupiah id-ID", () => {
    expect(nf0(1234567)).toBe("1.234.567,00");
    expect(rp(1500000)).toBe("Rp 1.500.000");
    expect(tgl("2026-10-06T00:00:00.000Z")).toBe("6 Okt 2026");
  });
});

describe("buildRabFlat + validate", () => {
  const tables = {
    Ta_Bidang: [{ Kd_Desa: "d", Kd_Bid: "1", Nama_Bidang: "Bidang 1" }],
    Ta_SubBidang: [{ Kd_Desa: "d", Kd_Sub: "1.01", Kd_Bid: "1", Nama_SubBidang: "Sub 1" }],
    Ta_Kegiatan: [{ Kd_Desa: "d", Kd_Keg: "1.01.2.03.0001", Kd_Sub: "1.01", Nama_Kegiatan: "Kegiatan A", Pagu_PAK: 100000 }],
    Ta_KegiatanOutput: [{ Kd_Desa: "d", Kd_Keg: "1.01.2.03.0001", No_ID: "1", Nama_Paket: "Paket A", Anggaran: 100000, AnggaranStlhPAK: 100000 }],
    Ta_Lanj_Kegiatan: [],
    Ta_RAB: [{ Kd_Desa: "d", Kd_Keg: "1.01.2.03.0001", Kd_Rincian: "5.1.1", Kd_SubRinci: "1", Anggaran: 100000, AnggaranPAK: 0, AnggaranStlhPAK: 100000 }],
    Ta_RABRinci: [{ Kd_Desa: "d", Kd_Keg: "1.01.2.03.0001", Kd_Rincian: "5.1.1", Kd_SubRinci: "1", No_Urut: "1", Uraian: "Item", Satuan: "Unit", JmlSatuan: 1, HrgSatuan: 100000, Anggaran: 100000, AnggaranPAK: 0, AnggaranStlhPAK: 100000, JmlSatuanPAK: 1, HrgSatuanPAK: 100000 }],
  };

  it("membangun rab_flat dengan hierarki lengkap", () => {
    const { flat, issues } = buildRabFlat(tables as never);
    expect(flat).toHaveLength(1);
    expect(flat[0].Nama_Bidang).toBe("Bidang 1");
    expect(flat[0].Nama_Rincian).toBe("Paket A");
    expect(flat[0].Jenis).toBe("BELANJA");
    expect(issues.noKeg).toHaveLength(0);
  });

  it("validate menghasilkan PASS untuk data konsisten", () => {
    const { flat, issues } = buildRabFlat(tables as never);
    const res = validate(tables as never, flat, issues);
    const errors = res.filter((r) => r.level === "ERROR");
    expect(errors).toHaveLength(0);
  });
});

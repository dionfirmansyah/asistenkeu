import type { Row, SmdTables } from "@/types/smd";
import { norm, vt } from "./util";

export const rowVal = (r: Row | null | undefined, names: string[]): string => {
  if (!r) return "";
  const keys = Object.keys(r);
  const lower = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const n of names) {
    const k = Object.prototype.hasOwnProperty.call(r, n) ? n : lower.get(n.toLowerCase());
    const v = k ? norm(r[k]) : "";
    if (v) return v;
  }
  return "";
};

export interface VillageIdentity {
  tahun: string;
  desa: string;
  kecamatan: string;
  kades: string;
  kaur: string;
  sekdes: string;
  bendahara: string;
  alamat: string;
  npwp: string;
  statusIdm: string;
}

export function villageIdentity(tables: SmdTables | null, flatTahun?: string): VillageIdentity {
  const desaRow = (tables?.Ta_Desa || [])[0] || null;
  const kecRows = tables?.Ref_Kecamatan || [];
  const keys = ["Kd_Prov", "Kd_Kab", "Kd_Kec", "Kd_Kecamatan"];
  const sameRef = (r: Row) => {
    let seen = false;
    for (const k of keys) {
      const a = rowVal(desaRow, [k]);
      const b = rowVal(r, [k]);
      if (a && b) {
        seen = true;
        if (a !== b) return false;
      }
    }
    return seen;
  };
  const kecRow = kecRows.find(sameRef) || kecRows[0] || null;
  return {
    tahun: rowVal(desaRow, ["Tahun"]) || flatTahun || "",
    desa: rowVal(desaRow, ["Ibukota", "Nama_Desa"]),
    kecamatan: rowVal(kecRow, ["Nama_Kecamatan"]),
    kades: rowVal(desaRow, ["Nm_Kades"]),
    kaur: rowVal(desaRow, ["Nm_Kaur_keu", "Nm_Kaur_Keu", "Nm_KaurKeu"]),
    sekdes: rowVal(desaRow, ["Nm_Sekdes"]),
    bendahara: rowVal(desaRow, ["Nm_Bendahara"]),
    alamat: rowVal(desaRow, ["Alamat"]),
    npwp: rowVal(desaRow, ["NPWP"]),
    statusIdm: rowVal(desaRow, ["Status_IDM"]),
  };
}

export { vt };

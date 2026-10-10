import { Buffer } from "buffer";
import MdbReader from "mdb-reader";
import { decodeSmd, hasJetMagic } from "@/lib/engine/decode";
import { idbPut, rememberCache } from "@/lib/storage/idb";
import type { Row } from "@/types/smd";

export interface SppRec {
  name: string;
  reg: Row[];
  rinci?: Row[];
  bukti: Row[];
  pot: Row[];
  nSpp: number;
  /** Byte .smd asli (base64) — dikirim ke server lokal saat ekspor .smd */
  raw?: string;
}

function readTables(buf: Uint8Array): MdbReader {
  const dec = decodeSmd(buf);
  if (!hasJetMagic(dec)) throw new Error("Header hasil dekode bukan Jet4. Ini kemungkinan bukan file .SMD Siskeudes.");
  return new MdbReader(Buffer.from(dec));
}

const tableOf = (rd: MdbReader, n: string): Row[] => {
  try {
    return rd.getTable(n).getData() as Row[];
  } catch {
    return [];
  }
};

/** Parse buffer .smd menjadi record SPP (tanpa menyimpan). */
export function parseSppBuffer(buf: Uint8Array, fileName: string, rawAb?: ArrayBuffer): SppRec {
  const rd = readTables(buf);
  const reg = tableOf(rd, "Ta_SPP");
  if (!reg.length) throw new Error("Tabel Ta_SPP kosong atau tidak ditemukan.");
  let raw = "";
  if (rawAb) {
    try {
      const bin = new Uint8Array(rawAb);
      let s = "";
      for (let i = 0; i < bin.length; i++) s += String.fromCharCode(bin[i]);
      raw = btoa(s);
    } catch {
      raw = "";
    }
  }
  return { name: fileName, reg, rinci: tableOf(rd, "Ta_SPPRinci"), bukti: tableOf(rd, "Ta_SPPBukti"), pot: tableOf(rd, "Ta_SPPPot"), nSpp: reg.length, raw };
}

/** Simpan record SPP ke IndexedDB + cache. */
export async function saveSppFile(rec: SppRec): Promise<void> {
  rememberCache("src:spp", rec);
  await idbPut("sourceFiles", { type: "spp", ...rec, savedAt: Date.now() });
}

/** Baca file SPP dari input, simpan ke IndexedDB + cache, kembalikan record. */
export async function readSppFile(file: File): Promise<SppRec> {
  const ab = await file.arrayBuffer();
  const rec = parseSppBuffer(new Uint8Array(ab), file.name, ab);
  await saveSppFile(rec);
  return rec;
}

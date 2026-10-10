import { Buffer } from "buffer";
import MdbReader from "mdb-reader";
import { decodeSmd, hasJetMagic } from "@/lib/engine/decode";
import { idbPut, rememberCache } from "@/lib/storage/idb";
import type { Row } from "@/types/smd";

export interface PajakFileRec {
  name: string;
  pajak: Row[];
  rinci: Row[];
}

/** Parse buffer .smd menjadi record pajak (tanpa menyimpan). */
export function parsePajakBuffer(buf: Uint8Array, fileName: string): PajakFileRec {
  const dec = decodeSmd(buf);
  if (!hasJetMagic(dec)) throw new Error("Header hasil dekode bukan Jet4. Ini kemungkinan bukan file .SMD Siskeudes.");
  const rd = new MdbReader(Buffer.from(dec));
  const get = (n: string): Row[] => {
    try {
      return rd.getTable(n).getData() as Row[];
    } catch {
      return [];
    }
  };
  const pajak = get("Ta_Pajak");
  if (!pajak.length) throw new Error("Tabel Ta_Pajak kosong atau tidak ditemukan.");
  return { name: fileName, pajak, rinci: get("Ta_PajakRinci") };
}

/** Simpan record pajak ke IndexedDB + cache. */
export async function savePajakFile(pf: PajakFileRec): Promise<void> {
  rememberCache("src:pajak", pf);
  await idbPut("sourceFiles", { type: "pajak", ...pf, savedAt: Date.now() });
}

/** Baca file pajak dari input, simpan, kembalikan record. */
export async function readPajakFile(file: File): Promise<PajakFileRec> {
  const pf = parsePajakBuffer(new Uint8Array(await file.arrayBuffer()), file.name);
  await savePajakFile(pf);
  return pf;
}

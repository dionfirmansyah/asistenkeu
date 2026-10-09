import type { RpdDoc, RpdEntry } from "@/lib/storage/idb";

export interface RpdJsonFile {
  app: "asistenkeu-rpd";
  version: 1;
  exportedAt: string;
  sourceFile?: string;
  doc: RpdDoc;
  entries: RpdEntry[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function checkDoc(d: unknown): RpdDoc {
  if (!isObj(d) || typeof d.id !== "string" || !d.id || typeof d.scope !== "string") {
    throw new Error("Dokumen RPD tidak valid (id/scope hilang).");
  }
  return d as unknown as RpdDoc;
}

function checkEntries(list: unknown): RpdEntry[] {
  if (!Array.isArray(list)) throw new Error("Daftar rencana tidak valid.");
  return list.map((e, i) => {
    if (!isObj(e) || typeof e.id !== "string" || typeof e.key !== "string" || typeof e.scope !== "string") {
      throw new Error(`Baris rencana ke-${i + 1} tidak valid.`);
    }
    const bln = e.bln === null || e.bln === undefined || e.bln === "" ? null : Number(e.bln);
    if (bln !== null && !(bln >= 0 && bln <= 11)) throw new Error(`Bulan baris ke-${i + 1} tidak valid.`);
    return {
      id: e.id, scope: e.scope, docId: typeof e.docId === "string" ? e.docId : undefined,
      key: e.key, bln, vol: Number(e.vol) || 0, amt: Number(e.amt) || 0, ts: Number(e.ts) || Date.now(),
    } as RpdEntry;
  });
}

/** Validasi isi file JSON impor RPD. */
export function parseRpdJson(text: string): RpdJsonFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("File bukan JSON yang valid.");
  }
  if (!isObj(raw) || raw.app !== "asistenkeu-rpd" || !isObj(raw.doc)) {
    throw new Error("Bukan file ekspor RPD ASISTENKEU.");
  }
  return {
    app: "asistenkeu-rpd",
    version: 1,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    sourceFile: typeof raw.sourceFile === "string" ? raw.sourceFile : undefined,
    doc: checkDoc(raw.doc),
    entries: checkEntries(raw.entries),
  };
}

export function buildRpdJson(doc: RpdDoc, entries: RpdEntry[], sourceFile: string): string {
  return JSON.stringify(
    { app: "asistenkeu-rpd", version: 1, exportedAt: new Date().toISOString(), sourceFile, doc, entries },
    null,
    2,
  );
}

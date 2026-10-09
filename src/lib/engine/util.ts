import type { Row } from "@/types/smd";

export const vt = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (ArrayBuffer.isView(v)) return `[binary ${v.byteLength} bytes]`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export const num = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const norm = (v: unknown): string => vt(v).replace(/\s+/g, " ").trim();

/** Bersihkan catatan kaki Siskeudes ("**)") & spasi; aslinya disimpan di *_Asli. */
export const cleanName = (v: unknown): string => norm(v).replace(/\s*\*+\)?\s*$/, "").trim();

export const K = (...p: unknown[]): string => p.map(vt).join("¦");

export const groupBy = <T>(rows: T[], fn: (r: T) => string): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = fn(r);
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
};

export const KIND: Record<string, string> = {
  "4": "PENDAPATAN",
  "5": "BELANJA",
  "6": "PEMBIAYAAN",
};

export const PSEUDO_KEG = "04.2005.00.00.00.";
export const PSEUDO_SUFFIX = ".00.00.00.";

export const isPseudo = (kd: unknown): boolean => vt(kd) === PSEUDO_KEG || vt(kd).endsWith(PSEUDO_SUFFIX);

export type { Row };

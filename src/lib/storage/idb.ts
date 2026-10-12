import { openDB, type IDBPDatabase } from "idb";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function idb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB("smd-rpd-db", 5, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("entries")) db.createObjectStore("entries", { keyPath: "id" });
        if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs", { keyPath: "id" });
        if (!db.objectStoreNames.contains("sourceFiles")) db.createObjectStore("sourceFiles", { keyPath: "type" });
        if (!db.objectStoreNames.contains("sppEdits")) db.createObjectStore("sppEdits", { keyPath: "id" });
        if (!db.objectStoreNames.contains("pajakManual")) db.createObjectStore("pajakManual", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export type DocStatus = "draft" | "progress" | "done";

export interface RpdDoc {
  id: string;
  scope: string;
  name: string;
  judul: string;
  desa: string;
  kecamatan: string;
  tahun: string;
  kades: string;
  kaur: string;
  tanggal: string;
  ts: number;
  updated: number;
  /** Status kanban; dokumen lama tanpa field ini dianggap "draft". */
  status?: DocStatus;
}

export interface RpdEntry {
  id: string;
  scope: string;
  docId?: string;
  key: string;
  bln: number | null;
  vol: number;
  amt: number;
  ts: number;
}

export interface PajakManual {
  id: string;
  scope: string;
  fileName: string;
  noSpp: string;
  noBukti: string;
  kdKeg: string;
  kdRincian: string;
  nilai: number;
  billing: string;
  ts: number;
}

export async function idbAll<T>(store: string, scope: string): Promise<T[]> {
  const db = await idb();
  const all = (await db.getAll(store as never)) as Array<T & { scope: string }>;
  return all.filter((x) => x.scope === scope);
}

export const idbPut = async (store: string, rec: object) => (await idb()).put(store as never, rec as never);
export const idbDel = async (store: string, id: string) => (await idb()).delete(store as never, id);
export const newId = (p: string) =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : p + Date.now() + Math.random();

/**
 * Cache memori sesi (stale-while-revalidate): view menginisialisasi state
 * dari sini agar cat pertama langsung berisi data (tanpa kedip), lalu
 * effect tetap membaca IndexedDB segar dan menyegarkan cache.
 */
const mem = new Map<string, unknown>();

export function peekCache<T>(key: string): T | undefined {
  return mem.get(key) as T | undefined;
}

export function rememberCache<T>(key: string, value: T): void {
  mem.set(key, value);
}

export function bustCache(key: string): void {
  mem.delete(key);
}

import { idb } from "./idb";

const DIR_KEY = "sppJsonDir";

interface FsDirHandle {
  name?: string;
  queryPermission(opts?: { mode: string }): Promise<string>;
  requestPermission(opts?: { mode: string }): Promise<string>;
  getFileHandle(name: string, opts?: { create: boolean }): Promise<{
    createWritable(): Promise<{ write(c: string): Promise<void>; close(): Promise<void> }>;
  }>;
}

const picker = (): undefined | ((opts?: object) => Promise<FsDirHandle>) =>
  (window as unknown as { showDirectoryPicker?: (opts?: object) => Promise<FsDirHandle> }).showDirectoryPicker;

async function ensurePerm(dir: FsDirHandle, ask: boolean): Promise<boolean> {
  try {
    let p = await dir.queryPermission({ mode: "readwrite" });
    if (p === "granted") return true;
    if (p === "prompt" && ask) p = await dir.requestPermission({ mode: "readwrite" });
    return p === "granted";
  } catch {
    return false;
  }
}

/**
 * Tulis file langsung ke folder export/json (File System Access API).
 * Folder dipilih sekali saja lalu diingat di IndexedDB.
 * Kembalikan {ok:true, dir} bila berhasil, {ok:false} bila harus unduh biasa.
 */
export async function writeJsonToFolder(nama: string, isi: string): Promise<{ ok: boolean; dir?: string }> {
  if (!picker()) return { ok: false };
  try {
    const db = await idb();
    const rec = (await db.get("sourceFiles", DIR_KEY)) as { dir?: FsDirHandle } | undefined;
    let dir = rec?.dir;
    if (dir) {
      if (!(await ensurePerm(dir, true))) return { ok: false };
    } else {
      dir = await picker()!({ id: "asistenkeu-export-json", mode: "readwrite" });
      await db.put("sourceFiles", { type: DIR_KEY, dir, savedAt: Date.now() });
    }
    const fh = await dir.getFileHandle(nama, { create: true });
    const w = await fh.createWritable();
    await w.write(isi);
    await w.close();
    return { ok: true, dir: dir.name || "" };
  } catch (e) {
    if (e && typeof e === "object" && (e as { name?: string }).name === "NotFoundError") {
      try {
        (await idb()).delete("sourceFiles", DIR_KEY);
      } catch {
        /* abaikan */
      }
    } else if (!e || (e as { name?: string }).name !== "AbortError") {
      console.warn("Ekspor JSON ke folder gagal:", e);
    }
    return { ok: false };
  }
}

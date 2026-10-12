import { create } from "zustand";
import { Buffer } from "buffer";
import MdbReader from "mdb-reader";
import { idb, idbPut } from "@/lib/storage/idb";
import { buildRabFlat } from "@/lib/engine/rab";
import { decodeSmd, hasJetMagic } from "@/lib/engine/decode";
import { validate } from "@/lib/engine/validate";
import { toast } from "sonner";
import type { RabFlatRow, RabIssues, SmdTables, ValidationIssue } from "@/types/smd";

export type Basis = "Anggaran" | "AnggaranStlhPAK" | "AnggaranPAK";

interface SmdState {
  fileName: string | null;
  tables: SmdTables | null;
  flat: RabFlatRow[];
  issues: RabIssues | null;
  val: ValidationIssue[];
  basis: Basis;
  status: { kind: "idle" | "info" | "error" | "ok"; text: string };
  loadFile: (file: File) => Promise<void>;
  setBasis: (b: Basis) => void;
  clear: () => void;
  restore: () => Promise<void>;
}

export const useSmdStore = create<SmdState>((set) => ({
  fileName: null,
  tables: null,
  flat: [],
  issues: null,
  val: [],
  basis: "AnggaranStlhPAK",
  status: { kind: "idle", text: "" },
  async loadFile(file) {
    set({ status: { kind: "info", text: "Membaca file…" } });
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const decoded = decodeSmd(buf);
      if (!hasJetMagic(decoded)) {
        set({ status: { kind: "error", text: "File tidak dikenali sebagai .SMD Siskeudes." } });
        toast.error("File tidak dikenali sebagai .SMD Siskeudes.", { duration: Infinity });
        return;
      }
      const reader = new MdbReader(Buffer.from(decoded));
      const tables = Object.fromEntries(
        reader.getTableNames().map((n) => [n, reader.getTable(n).getData()]),
      ) as SmdTables;
      const { flat, issues } = buildRabFlat(tables);
      const val = validate(tables, flat, issues);
      // prepare() ala versi lama: Asal, Rincian_Key, Nama_Rincian_Label, _q
      for (const r of flat) {
        r.Asal = /silpa/i.test(r.Nama_Rincian) ? "SILPA" : "BARU";
        r.Rincian_Key = `${r.Kd_Keg}|${r.Kd_SubRinci}`;
        r.Nama_Rincian_Label = r.Pseudo ? "(Pendapatan / Pembiayaan)" : r.Nama_Rincian || "(nama rincian tidak ditemukan)";
        r._q = [r.Kd_Bid, r.Nama_Bidang, r.Kd_Sub, r.Nama_SubBidang, r.Kd_Keg, r.Nama_Kegiatan, r.Kd_Rincian, r.Kd_SubRinci, r.Nama_Rincian, r.Uraian, r.SumberDana, r.Nm_PPTKD, r.Lokasi].join(" ").toLowerCase();
      }
      set({
        fileName: file.name,
        tables,
        flat,
        issues,
        val,
        status: { kind: "ok", text: `Berhasil: ${flat.length} baris RAB terbaca.` },
      });
      toast.success(`File ${file.name} dimuat — ${flat.length} baris RAB terbaca.`);
      // Simpan ke IndexedDB agar tetap ada setelah refresh (store "sourceFiles")
      try {
        await idbPut("sourceFiles", { type: "rab", name: file.name, size: file.size, tables, flat, issues, val, savedAt: Date.now() });
      } catch (e) {
        console.error("Gagal menyimpan file ke IndexedDB", e);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membaca file.";
      set({ status: { kind: "error", text: msg } });
      toast.error(msg, { duration: Infinity });
    }
  },
  setBasis: (basis) => set({ basis }),
  clear: () => {
    set({ fileName: null, tables: null, flat: [], issues: null, val: [], status: { kind: "idle", text: "" } });
    void idb().then((db) => db.delete("sourceFiles", "rab")).catch(() => {});
  },
  restore: async () => {
    try {
      const db = await idb();
      const rec = (await db.get("sourceFiles", "rab")) as
        | { name: string; tables: SmdTables; flat: RabFlatRow[]; issues: RabIssues; val: ValidationIssue[] }
        | undefined;
      if (rec) {
        set({
          fileName: rec.name,
          tables: rec.tables,
          flat: rec.flat,
          issues: rec.issues ?? null,
          val: rec.val ?? [],
          status: { kind: "ok", text: `File ${rec.name} dipulihkan dari IndexedDB (${rec.flat?.length ?? 0} baris RAB).` },
        });
      }
    } catch (e) {
      console.error("Gagal memulihkan file dari IndexedDB", e);
    }
  },
}));

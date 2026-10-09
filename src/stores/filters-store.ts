import { create } from "zustand";
import type { RabFlatRow } from "@/types/smd";

export const FILTERS = [
  { id: "Tahun", label: "Semua tahun" },
  { id: "Jenis", label: "Semua jenis" },
  { id: "Nama_Bidang", label: "Semua bidang" },
  { id: "Nama_SubBidang", label: "Semua sub bidang" },
  { id: "Nama_Kegiatan", label: "Semua kegiatan" },
  { id: "Nama_Rincian_Label", label: "Semua rincian kegiatan" },
  { id: "Nm_PPTKD", label: "Semua PPTKD" },
  { id: "SumberDana", label: "Semua sumber dana" },
  { id: "Asal", label: "Semua asal anggaran" },
] as const;

export type FilterField = (typeof FILTERS)[number]["id"];

interface FiltersState {
  values: Record<string, string>;
  q: string;
  set: (field: FilterField, value: string) => void;
  setQ: (q: string) => void;
  reset: () => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  values: {},
  q: "",
  set: (field, value) => set((s) => ({ values: { ...s.values, [field]: value } })),
  setQ: (q) => set({ q }),
  reset: () => set({ values: {}, q: "" }),
}));

/** Filter murni: satu field equality + teks pencarian (r._q). */
export function applyFilters(rows: RabFlatRow[], values: Record<string, string>, q: string): RabFlatRow[] {
  const sel = Object.entries(values).filter(([, v]) => v);
  const query = q.trim().toLowerCase();
  return rows.filter((r) => {
    for (const [f, v] of sel) if ((r as Record<string, unknown>)[f] !== v) return false;
    return !query || String(r._q ?? "").includes(query);
  });
}

/** Opsi cascade: pool menyempit sesuai pilihan di parent chain. */
export function cascadeOptions(rows: RabFlatRow[], values: Record<string, string>, field: FilterField): string[] {
  const chain: FilterField[] = ["Nama_Bidang", "Nama_SubBidang", "Nama_Kegiatan", "Nama_Rincian_Label"];
  let pool = rows;
  for (const f of chain) {
    if (f === field) break;
    const v = values[f];
    if (v) pool = pool.filter((r) => (r as Record<string, unknown>)[f] === v);
  }
  const vals = [...new Set(pool.map((r) => String((r as Record<string, unknown>)[field] ?? "")))];
  return vals.sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
}

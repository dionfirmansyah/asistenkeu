import type { RabFlatRow } from "@/types/smd";

export interface AggRow {
  name: string;
  total: number;
  semula: number;
  menjadi: number;
  delta: number;
  items: number;
  rincian: Set<string>;
  keg: Set<string>;
  nRincian: number;
  nKeg: number;
}

export function aggregate(rows: RabFlatRow[], field: string, basis: string): AggRow[] {
  const m = new Map<string, AggRow>();
  for (const r of rows) {
    const k = String((r as Record<string, unknown>)[field] ?? "");
    let x = m.get(k);
    if (!x) {
      x = { name: k, total: 0, semula: 0, menjadi: 0, delta: 0, items: 0, rincian: new Set(), keg: new Set(), nRincian: 0, nKeg: 0 };
      m.set(k, x);
    }
    x.total += Number((r as Record<string, unknown>)[basis]) || 0;
    x.semula += r.Anggaran;
    x.menjadi += r.AnggaranStlhPAK;
    x.delta += r.AnggaranPAK;
    x.items++;
    if (!r.Pseudo) {
      if (r.Rincian_Key) x.rincian.add(r.Rincian_Key);
      x.keg.add(r.Kd_Keg);
    }
  }
  return [...m.values()]
    .map((x) => ({ ...x, nRincian: x.rincian.size, nKeg: x.keg.size }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

export const sumOf = (rows: RabFlatRow[], c: keyof RabFlatRow | string): number =>
  rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[c]) || 0), 0);

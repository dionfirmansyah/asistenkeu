import { useMemo, useState, type ReactNode } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { useFiltersStore, applyFilters, cascadeOptions, FILTERS, type FilterField } from "@/stores/filters-store";
import { rp, rpS } from "@/lib/engine/format";
import { groupBy } from "@/lib/engine/util";
import { toCSV, download, copyText } from "@/lib/csv";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DanaBadge } from "@/components/ui/dana-badge";
import { Input } from "@/components/ui/input";
import type { Basis } from "@/stores/smd-store";
import type { RabFlatRow } from "@/types/smd";

const FLAT_MIN: [string, string][] = [
  ["Jenis", "Jenis"], ["Kd_Bid", "Kode Bidang"], ["Nama_Bidang", "Bidang"], ["Kd_Keg", "Kode Kegiatan"], ["Nama_Kegiatan", "Nama Kegiatan"],
  ["Nama_Rincian", "Nama Rincian"], ["No_Urut", "No"], ["Uraian", "Uraian"], ["SumberDana", "Sumber Dana"], ["Nm_PPTKD", "PPTKD"],
  ["JmlSatuanPAK", "Volume"], ["Satuan", "Satuan"], ["HrgSatuanPAK", "Harga Satuan"], ["Anggaran", "Semula"], ["AnggaranPAK", "Perubahan"], ["AnggaranStlhPAK", "Menjadi"],
];

const BASIS_LABEL: Record<Basis, string> = {
  Anggaran: "Semula",
  AnggaranStlhPAK: "Menjadi",
  AnggaranPAK: "Perubahan",
};

const sortKey = (a: [string, RabFlatRow[]], b: [string, RabFlatRow[]]) => a[0].localeCompare(b[0], "id", { numeric: true });

const sum = (rows: RabFlatRow[], f: (r: RabFlatRow) => number) => rows.reduce((s, r) => s + f(r), 0);

/** Filter yang ditampilkan di kartu Struktur (sisanya cukup lewat pohon + pencarian pohon). */
const STRUKTUR_FILTERS = FILTERS.filter((F) => F.id === "Nm_PPTKD" || F.id === "SumberDana");

/** Kedalaman buka-otomatis mengikuti filter hierarki terdalam yang aktif. */
const HIER_DEPTH: { field: FilterField; depth: number }[] = [
  { field: "Jenis", depth: 1 },
  { field: "Nama_Bidang", depth: 2 },
  { field: "Nama_SubBidang", depth: 3 },
  { field: "Nama_Kegiatan", depth: 4 },
  { field: "Nama_Rincian_Label", depth: 5 },
];

export default function StrukturView() {
  const { flat, basis, setBasis, fileName } = useSmdStore();
  const { values, q, set, reset } = useFiltersStore();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    let r = applyFilters(flat, values, q);
    const s = search.trim().toLowerCase();
    if (s) {
      r = r.filter((x) =>
        [x.Kd_Bid, x.Nama_Bidang, x.Kd_Sub, x.Nama_SubBidang, x.Kd_Keg, x.Nama_Kegiatan, x.Nama_Rincian, x.Uraian, x.SumberDana, x.Nm_PPTKD, x.Kd_Rincian]
          .map(String)
          .join(" ")
          .toLowerCase()
          .includes(s),
      );
    }
    return r;
  }, [flat, values, q, search]);
  const [copied, setCopied] = useState(false);
  const searching = search.trim() !== "";
  const keywordActive = searching || q.trim() !== "";
  const openDepth = useMemo(() => {
    if (keywordActive) return Number.POSITIVE_INFINITY;
    let d = 0;
    for (const h of HIER_DEPTH) {
      if (String(values[h.field] ?? "").trim()) d = h.depth;
    }
    if (d === 0 && Object.values(values).some((v) => String(v ?? "").trim())) d = 2;
    return d;
  }, [keywordActive, values]);

  const byJenis = useMemo(() => {
    const m = groupBy(rows, (r) => r.Jenis || "LAINNYA");
    const order = ["PENDAPATAN", "BELANJA", "PEMBIAYAAN"];
    return [...m.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [rows]);

  const exportCsv = () => {
    const base = (fileName ?? "rab").replace(/\.[^.]+$/, "");
    download(`${base}_rab_flat.csv`, toCSV(FLAT_MIN, rows));
    toast.success("Berkas CSV terunduh.");
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Struktur RAB</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Susunan anggaran per bidang, kegiatan, dan rincian.</p>
      </div>
      {/* Filter — sama seperti Dashboard, satu store bersama */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          {STRUKTUR_FILTERS.map((F) => {
            const opts = cascadeOptions(flat, values, F.id);
            return (
              <label key={F.id} className="block space-y-1 text-xs font-medium text-muted-foreground">
                <span>{F.label.replace(/^Semua\s+/i, "")}</span>
                <Select value={values[F.id] === "" || values[F.id] === undefined ? undefined : values[F.id]} onValueChange={(v: string | null) => set(F.id, !v || v === "__all__" || v === "__empty__" ? "" : v)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={F.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{F.label}</SelectItem>
                    {opts.map((o) => (
                      <SelectItem key={o || "__empty__"} value={o === "" ? "__empty__" : o}>
                        {o || "(kosong)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            );
          })}
        </CardContent>
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>
            {rows.length.toLocaleString("id-ID")} dari {flat.length.toLocaleString("id-ID")} baris
          </span>
          <div className="flex items-center gap-2">
            <span>Basis</span>
            <div className="flex gap-1">
              {(Object.keys(BASIS_LABEL) as Basis[]).map((k) => (
                <Button key={k} size="sm" variant={basis === k ? "default" : "outline"} className="h-7 text-xs" onClick={() => setBasis(k)}>
                  {BASIS_LABEL[k]}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>Reset</Button>
          </div>
        </div>
      </Card>
      <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Basis {BASIS_LABEL[basis]}. {rows.length.toLocaleString("id-ID")} item (mengikuti filter di atas).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-72 text-xs"
            placeholder="Cari di pohon RAB… (kegiatan, uraian, sumber dana)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={async () => { const ok = await copyText(toCSV(FLAT_MIN, rows)); setCopied(ok); setTimeout(() => setCopied(false), 1400); if (ok) toast.success("CSV disalin ke clipboard."); else toast.error("Gagal menyalin.", { duration: Infinity }); }}>
            {copied ? "Tersalin" : "Salin CSV"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>Unduh CSV</Button>
        </div>
      </div>

      {byJenis.map(([jenis, jrows]) => (
        <Node key={jenis} title={jenis} amt={sum(jrows, (r) => Number(r[basis]) || 0)} forceOpen={openDepth >= 1}>
          {jenis === "BELANJA" ? (
            // BELANJA: Bidang → Sub Bidang → Kegiatan → Rincian → item
            [...groupBy(jrows.filter((r) => !r.Pseudo), (r) => `${r.Kd_Bid}|${r.Nama_Bidang}`)].sort(sortKey).map(([bk, br]) => {
              const [bc, bn] = bk.split("|");
              return (
                <Node key={bk} title={`${bc} — ${bn}`} amt={sum(br, (r) => Number(r[basis]) || 0)} forceOpen={openDepth >= 2}>
                  {[...groupBy(br, (r) => `${r.Kd_Sub}|${r.Nama_SubBidang}`)].sort(sortKey).map(([sk, sr]) => {
                    const [sc, sn] = sk.split("|");
                    return (
                      <Node key={sk} title={`${sc} — ${sn}`} amt={sum(sr, (r) => Number(r[basis]) || 0)} forceOpen={openDepth >= 3}>
                        {[...groupBy(sr, (r) => r.Kd_Keg)].sort(sortKey).map(([kk, kr]) => (
                          <Node key={kk} title={`${kr[0].ID_Keg || kk} — ${kr[0].Nama_Kegiatan}`} amt={sum(kr, (r) => Number(r[basis]) || 0)} forceOpen={openDepth >= 4}>
                            {[...groupBy(kr, (r) => `${r.Kd_SubRinci}|${r.Nama_Rincian}`)].sort(sortKey).map(([rk, rr]) => {
                              const [rc, rn] = rk.split("|");
                              return (
                                <Node key={rk} title={`${rc} — ${rn}`} amt={sum(rr, (r) => Number(r[basis]) || 0)} forceOpen={openDepth >= 5}>
                                  {rr.map((r) => <ItemRow key={r._id} r={r} basis={basis} forceOpen={keywordActive} />)}
                                </Node>
                              );
                            })}
                          </Node>
                        ))}
                      </Node>
                    );
                  })}
                </Node>
              );
            })
          ) : (
            // PENDAPATAN / PEMBIAYAAN: sedikit baris, tampilkan langsung tanpa level grup
            jrows.map((r) => <ItemRow key={r._id} r={r} basis={basis} forceOpen={keywordActive} />)
          )}
        </Node>
      ))}
      {!rows.length && <p className="text-sm text-muted-foreground">Tidak ada data untuk filter ini.</p>}
      </div>
    </div>
  );
}

function Node({ title, amt, children, forceOpen }: { title: string; amt: number; children?: ReactNode; forceOpen?: boolean }) {
  return (
    <details open={forceOpen} className="rounded-md border bg-card">
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="font-semibold">{rp(amt)}</span>
      </summary>
      <div className="space-y-1 px-3 pb-2">{children}</div>
    </details>
  );
}

function ItemRow({ r, basis, forceOpen }: { r: RabFlatRow; basis: Basis; forceOpen?: boolean }) {
  return (
    <details open={forceOpen} className="rounded-md border border-dashed">
      <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs">
        <span>
          {r.Pseudo ? (
            <><b>{r.Kd_Rincian}</b> {r.Uraian || r.Nama_Rincian_Label}</>
          ) : (
            <><b>{r.No_Urut}.</b> {r.Uraian}</>
          )}
          {r.Asal === "SILPA" && <span className="ml-1 rounded-sm bg-secondary px-1 text-xs">SiLPA</span>}
        </span>
        <span className="font-semibold">{rp(Number(r[basis]) || 0)}</span>
      </summary>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pb-2 text-xs text-muted-foreground md:grid-cols-4">
        <div>Sumber dana: <DanaBadge value={r.SumberDana} emptyLabel="-" /></div>
        <div>PPTKD: <b>{r.Nm_PPTKD || "-"}</b></div>
        <div>Volume: <b>{r.JmlSatuanPAK} {r.Satuan} × {rp(r.HrgSatuanPAK)}</b></div>
        <div>Semula: <b>{rp(r.Anggaran)}</b> · Perubahan: <b>{rpS(r.AnggaranPAK)}</b> · Menjadi: <b>{rp(r.AnggaranStlhPAK)}</b></div>
      </div>
    </details>
  );
}


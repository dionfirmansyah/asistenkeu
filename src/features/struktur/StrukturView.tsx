import { useMemo, useState, type ReactNode } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { useFiltersStore, applyFilters } from "@/stores/filters-store";
import { rp, rpS } from "@/lib/engine/format";
import { groupBy } from "@/lib/engine/util";
import { toCSV, download, copyText } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { DanaBadge } from "@/components/ui/dana-badge";
import { Input } from "@/components/ui/input";
import type { Basis } from "@/stores/smd-store";
import type { RabFlatRow } from "@/types/smd";

const FLAT_MIN: [string, string][] = [
  ["Jenis", "Jenis"], ["Kd_Bid", "Kode Bidang"], ["Nama_Bidang", "Bidang"], ["Kd_Keg", "Kode Kegiatan"], ["Nama_Kegiatan", "Nama Kegiatan"],
  ["Nama_Rincian", "Nama Rincian"], ["No_Urut", "No"], ["Uraian", "Uraian"], ["SumberDana", "Sumber Dana"], ["Nm_PPTKD", "PPTKD"],
  ["JmlSatuanPAK", "Volume"], ["Satuan", "Satuan"], ["HrgSatuanPAK", "Harga Satuan"], ["Anggaran", "Semula"], ["AnggaranPAK", "Perubahan"], ["AnggaranStlhPAK", "Menjadi"],
];

const sortKey = (a: [string, RabFlatRow[]], b: [string, RabFlatRow[]]) => a[0].localeCompare(b[0], "id", { numeric: true });

const sum = (rows: RabFlatRow[], f: (r: RabFlatRow) => number) => rows.reduce((s, r) => s + f(r), 0);

export default function StrukturView() {
  const { flat, basis, fileName } = useSmdStore();
  const { values, q } = useFiltersStore();
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

  const byJenis = useMemo(() => {
    const m = groupBy(rows, (r) => r.Jenis || "LAINNYA");
    const order = ["PENDAPATAN", "BELANJA", "PEMBIAYAAN"];
    return [...m.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [rows]);

  const exportCsv = () => {
    const base = (fileName ?? "rab").replace(/\.[^.]+$/, "");
    download(`${base}_rab_flat.csv`, toCSV(FLAT_MIN, rows));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Basis {basis}. {rows.length.toLocaleString("id-ID")} item (mengikuti filter Dashboard).
        </p>
        <div className="flex gap-2">
          <Input
            className="h-8 w-72 text-xs"
            placeholder="Cari di pohon RAB… (kegiatan, uraian, sumber dana)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={async () => { setCopied(await copyText(toCSV(FLAT_MIN, rows))); setTimeout(() => setCopied(false), 1400); }}>
            {copied ? "Tersalin" : "Salin CSV"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>Unduh CSV</Button>
        </div>
      </div>

      {byJenis.map(([jenis, jrows]) => (
        <Node key={jenis} title={jenis} amt={sum(jrows, (r) => Number(r[basis]) || 0)}>
          {jenis === "BELANJA" ? (
            // BELANJA: Bidang → Sub Bidang → Kegiatan → Rincian → item
            [...groupBy(jrows.filter((r) => !r.Pseudo), (r) => `${r.Kd_Bid}|${r.Nama_Bidang}`)].sort(sortKey).map(([bk, br]) => {
              const [bc, bn] = bk.split("|");
              return (
                <Node key={bk} title={`${bc} — ${bn}`} amt={sum(br, (r) => Number(r[basis]) || 0)}>
                  {[...groupBy(br, (r) => `${r.Kd_Sub}|${r.Nama_SubBidang}`)].sort(sortKey).map(([sk, sr]) => {
                    const [sc, sn] = sk.split("|");
                    return (
                      <Node key={sk} title={`${sc} — ${sn}`} amt={sum(sr, (r) => Number(r[basis]) || 0)}>
                        {[...groupBy(sr, (r) => r.Kd_Keg)].sort(sortKey).map(([kk, kr]) => (
                          <Node key={kk} title={`${kr[0].ID_Keg || kk} — ${kr[0].Nama_Kegiatan}`} amt={sum(kr, (r) => Number(r[basis]) || 0)}>
                            {[...groupBy(kr, (r) => `${r.Kd_SubRinci}|${r.Nama_Rincian}`)].sort(sortKey).map(([rk, rr]) => {
                              const [rc, rn] = rk.split("|");
                              return (
                                <Node key={rk} title={`${rc} — ${rn}`} amt={sum(rr, (r) => Number(r[basis]) || 0)}>
                                  {rr.map((r) => <ItemRow key={r._id} r={r} basis={basis} />)}
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
            jrows.map((r) => <ItemRow key={r._id} r={r} basis={basis} />)
          )}
        </Node>
      ))}
      {!rows.length && <p className="text-sm text-muted-foreground">Tidak ada data untuk filter ini.</p>}
    </div>
  );
}

function Node({ title, amt, children }: { title: string; amt: number; children?: ReactNode }) {
  return (
    <details className="rounded-md border bg-card">
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="font-semibold">{rp(amt)}</span>
      </summary>
      <div className="space-y-1 px-3 pb-2">{children}</div>
    </details>
  );
}

function ItemRow({ r, basis }: { r: RabFlatRow; basis: Basis }) {
  return (
    <details className="rounded-md border border-dashed">
      <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs">
        <span>
          {r.Pseudo ? (
            <><b>{r.Kd_Rincian}</b> {r.Uraian || r.Nama_Rincian_Label}</>
          ) : (
            <><b>{r.No_Urut}.</b> {r.Uraian}</>
          )}
          {r.Asal === "SILPA" && <span className="ml-1 rounded bg-secondary px-1 text-[10px]">SiLPA</span>}
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


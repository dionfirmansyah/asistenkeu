import { useMemo, useState } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { useFiltersStore, applyFilters } from "@/stores/filters-store";
import { toCSV, download, copyText } from "@/lib/csv";
import { rp, rpS } from "@/lib/engine/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const FLAT_MIN: [string, string][] = [
  ["Kd_Bid", "Kode Bidang"], ["Nama_Bidang", "Bidang"], ["Kd_Sub", "Kode Sub Bidang"], ["Nama_SubBidang", "Sub Bidang"],
  ["Kd_Keg", "Kode Kegiatan"], ["Nama_Kegiatan", "Nama Kegiatan"], ["Kd_SubRinci", "Kode Rincian"], ["Nama_Rincian", "Nama Rincian"],
  ["Kd_Rincian", "Kode Jenis Belanja"], ["No_Urut", "No"], ["Uraian", "Uraian"], ["SumberDana", "Sumber Dana"], ["Nm_PPTKD", "PPTKD"],
  ["JmlSatuan", "Volume"], ["Satuan", "Satuan"], ["HrgSatuan", "Harga Satuan"], ["Anggaran", "Anggaran Semula"], ["AnggaranPAK", "Perubahan (PAK)"], ["AnggaranStlhPAK", "Anggaran Setelah PAK"],
];
const NUMERIC = new Set(["JmlSatuan", "HrgSatuan", "Anggaran", "AnggaranPAK", "AnggaranStlhPAK"]);
const PAGE_SIZE = 100;

export default function RabView() {
  const { flat, fileName } = useSmdStore();
  const { values, q: dashQ } = useFiltersStore();
  const [useDashboardFilter, setUseDashboardFilter] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ k: string; dir: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    let r = useDashboardFilter ? applyFilters(flat, values, dashQ) : flat;
    const s = search.trim().toLowerCase();
    if (s) r = r.filter((x) => String(x._q ?? "").includes(s));
    if (sort) {
      r = [...r].sort((a, c) => {
        const x = (a as Record<string, unknown>)[sort.k];
        const y = (c as Record<string, unknown>)[sort.k];
        return (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""), "id", { numeric: true })) * sort.dir;
      });
    }
    return r;
  }, [flat, values, dashQ, useDashboardFilter, search, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const slice = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const cols = FLAT_MIN;
  const onSort = (k: string) => setSort(sort && sort.k === k ? { k, dir: -sort.dir } : { k, dir: 1 });
  const baseName = (fileName ?? "rab").replace(/\.[^.]+$/, "");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm">
          <Checkbox checked={useDashboardFilter} onCheckedChange={(v) => setUseDashboardFilter(!!v)} />
          Ikuti filter Dashboard
        </label>
        <Input className="h-8 w-64 text-xs" placeholder="Cari…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={async () => { setCopied(await copyText(toCSV(cols, rows))); setTimeout(() => setCopied(false), 1400); }}>
          {copied ? "Tersalin" : "Salin CSV"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => download(`${baseName}_rab_flat.csv`, toCSV(cols, rows))}>Unduh CSV</Button>
      </div>
      <p className="text-xs text-muted-foreground">{rows.length.toLocaleString("id-ID")} dari {flat.length.toLocaleString("id-ID")} baris, {cols.length} kolom.</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              {cols.map(([k, l]) => (
                <th key={k} className={`cursor-pointer px-2 py-1 ${NUMERIC.has(k) ? "num" : ""}`} onClick={() => onSort(k)}>
                  {l} {sort?.k === k ? (sort.dir > 0 ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r._id} className="border-t">
                {cols.map(([k]) => (
                  <td key={k} className={`px-2 py-1 ${NUMERIC.has(k) ? "num" : ""}`}>
                    {NUMERIC.has(k)
                      ? k === "AnggaranPAK"
                        ? rpS(Number((r as Record<string, unknown>)[k]))
                        : rp(Number((r as Record<string, unknown>)[k]))
                      : String((r as Record<string, unknown>)[k] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Baris {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} dari {rows.length.toLocaleString("id-ID")}</span>
        <span className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
          <span>Halaman {page + 1} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Berikutnya</Button>
        </span>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { toCSV, download, copyText } from "@/lib/csv";
import { toast } from "sonner";
import { vt } from "@/lib/engine/util";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

export default function RawView() {
  const { tables, fileName } = useSmdStore();
  const names = useMemo(() => Object.keys(tables ?? {}), [tables]);
  const [active, setActive] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = active || names[0] || "";
  const rows = tables?.[current] ?? [];
  const cols = useMemo(() => [...new Set(rows.flatMap((r) => Object.keys(r)))] as string[], [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => Object.values(r).some((v) => vt(v).toLowerCase().includes(s)));
  }, [rows, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const baseName = (fileName ?? "data").replace(/\.[^.]+$/, "");

  if (!names.length) return <p className="text-sm text-muted-foreground">Belum ada data.</p>;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-primary">Data database</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Isi mentah tabel hasil decode file .SMD.</p>
      </div>
      <div className="space-y-2">
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {names.map((n) => (
          <Button key={n} size="sm" variant={n === current ? "default" : "outline"} className="h-7 text-xs" onClick={() => { setActive(n); setPage(0); setSearch(""); }}>
            {n} ({tables?.[n]?.length ?? 0})
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input className="h-8 w-64 text-xs" placeholder="Cari di tabel…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <span className="text-xs text-muted-foreground">{filtered.length.toLocaleString("id-ID")} dari {rows.length.toLocaleString("id-ID")} baris · {cols.length} kolom</span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={async () => { const ok = await copyText(toCSV(cols.map((c) => [c, c] as [string, string]), filtered)); setCopied(ok); setTimeout(() => setCopied(false), 1400); if (ok) toast.success("CSV disalin ke clipboard."); else toast.error("Gagal menyalin.", { duration: Infinity }); }}>{copied ? "Tersalin" : "Salin CSV"}</Button>
        <Button variant="outline" size="sm" onClick={() => { download(`${baseName}_${current}.csv`, toCSV(cols.map((c) => [c, c] as [string, string]), filtered)); toast.success("Berkas CSV terunduh."); }}>Unduh CSV</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-muted text-left">
              {cols.map((c) => <th key={c} scope="col" className="h-10 px-3 text-[13px] font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} className="border-t hover:bg-primary/5">
                {cols.map((c) => <td key={c} className="h-11 max-w-64 truncate px-3">{typeof r[c] === "number" || typeof r[c] === "string" ? String(r[c]) : vt(r[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Menampilkan {slice.length} dari {filtered.length.toLocaleString("id-ID")} baris</span>
        <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
        <span>Halaman {page + 1} / {pages}</span>
        <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Berikutnya</Button>
        </div>
      </div>
      </div>
    </div>
  );
}

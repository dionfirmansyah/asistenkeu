import { useMemo, type ComponentType } from "react";
import { useSmdStore, type Basis } from "@/stores/smd-store";
import { useFiltersStore, applyFilters, cascadeOptions, FILTERS } from "@/stores/filters-store";
import { aggregate, sumOf } from "./aggregate";
import { nfInt0, rp, rpS } from "@/lib/engine/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { villageIdentity } from "@/lib/engine/identity";
import { Building2, Landmark, Wallet, Receipt, TrendingUp, TrendingDown, PiggyBank, Layers } from "lucide-react";

const BASIS_LABEL: Record<Basis, string> = {
  Anggaran: "Semula",
  AnggaranStlhPAK: "Menjadi",
  AnggaranPAK: "Perubahan",
};
const fmtCompact = (n: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function DashboardView() {
  const { flat, basis, setBasis, tables } = useSmdStore();
  const { values, q, set, setQ, reset } = useFiltersStore();

  const rows = useMemo(() => applyFilters(flat, values, q), [flat, values, q]);
  const b = basis;
  const belanja = rows.filter((r) => r.Jenis === "BELANJA");
  const nonP = rows.filter((r) => !r.Pseudo);
  const setN = <T,>(a: T[], f: (x: T) => unknown) => new Set(a.map(f)).size;
  const tB = sumOf(belanja, b);
  const silpa = belanja.filter((r) => r.Asal === "SILPA");
  const semula = sumOf(rows, "Anggaran");
  const delta = sumOf(rows, "AnggaranPAK");
  const menjadi = sumOf(rows, "AnggaranStlhPAK");

  const pp = aggregate(rows, "Nm_PPTKD", b).filter((x) => x.name).slice(0, 10);
  const dana = aggregate(belanja, "SumberDana", b).filter((x) => x.total !== 0);
  const bid = aggregate(rows, "Nama_Bidang", b);
  const jenis = (["PENDAPATAN", "BELANJA", "PEMBIAYAAN"] as const)
    .map((j) => {
      const a = rows.filter((r) => r.Jenis === j);
      return { j, semula: sumOf(a, "Anggaran"), perubahan: sumOf(a, "AnggaranPAK"), menjadi: sumOf(a, "AnggaranStlhPAK") };
    })
    .filter((x) => x.semula || x.perubahan || x.menjadi);
  const top = belanja.slice().sort((a, c) => Math.abs(c[b]) - Math.abs(a[b])).slice(0, 10);
  const changes = aggregate(nonP, "Nama_Kegiatan", "AnggaranPAK").filter((x) => x.delta !== 0).slice(0, 10);

  const ident = villageIdentity(tables, flat[0] ? String(flat[0].Tahun) : "");

  return (
    <div className="space-y-4">
      {/* Identitas desa */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Desa {ident.desa || "-"}</h1>
              <p className="text-sm text-muted-foreground">Kecamatan {ident.kecamatan || "-"} · Tahun Anggaran {ident.tahun || "-"}{ident.statusIdm ? ` · Status IDM: ${ident.statusIdm}` : ""}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{flat.length.toLocaleString("id-ID")} baris RAB</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <div className="rounded-md border bg-card/60 p-2"><div className="text-muted-foreground">Kepala Desa</div><b>{ident.kades || "-"}</b></div>
            <div className="rounded-md border bg-card/60 p-2"><div className="text-muted-foreground">Sekretaris Desa</div><b>{ident.sekdes || "-"}</b></div>
            <div className="rounded-md border bg-card/60 p-2"><div className="text-muted-foreground">Kaur Keuangan</div><b>{ident.kaur || "-"}</b></div>
            <div className="rounded-md border bg-card/60 p-2"><div className="text-muted-foreground">Bendahara Desa</div><b>{ident.bendahara || "-"}</b></div>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
          {FILTERS.map((F) => {
            const opts = cascadeOptions(flat, values, F.id);
            return (
              <label key={F.id} className="block space-y-1 text-xs font-medium text-muted-foreground">
                <span className="uppercase tracking-wide">{F.label.replace(/^Semua\s+/i, "")}</span>
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
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            <span className="uppercase tracking-wide">Cari</span>
            <Input className="h-9 w-full text-sm" placeholder="Ketik kata kunci…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </CardContent>
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>
            {rows.length.toLocaleString("id-ID")} dari {flat.length.toLocaleString("id-ID")} baris
          </span>
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wide">Basis</span>
            <div className="flex gap-1">
              {(Object.keys(BASIS_LABEL) as Basis[]).map((k) => (
                <Button key={k} size="sm" variant={b === k ? "default" : "outline"} className="h-7 text-xs" onClick={() => setBasis(k)}>
                  {BASIS_LABEL[k]}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>Reset</Button>
          </div>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Total RAB" value={rp(sumOf(rows, b))} sub={`Basis ${BASIS_LABEL[b]}`} icon={Receipt} />
        <Kpi label="Total belanja" value={rp(tB)} sub={`${belanja.length.toLocaleString("id-ID")} item`} icon={Wallet} />
        <Kpi label="Belanja dari SiLPA" value={rp(sumOf(silpa, b))} sub={`${tB ? Math.round((sumOf(silpa, b) / tB) * 100) : 0}% dari belanja`} icon={PiggyBank} />
        <Kpi label="Kegiatan" value={setN(nonP, (r) => r.Kd_Keg).toLocaleString("id-ID")} sub={`${setN(nonP.filter((r) => r.Kd_Bid), (r) => r.Kd_Bid)} bidang`} icon={Landmark} />
      </div>

      {/* KPI tambahan */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Rincian kegiatan" value={setN(nonP, (r) => r.Rincian_Key).toLocaleString("id-ID")} sub="Paket unik" icon={Building2} />
        <Kpi label="Sub bidang" value={setN(nonP.filter((r) => r.Kd_Sub), (r) => r.Kd_Sub).toLocaleString("id-ID")} sub="" />
        <Kpi label="PPTKD" value={setN(nonP.filter((r) => r.Nm_PPTKD), (r) => r.Nm_PPTKD).toLocaleString("id-ID")} sub="" />
        <Kpi label="Sumber dana" value={setN(rows.filter((r) => r.SumberDana), (r) => r.SumberDana).toLocaleString("id-ID")} sub="" />
      </div>

      {/* Perubahan */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Perubahan anggaran</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 p-3 text-sm">
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers className="size-3.5" />Semula</div>
            <div className="mt-1 font-semibold">{rp(semula)}</div>
          </div>
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" />Menjadi</div>
            <div className="mt-1 font-semibold">{rp(menjadi)}</div>
          </div>
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{delta >= 0 ? <TrendingUp className="size-3.5 text-emerald-600" /> : <TrendingDown className="size-3.5 text-destructive" />}Bertambah / (berkurang)</div>
            <div className={`mt-1 font-semibold ${delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>{rpS(delta)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Grafik */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Belanja per PPTKD</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ChartContainer config={{ total: { label: "Total", color: "var(--color-primary)" } }}>
              <BarChart data={pp} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={fmtCompact} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => rp(Number(v))} />} />
                <Bar dataKey="total" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Komposisi sumber dana (belanja)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ChartContainer config={{}}>
              <PieChart>
                <Pie data={dana} dataKey="total" nameKey="name" innerRadius={50} outerRadius={90}>
                  {dana.map((_, i) => (
                    <Cell key={i} fill={["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"][i % 5]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => rp(Number(v))} />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Anggaran per bidang</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ChartContainer config={{ total: { label: "Total", color: "var(--color-primary)" } }}>
              <BarChart data={bid.map((x) => ({ ...x, name: x.name.replace(/^BIDANG\s+/i, "") }))} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={fmtCompact} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => rp(Number(v))} />} />
                <Bar dataKey="total" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Pendapatan / Belanja / Pembiayaan</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ChartContainer config={{ semula: { label: "Semula", color: "var(--color-muted-foreground)" }, perubahan: { label: "Perubahan", color: "var(--color-accent-foreground)" }, menjadi: { label: "Menjadi", color: "var(--color-primary)" } }}>
              <BarChart data={jenis}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="j" />
                <YAxis tickFormatter={fmtCompact} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => rp(Number(v))} />} />
                <Bar dataKey="semula" fill="var(--color-muted-foreground)" radius={4} />
                <Bar dataKey="perubahan" fill="var(--color-accent-foreground)" radius={4} />
                <Bar dataKey="menjadi" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabel ringkasan sumber dana & PPTKD */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Sumber dana (belanja)</CardTitle></CardHeader>
          <CardContent className="p-3 overflow-x-auto">
            <GroupTable rows={belanja} field="SumberDana" basis={b} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">PPTKD</CardTitle></CardHeader>
          <CardContent className="p-3 overflow-x-auto">
            <GroupTable rows={rows.filter((r) => r.Nm_PPTKD)} field="Nm_PPTKD" basis={b} />
          </CardContent>
        </Card>
      </div>

      {/* Top belanja */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">10 belanja terbesar</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th>Kegiatan</th><th>Rincian</th><th className="num">Semula</th><th className="num">Perubahan</th><th className="num">Menjadi</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="py-1 pr-2">{r.Nama_Kegiatan}</td>
                  <td className="py-1 pr-2">{r.Nama_Rincian_Label} {r.Asal === "SILPA" && <Badge variant="secondary">SiLPA</Badge>}</td>
                  <td className="num">{rp(r.Anggaran)}</td>
                  <td className="num">{rpS(r.AnggaranPAK)}</td>
                  <td className="num">{rp(r.AnggaranStlhPAK)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Perubahan kegiatan */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Kegiatan dengan perubahan terbesar</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th>Kegiatan</th><th className="num">Semula</th><th className="num">Menjadi</th><th className="num">Δ</th></tr></thead>
            <tbody>
              {changes.map((x) => (
                <tr key={x.name} className="border-t">
                  <td className="py-1 pr-2">{x.name}</td>
                  <td className="num">{rp(x.semula)}</td>
                  <td className="num">{rp(x.menjadi)}</td>
                  <td className={`num ${x.delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>{rpS(x.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon?: ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          {Icon && <Icon className="size-4 text-primary" />}
        </div>
        <div className="truncate text-lg font-semibold" title={value}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function GroupTable({ rows, field, basis }: { rows: Parameters<typeof aggregate>[0]; field: string; basis: Basis }) {
  const agg = aggregate(rows, field, basis).filter((x) => x.name);
  const tot = agg.reduce((s, x) => s + x.total, 0);
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-xs text-muted-foreground"><th>{field === "SumberDana" ? "Sumber dana" : "PPTKD"}</th><th className="num">Rincian</th><th className="num">Kegiatan</th><th className="num">Total</th><th className="num">%</th></tr></thead>
      <tbody>
        {agg.map((x) => (
          <tr key={x.name} className="border-t">
            <td className="py-1 pr-2">{x.name}</td>
            <td className="num">{nfInt0(x.nRincian)}</td>
            <td className="num">{nfInt0(x.nKeg)}</td>
            <td className="num">{rp(x.total)}</td>
            <td className="num">{tot ? Math.round((Math.abs(x.total) / Math.abs(tot)) * 100) : 0}%</td>
          </tr>
        ))}
        <tr className="border-t font-semibold"><td>Total</td><td className="num"></td><td className="num"></td><td className="num">{rp(tot)}</td><td className="num">100%</td></tr>
      </tbody>
    </table>
  );
}



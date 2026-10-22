import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { dibayarkan, rupiah, terbilang } from "./format";
import { KwitansiPengeluaran } from "./KwitansiPengeluaran";
import type { KwitansiData } from "./types";
import "./kwitansi.css";

type CetakTemplate = "spp-1" | "spp-2" | "sptjb";

const TEMPLATE_LABEL: Record<CetakTemplate, string> = {
  "spp-1": "SPP-1",
  "spp-2": "SPP-2",
  sptjb: "SPTJB",
};

const hariIni = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const jamAcak = () => {
  const p = (n: number) => String(n).padStart(2, "0");
  const h = 8 + Math.floor(Math.random() * 7);
  const m = Math.floor(Math.random() * 60);
  // Hari ini, jam acak 08:00–14:59 agar tetap dalam jam kerja
  return `${p(h)}:${p(m)}`;
};
const jamIni = jamAcak;

/**
 * Popup sebelum cetak: isi tanggal & jam "dicetakPada", kabupaten bila kosong,
 * dan potongan (terisi otomatis dari data). Pratinjau ikut terisi langsung.
 * Mendukung satu kwitansi (awal+onCetak) atau banyak (banyak+onCetakBanyak).
 */
export function PratinjauCetak({
  open,
  onOpenChange,
  awal,
  onCetak,
  banyak,
  onCetakBanyak,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  awal?: KwitansiData;
  onCetak?: (d: KwitansiData) => void;
  banyak?: KwitansiData[];
  onCetakBanyak?: (ds: KwitansiData[]) => void;
}) {
  const pertama = banyak?.[0] ?? awal;
  const [tgl, setTgl] = useState(pertama?.tanggal || hariIni());
  const [jam, setJam] = useState(jamIni());
  const [kabupaten, setKabupaten] = useState(pertama?.kabupaten ?? "");
  const [ppn, setPpn] = useState(pertama?.potongan.ppn ?? 0);
  const [pph, setPph] = useState(pertama?.potongan.pph ?? 0);
  const [lainnya, setLainnya] = useState(pertama?.potongan.lainnya ?? 0);
  const [template, setTemplate] = useState<CetakTemplate>("spp-1");

  if (!pertama) return null;

  const terapkan = (d: KwitansiData): KwitansiData => ({
    ...d,
    kabupaten,
    potongan: { ppn, pph, lainnya },
    dicetakPada: `${tgl}T${jam.length === 5 ? jam + ":00" : jam}`,
  });
  const data = terapkan(pertama);
  const semua = banyak ? banyak.map(terapkan) : [data];
  const totalBayar = semua.reduce((s, d) => s + dibayarkan(d), 0);

  const cetak = () => {
    if (banyak && onCetakBanyak) onCetakBanyak(banyak.map(terapkan));
    else if (awal && onCetak) onCetak(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {banyak ? `Cetak ${banyak.length} kwitansi` : `Cetak kwitansi ${pertama.nomor}`}
          </DialogTitle>
          <div className="flex gap-1 mt-1">
            {(["spp-1", "spp-2", "sptjb"] as CetakTemplate[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={template === t ? "default" : "outline"}
                className="text-xs"
                onClick={() => setTemplate(t)}
                disabled={t !== "spp-1"}
                title={t === "spp-1" ? "Template SPP-1 (aktif)" : "Menunggu contoh PDF"}
              >
                {TEMPLATE_LABEL[t]}
              </Button>
            ))}
          </div>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs">Tanggal cetak
                <Input className="mt-1" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
              </label>
              <label className="block text-xs">Jam cetak
                <Input className="mt-1" type="time" value={jam} onChange={(e) => setJam(e.target.value)} />
              </label>
            </div>
            <label className="block text-xs">Kabupaten
              <Input className="mt-1" value={kabupaten} onChange={(e) => setKabupaten(e.target.value.toUpperCase())} />
            </label>
            <div className="space-y-2 border-t pt-2">
              <div className="text-xs font-semibold">Potongan (Rp)</div>
              <label className="block text-xs">PPN<MoneyInput className="mt-1 h-8 text-xs" value={ppn} onChange={setPpn} /></label>
              <label className="block text-xs">PPh<MoneyInput className="mt-1 h-8 text-xs" value={pph} onChange={setPph} /></label>
              <label className="block text-xs">Lainnya<MoneyInput className="mt-1 h-8 text-xs" value={lainnya} onChange={setLainnya} /></label>
            </div>
            <div className="rounded-md border p-2 text-xs">
              <div>Dibayarkan: <b>{rupiah(totalBayar)}</b></div>
              {!banyak && <div className="mt-1 text-muted-foreground">== {pertama.terbilang?.trim() || terbilang(pertama.jumlah)} ==</div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button size="sm" onClick={cetak}>Cetak{banyak ? ` ${banyak.length}` : ""}</Button>
            </div>
          </div>
          <div className="kwt-pratinjau rounded-md border">
            {template === "spp-1" ? (
              banyak ? (
                <>
                  {banyak.map((d) => (
                    <div key={d.nomor} className="mb-2">
                      <KwitansiPengeluaran data={terapkan(d)} tampilkanPenandaCetak={false} />
                    </div>
                  ))}
                  <p className="p-2 text-xs text-muted-foreground border-t pt-2">
                    Total {banyak.length} kwitansi · Rp <b className="tabular-nums">{rupiah(totalBayar)}</b>
                  </p>
                </>
              ) : (
                <KwitansiPengeluaran data={data} />
              )
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <p>Template <b>{TEMPLATE_LABEL[template]}</b> belum tersedia.</p>
                <p className="mt-1">Silakan kirim contoh PDF SPP-{template === "spp-2" ? "2" : "TJB"} agar dapat disesuaikan.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

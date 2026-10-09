import type { Row } from "@/types/smd";
import { vt } from "@/lib/engine/util";
import { villageIdentity } from "@/lib/engine/identity";
import { rekName } from "@/features/rpd/print";
import type { SmdTables } from "@/types/smd";
import type { KwitansiData } from "./types";

const isoTanggal = (v: unknown): string => {
  const d = vt(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};

/** Petakan satu baris Ta_SPPBukti + potongannya menjadi KwitansiData. */
export function buktiKeKwitansi(
  b: Row,
  pot: Row[],
  tables: SmdTables | null,
  namaKegiatan: string,
  kodeKegiatan: string,
): KwitansiData {
  const ident = villageIdentity(tables);
  const jumlah = Number(b.Nilai) || 0;
  const totalPot = pot.reduce((s, p) => s + (Number(p.Nilai) || 0), 0);
  return {
    nomor: vt(b.No_Bukti),
    desa: ident.desa,
    kabupaten: "KOTABARU",
    sumberDana: vt(b.Sumberdana),
    diterimaDari: `KEPALA URUSAN KEUANGAN DESA ${ident.desa}`,
    jumlah,
    uraian: vt(b.Keterangan).replace(/\s+/g, " ").trim(),
    kegiatan: { kode: kodeKegiatan, nama: namaKegiatan },
    rekening: { kode: vt(b.Kd_Rincian), nama: rekName(vt(b.Kd_Rincian)) },
    potongan: { ppn: 0, pph: 0, lainnya: totalPot },
    kota: ident.desa,
    tanggal: isoTanggal(b.Tgl_Bukti),
    pemberi: { jabatan: "KEPALA URUSAN KEUANGAN", nama: ident.kaur },
    penerima: { nama: vt(b.Nm_Penerima) },
  };
}

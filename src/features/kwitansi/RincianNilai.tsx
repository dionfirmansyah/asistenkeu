import { rupiah } from "./format";
import type { KwitansiData } from "./types";

export function RincianNilai({ data, bayar }: { data: KwitansiData; bayar: number }) {
  const baris = (label: string, n: number, total?: boolean) => (
    <div className={"kwt-r" + (total ? " kwt-total" : "")}>
      <span>{label}</span>
      <span>:</span>
      <span className="kwt-v">
        <span>Rp.</span>
        <span>{rupiah(n)}</span>
      </span>
    </div>
  );
  return (
    <div className="kwt-rincian">
      {baris("Nilai", data.jumlah)}
      {baris("Pot Pajak PPN", data.potongan.ppn)}
      {baris("Pot Pajak PPh", data.potongan.pph)}
      {baris("Pot Lainnya", data.potongan.lainnya)}
      {baris("Dibayarkan", bayar, true)}
    </div>
  );
}

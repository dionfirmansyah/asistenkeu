export interface KwitansiData {
  nomor: string;
  desa: string;
  kabupaten: string;
  sumberDana: string;
  diterimaDari: string;
  jumlah: number;
  terbilang?: string;
  uraian: string;
  kegiatan: { kode: string; nama: string };
  rekening: { kode: string; nama: string };
  potongan: { ppn: number; pph: number; lainnya: number };
  kota: string;
  tanggal: string;
  pemberi: { jabatan: string; nama: string };
  penerima: { nama: string };
  dicetakPada?: string;
}

export interface KwitansiPengeluaranProps {
  data: KwitansiData;
  tampilkanPenandaCetak?: boolean;
  className?: string;
}

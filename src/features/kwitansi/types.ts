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

/** Data tingkat SPP (diambil dari file .SMD Register SPP) untuk mencetak template SPP-1/SPP-2/SPTJB. */
export interface SppTemplateData {
  nomor?: string;           // No SPP (mis. 0001/SPP/04.2005/2026)
  desa?: string;
  kabupaten?: string;
  tahun?: number;
  perdes?: { nomor: string; tanggal: string };
  bidang?: string;
  subBidang?: string;
  kegiatan?: string;
  waktu?: string;
  keperluan?: string;
  tanggal?: string;         // "17 Maret 2026"
  pelaksana?: string;
  rincian?: Array<{
    kode: string;
    uraian: string;
    pagu: number;
    lalu: number;
    skrg: number;
    jml: number;
    sisa: number;
  }>;
  ttd?: Array<{ aksi: string; jabatan: string; nama: string }>;
  penerimaDetail?: Array<{
    nama: string;
    alamat: string;
    bukti: string;
    uraian: string;
    rekening: string;
    jumlah: number;
  }>;
  cetak?: { spp1?: string; spp2?: string; sptjb?: string };
}

export interface KwitansiPengeluaranProps {
  data: KwitansiData;
  tampilkanPenandaCetak?: boolean;
  className?: string;
}

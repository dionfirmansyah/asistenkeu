/** Satu baris generik tabel hasil mdb-reader */
export type Row = Record<string, unknown>;

export interface SmdTables {
  Ta_Bidang: Row[];
  Ta_SubBidang: Row[];
  Ta_Kegiatan: Row[];
  Ta_KegiatanOutput: Row[];
  Ta_Lanj_Kegiatan: Row[];
  Ta_RAB: Row[];
  Ta_RABRinci: Row[];
  [table: string]: Row[];
}

export interface RabFlatRow {
  Tahun: string;
  Kd_Desa: string;
  Jenis: string;
  Pseudo: boolean;
  Kd_Bid: string;
  Nama_Bidang: string;
  Kd_Sub: string;
  Nama_SubBidang: string;
  Kd_Keg: string;
  ID_Keg: string;
  Nama_Kegiatan: string;
  Nama_Kegiatan_Asli: string;
  Kd_Rincian: string;
  Kd_SubRinci: string;
  Nama_Rincian: string;
  No_Urut: string;
  Uraian: string;
  Satuan: string;
  SumberDana: string;
  JmlSatuan: number;
  HrgSatuan: number;
  Anggaran: number;
  JmlSatuanPAK: number;
  HrgSatuanPAK: number;
  AnggaranPAK: number;
  AnggaranStlhPAK: number;
  Selisih: number;
  upah_pktd: string;
  Kode_SBU: string;
  tagging_pby: string;
  Nm_PPTKD: string;
  Jbt_PPTKD: string;
  Lokasi: string;
  Waktu: string;
  Keluaran: string;
  Pola_Kegiatan: string;
  Sifat: string;
  Volume_Output: number | null;
  Satuan_Output: string;
  _hasHead: boolean;
  _id?: number;
  _q?: unknown;
  /** Diperkaya di smd-store setelah buildRabFlat (prepare() versi lama) */
  Asal?: "SILPA" | "BARU";
  Rincian_Key?: string;
  Nama_Rincian_Label?: string;
  [k: string]: unknown;
}

export interface RabIssues {
  noKeg: RabFlatRow[];
  noSub: RabFlatRow[];
  noBid: RabFlatRow[];
  noRincianName: RabFlatRow[];
  noRabHeader: RabFlatRow[];
  lanjFallback: number;
}

export interface SmdTablesLike {
  [table: string]: Row[];
}

export interface ValidationIssue {
  level: "PASS" | "ERROR" | "WARNING" | "INFO";
  group: string;
  text: string;
  detail: string[];
}

export interface SppEdit {
  id: string;
  table: string;
  keys: Record<string, unknown>;
  fields: Record<string, { orig: unknown; edit: unknown }>;
  updatedAt: string;
}

import { Barcode } from "./Barcode";
import { KwitansiBaris } from "./KwitansiBaris";
import { RincianNilai } from "./RincianNilai";
import { dibayarkan, rupiah, stempelCetak, tanggalIndonesia, terbilang } from "./format";
import type { KwitansiPengeluaranProps } from "./types";

export function KwitansiPengeluaran({
  data,
  tampilkanPenandaCetak = true,
  className,
}: KwitansiPengeluaranProps) {
  const bayar = dibayarkan(data);
  const kata = (data.terbilang || "").trim() || terbilang(data.jumlah);
  return (
    <main className={"kwt-halaman" + (className ? " " + className : "")}>
      {bayar < 0 && (
        <p className="kwt-negatif no-print">
          Peringatan: total potongan melebihi jumlah — Dibayarkan negatif ({rupiah(bayar)}). Tetap dirender.
        </p>
      )}
      <article className="kwt-kotak">
        <header className="kwt-kop">
          <p className="kwt-kop-instansi">
            PEMERINTAH DESA {data.desa}
            <br />
            KABUPATEN {data.kabupaten}
          </p>
          <h1>TANDA BUKTI PENGELUARAN UANG</h1>
        </header>

        <div className="kwt-nomor-baris">
          <p className="kwt-nomor">NOMOR : {data.nomor}</p>
          <p className="kwt-sumberdana">Sumberdana :&nbsp; {data.sumberDana}</p>
        </div>

        <div className="kwt-diterima">
          <KwitansiBaris label="Sudah diterima dari" nilai={data.diterimaDari} />
        </div>

        <div className="kwt-uang">
          <KwitansiBaris
            label="Uang sebesar"
            nilai={
              <span className="kwt-uang-nilai">
                <span>Rp.</span>
                <span>{rupiah(data.jumlah)}</span>
              </span>
            }
          />
        </div>

        <div className="kwt-terbilang">
          <KwitansiBaris label="" nilai={<span>== {kata} ==</span>} />
        </div>

        <div className="kwt-pembayaran">
          <KwitansiBaris label="Sebagai pembayaran" nilai={data.uraian} />
        </div>

        <div className="kwt-kegiatan">
          <KwitansiBaris
            label="Kegiatan"
            menjorok
            nilai={
              <>
                {data.kegiatan.kode}&nbsp; {data.kegiatan.nama}
              </>
            }
          />
        </div>

        <div className="kwt-rekening">
          <KwitansiBaris
            label="Rek. Belanja"
            menjorok
            nilai={
              <>
                {data.rekening.kode}&nbsp; {data.rekening.nama}
              </>
            }
          />
        </div>

        <div className="kwt-catatan">
          <span>Catatan Keuangan :</span>
          <span>Potongan Pajak, Pajak Daerah dan potongan Lainnya :</span>
        </div>

        <RincianNilai data={data} bayar={bayar} />

        <div className="kwt-ttd">
          <div>
            <p>Yang Memberi,</p>
            <p>{data.pemberi.jabatan}</p>
            <p className="kwt-nama">{data.pemberi.nama}</p>
          </div>
          <div>
            <p>
              {tanggalIndonesia(data.tanggal, data.kota)}
            </p>
            <p>Yang Menerima,</p>
            <p className="kwt-nama">{data.penerima.nama}</p>
          </div>
        </div>

        <Barcode teks={data.nomor} />
      </article>

      {tampilkanPenandaCetak && data.dicetakPada && (
        <p className="kwt-penanda">
          <span className="kwt-penanda-label">Printed by Siskeudes</span>
          <span className="kwt-penanda-waktu">{stempelCetak(data.dicetakPada)}</span>
        </p>
      )}
    </main>
  );
}

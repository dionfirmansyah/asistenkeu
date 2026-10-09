# PRD Komponen React Kwitansi Siskeudes

Oct 8, 2026 · @nightsense

PRD ini menjadi acuan bagi AI untuk membuat komponen React `KwitansiPengeluaran` yang mereproduksi Tanda Bukti Pengeluaran Uang cetakan Siskeudes secara presisi dan siap dicetak di kertas A4.

## Tujuan dan lingkup

Komponen ini mengganti cetakan kwitansi bawaan Siskeudes dengan tampilan web yang bisa diisi dari data JSON dan dicetak langsung dari browser, dengan hasil visual sama seperti contoh `FORMAT_KWITANSI.pdf` (Desa Langkang Lama, Kabupaten Kotabaru, nomor 00001/KWT/04.2005/2026).

- **Termasuk:** satu komponen kwitansi per lembar, pemformatan Rupiah dan terbilang, gaya cetak A4, barcode dekoratif, dan halaman pratinjau untuk mencetak satu atau banyak kwitansi.
- **Tidak termasuk:** koneksi ke database Siskeudes, pembacaan file `.smd`, autentikasi, dan penyimpanan data. Data masuk lewat props.
- **Pengguna:** operator keuangan desa yang mencetak kwitansi untuk arsip dan tanda tangan basah.

## Anatomi kwitansi

Kwitansi terdiri dari 12 zona dalam satu kotak berbingkai hitam, dibaca dari atas ke bawah. Label di kolom kiri dan titik dua (:) di kolom tengah selalu sejajar vertikal pada semua baris isian.

| # | Zona | Teks tetap | Isi dinamis | Gaya |
| --- | --- | --- | --- | --- |
| 1 | Kop | PEMERINTAH DESA, KABUPATEN | nama desa, nama kabupaten | huruf kapital, tebal, rata kiri |
| 2 | Judul | TANDA BUKTI PENGELUARAN UANG | tidak ada | tebal, di tengah kotak, tepat di bawah kop |
| 3 | Garis pemisah | tidak ada | tidak ada | garis horizontal penuh selebar kotak |
| 4 | Nomor dan sumber dana | NOMOR :, Sumberdana : | nomor kwitansi, kode sumber dana (ADD) | nomor dalam kotak ber-border, tebal, di tengah; sumber dana rata kanan |
| 5 | Penerima uang | Sudah diterima dari | nama pemberi (Kepala Urusan Keuangan Desa ...) | teks biasa |
| 6 | Nominal | Uang sebesar, Rp. | jumlah angka, kalimat terbilang | angka tebal; terbilang tebal miring diapit tanda `==` di kiri dan kanan |
| 7 | Pembayaran | Sebagai pembayaran | uraian pembayaran | teks biasa, boleh turun baris |
| 8 | Kegiatan dan rekening | Kegiatan, Rek. Belanja | kode dan nama kegiatan, kode dan nama rekening | label menjorok 11 mm dari label lain, rata kiri; titik dua tetap sejajar dengan baris lain |
| 9 | Catatan keuangan | Catatan Keuangan :, Potongan Pajak, Pajak Daerah dan potongan Lainnya : | tidak ada | teks biasa |
| 10 | Rincian nilai | Nilai, Pot Pajak PPN, Pot Pajak PPh, Pot Lainnya, Dibayarkan | lima angka Rupiah | angka rata kanan; baris Dibayarkan punya garis tipis di atas dan garis tebal di bawah |
| 11 | Tanda tangan | Yang Memberi, KEPALA URUSAN KEUANGAN, Yang Menerima, | kota dan tanggal, nama bendahara, nama penerima | dua kolom; ruang kosong sekitar tiga baris untuk tanda tangan sebelum nama |
| 12 | Barcode | tidak ada | nomor kwitansi | pojok kanan bawah di dalam kotak, dekoratif |

Di luar kotak, tepat di bawah sudut kiri, ada penanda cetak: label hitam kecil berteks putih "Printed by Siskeudes" diikuti tanggal dan jam cetak (contoh 08/10/2026 19.03.19). Penanda ini ikut dicetak seperti aslinya, tetapi bisa dimatikan lewat prop.

Catatan penting dari contoh PDF: teks "KEPALA URUSAN KEUANGAN DESA LANGKANG LAMA" pada zona 5 terpotong di aslinya. Komponen tidak boleh meniru pemotongan itu; teks ditampilkan utuh dan boleh turun baris.

## Model data

Semua isi dinamis berasal dari satu objek `KwitansiData`. Angka Rupiah disimpan sebagai bilangan bulat (`number`), bukan teks berformat, supaya perhitungan dan terbilang tidak bergantung pada tampilan.

```ts
export interface KwitansiData {
  nomor: string;                 // "00001/KWT/04.2005/2026"
  desa: string;                  // "LANGKANG LAMA"
  kabupaten: string;             // "KOTABARU"
  sumberDana: string;            // "ADD"
  diterimaDari: string;          // "KEPALA URUSAN KEUANGAN DESA LANGKANG LAMA"
  jumlah: number;                // 7350000 (juga dipakai sebagai "Nilai")
  terbilang?: string;            // opsional; jika kosong dihitung otomatis
  uraian: string;                // teks "Sebagai pembayaran"
  kegiatan: { kode: string; nama: string };
  rekening: { kode: string; nama: string };
  potongan: { ppn: number; pph: number; lainnya: number };
  kota: string;                  // "LANGKANG LAMA"
  tanggal: string;               // ISO "2026-03-17"
  pemberi: { jabatan: string; nama: string };
  penerima: { nama: string };
  dicetakPada?: string;          // ISO "2026-10-08T19:03:19"
}
```

Contoh data dari kwitansi pada PDF:

```json
{
  "nomor": "00001/KWT/04.2005/2026",
  "desa": "LANGKANG LAMA",
  "kabupaten": "KOTABARU",
  "sumberDana": "ADD",
  "diterimaDari": "KEPALA URUSAN KEUANGAN DESA LANGKANG LAMA",
  "jumlah": 7350000,
  "uraian": "Penghasilan Tetap Kepala Desa bulan Januari s.d. Maret a.n. Joko Waluyo",
  "kegiatan": { "kode": "01.01.01.", "nama": "Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa" },
  "rekening": { "kode": "5.1.1.01.", "nama": "Penghasilan Tetap Kepala Desa" },
  "potongan": { "ppn": 0, "pph": 0, "lainnya": 0 },
  "kota": "LANGKANG LAMA",
  "tanggal": "2026-03-17",
  "pemberi": { "jabatan": "KEPALA URUSAN KEUANGAN", "nama": "DION FIRMANSYAH, S.Kom" },
  "penerima": { "nama": "JOKO WALUYO" },
  "dicetakPada": "2026-10-08T19:03:19"
}
```

## Aturan format dan perhitungan

Semua pemformatan ditulis sebagai fungsi murni di `format.ts` tanpa `toLocaleString`, supaya hasilnya sama di semua browser dan perangkat.

- **Rupiah:** titik sebagai pemisah ribuan, koma sebagai desimal, selalu dua digit di belakang koma. 7350000 menjadi `7.350.000,00`. Bilangan sen tidak didukung; `jumlah` harus bulat.
- **Dibayarkan:** `jumlah - ppn - pph - lainnya`. Nilai ini dihitung komponen, bukan dikirim lewat props. Jika hasilnya negatif, komponen menampilkan peringatan di layar (tidak ikut tercetak) dan tetap merender.
- **Tanggal:** `{kota}, {tanggal} {NamaBulan} {tahun}` dengan hari tanpa angka nol di depan, contoh `LANGKANG LAMA, 17 Maret 2026`. Nama bulan: Januari, Februari, Maret, April, Mei, Juni, Juli, Agustus, September, Oktober, November, Desember.
- **Penanda cetak:** `dd/MM/yyyy HH.mm.ss` dengan titik antara jam, menit, dan detik, contoh `08/10/2026 19.03.19`. Waktu dipakai apa adanya, tanpa konversi zona.
- **Terbilang:** huruf awal setiap kata kapital, diakhiri "Rupiah", lalu diapit ` ==  ` dan `  == `. Jika `terbilang` dikirim lewat props, nilai itu dipakai; jika tidak, dihitung dari `jumlah`.

Contoh keluaran terbilang yang harus lolos uji unit:

| Jumlah | Terbilang |
| --- | --- |
| 0 | Nol Rupiah |
| 1000 | Seribu Rupiah |
| 1000000 | Satu Juta Rupiah |
| 111000 | Seratus Sebelas Ribu Rupiah |
| 2500000 | Dua Juta Lima Ratus Ribu Rupiah |
| 7350000 | Tujuh Juta Tiga Ratus Lima Puluh Ribu Rupiah |

Khusus bilangan 1000 dan 100, bentuknya "Seribu" dan "Seratus", bukan "Satu Ribu" atau "Satu Ratus". Pada satuan juta ke atas tetap "Satu Juta", "Satu Miliar". Fungsi harus menangani sampai triliun.

## Layout dan spesifikasi cetak

Ukuran berikut diukur dari halaman PDF contoh (A4 portrait) dengan toleransi sekitar 1 mm. Kwitansi menempati bagian atas halaman; separuh bawah dibiarkan kosong seperti aslinya.

| Elemen | Spesifikasi |
| --- | --- |
| Kertas | A4 portrait, `@page { size: A4 portrait; margin: 0 }` |
| Kotak kwitansi | lebar 179 mm, tinggi 148,5 mm, jarak 16 mm dari tepi kiri dan 11,5 mm dari tepi atas |
| Garis kotak | hitam, tebal 0,5 mm; garis pemisah di bawah judul pada jarak 19 mm dari tepi atas kotak |
| Font | Arial, Helvetica, sans-serif; isi 9 pt, judul 10 pt; kop dan judul tebal |
| Kolom isian | label mulai 8 mm dari tepi kiri kotak, titik dua pada 42 mm, nilai mulai 46 mm |
| Kotak nomor | border 0,25 mm, lebar 80 mm, mulai 50 mm dari tepi kiri kotak (hampir di tengah); sumber dana rata kanan pada baris yang sama |
| Rincian nilai | label mulai 43 mm dari tepi kiri kotak, titik dua pada 70 mm, "Rp." setelahnya, angka rata kanan pada 108 mm |
| Garis Dibayarkan | garis atas 0,5 mm dan garis bawah 1 mm, panjang sekitar 37 mm dari titik dua sampai tepi kanan angka |
| Tanda tangan | kolom kiri mulai 27 mm, kolom kanan mulai 118 mm dari tepi kiri kotak; jarak peran ke nama sekitar 17 mm |
| Barcode | Code 128 dari nomor kwitansi, lebar sekitar 46 mm, tinggi 5 mm, rata kanan di dalam kotak, 3 mm dari tepi bawah |
| Penanda cetak | di luar kotak, 2 mm di bawahnya; label hitam berteks putih 6 pt, lalu stempel waktu 7 pt |

Aturan cetak:

- Gunakan satuan `mm` dan `pt`, bukan `px` atau `rem`, agar ukuran cetak sama di setiap perangkat.
- Tambahkan `-webkit-print-color-adjust: exact; print-color-adjust: exact` supaya label hitam penanda cetak tidak hilang.
- Setiap kwitansi diberi `break-after: page`; elemen non-cetak (tombol Cetak, pilihan data, peringatan) memakai kelas `no-print` dan disembunyikan lewat `@media print`.
- Teks yang panjang (uraian, nama kegiatan) boleh turun baris di dalam kolom nilainya tanpa memotong dan tanpa mengubah tinggi kotak lebih dari 10 mm.

## Contoh tampilan HTML dan CSS

Berkas `kwitansi-contoh.html` di bawah ini adalah acuan visual statis: jika dibuka di browser dan dicetak ke PDF, posisi setiap baris teks berbeda sekitar 0,5 mm dari PDF contoh (diperiksa dengan membandingkan hasil render keduanya pada 100 dpi). AI memindahkan struktur dan nilai CSS ini ke komponen React, lalu mengganti teks tetap dengan data dari props.

```html
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tanda Bukti Pengeluaran Uang</title>
<style>
  @page { size: A4 portrait; margin: 0; }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, "Liberation Sans", sans-serif;
    font-size: 9pt;
    color: #000;
    background: #d9dce1;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  p, h1 { margin: 0; }

  /* Halaman A4: kwitansi di bagian atas, separuh bawah kosong */
  .halaman {
    position: relative;
    width: 210mm;
    height: 297mm;
    padding: 11.5mm 0 0 16mm;
    margin: 8mm auto;
    background: #fff;
    box-shadow: 0 1mm 4mm rgba(0, 0, 0, .25);
    break-after: page;
  }

  /* Kotak kwitansi */
  .kwitansi {
    position: relative;
    width: 179mm;
    height: 148.5mm;
    border: .5mm solid #000;
  }

  /* 1-3. Kop, judul, garis pemisah */
  .kop {
    height: 19.3mm;
    padding: 2.2mm 0 0 4.4mm;
    border-bottom: .5mm solid #000;
  }
  .kop-instansi { font-weight: 700; line-height: 5.1mm; }
  .kop h1 {
    margin-top: -.45mm;
    font-size: 10pt;
    font-weight: 700;
    line-height: 5mm;
    text-align: center;
  }

  /* 4. Nomor dan sumber dana */
  .nomor-baris {
    position: relative;
    height: 6.6mm;
    margin-top: 1.5mm;
  }
  .nomor {
    width: 80mm;
    height: 6.6mm;
    margin: 0 0 0 49.8mm;
    border: .25mm solid #000;
    font-weight: 700;
    line-height: 6.1mm;
    text-align: center;
  }
  .sumberdana {
    position: absolute;
    top: 0;
    right: 4.8mm;
    line-height: 6.6mm;
  }

  /* 5-8. Baris isian: label | titik dua | nilai */
  .baris {
    display: grid;
    grid-template-columns: 34mm 4.6mm 1fr;
    padding-left: 7.6mm;
    padding-right: 5mm;
    line-height: var(--lh, 6.2mm);
    min-height: var(--lh, 6.2mm);
  }
  .baris .nilai { padding-right: 2mm; }
  .menjorok { padding-left: 18.8mm; grid-template-columns: 22.8mm 4.6mm 1fr; }

  .diterima   { --lh: 6.2mm; margin-top: 1mm; }
  .uang       { --lh: 7.4mm; }
  .uang .nilai { display: flex; justify-content: space-between; width: 38.8mm; font-weight: 700; }
  .terbilang  { --lh: 5.4mm; }
  .terbilang .nilai { font-weight: 700; font-style: italic; }
  .pembayaran { --lh: 6.2mm; margin-top: 2.5mm; }
  .kegiatan   { --lh: 6.2mm; margin-top: 6.3mm; }
  .rekening   { --lh: 5.2mm; }

  /* 9. Catatan keuangan */
  .catatan {
    display: grid;
    grid-template-columns: 34mm 1fr;
    padding-left: 7.6mm;
    margin-top: 2.3mm;
    line-height: 6.2mm;
  }

  /* 10. Rincian nilai */
  .rincian { margin: .95mm 0 0 43.4mm; width: 66mm; }
  .rincian .r {
    display: grid;
    grid-template-columns: 27.4mm 1.3mm 36.8mm;
    line-height: 5.1mm;
  }
  .rincian .v {
    display: flex;
    justify-content: space-between;
    padding: 0 1.3mm 0 .5mm;
  }
  .rincian .total { margin-top: .8mm; }
  .rincian .total .v {
    border-top: .5mm solid #000;
    border-bottom: 1mm solid #000;
    line-height: 5.6mm;
  }

  /* 11. Tanda tangan */
  .ttd {
    display: grid;
    grid-template-columns: 90.6mm 1fr;
    padding-left: 27.4mm;
    margin-top: 2.95mm;
    line-height: 4.9mm;
  }
  .ttd .nama { margin-top: 12.1mm; }

  /* 12. Barcode dekoratif (implementasi nyata: Code 128 dari nomor kwitansi) */
  .barcode {
    position: absolute;
    right: 3.8mm;
    bottom: 1.3mm;
    width: 46mm;
    height: 4.7mm;
    background: repeating-linear-gradient(90deg,
      #000 0 .35mm, #fff .35mm .7mm,
      #000 .7mm 1.4mm, #fff 1.4mm 1.75mm,
      #000 1.75mm 2.1mm, #fff 2.1mm 2.8mm,
      #000 2.8mm 3.15mm, #fff 3.15mm 3.5mm);
  }

  /* Penanda cetak di luar kotak */
  .penanda {
    display: flex;
    align-items: center;
    gap: 1.5mm;
    margin-top: 2.6mm;
  }
  .penanda .label {
    width: 32.5mm;
    padding: .4mm 0 .4mm 4mm;
    background: #000;
    color: #fff;
    font-size: 6pt;
  }
  .penanda .waktu { font-size: 7pt; }

  /* Elemen non-cetak */
  .no-print { display: none; }
  @media screen {
    .no-print { display: block; position: fixed; top: 4mm; right: 4mm; }
    .no-print button { padding: 2mm 5mm; font: inherit; cursor: pointer; }
  }
  @media print {
    body { background: #fff; }
    .halaman { margin: 0; box-shadow: none; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="no-print"><button type="button" onclick="window.print()">Cetak</button></div>

<main class="halaman">
  <article class="kwitansi">

    <header class="kop">
      <p class="kop-instansi">PEMERINTAH DESA LANGKANG LAMA<br>KABUPATEN KOTABARU</p>
      <h1>TANDA BUKTI PENGELUARAN UANG</h1>
    </header>

    <div class="nomor-baris">
      <p class="nomor">NOMOR : 00001/KWT/04.2005/2026</p>
      <p class="sumberdana">Sumberdana :&nbsp; ADD</p>
    </div>

    <div class="baris diterima">
      <span>Sudah diterima dari</span><span>:</span>
      <span class="nilai">KEPALA URUSAN KEUANGAN DESA LANGKANG LAMA</span>
    </div>

    <div class="baris uang">
      <span>Uang sebesar</span><span>:</span>
      <span class="nilai"><span>Rp.</span><span>7.350.000,00</span></span>
    </div>

    <div class="baris terbilang">
      <span></span><span></span>
      <span class="nilai">== Tujuh Juta Tiga Ratus Lima Puluh Ribu Rupiah ==</span>
    </div>

    <div class="baris pembayaran">
      <span>Sebagai pembayaran</span><span>:</span>
      <span class="nilai">Penghasilan Tetap Kepala Desa bulan Januari s.d. Maret a.n. Joko Waluyo</span>
    </div>

    <div class="baris menjorok kegiatan">
      <span>Kegiatan</span><span>:</span>
      <span class="nilai">01.01.01.&nbsp; Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa</span>
    </div>

    <div class="baris menjorok rekening">
      <span>Rek. Belanja</span><span>:</span>
      <span class="nilai">5.1.1.01.&nbsp; Penghasilan Tetap Kepala Desa</span>
    </div>

    <div class="catatan">
      <span>Catatan Keuangan :</span>
      <span>Potongan Pajak, Pajak Daerah dan potongan Lainnya :</span>
    </div>

    <div class="rincian">
      <div class="r"><span>Nilai</span><span>:</span><span class="v"><span>Rp.</span><span>7.350.000,00</span></span></div>
      <div class="r"><span>Pot Pajak PPN</span><span>:</span><span class="v"><span>Rp.</span><span>0,00</span></span></div>
      <div class="r"><span>Pot Pajak PPh</span><span>:</span><span class="v"><span>Rp.</span><span>0,00</span></span></div>
      <div class="r"><span>Pot Lainnya</span><span>:</span><span class="v"><span>Rp.</span><span>0,00</span></span></div>
      <div class="r total"><span>Dibayarkan</span><span>:</span><span class="v"><span>Rp.</span><span>7.350.000,00</span></span></div>
    </div>

    <div class="ttd">
      <div>
        <p>Yang Memberi,</p>
        <p>KEPALA URUSAN KEUANGAN</p>
        <p class="nama">DION FIRMANSYAH, S.Kom</p>
      </div>
      <div>
        <p>LANGKANG LAMA,&nbsp; 17 Maret 2026</p>
        <p>Yang Menerima,</p>
        <p class="nama">JOKO WALUYO</p>
      </div>
    </div>

    <div class="barcode" role="img" aria-label="Barcode nomor kwitansi"></div>
  </article>

  <p class="penanda">
    <span class="label">Printed by Siskeudes</span>
    <span class="waktu">08/10/2026 19.03.19</span>
  </p>
</main>

</body>
</html>
```

Cara memindahkannya ke React:

- Setiap blok HTML (`kop`, `nomor-baris`, `baris`, `rincian`, `ttd`, `barcode`, `penanda`) menjadi satu elemen atau sub-komponen; nama kelas dan nilai CSS dipindahkan apa adanya ke `kwitansi.css`.
- Teks yang ditulis langsung di contoh (nama desa, nomor, jumlah, uraian, nama penanda tangan) diganti dengan nilai dari `KwitansiData` melalui fungsi di `format.ts`.
- Barcode pada contoh hanya pola garis dekoratif dari CSS; di komponen React diganti Code 128 dari nomor kwitansi.
- Tombol Cetak dan kelas `no-print` pindah ke `PratinjauCetak.tsx`, bukan ke komponen kwitansi.
- Jarak antarbaris pada contoh diatur lewat `line-height` dan `margin-top` per baris agar cocok dengan PDF; jangan diganti dengan nilai `rem` atau `gap` bawaan.

## Struktur komponen dan props

Tumpukan teknologi: React 18+ dengan TypeScript, CSS Modules atau satu berkas CSS biasa, tanpa pustaka UI. Satu-satunya dependensi opsional adalah `jsbarcode` untuk barcode; jika tidak tersedia, komponen menggambar barcode dengan SVG sendiri.

```
src/kwitansi/
  KwitansiPengeluaran.tsx   // komponen utama, satu kwitansi
  KwitansiBaris.tsx         // baris label : nilai yang sejajar
  RincianNilai.tsx          // blok Nilai sampai Dibayarkan
  Barcode.tsx               // Code 128 sebagai SVG
  format.ts                 // rupiah(), terbilang(), tanggalIndonesia(), stempelCetak()
  types.ts                  // KwitansiData
  kwitansi.css              // gaya layar dan @media print
  PratinjauCetak.tsx        // halaman demo: daftar data, tombol Cetak
  format.test.ts            // uji unit rupiah dan terbilang
```

Antarmuka komponen utama:

```ts
interface KwitansiPengeluaranProps {
  data: KwitansiData;
  tampilkanPenandaCetak?: boolean; // default true
  className?: string;
}
```

Ketentuan perilaku:

- `KwitansiPengeluaran` murni presentasional: tidak memanggil jaringan, tidak menyimpan state, dan menghasilkan markup yang sama untuk data yang sama.
- Struktur memakai elemen semantik (`header`, `dl` atau `table` untuk baris isian) dan CSS grid, bukan posisi absolut, kecuali barcode dan sumber dana.
- `PratinjauCetak` menerima `KwitansiData[]`, merender satu kwitansi per halaman, dan tombol Cetak memanggil `window.print()`.
- Tidak ada teks hasil dari AI di dalam komponen; semua label tetap ditulis persis seperti di tabel anatomi, termasuk huruf besar dan kecilnya (misalnya "Sudah diterima dari", "Rek. Belanja", "Pot Pajak PPN").

## Kriteria penerimaan

Hasil dinyatakan selesai jika semua butir berikut terpenuhi dengan data contoh pada bagian Model data.

- [ ] Pratinjau cetak (Ctrl+P) menghasilkan satu halaman A4 dengan kotak kwitansi di bagian atas, tanpa header atau footer browser.
- [ ] Semua 12 zona pada tabel anatomi ada, berurutan, dan bertulisan sama persis dengan PDF contoh.
- [ ] Titik dua pada baris isian (Sudah diterima dari sampai Rek. Belanja) sejajar vertikal.
- [ ] Terbilang tampil sebagai `== Tujuh Juta Tiga Ratus Lima Puluh Ribu Rupiah ==` dalam tebal miring.
- [ ] Angka pada rincian nilai rata kanan dan bertitik ribuan; Dibayarkan menunjukkan `Rp. 7.350.000,00` dengan garis tipis di atas dan garis tebal di bawah.
- [ ] Tanggal tampil `LANGKANG LAMA, 17 Maret 2026`; penanda cetak tampil `08/10/2026 19.03.19`.
- [ ] Teks "KEPALA URUSAN KEUANGAN DESA LANGKANG LAMA" tampil utuh, tidak terpotong.
- [ ] Ukuran kotak, margin, dan posisi kolom sesuai tabel layout dengan selisih tidak lebih dari 1 mm saat dicetak ke PDF dan ditumpuk di atas PDF contoh.
- [ ] Semua uji unit `format.test.ts` lulus, termasuk keenam contoh terbilang dan kasus potongan melebihi jumlah.
- [ ] Mengganti data (nama, jumlah, uraian panjang, potongan PPN dan PPh tidak nol) mengubah tampilan tanpa merusak layout.
- [ ] Tidak ada kelas atau gaya yang bergantung pada Tailwind, font eksternal, atau koneksi internet saat mencetak.

### Perintah singkat untuk AI

Tempelkan teks berikut bersama PRD ini dan berkas `FORMAT_KWITANSI.pdf`:

```
Buat komponen React + TypeScript sesuai PRD terlampir. Ikuti struktur berkas,
tipe KwitansiData, aturan format, dan ukuran cetak persis seperti tertulis.
Jangan menambah dependensi selain jsbarcode (opsional). Setelah selesai, jalankan
uji format.test.ts dan jelaskan butir kriteria penerimaan mana yang belum bisa
diperiksa tanpa mencetak ke kertas.
```

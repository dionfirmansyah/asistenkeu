# DESIGN.md — Sistem desain ASISTENKEU (gaya portal Coretax)

Dokumen ini adalah **sumber kebenaran visual** untuk ASISTENKEU. Jika ada konflik antara dokumen ini dan kebiasaan bawaan AI, dokumen ini yang menang.

Arah desain: **portal layanan pemerintah yang resmi, tenang, dan padat informasi**. Bukan landing page, bukan dashboard "SaaS modern".

> Catatan: warna dan ukuran di bawah adalah pendekatan visual yang terinspirasi tampilan portal Coretax DJP, bukan token resmi DJP. Jangan memakai logo, ikon, atau nama "Coretax"/"DJP" di antarmuka.

---

## 0. Cara memakai (untuk AI)

1. Baca seluruh dokumen ini sebelum mengubah apa pun.
2. **Jangan ubah logika bisnis**: nama props, state, hook, struktur data, IndexedDB, parsing .SMD, rumus pajak/rekonsiliasi. Yang diubah hanya markup, class Tailwind, dan komponen presentasi.
3. Utamakan token (`bg-primary`, `text-muted-foreground`, `border-border`) daripada hex. Hex hanya boleh untuk gradien header (lihat 6.1).
4. Ubah gaya dasar di `components/ui/*` (Button, Input, Card, Badge, Table, Tabs, Dialog) sekali, jangan menimpa gaya per halaman.
5. Jangan menambah dependensi baru. Satu-satunya pengecualian: font Inter lokal (lihat 3).
6. Keluarkan **file lengkap** yang siap dipakai, bukan potongan. Sebutkan token baru yang perlu ditambahkan ke CSS.
7. Aplikasi berjalan **100% offline**: tidak boleh ada font, ikon, atau gambar dari CDN.

---

## 1. Prinsip

- **Resmi dan tenang.** Biru navy sebagai identitas, satu aksen kuning tipis, sisanya netral. Warna status (hijau, kuning, merah) hanya untuk makna status.
- **Padat tapi terbaca.** Pengguna adalah bendahara dan Kaur Keuangan yang bekerja dengan angka. Tabel dan form lebih penting daripada hiasan.
- **Datar.** Border tipis menggantikan bayangan. Tanpa kaca blur, tanpa gradien dekoratif, tanpa animasi masuk.
- **Konsisten.** Satu radius untuk kontrol (6px), satu untuk panel (8px). Satu cara untuk setiap pola (kartu, tabel, status, form).
- **Jelas apa yang terjadi.** Setiap layar punya judul, status, dan satu aksi utama.
- **Progressive disclosure.** Tampilkan yang umum dulu; detail teknis masuk ke panel lipat atau dialog.

---

## 2. Token warna

Format: triplet HSL gaya shadcn (Tailwind v3, dipakai sebagai `hsl(var(--primary))`). Jika proyek memakai Tailwind v4 dengan nilai penuh (`oklch(...)` atau hex), konversi ke format yang dipakai proyek; **jangan mencampur format**.

```css
:root {
  --radius: 0.5rem;

  /* Permukaan */
  --background: 218 50% 97%;          /* #f3f6fb  latar halaman */
  --foreground: 216 41% 18%;          /* #1b2a41  teks utama */
  --card: 0 0% 100%;
  --card-foreground: 216 41% 18%;
  --popover: 0 0% 100%;
  --popover-foreground: 216 41% 18%;
  --muted: 217 42% 94%;               /* #e9eef6  header tabel, area sekunder */
  --muted-foreground: 215 18% 43%;    /* #5b6b82  teks pendukung */
  --border: 216 38% 90%;              /* #dbe3ef */
  --input: 216 30% 78%;               /* border input, sedikit lebih tegas */
  --ring: 215 80% 37%;

  /* Identitas */
  --primary: 216 81% 29%;             /* #0e3d85  tombol utama, tautan, tab aktif */
  --primary-foreground: 0 0% 100%;
  --secondary: 217 42% 94%;
  --secondary-foreground: 216 81% 29%;
  --accent: 217 72% 94%;              /* #e6eefb  hover menu, item aktif */
  --accent-foreground: 216 81% 29%;

  /* Merek (header) */
  --brand-900: 219 79% 13%;           /* #071a3d */
  --brand-800: 217 83% 23%;           /* #0a2f6b */
  --brand-700: 216 81% 29%;           /* #0e3d85 */
  --brand-600: 215 80% 37%;           /* #1352a8 */
  --gold: 43 96% 56%;                 /* #fbbf24  hanya garis aksen header */

  /* Status */
  --destructive: 0 74% 42%;           /* #b91c1c */
  --destructive-soft: 0 81% 96%;      /* #fdecec */
  --success: 142 72% 29%;             /* #15803d */
  --success-soft: 140 45% 93%;        /* #e7f6ec */
  --warning: 26 91% 37%;              /* #b45309 */
  --warning-soft: 48 96% 89%;         /* #fef3c7 */
  --info: 216 81% 29%;
  --info-soft: 217 72% 94%;

  /* Grafik */
  --chart-1: 216 81% 29%;
  --chart-2: 199 89% 40%;
  --chart-3: 142 72% 29%;
  --chart-4: 43 96% 48%;
  --chart-5: 0 74% 42%;

  /* Tinggi header (bar utama + garis aksen + breadcrumb) untuk sidebar sticky */
  --header-h: 5.7rem;
}

.dark {
  --background: 218 45% 8%;
  --foreground: 216 30% 92%;
  --card: 218 40% 11%;
  --card-foreground: 216 30% 92%;
  --popover: 218 40% 11%;
  --popover-foreground: 216 30% 92%;
  --muted: 218 30% 16%;
  --muted-foreground: 216 18% 65%;
  --border: 218 30% 20%;
  --input: 218 28% 26%;
  --ring: 213 90% 62%;

  --primary: 213 90% 62%;
  --primary-foreground: 219 79% 10%;
  --secondary: 218 30% 18%;
  --secondary-foreground: 216 30% 92%;
  --accent: 218 35% 18%;
  --accent-foreground: 213 90% 75%;

  --destructive: 0 72% 60%;
  --destructive-soft: 0 45% 16%;
  --success: 142 60% 50%;
  --success-soft: 142 40% 14%;
  --warning: 43 96% 56%;
  --warning-soft: 35 60% 14%;
  --info: 213 90% 70%;
  --info-soft: 218 50% 17%;
}
```

Daftarkan `success`, `warning`, `info`, dan varian `-soft` sebagai warna Tailwind (lewat `tailwind.config` atau `@theme`) agar bisa dipakai sebagai `bg-success-soft text-success`.

**Aturan pemakaian warna**

| Pakai untuk | Token |
|---|---|
| Aksi utama, tautan, tab/menu aktif, judul halaman | `primary` |
| Latar halaman | `background` |
| Panel, kartu, sidebar, dialog | `card` |
| Header tabel, area sekunder, input read-only | `muted` |
| Hover baris/menu, item aktif sidebar | `accent` atau `primary/5` |
| Sesuai, berhasil, saldo cocok | `success` |
| Perlu perhatian, draf, menggantung | `warning` |
| Selisih, error, hapus | `destructive` |
| Informasi netral | `info` |
| Garis aksen header | `gold` (hanya di sana) |

Jangan membuat warna baru di luar tabel ini tanpa alasan tertulis.

---

## 3. Tipografi

- Font: **Inter** (disimpan lokal, mis. `@fontsource-variable/inter`) dengan cadangan sistem. Aplikasi offline, jadi tidak boleh memuat dari Google Fonts.
- Jika tidak ingin menambah paket, pakai tumpukan sistem saja.

```css
html {
  font-family: "Inter Variable", "Inter", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif;
  font-feature-settings: "cv11", "ss01";
  -webkit-font-smoothing: antialiased;
}
.tabular, table td, table th { font-variant-numeric: tabular-nums; }
```

| Peran | Class | Catatan |
|---|---|---|
| Judul halaman | `text-xl font-semibold text-primary` | satu per halaman |
| Judul panel/kartu | `text-base font-semibold` | |
| Isi | `text-sm` | ukuran dasar |
| Tabel | `text-[13px]` | |
| Teks pendukung | `text-xs text-muted-foreground` | |
| Angka ringkasan | `text-2xl font-semibold tabular-nums` | tanpa gradien |
| Nama aplikasi (wordmark) | `text-[15px] font-bold tracking-wide` | satu-satunya teks kapital |

Aturan:
- Bobot yang dipakai: 400, 500, 600, 700.
- **Sentence case** untuk semua label, judul kolom, dan tombol. Jangan memakai huruf kapital semua untuk label atau eyebrow.
- Panjang baris isi maksimal ±75 karakter.
- Semua angka di tabel, form, dan ringkasan memakai `tabular-nums`.

---

## 4. Spasi, bentuk, dan gerak

- Grid dasar **4px**. Jarak umum: 8, 12, 16, 20, 24.
- Padding halaman: `px-4` (mobile), `px-6` (desktop). Lebar konten maksimal `max-w-[1440px]`.
- Padding kartu: `p-4` (mobile), `p-5` (desktop). Jarak antar kartu: `gap-4`.
- Radius: kontrol (tombol, input, select) `rounded-md`; panel, kartu, dialog `rounded-lg`; chip status dan avatar `rounded-full`. **Jangan** memakai `rounded-xl` atau `rounded-2xl`.
- Bayangan: kartu `shadow-sm` atau tanpa bayangan; dialog dan popover `shadow-lg`. Tidak ada `shadow-md`/`shadow-xl` lain.
- Border: `border border-border` 1px.
- Gerak: hanya respons terhadap aksi (buka dialog, ekspansi, toggle), 150 ms, `ease-out`. Tanpa animasi masuk per section, tanpa efek hover berlebihan. Hormati `prefers-reduced-motion`.
- Ikon: `lucide-react`, stroke 1.75; 16px di tombol dan input, 20px di sidebar.

---

## 5. Kerangka aplikasi

```
┌──────────────────────────────────────────────────────────┐
│ Header biru navy (h-14): logo, nama app | file, operator, tema │
├─ garis aksen kuning 3px ─────────────────────────────────┤
│ Breadcrumb putih: Beranda > Halaman        status offline │
├──────────┬───────────────────────────────────────────────┤
│ Sidebar  │ Judul halaman + aksi utama                     │
│ putih    │ ┌ Panel ─────────────────────────────────────┐ │
│ 256px    │ │ judul panel                                │ │
│          │ │ isi (form / tabel / ringkasan)             │ │
│          │ └────────────────────────────────────────────┘ │
└──────────┴───────────────────────────────────────────────┘
Mobile: sidebar diganti bottom bar; header dan breadcrumb tetap.
```

- Latar halaman `bg-background`; semua panel `bg-card`.
- Sidebar `sticky top-[var(--header-h)]`, tinggi `h-[calc(100vh-var(--header-h))]`, `overflow-y-auto`.
- Satu halaman = satu judul + maksimal satu tombol utama (primary) di kanan atas judul.

---

## 6. Komponen

### 6.1 Header

Bar utama biru navy solid-gradien tipis, teks putih. Resep kelas:

```tsx
<header className="sticky top-0 z-20 shadow-sm">
  <div className="bg-gradient-to-r from-[#0a2f6b] via-[#0e3d85] to-[#1352a8] text-white dark:from-[#071a3d] dark:via-[#0a2a5e] dark:to-[#0e3d85]">
    <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4">
      {/* logo: kotak putih rounded-lg size-9, ikon berwarna navy */}
      {/* nama: text-[15px] font-bold tracking-wide + keterangan text-[11px] text-white/70 */}
      {/* kanan: chip file (border-white/20 bg-white/10), pemisah h-8 w-px bg-white/20, avatar bulat + 2 baris teks, tombol tema ghost putih */}
    </div>
  </div>
  <div className="h-[3px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400/0" />
  {/* breadcrumb: lihat 6.2 */}
</header>
```

- Hex di atas = `--brand-800`, `--brand-700`, `--brand-600`, `--brand-900`.
- Tombol ikon di header: `text-white hover:bg-white/15 hover:text-white`.
- Identitas operator: avatar `size-9 rounded-full bg-white/15 ring-1 ring-white/30`, baris 1 nama (`text-[13px] font-semibold`), baris 2 peran dan desa (`text-[11px] text-white/70`).

### 6.2 Breadcrumb

`border-b bg-background`, isi `text-xs text-muted-foreground`. Segmen terakhir `text-foreground font-medium`. Di kanan: titik hijau `size-1.5 rounded-full bg-success` + "100% offline di browser".

### 6.3 Sidebar (desktop)

- `w-64 border-r bg-card`, bisa diciutkan ke `w-16` (hanya ikon + tooltip).
- Judul grup: `px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground` (sentence case, tanpa huruf kapital).
- Item: `flex h-10 items-center gap-3 rounded-md px-3 text-sm text-foreground/80 hover:bg-accent`.
- Item aktif: `bg-accent text-primary font-medium` + penanda kiri `before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-primary`.
- Struktur menu mengikuti yang sudah ada di aplikasi (contoh: Beranda, Penganggaran, Pelaksanaan dengan Rekonsiliasi kas, Kalkulator pajak, Laporan, Pengaturan). Jangan menambah atau mengganti nama menu.

### 6.4 Bottom bar (mobile)

- `fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)]`, tinggi `h-16`, maksimal 5 item.
- Item: ikon 20px di atas label `text-[11px]`; aktif `text-primary font-medium`, tidak aktif `text-muted-foreground`.
- Beri `pb-20` pada konten agar tidak tertutup.

### 6.5 Judul halaman

```tsx
<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
  <div>
    <h2 className="text-xl font-semibold text-primary">Rekonsiliasi kas</h2>
    <p className="mt-0.5 text-sm text-muted-foreground">Cocokkan saldo kas rill dengan saldo SISKEUDES.</p>
  </div>
  <div className="flex gap-2">{/* maksimal satu tombol primary */}</div>
</div>
```

### 6.6 Panel / kartu

Panel dengan bilah judul, ciri khas portal pemerintah:

```tsx
<section className="rounded-lg border bg-card shadow-sm">
  <div className="flex items-center justify-between border-b px-4 py-3 md:px-5">
    <h3 className="text-base font-semibold">Judul panel</h3>
    {/* aksi sekunder opsional */}
  </div>
  <div className="p-4 md:p-5">…</div>
</section>
```

Kartu ringkasan angka: label `text-xs text-muted-foreground`, nilai `text-2xl font-semibold tabular-nums`, status opsional berupa badge. Maksimal 4 per baris; `grid-cols-2 lg:grid-cols-4`. Tanpa gradien, tanpa sparkline dekoratif.

### 6.7 Tombol

| Varian | Kelas inti | Dipakai untuk |
|---|---|---|
| Primary | `bg-primary text-primary-foreground hover:bg-primary/90` | satu aksi utama per layar |
| Outline | `border border-primary bg-transparent text-primary hover:bg-primary/5` | aksi sekunder penting (Ekspor, Unggah ulang) |
| Ghost | `text-foreground/80 hover:bg-accent` | aksi tersier, ikon |
| Destructive | `bg-destructive text-white hover:bg-destructive/90` | hapus, reset data |

- Tinggi: `h-9` (default), `h-8` (kecil, di dalam tabel), `h-10` (mobile, aksi utama).
- Radius `rounded-md`, teks `text-sm font-medium`. Tanpa gradien, tanpa bayangan.
- Fokus: `focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1`.
- Status memuat: spinner kecil di kiri + label berubah ("Menyimpan…"). Tombol dinonaktifkan selama proses.
- Jangan menambahkan panah ("→") di akhir label tombol.

### 6.8 Form

- Label di atas kolom: `text-sm font-medium mb-1.5`. Wajib diisi: tanda `*` merah (`text-destructive`) setelah label.
- Kolom: `h-9 rounded-md border border-input bg-card px-3 text-sm`; fokus `border-ring ring-2 ring-ring/25`; read-only `bg-muted`.
- Teks bantuan: `mt-1 text-xs text-muted-foreground`. Error: `mt-1 text-xs text-destructive` dengan ikon 12px, border kolom `border-destructive`.
- Grid: 1 kolom di mobile, 2 kolom di `md`, maksimal 3 kolom di `xl`. Kelompokkan kolom terkait dalam satu panel dengan judul.
- **Kolom rupiah**: prefiks "Rp" (addon kiri berlatar `muted`), teks rata kanan, `tabular-nums`, pemisah ribuan titik muncul langsung saat mengetik, `inputMode="numeric"`.
- Bilah aksi form di dasar panel: `border-t bg-muted/40 px-5 py-3`, rata kanan, "Batal" (outline) lalu aksi utama. Di mobile bilah ini boleh `sticky bottom-16`.

### 6.9 Tabel

- Bungkus dengan `overflow-x-auto rounded-lg border`. Header `sticky top-0 bg-muted`.
- Header: `h-10 px-3 text-left text-[13px] font-semibold text-foreground` (sentence case). Sel: `h-11 px-3 text-[13px] border-b`.
- Baris: tanpa zebra; hover `hover:bg-primary/5`; baris terpilih `bg-accent`.
- Kolom angka: `text-right tabular-nums`; kolom kode/nomor: `font-medium`; teks panjang: `max-w-[28rem] truncate` dengan `title`.
- Baris total: `bg-muted font-semibold`, border atas 2px.
- Nilai negatif: tanda minus + `text-destructive`.
- Footer: kiri "Menampilkan 1–10 dari 128 data", kanan paginasi (tombol outline `h-8`). Pilihan jumlah baris: 10, 25, 50, 100.
- Aksi per baris: maksimal dua ikon ghost; sisanya masuk menu titik tiga.
- Di mobile, tabel lebar tetap bisa digulir horizontal; kolom pertama `sticky left-0 bg-card`.

### 6.10 Badge status

Pil dengan titik penanda: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium` + titik `size-1.5 rounded-full bg-current`.

| Status | Kelas | Teks |
|---|---|---|
| Sesuai / selesai | `bg-success-soft text-success` | "Sesuai", "Selesai" |
| Selisih / gagal | `bg-destructive-soft text-destructive` | "Selisih Rp 1.200", "Gagal" |
| Draf / menunggu | `bg-warning-soft text-warning` | "Draf", "Menunggu" |
| Info / aktif | `bg-info-soft text-info` | "Final", "Aktif" |
| Netral | `bg-muted text-muted-foreground` | "Tidak aktif" |

Status tidak boleh hanya dibedakan lewat warna: selalu sertakan teks.

### 6.11 Callout / alert

`rounded-md border border-l-4 p-3 text-sm`, warna sesuai status (`bg-*-soft`, `border-l-*`), ikon 16px di kiri, judul singkat `font-medium`, penjelasan satu atau dua kalimat. Untuk peringatan data (mis. selisih kas) tulis angka dan langkah perbaikan.

### 6.12 Tab

Gaya garis bawah, bukan pil: `border-b`, tab `px-4 py-2.5 text-sm text-muted-foreground`, aktif `text-primary font-medium border-b-2 border-primary -mb-px`. Maksimal 6 tab; lebih dari itu pakai sidebar.

### 6.13 Stepper (alur bertahap)

Dipakai untuk alur seperti Rekonsiliasi kas. Lingkaran `size-7`: selesai = `bg-primary text-primary-foreground` dengan ikon centang; aktif = `border-2 border-primary bg-card text-primary`; berikutnya = `bg-muted text-muted-foreground`. Garis penghubung `h-px bg-border` (selesai: `bg-primary`). Gunakan stepper hanya jika isinya memang berurutan. Di mobile tampilkan vertikal atau cukup "Langkah 2 dari 4".

### 6.14 Dialog

`rounded-lg shadow-lg`, lebar `max-w-lg`. Judul `text-base font-semibold`, penjelasan `text-sm text-muted-foreground`, footer `border-t bg-muted/40` dengan aksi di kanan. Dialog hapus wajib menyebut apa yang akan hilang dan bahwa tindakan tidak bisa dibatalkan; tombol destructive memakai kata kerja yang sama dengan pemicunya ("Hapus data").

### 6.15 Keadaan kosong

Ikon 20px dalam lingkaran `size-12 bg-info-soft text-primary`, judul `font-semibold`, satu kalimat penjelasan, **satu** tombol primary. Contoh: "Belum ada file Siskeudes" / "Unggah file .SMD untuk mulai. Data diproses di perangkat ini dan tidak dikirim ke server." / [Unggah file .SMD].

### 6.16 Toast

Kartu putih `rounded-md border shadow-lg` dengan penanda kiri 4px sesuai status. Pesan memakai kata kerja yang sama dengan aksinya ("Disimpan", "Dihapus", "Diekspor"). Hilang otomatis 4 detik; error tidak hilang otomatis.

### 6.17 Ubin menu (Beranda)

Grid `grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4`. Ubin = kartu yang bisa diklik: ikon 20px dalam kotak `size-10 rounded-lg bg-info-soft text-primary`, judul `text-sm font-semibold`, deskripsi `text-xs text-muted-foreground line-clamp-2`; hover `border-primary/40 shadow-sm`; fokus tampak jelas. Isi ubin diambil dari modul yang sudah ada.

---

## 7. Angka, mata uang, tanggal

```ts
export const rp = (n: number) =>
  (n < 0 ? "−" : "") + "Rp\u00A0" + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.abs(n));

export const tgl = (d: Date | string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
```

- Rupiah: `Rp 1.234.567` (titik ribuan, tanpa desimal kecuali memang perlu sen).
- Tanggal: `10 Okt 2026`. Persentase: `11%` (tanpa spasi).
- Angka selalu rata kanan di tabel dan memakai `tabular-nums`.
- Nilai negatif atau selisih diberi tanda minus dan warna `destructive`; nilai nol ditulis `Rp 0`, bukan "-".

---

## 8. Bahasa antarmuka

- Bahasa Indonesia baku yang ramah, kalimat aktif, sentence case.
- Label tombol = kata kerja spesifik: "Simpan", "Unggah file .SMD", "Ekspor PDF", "Hapus data". Hindari "Submit", "OK", "Proses" tanpa objek.
- Kata yang sama untuk aksi yang sama di seluruh alur (tombol "Simpan" menghasilkan toast "Disimpan").
- Error: sebut apa yang salah dan cara memperbaikinya, tanpa permintaan maaf. Contoh: "File bukan format .SMD. Pilih file cadangan dari SISKEUDES."
- Istilah keuangan desa mengikuti SISKEUDES (SPP, SPJ, RAB, RPD, BKU, PKA, Kaur Keuangan). Jangan mengganti dengan sinonim.
- Tanpa emoji di antarmuka. Tanpa tanda "→" di tombol/tautan. Tanpa rangkaian "kata · kata · kata" untuk menyusun label.

---

## 9. Mode gelap

- Gunakan token `.dark` di bagian 2; jangan menulis `dark:` per elemen kecuali untuk header dan toggle ikon.
- Header tetap biru navy (lebih gelap). Garis aksen kuning tetap.
- Badge status memakai varian `-soft` gelap; pastikan kontras teks ≥ 4.5:1.

---

## 10. Aksesibilitas dan responsif

- Kontras teks ≥ 4.5:1; teks besar dan ikon fungsional ≥ 3:1.
- Fokus keyboard selalu terlihat (`focus-visible:ring-2`). Urutan tab mengikuti urutan visual.
- Target sentuh minimal 40×40px di mobile.
- Tombol ikon wajib punya `aria-label` dan `title`.
- Status tidak hanya dibedakan lewat warna.
- Breakpoint: mobile < 768px (bottom bar, 1 kolom), tablet 768–1023px (sidebar ciut, 2 kolom), desktop ≥ 1024px (sidebar penuh).
- Tidak boleh ada gulir horizontal pada `body`; tabel lebar menggulir di wadahnya sendiri.
- Hormati `prefers-reduced-motion`.

---

## 11. Boleh dan jangan

**Boleh**
- Border 1px, bilah judul panel, badge status dengan titik, tabel padat, ubin menu sederhana.
- Satu aksen kuning hanya di garis bawah header.

**Jangan**
- `backdrop-blur`, kaca transparan, gradien dekoratif (selain bar header dan garis aksen), glow, bayangan tebal.
- `rounded-xl`/`rounded-2xl`, kartu dengan ikon besar berwarna-warni, ilustrasi dekoratif.
- Huruf kapital semua untuk label atau eyebrow di atas judul.
- Warna ungu, hijau neon, atau palet baru di luar bagian 2.
- Animasi masuk (fade/slide) per section atau hover berlebihan pada setiap kartu.
- Font atau ikon dari CDN; logo/nama resmi DJP atau Coretax.
- Mengubah logika, props, struktur data, atau nama menu saat merombak tampilan.

---

## 12. Urutan pengerjaan

Kerjakan berurutan; setiap langkah harus tetap bisa dibuild dan dijalankan.

1. **Token dan font**: tempel token bagian 2 ke CSS global, daftarkan warna status, pasang font lokal, set `--header-h`.
2. **Kerangka**: header + garis aksen + breadcrumb (6.1–6.2), sidebar desktop (6.3), bottom bar mobile (6.4).
3. **Komponen dasar** di `components/ui/*`: Button, Input/Select, Card, Badge, Table, Tabs, Dialog, Toast sesuai bagian 6.
4. **Halaman**, satu per satu: Beranda, Rekonsiliasi kas, Kalkulator pajak, RAB/RPD, lalu halaman lain. Tiap halaman: judul (6.5), panel (6.6), tabel (6.9), form (6.8), keadaan kosong (6.15).
5. **QA**: jalankan daftar periksa bagian 13 pada setiap halaman, di terang dan gelap, lebar 375px dan 1280px.

---

## 13. Daftar periksa penerimaan

- [ ] Header navy + garis aksen kuning + breadcrumb tampil di semua halaman
- [ ] Hanya satu `h2` judul halaman dan maksimal satu tombol primary per layar
- [ ] Semua warna berasal dari token; tidak ada hex baru selain gradien header
- [ ] Radius hanya 6px (kontrol) dan 8px (panel); tidak ada `rounded-xl+`
- [ ] Tidak ada `backdrop-blur`, gradien dekoratif, atau animasi masuk
- [ ] Angka rata kanan, `tabular-nums`, format `Rp 1.234.567`
- [ ] Status memakai badge dengan teks, bukan hanya warna
- [ ] Label dan tombol sentence case, kata kerja spesifik, bahasa Indonesia
- [ ] Mobile: bottom bar muncul, tidak ada gulir horizontal pada body, target sentuh ≥ 40px
- [ ] Mode gelap terbaca (kontras ≥ 4.5:1) dan fokus keyboard terlihat
- [ ] Tidak ada permintaan jaringan ke CDN (font, ikon, gambar)
- [ ] Logika bisnis, props, dan struktur data tidak berubah

---

## 14. Templat prompt

Tempel ke AI beserta file yang ingin dirombak:

```
Baca DESIGN.md terlampir dan rombak tampilan [nama file/halaman] agar sesuai.

Aturan:
- Jangan ubah logika, props, state, atau struktur data. Hanya markup dan class.
- Pakai token dari DESIGN.md; jangan membuat warna baru.
- Jika ada konflik antara kebiasaanmu dan DESIGN.md, DESIGN.md yang menang.
- Berikan file lengkap yang siap dipakai dan daftar token/komponen baru yang perlu ditambahkan.
- Di akhir, centang daftar periksa bagian 13 dan sebutkan yang belum terpenuhi.
```

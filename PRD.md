# PRD — Migrasi ASISTENKEU ke React + TypeScript

> **Status:** Draft v1 — 2026-10-08
> **Sumber kebenaran perilaku saat ini:** `docs/CONTRACT.md`, `docs/ARCHITECTURE.md`, kode `js/`.
> **Referensi dokumentasi kode:** semua penulisan kode WAJIB mengacu ke dokumen terbaru via
> [Context7](https://context7.com/) (MCP Context7: `resolve-library-id` → `get-library-docs`)
> untuk React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Lucide, dan Recharts. **Jangan
> menulis kode dari ingatan** — API shadcn/ui sering berubah.

---

## 1. Latar Belakang & Tujuan

ASISTENKEU adalah aplikasi web client-side (offline-first) untuk menganalisis data
Siskeudes (`.SMD`). Saat ini dibangun dengan Vanilla JS tanpa bundler, global state (`S`),
registry view, dan event listener imperatif. Masalah: sulit diskalakan, tidak ada
type-safety, tidak ada komponen reusable, styling tersebar.

**Tujuan:**

1. Menulis ulang UI dengan **React 19 + TypeScript (strict)** dan **Vite**.
2. **Tailwind CSS v4** sebagai design system; **shadcn/ui** untuk komponen; **Lucide** untuk ikon.
3. **Mempertahankan 100% perilaku fungsional** — parsing `.SMD`, filter dashboard, RPD,
   sisa anggaran, register SPP (overlay edit), pajak, rekon, validasi, ekspor — dan bahwa
   **data .SMD tidak pernah meninggalkan browser**.
4. Kode rapi & maintainable: struktur folder jelas, tiap fitur = modul mandiri,
   logika murni (engine) terpisah dari React.

**Non-tujuan:** backend/server, akun pengguna, multi-user, sinkronisasi cloud, mengubah
struktur file `.SMD`, mengganti format ekspor.

---

## 1.5 Konteks Produk (dari ASISTENKEU lama — lengkap)

ASISTENKEU = "Asisten Keuangan Desa": aplikasi web client-side (offline-first) untuk
Kaur Keuangan / Bendahara Desa yang bekerja dengan data **Siskeudes (.SMD)**. Fitur:
analisis RAB, penyusunan RPD, register SPP, kalkulator pajak, rekonsiliasi kas, validasi.
File `.SMD` diproses **murni di browser** — tidak pernah dikirim ke server.

**Struktur file `.SMD` (hasil bedah — jangan diubah tanpa bukti):**

```
Level 1  Bidang        Ta_Bidang         (Kd_Desa, Kd_Bid)
Level 2  Sub Bidang    Ta_SubBidang      (Kd_Desa, Kd_Sub)  → Kd_Bid
Level 3  Kegiatan      Ta_Kegiatan       (Kd_Desa, Kd_Keg)  → Kd_Sub, Nm_PPTKD
Level 4  Rincian Keg.  Ta_KegiatanOutput (Kd_Desa, Kd_Keg, No_ID)  ← nama rincian = Nama_Paket
Level 5/6 Jenis/Sub    Ta_RAB            (Kd_Desa, Kd_Keg, Kd_Rincian, Kd_SubRinci)
Level 7  Item          Ta_RABRinci       (… + No_Urut)

Kunci penghubung Level 4:  Ta_RAB.Kd_SubRinci == Ta_KegiatanOutput.No_ID
(Kd_SubRinci pada RAB BUKAN "sub rincian belanja", melainkan nomor rincian kegiatan.)

Semantik PAK: AnggaranPAK = selisih (+/-); AnggaranStlhPAK = Anggaran + AnggaranPAK.
Data SiLPA punya Anggaran = 0 dan AnggaranPAK > 0.
```

**Aturan keras (diturunkan dari CONTRACT.md — sekarang berlaku apa adanya):**

1. Client-side murni, offline-first, tanpa backend. Data `.SMD` tidak boleh keluar dari
   browser (tanpa fetch ke API eksternal; asset statis idealnya self-host).
2. **IndexedDB adalah database utama** (lihat §4.1); localStorage hanya state kecil.
3. Bahasa UI & teks antarmuka: **Indonesia**.
4. `src/lib/engine/*` bebas React & DOM (`document.*` dilarang) — bisa diuji Vitest.
5. Semua uang tampil via `rp()`/`nf0()` (id-ID); input uang lewat helper bersama.
6. Jangan membuat API/field baru tanpa bukti dari file `.SMD` atau kode lama.
7. Sebelum klaim selesai: `npm run build` bersih, `npm test` hijau, console preview
   kosong, alur nyata dengan `dataset/RAB_20260923.smd` (jika folder itu disalin ke
   project baru).

**Catatan:** `AGENTS.md`, `docs/CONTRACT.md`, `docs/ARCHITECTURE.md` milik project lama
**tidak perlu dibaca lagi** bila mengerjakan project baru dari nol berbasis PRD ini.

---

## 2. Tech Stack (dikunci)

| Area | Pilihan | Catatan Context7 |
|---|---|---|
| Build | Vite 7 (`vite`, `@vitejs/plugin-react`) | library "Vite" |
| UI | React 19 + TypeScript strict | library "React" |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | library "Tailwind CSS" |
| Komponen | shadcn/ui (CLI `npx shadcn@latest`) | library "shadcn/ui" |
| Ikon | `lucide-react` | library "Lucide" |
| Grafik | shadcn/ui Chart (Recharts) | library "Recharts" |
| State global | Zustand (kecil, tanpa boilerplate) | library "Zustand" |
| Router | State-based view (sama seperti sekarang) ATAU `react-router` — keputusan: **state view** untuk paritas, mudah diarahkan ke router nanti | — |
| IndexedDB | `idb` | library "idb" |
| Parsing .SMD | `mdb-reader` (sama, port npm) | — |
| Lint/format | ESLint 9 + Prettier | — |
| Uji | Vitest (engine murni) + `node --check` ekuivalen via `tsc --noEmit` | library "Vitest" |

Semua pencarian dokumen: gunakan Context7 MCP, contoh:

```
resolve-library-id("tailwindcss") → get-library-docs(id, topic="v4 vite plugin")
resolve-library-id("shadcn/ui")  → get-library-docs(id, topic="button card table dialog")
```

---

## 3. Arsitektur Target

```
src/
  main.tsx                # bootstrap React + theme provider
  App.tsx                 # shell: TopBar, Sidebar/BottomNav, view switch
  index.css               # @import "tailwindcss"; token tema (dark/light)
  types/smd.ts            # tipe baris Ta_* hasil bedah (lihat §6)
  lib/
    engine/
      decode.ts           # decodeSmd (XOR) — murni, dari js/core/engine.js
      rab.ts              # buildRabFlat — murni
      validate.ts         # validate — murni
      format.ts           # rp(), nf0(), dsb.
      index.ts
    storage/
      idb.ts              # wrapper idb (docs, entries, sppEdits, file)
      local.ts            # localStorage keys asistenkeu_*
    utils.ts              # cn() helper shadcn
  stores/
    smd-store.ts          # file aktif, tables, flat, avail/basis, status
    theme-store.ts
    filters-store.ts      # 10 filter dashboard (cascade, pindahkan dari state.js)
  features/               # SATU folder per fitur = view + komponen + store kecil
    dashboard/
      DashboardView.tsx
      components/{KpiCards,AggChart,FlatTable}.tsx
      aggregate.ts        # logika agregasi (murni)
    struktur/  rab/  raw/  validasi/
    rpd/       rpd-export/  sisa/  spp/  pajak/  rekon/
  components/ui/          # hasil generate shadcn (button, card, table, dialog, …)
  components/layout/      # AppShell, Sidebar, BottomNav, MoreSheet, ThemeToggle
tools/spp_patch.mjs       # TETAP (Node, odbc) — tidak dibahas di PRD ini
public/                   # favicon dll
```

Prinsip:

- `lib/engine/*` **bebas React & DOM** → bisa diuji Vitest (mengikuti aturan lama: engine
  murni).
- Komponen fitur baca store (Zustand selector) — tidak ada prop-drilling data besar.
- Semua angka tampil via `rp()`/`nf0()` (id-ID). Input uang lewat komponen `MoneyInput`.
- Semua teks UI berbahasa Indonesia. Komentar kode boleh Indonesia/English konsisten.

---

## 4. Keputusan Teknis Utama

1. **View switching** memakai state (`activeView`) seperti `showView()` sekarang — paritas
   1:1, navigasi mobile (bottom-nav + more-sheet) tinggal dipetakan ke state yang sama.
2. **Chart.js → Recharts** (via komponen `Chart` shadcn). Agregasi (`aggregate()`)
   dipindahkan apa adanya ke `features/dashboard/aggregate.ts`.
3. **Tema dark/light** via class `dark` di `<html>` + `theme-store` (localStorage
   `asistenkeu_theme`) — setara `data-theme` lama.
4. **Penyimpanan sama:** IndexedDB untuk data file/RPD/SPP edits; localStorage untuk
   state kecil (`asistenkeu_pajak_v1`, `asistenkeu_rekon_v1`, tema).

### 4.1 Lapisan data (WAJIB)

- **IndexedDB adalah database utama aplikasi.** Semua data besar/terstruktur disimpan di
  IndexedDB (via `idb` di `src/lib/storage/idb.ts`): data file `.SMD` yang dipulihkan saat
  reload, metadata & item RPD (store `docs`, `entries`), overlay edit SPP (`sppEdits`).
- **localStorage hanya untuk state kecil fitur** (`asistenkeu_pajak_v1`,
  `asistenkeu_rekon_v1`, `asistenkeu_theme`). Dilarang menyimpan data `.SMD` / RPD di
  localStorage (batas ±5MB).
- Tidak ada server storage, cookie, atau pengiriman data ke internet.
5. **File `.SMD` tidak pernah di-upload** — decode XOR + `mdb-reader` tetap di browser.
6. **Ekspor JSON edit SPP** tetap lewat File System Access API dengan fallback unduhan.

---

## 5. Pemetaan Fitur Lama → Baru

| Fitur lama | Modul baru | Komponen shadcn utama | Ikon Lucide |
|---|---|---|---|
| Dashboard | `features/dashboard` | Card, Chart, Table, Select, Badge | LayoutDashboard |
| Struktur RAB | `features/struktur` | Tree (kustom, pakai ChevronRight), Card | FolderTree |
| Rincian Belanja (rab) | `features/rab` | Table, Button (CSV), Input | List |
| Rencana Penggunaan (rpd) | `features/rpd` | Form, Input, Dialog, Table, Tabs | ClipboardList |
| Ekspor RPD | `features/rpd-export` | Button, Card, DropdownMenu | FileDown |
| Sisa Anggaran | `features/sisa` | Card, Table, Progress | PiggyBank |
| Register SPP | `features/spp` | Table, Dialog, Checkbox, Badge, Tooltip | ReceiptText |
| Rekap Pajak | `features/rekap-pajak` | Table, Dialog, Combobox, MoneyInput | Receipt |
| Rekonsiliasi Kas | `features/rekon` | Form, Table, Textarea, Button | Scale |
| Kalkulator Pajak | `features/pajak` | Form, Input, Select, Card, Separator | Percent |
| Validasi | `features/validasi` | Alert, Badge, Table, Collapsible | ShieldCheck |
| Data Database (raw) | `features/raw` | Tabs, Table, ScrollArea | Database |

---

## 6. Tipe Data (`src/types/smd.ts`)

Hasil bedah file `.SMD` — **jangan mengubah relasi tanpa bukti dari file** (lihat banner di
`js/core/engine.js`).

```ts
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

/** 1 item RAB rata = 1 baris (hasil buildRabFlat) */
export interface RabFlatRow {
  Kd_Desa: string;
  Kd_Bid: string;
  Nm_Bidang: string;
  Kd_Sub: string;
  Nm_SubBidang: string;
  Kd_Keg: string;
  Nm_Kegiatan: string;
  Nama_Kegiatan_Asli: string;
  Nama_Paket: string;
  Kd_Rincian: string;
  Kd_SubRinci: string;
  Kd_Jenis: string;
  Anggaran: number;        // Anggaran murni
  AnggaranPAK: number;     // selisih (+/-)
  AnggaranStlhPAK: number; // "Menjadi"
  // ...field lain sesuai engine.js
}

export interface RabBasis {
  Anggaran: number;
  AnggaranPAK: number;
  AnggaranStlhPAK: number;
}

/** Overlay edit register SPP (disimpan di IndexedDB "sppEdits") */
export interface SppEdit {
  id: string;
  table: string;
  keys: Record<string, unknown>;
  fields: Record<string, { orig: unknown; edit: unknown }>;
  updatedAt: string;
}
```

---

## 7. Inti Engine (port langsung, tetap murni)

`src/lib/engine/decode.ts`:

```ts
const KEY_EVEN = Uint8Array.from([0xbd, 0xde, 0xef, 0xf7, 0xfb, 0x7d, 0x3e, 0x9f, 0xcf, 0xe7, 0xf3, 0xf9, 0xfc, 0xfe, 0xff, 0xff]);
const KEY_ODD = new Uint8Array(16).fill(0xff);
const KEYSTREAM = new Uint8Array([...KEY_EVEN, ...KEY_ODD]);

/** XOR decode file .SMD (port persis js/core/engine.js#decodeSmd) */
export function decodeSmd(raw: Uint8Array): Uint8Array {
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ KEYSTREAM[i % 32];
  return out;
}
```

`src/lib/engine/format.ts`:

```ts
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
export const nf0 = (n: number) => nf.format(Math.round(n || 0));
export const rp = (n: number) => "Rp " + nf0(n);
export const rpS = (n: number) => (n < 0 ? "-Rp " : "Rp ") + nf0(Math.abs(n));
```

`buildRabFlat` dan `validate` di-port apa adanya dengan signature:

```ts
export function buildRabFlat(t: SmdTables): { flat: RabFlatRow[]; issues: RabIssues };
export function validate(t: SmdTables, flat: RabFlatRow[]): ValidationIssue[];
```

---

## 8. State (Zustand)

`src/stores/smd-store.ts`:

```ts
import { create } from "zustand";

interface SmdState {
  fileName: string | null;
  tables: SmdTables | null;
  flat: RabFlatRow[];
  basis: "Anggaran" | "AnggaranStlhPAK" | "AnggaranPAK";
  status: { kind: "idle" | "info" | "error" | "ok"; text: string };
  loadFile: (file: File) => Promise<void>;
  clear: () => void;
}

export const useSmdStore = create<SmdState>((set) => ({
  fileName: null,
  tables: null,
  flat: [],
  basis: "AnggaranStlhPAK",
  status: { kind: "idle", text: "" },
  async loadFile(file) {
    set({ status: { kind: "info", text: "Membaca file…" } });
    const buf = new Uint8Array(await file.arrayBuffer());
    const decoded = decodeSmd(buf);
    const reader = new MdbReader(decoded);
    const tables = Object.fromEntries(reader.getTableNames().map((n) => [n, reader.getTable(n).getData()])) as SmdTables;
    const { flat } = buildRabFlat(tables);
    set({ fileName: file.name, tables, flat, status: { kind: "ok", text: `Berhasil: ${flat.length} baris RAB` } });
  },
  clear: () => set({ fileName: null, tables: null, flat: [], status: { kind: "idle", text: "" } }),
}));
```

Filter dashboard (10 filter cascade, dulu di `js/core/state.js#applyFilters`) →
`stores/filters-store.ts`; komponen memfilter `flat` via selector. **Jangan** menyimpan
hasil filter — cukup state filter, turunan dihitung memo `useMemo`.

---

## 9. Setup Inti (ringkasan — ikuti Context7)

```bash
npm create vite@latest asistenkeu -- --template react-ts
cd asistenkeu
npm i tailwindcss @tailwindcss/vite lucide-react zustand idb mdb-reader
npm i -D vitest
npx shadcn@latest init
npx shadcn@latest add button card table dialog badge select input form tabs alert progress tooltip scroll-area dropdown-menu separator sonner
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`src/index.css` (Tailwind v4):

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* token shadcn lainnya mengikuti docs resmi */
}
```

Contoh view fitur kecil — Validasi:

```tsx
export function ValidasiView() {
  const tables = useSmdStore((s) => s.tables);
  const issues = useMemo(() => (tables ? validate(tables, useSmdStore.getState().flat) : []), [tables]);
  if (!tables) return <EmptyState icon={ShieldCheck} title="Belum ada file" hint="Upload .SMD dulu" />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Validasi Data</h2>
      {issues.length === 0 ? (
        <Alert><ShieldCheck className="size-4" /><AlertDescription>Tidak ada masalah ditemukan.</AlertDescription></Alert>
      ) : (
        <Table>{/* ... */}</Table>
      )}
    </div>
  );
}
```

---

## 10. Rencana Migrasi (bertahap, tiap fase bisa dirilis)

| Fase | Isi | Kriteria selesai |
|---|---|---|
| 0 | Scaffold Vite + Tailwind + shadcn + tema + AppShell (sidebar, bottom-nav, header, dropzone) + store smd + engine port + Vitest untuk engine | Upload `RAB_20260923.smd` → console bersih, flat terbentuk |
| 1 | Dashboard (agregasi + Recharts + filter 10 cascade) | angka cocok versi lama |
| 2 | Struktur, Rab (CSV), Raw, Validasi | tabel identik |
| 3 | RPD + rpd-export (IndexedDB) | simpan/muat dokumen RPD |
| 4 | Sisa, SPP (+overlay edit + ekspor JSON), Rekon, Pajak (localStorage) | edit SPP → ekspor JSON jalan |
| 5 | Theme, dark mode, mobile UX, a11y, print | paritas UX dengan versi lama |
| 6 | Hapus kode lama (`js/`, `css/`, `index.html` lama), update README + CONTRACT | build produksi bersih |

Selama migrasi: kode lama tetap jalan (folder lama tidak disentuh); kode baru hidup di
`src/` + `index.html` baru hasil Vite. Jangan mencampur.

---

## 10.5 Cara menyerahkan kerja ke AI agent

PRD ini **berdiri sendiri** — tidak perlu membaca `AGENTS.md`/`CONTRACT.md`/
`ARCHITECTURE.md`. Saat meminta AI mengerjakan, berikan cukup:

1. `docs/PRD-REACT-PORT.md` (dokumen ini) — satu-satunya dokumen wajib.
2. Kode lama terkait fase yang dikerjakan (mis. `js/features/pajak.js` untuk Fase 4),
   hanya sebagai referensi perilaku bila project lama masih ada.

Teks ajakaan: *"Kerjakan Fase N sesuai docs/PRD-REACT-PORT.md. PRD itu cukup — jangan
perlu baca CONTRACT/ARCHITECTURE. Ikuti Context7 untuk setiap library. Pertahankan
perilaku versi lama bila dirujuk. Jangan sentuh backend/internet. IndexedDB tetap
database utama. Selesaikan definisi 'Selesai' §12 sebelum klaim done."*

---

## 11. Standar Kode

- TypeScript `strict: true`; tidak ada `any` (gunakan `unknown` + narrowing).
- Nama file komponen: `PascalCase.tsx`; util/store: `kebab-case.ts`.
- Semua string UI berbahasa Indonesia; konstanta teks dekat fiturnya.
- Satu fitur = satu folder; tidak ada impor silang fitur (lewat `lib/` atau store bersama).
- Setiap komponen fitur harus punya empty state (belum upload file) dan error state.
- Format uang/tanggal selalu via helper bersama — jangan format manual.
- Aksesibilitas: label untuk input, `aria-live` untuk status, fokus terlihat.
- Komentar "mengapa", bukan "apa". Dokumen API selalu dicek ulang ke Context7.

---

## 12. Pengujian & "Selesai"

- [ ] `npm run build` (tsc + vite) bersih, `npm run lint` bersih.
- [ ] `npm test` — Vitest untuk `lib/engine/*` lolos.
- [ ] Alur nyata: upload `dataset/RAB_20260923.smd`, jalankan tiap fitur, bandingkan angka
      dengan versi lama (spot check manual dashboard/sisa/pajak).
- [ ] Console preview kosong; cek light + dark; desktop ≥1280px & mobile ≤420px.
- [ ] Data .SMD tidak keluar dari browser (tidak ada fetch eksternal selain CDN font/asset
      statis; idealnya self-host).

---

## 13. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Recharts tidak selengkap Chart.js untuk beberapa tipe | bungkus Chart shadcn; fallback chart kustom SVG kecil |
| Perilaku filter cascade halus & tersebar | ekstrak `applyFilters` ke util murni dulu, uji Vitest |
| Ekspor .SMD tidak bisa dari browser | pertahankan `tools/spp_patch.mjs` (di luar scope UI) |
| API shadcn berubah | semua contoh kode ditulis mengikuti Context7 saat implementasi |

---

*Dokumen ini adalah PRD hidup — perbarui saat keputusan berubah. Perilaku yang sudah
divalidasi dari kode lama tetap jadi sumber kebenaran sampai fase 6 selesai.*

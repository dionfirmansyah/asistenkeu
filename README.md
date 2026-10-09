# ASISTENKEU — Asisten Keuangan Desa (React + TypeScript)

Aplikasi web client-side (offline-first) untuk menganalisis data **Siskeudes (.SMD)**:
analisis RAB, penyusunan RPD, register SPP, kalkulator pajak, dan rekonsiliasi kas.
File diproses **murni di browser** — tidak ada data yang dikirim ke server.

Spesifikasi lengkap: [PRD.md](./PRD.md).

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
```

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dev Vite |
| `npm run build` | Type-check + build produksi ke `dist/` |
| `npm run preview` | Preview build produksi |
| `npm test` | Uji engine (Vitest) |
| `npm run typecheck` | Type-check tanpa emit |

## Struktur

```
src/
  main.tsx              bootstrap React (+polyfill Buffer/process untuk mdb-reader)
  App.tsx               shell: header, dropzone upload, restore dari IndexedDB
  index.css             Tailwind v4 + token tema (light/dark)
  types/smd.ts          tipe baris tabel hasil decode .SMD
  lib/
    engine/             decode XOR, buildRabFlat, validate, identity, format — murni
    storage/idb.ts      IndexedDB (docs, entries, sppEdits, sourceFiles)
    csv.ts              ekspor/salin CSV
  stores/               Zustand: smd-store, theme-store, filters-store
  features/<fitur>/     satu folder per fitur (dashboard, struktur, rab, raw,
                        validasi, rpd, sisa, spp, pajak, rekon)
  components/ui/        komponen shadcn
  components/layout/    NavShell (sidebar desktop + nav mobile)
```

Data disimpan di **IndexedDB** (DB `smd-rpd-db`) — file RAB/SPP, dokumen RPD,
overlay edit SPP, dan baris pajak manual — sehingga tetap ada setelah refresh. State kecil (tema, pajak, rekon)
memakai localStorage.

## Ekspor Register SPP menjadi .smd (server lokal)

Browser tidak bisa menulis database Jet/Access, jadi tombol
**Ekspor Register SPP (.smd)** mengirim file + edit ke server lokal kecil
(`tools/spp_server.mjs` di proyek lama, hanya `http://127.0.0.1:8743`, data tidak
keluar dari komputer) yang menerapkan patch via ODBC lalu mengembalikan `.smd`
hasil untuk diunduh.

```bash
cd F:\code\ASISTENKEU
npm install          # sekali saja (paket odbc + mdb-reader)
npm run patch_server # atau klik 2x tools/jalankan_server_spp.bat
```

Bila server mati, tombol otomatis memakai jalur cadangan: tulis `.edit.json` ke
folder `export/json` (untuk `tools/terapkan_spp.bat`). Butuh Windows + Microsoft
Access Database Engine Redistributable (bitness sama dengan Node).

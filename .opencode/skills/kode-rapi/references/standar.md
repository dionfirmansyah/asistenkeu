# Standar Kode ASISTENKEU (bisa diubah bebas oleh pemilik repo)

> File ini milik user. Ubah, tambah, atau hapus aturan di sini kapan saja —
> AI wajib mengikuti versi terbaru file ini setiap sebelum menulis kode.
> Aturan di sini mengalahkan default umum.

## TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`)

- Gunakan `import type` untuk semua import yang hanya dipakai sebagai tipe.
- Dilarang: `enum`, namespace, parameter properties. Pakai union string + const object.
- Dilarang menambah `any` baru. `as` hanya untuk batas I/O tak bertipe
  (mdb-reader, IndexedDB, JSON impor) dan wajib dijaga guard (`Array.isArray`,
  pengecekan field) sedekat mungkin dengan cast.
- Dilarang `!` (non-null assertion) pada data runtime. Ganti dengan
  optional chaining + fallback (`?.` / `??`), atau early return.
- `noUnusedLocals/Parameters`: jangan tinggalkan variabel mati (`void x` bukan solusi).
- Pola get-or-set pada `Map`: tulis eksplisit, jangan
  `(m.get(k) ?? m.set(k, []).get(k)!).push(...)`.

  ```ts
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
  ```

## React

- Satu `import` per modul (jangan `import {a} from "react"` dua kali).
- Path `@/...` untuk semua import lintas file (termasuk `./App` → `@/App` bila memungkinkan).
- Jangan turunkan state dari props via `useEffect`; pakai `key={...}` pada
  komponen atau hitung saat render.
- `useEffect` tanpa `eslint-disable`: stabilkan dependensi (`useCallback`/inline).
- Daftar `useState` > 8 dalam satu komponen adalah sinyal untuk `useReducer`.
- `type="button"` pada setiap `<button>` di dalam form; `scope="col"` pada `<th>`.
- Area klik custom (`div onClick`) wajib `role="button" tabIndex={0} onKeyDown`
  dan `aria-label`.
- `React.ReactNode` → `import type { ReactNode }`.

## Library & dokumentasi (Context7, wajib)

- Setiap memakai, menambah, atau mengutak-atik library pihak ketiga
  (recharts, zustand, shadcn/base-ui, mdb-reader, dsb.): cek dokumentasi
  terbarunya di **https://context7.com/** dulu — temukan halaman library
  tersebut, baca API yang relevan, baru tulis kode. Jangan mengandalkan
  hafalan versi API.
- Samakan dengan versi terpasang di `package.json`; contoh dari versi lain
  wajib disesuaikan dulu.
- Bila halaman Context7-nya tidak ketemu/tidak bisa dibuka, fallback ke situs
  docs resmi library dan catat itu di respons.

## Repo ini (spesifik, jangan dilanggar)

- `src/polyfills.ts` tetap import pertama di `main.tsx` (dibutuhkan mdb-reader).
- Alur baca `.SMD`: `decodeSmd` → `hasJetMagic` (wajib) → `MdbReader` →
  `buildRabFlat` → `validate`. Pesan error berbahasa Indonesia.
- `groupBy` dari `@/lib/engine/util` — jangan buat helper `group` lokal baru.
- CSV lewat `@/lib/csv` (`toCSV` menerima `Record<string, unknown>[]` langsung;
  `RabFlatRow` sudah punya index signature — tanpa cast ganda).
- IndexedDB `smd-rpd-db`: store `entries, docs, sourceFiles (keyPath: type),
  sppEdits, pajakManual`. Scope RPD/Sisa: `` `${Kd_Desa}-${Tahun}` ``.
- Server patch SPP hanya `http://127.0.0.1:8743` dengan timeout; selalu sediakan
  jalur fallback bila server mati. `tools/` dan `PRD.md` tidak ada di repo —
  abaikan referensi README ke sana.
- `catch` tidak boleh sunyi: minimal `console.warn` + status/error yang terlihat user.

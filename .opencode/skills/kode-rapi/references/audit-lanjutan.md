# Audit Lanjutan (temuan belum diperbaiki — 10 Okt 2026)

Sudah diperbaiki: double-`find` + `!` (RekapPajakView), `tables!` (RawView),
dead code `void kdDesa` (SisaView), import ganda (NavShell, SppView),
pola `Map.get!` (SppView), `group` lokal → `groupBy` (StrukturView),
cast CSV ganda, `React.ReactNode`, `basis: string` → `Basis`,
guard `PratinjauCetak` tanpa data, accessor tabel aman (SppDataView),
`th scope`, dropzone `role=button`.

## Sisa pekerjaan (prioritas turun)

1. **Helper baca .SMD bersama (sebagian selesai)** — SPP (`lib/sppFile.ts`) dan pajak
   (`lib/pajakFile.ts`) sudah terpusat dan dipakai sidebar + kedua view-nya.
   Sisa: `smd-store.ts:37-45` (RAB) masih inline — satukan bila menyentuhnya.
2. **Komponen `Kpi` bersama** — diduplikasi di `SisaView, SppDataView,
   RekapPajakView, RpdView, DashboardView`. Ekstrak ke `components/ui/kpi.tsx`.
3. **Hook CSV bersama** — pola salin/unduh CSV identik di
   `RabView, RawView, StrukturView`. Buat `useCsvCopy`.
4. **Pecah komponen besar** — `RpdView.tsx` (~800 baris), `SppView.tsx`
   (~600 baris), `print.ts` (474 baris, `REK_NAMA` + 2 renderer).
5. **`any` di `rpd/print.ts` dan `rpd/excel.ts`** — ketik `Map` dan parameter
   (`Ridx`/`RpdItem`), satukan logika grouping RPD yang duplikat.
6. **Skema IndexedDB bertipe** — `idb()` tanpa skema memaksa `as never` di semua
   call-site; beri generic schema `idb` + migrasi versi.
7. **`money-input.tsx` derived state** via `useEffect`; `RpdView` reload/effect deps.
8. **Konstanta tersebar** — `BASE`/`withTimeout`, nama DB, kunci localStorage
   (`asistenkeu_theme`, `*_pajak_v1`, `*_rekon_v2`) → `lib/constants.ts`.
9. **`select` tanpa label** di `RekonView.tsx:163,171,177`.

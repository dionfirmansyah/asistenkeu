# AGENTS.md

Offline-first React + TS app (Vite 8, React 19): analyzes Siskeudes `.SMD` files fully in-browser. No backend; persistence is IndexedDB (`smd-rpd-db`) + small localStorage state.

## Sumber kebenaran visual

`.opencode/skills/kode-rapi/references/DESIGN.md` — sistem desain gaya portal Coretax (navy `#0e3d85`, aksen emas hanya garis header). Token di `src/index.css` (hex, light+dark, termasuk `success/warning/info` + varian `-soft`, `brand-*`, `gold`, `--header-h`). Aturan keras: sentence case (akronim tetap kapital), radius hanya 6px kontrol / 8px panel, tanpa `backdrop-blur`/gradien dekoratif/`rounded-xl+`, angka `tabular-nums` + `Rp` tanpa desimal, tanggal `tgl()` ("10 Okt 2026"), badge status `StatusBadge` (dot + teks).

## Sebelum menulis kode (wajib)

Muat skill `kode-rapi` (`skill` tool, id `kode-rapi`) dan patuhi
`.opencode/skills/kode-rapi/references/standar.md` — file milik user yang bebas
diubah; versinya yang berlaku adalah isi file saat ini, bukan hafalan model.

## Commands

- `npm run dev` — Vite dev server (`http://localhost:5173`)
- `npm run build` — `tsc && vite build` to `dist/` (type-check runs first, blocks build)
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — `vitest run` (only `src/**/*.test.ts`, `environment: node`; currently just `lib/engine/engine.test.ts`, `features/kwitansi/format.test.ts`)
- `npm run preview` — preview production build
- No lint/format/test-per-file scripts. Verify with `npm run typecheck` + `npm test`; run `npm run build` before finishing if build config touched.

## Structure

- `src/main.tsx` → `src/App.tsx` → `src/components/layout/NavShell.tsx` (hash routing: `#/<id>`, e.g. `#/rpd`)
- `src/lib/engine/` — pure logic: `decode.ts` (XOR decode), `rab.ts` (`buildRabFlat`), `validate.ts`, `format.ts`, `identity.ts`, `util.ts`; re-exported via `index.ts`
- `src/stores/smd-store.ts` — central state: `loadFile` → `decodeSmd` → `hasJetMagic` gate → `mdb-reader` → `buildRabFlat` → `validate` → IndexedDB `sourceFiles[type=rab]`; `restore()` on startup
- `src/features/<name>/` — one folder per view (`dashboard, struktur, rpd, sisa, spp, spp-data, rekap-pajak, pajak-data, rekon, pajak, validasi, raw, kwitansi, rab`); view resolution is the if-chain in `NavShell.tsx`
- `src/lib/storage/idb.ts` — DB `smd-rpd-db` v5, stores: `entries, docs, sourceFiles (keyPath: type), sppEdits, pajakManual`
- `src/components/ui/` — shadcn (`base-nova`, Neutral, CSS vars); `DanaBadge` (warna tetap per kode sumber dana: ADD biru, DDS hijau, PBH kuning, DLL ungu, PBP merah) dipakai semua view yang menampilkan sumber dana; upload .smd terpusat di `src/lib/sppFile.ts` (`parseSppBuffer`/`readSppFile`/`saveSppFile`) dan `src/lib/pajakFile.ts` (`parsePajakBuffer`/`readPajakFile`/`savePajakFile`) — pakai ini, jangan duplikasi parsing di view; `src/lib/utils.ts`, `src/lib/csv.ts`, `src/lib/sppServer.ts`

## Gotchas

- `src/polyfills.ts` must stay the first import in `main.tsx`: `mdb-reader` needs browser `Buffer`/`process` shims.
- `vite.config.ts` aliases `mdb-reader` to its browser build (`lib/browser/index.js`) and `@` → `./src`. `components.json` expects CSS at `src/index.css` but actual file replaced `components.json` Tailwind wiring — verify before adding shadcn components.
- tsconfig is strict: `erasableSyntaxOnly` (no enums/namespaces/parameter properties), `verbatimModuleSyntax` (use `import type`), `noUnusedLocals/Parameters`, `allowImportingTsExtensions`.
- `.SMD` decode is XOR with 32-byte keystream (`decode.ts`); always gate on `hasJetMagic` before parsing — error message is Indonesian ("File tidak dikenali sebagai .SMD Siskeudes.").
- SPP export (`src/lib/sppServer.ts`) POSTs to `http://127.0.0.1:8743` local patch server with 2.5s status timeout; handle server-down path (JSON fallback). README's `tools/spp_server.mjs` / `PRD.md` references are stale — `tools/` and `PRD.md` do not exist in this repo.
- Rekap Pajak owns its own upload (`Ta_Pajak` + `Ta_PajakRinci`) → IndexedDB `sourceFiles[type=pajak]`, independent from Register SPP (`type=spp`). Raw tables view: `features/pajak-data` (nav `#/data-pajak`). Sample: `dataset/PAJAK_DESA_20261010.smd` (52 SSP, total Rp22.598.849; `Jenis_Setoran`/NPWP2 mostly empty — don't rely on them).
- No CI, pre-commit, or `opencode.json` config exists.

# PRD: Google Drive File Manager di Website

Versi 1.0 · 12 Oktober 2026 · Ditujukan untuk AI coding assistant yang melanjutkan implementasi

## 1. Ringkasan

Website memiliki fitur file manager yang terhubung langsung ke satu folder Google Drive (folder root). Seluruh isi folder itu, termasuk subfolder, tampil di website tanpa perlu membuka Google Drive. Dari website, pengguna juga bisa membuat folder, mengunggah file, membuat Google Docs/Sheets/Slides kosong, mengganti nama, membuang item ke Sampah, dan mengunduh file.

Tidak ada backend. Semua panggilan berjalan dari browser langsung ke Google Drive API v3 memakai token OAuth 2.0 milik akun yang login. Drive adalah satu-satunya sumber data: website tidak menyimpan salinan atau database.

## 2. Tujuan dan non-tujuan

**Tujuan**

- Menampilkan isi folder root dan semua subfolder, dimuat per folder saat dibuka (lazy loading).
- Mengelola isi folder dari website sehingga pemilik tidak perlu membuka Google Drive.
- Aman untuk data keuangan desa: tidak ada kunci rahasia di browser, dan hanya akun yang login yang bisa melihat atau mengubah file.

**Non-tujuan (jangan dikerjakan)**

- Backend, database, atau salinan isi Drive.
- Service account dan API key untuk folder pribadi.
- Pengaturan berbagi/izin akses, hapus permanen, riwayat versi, atau editor dokumen di dalam website.
- Sinkronisasi real-time (webhook/watch). Cukup tombol Segarkan, pembaruan otomatis setelah operasi tulis, dan muat ulang saat tab kembali aktif (P2).

## 3. Kondisi saat ini

Sudah selesai, diperluas dan bukan ditulis ulang:

- `src/lib/googleDrive.ts`, kemungkinan berisi: `signInGoogle`, `signOutGoogle`, `listChildren`, `getItem`, `downloadFile`, `exportGoogleFile`, `isFolder`, dan tipe `DriveItem`. AI wajib membaca file aslinya lebih dulu dan menyesuaikan dengan isinya.
- `.env.local` berisi `VITE_GOOGLE_CLIENT_ID` dan `VITE_ROOT_FOLDER_ID`.
- Script Google Identity Services (`https://accounts.google.com/gsi/client`) di `index.html`; verifikasi sudah ada.

Belum ada: komponen UI, hook, dan semua operasi tulis (buat, unggah, ubah nama, sampah, pindah).

Folder root harus dibaca dari `import.meta.env.VITE_ROOT_FOLDER_ID`, bukan konstanta di dalam komponen.

## 4. Perubahan wajib pertama: scope OAuth

`googleDrive.ts` saat ini memakai scope `https://www.googleapis.com/auth/drive.readonly`. Scope itu hanya bisa membaca, sehingga semua operasi tulis akan gagal dengan error 403.

Ganti menjadi `https://www.googleapis.com/auth/drive`.

Kenapa bukan `drive.file`: scope itu hanya memberi akses ke file yang dibuat oleh aplikasi ini atau dipilih lewat Google Picker. Isi folder yang sudah ada di Drive tidak akan terlihat, padahal kebutuhan utama adalah menampilkan folder yang sudah ada.

Konsekuensi yang harus dipahami:

- `drive` adalah scope restricted: token mencakup seluruh Drive akun yang login, bukan hanya folder root. Karena itu kode wajib membatasi semua navigasi dan operasi ke subtree folder root (lihat bagian Keamanan).
- Selama OAuth consent screen berstatus Testing, hanya email di Test users yang bisa login, dan muncul peringatan aplikasi belum diverifikasi. Itu normal untuk pemakaian pribadi. Jangan ubah ke Production tanpa proses verifikasi Google.

Langkah manual oleh pemilik proyek (bukan tugas AI):

1. Google Cloud Console → Google Auth Platform → Data Access (tampilan lama: OAuth consent screen → Scopes), tambahkan scope `https://www.googleapis.com/auth/drive`.
2. Pastikan Google Drive API aktif dan email yang dipakai ada di Test users.
3. Pastikan akun itu Pemilik atau Editor pada folder root.
4. Setelah kode diubah, Keluar lalu login ulang agar persetujuan baru muncul.
5. Saat deploy, tambahkan domain produksi ke Authorized JavaScript origins.

## 5. Kebutuhan fungsional

Prioritas: P0 wajib, P1 penting, P2 opsional.

**FR-1 Autentikasi (P0)**

- Tombol Hubungkan Google Drive memicu `signInGoogle()` lewat klik pengguna (jangan otomatis, agar popup tidak diblokir).
- Tunggu script GIS selesai dimuat sebelum memanggil `google.accounts.oauth2`.
- Simpan token dan waktu kedaluwarsanya (`expires_in`, sekitar 1 jam) hanya di memori modul. Jangan simpan di localStorage/sessionStorage.
- Bila token kedaluwarsa atau API mengembalikan 401, tampilkan banner Sesi berakhir dengan tombol Masuk lagi. Jangan memunculkan popup login otomatis.
- Keluar mencabut token (`revoke`) dan membersihkan semua state.
- Setelah login, verifikasi root: panggil `getItem(VITE_ROOT_FOLDER_ID)`; pastikan itu folder dan akun punya akses. Jika tidak, tampilkan pesan yang jelas.

**FR-2 Penelusuran (P0)**

- Tampilan utama: breadcrumb + daftar/tabel isi folder saat ini (bukan tree), karena operasi buat/unggah butuh konteks folder tujuan. Tree sidebar boleh P2.
- Kolom: ikon, nama, ukuran (format KB/MB), terakhir diubah (locale id-ID). Folder tampil lebih dulu, lalu urut nama.
- Klik folder membuka isinya (dimuat sekali, disimpan di cache `Map<folderId, DriveItem[]>` selama sesi). Klik breadcrumb kembali ke folder tersebut. Breadcrumb tidak boleh naik di atas root.
- Tombol Segarkan mengosongkan cache folder aktif dan memuat ulang dari Drive.
- Shortcut Drive (`application/vnd.google-apps.shortcut`) ditampilkan dengan ikon khusus dan dibuka lewat `webViewLink`; jangan ditelusuri sebagai folder.

**FR-3 Buat folder (P0)**

- Tombol Folder baru di toolbar, dialog input nama, dibuat di folder aktif.
- Validasi: tidak kosong setelah di-trim, maksimal 255 karakter. Bila nama yang sama sudah ada di folder itu, beri peringatan dan minta konfirmasi (Drive mengizinkan nama kembar, tapi untuk dokumen keuangan itu membingungkan).
- Setelah sukses, sisipkan item hasil ke daftar tanpa memuat ulang seluruh folder.

**FR-4 Unggah file (P0)**

- Tombol Unggah dan drag-and-drop ke area daftar; boleh banyak file sekaligus.
- Antrean unggahan dengan progres per file, batas 2 unggahan bersamaan, tombol batal (AbortController/xhr.abort), dan status sukses/gagal per file.
- File kecil (≤ 5 MB): multipart. File besar: resumable upload dengan XMLHttpRequest agar progres terbaca.
- Batas ukuran maksimal dikonfigurasi lewat konstanta (default 100 MB) agar browser tidak kehabisan memori; tolak dengan pesan jelas bila melebihi.
- Item hasil unggah langsung muncul di daftar.

**FR-5 Buat file Google kosong (P1)**

- Menu File baru: Google Docs, Google Sheets, Google Slides. Dibuat di folder aktif dengan nama dari dialog.
- Setelah dibuat, tawarkan Buka di Google Drive (`webViewLink`, tab baru).

**FR-6 Unduh (P0)**

- File biasa: `downloadFile`. File Google native: `exportGoogleFile` dengan format default Docs → .docx, Sheets → .xlsx, Slides → .pptx, plus opsi PDF. Batas export Drive 10 MB; tangani error dengan pesan jelas.
- Nama file hasil unduhan diberi ekstensi yang sesuai untuk file hasil export.

**FR-7 Ubah nama (P1)**

- Dari menu aksi per baris, dialog dengan nama saat ini terisi. Validasi sama dengan FR-3.

**FR-8 Buang ke Sampah (P0)**

- Hanya memindahkan ke Sampah (`trashed: true`), tidak pernah hapus permanen. Wajib ada dialog konfirmasi yang menyebut nama item; untuk folder, tegaskan bahwa isinya ikut terbuang.
- Setelah sukses, hapus item dari daftar. Beri pesan bahwa item bisa dipulihkan dari Sampah di Google Drive.

**FR-9 Pindah (P1)**

- Pindahkan item ke folder lain di bawah root lewat dialog pemilih folder. Tujuan hanya boleh di dalam subtree root; folder tidak boleh dipindahkan ke dalam dirinya sendiri atau turunannya.

**FR-10 Cari (P1)**

- Kolom cari nama pada folder aktif (`name contains`). Drive tidak mendukung pencarian rekursif dalam satu query, jadi pencarian dibatasi ke folder aktif.

**FR-11 Pratinjau (P2)**

- Pratinjau gambar dan PDF di dialog; jenis lain cukup tombol Buka di Google Drive.

**Hak akses per item (P0 untuk UI)**

- Minta field `capabilities(canAddChildren,canRename,canTrash,canDownload)` dan nonaktifkan tombol yang tidak diizinkan (mis. folder tempat akun hanya Viewer).

## 6. Fungsi baru di data layer (`googleDrive.ts`)

Semua request menyertakan `supportsAllDrives=true` dan melewati helper `api()` yang sama (header Bearer, penanganan 401, retry). Konstanta fields: `id,name,mimeType,size,modifiedTime,webViewLink,parents,capabilities(canAddChildren,canRename,canTrash,canDownload)`. Perluas `DriveItem` dengan field opsional tersebut tanpa merusak penggunaan yang sudah ada.

| Fungsi | Endpoint | Catatan |
| --- | --- | --- |
| `createFolder(parentId, name)` | `POST /drive/v3/files` | body: `name`, `mimeType` folder, `parents:[parentId]` |
| `createGoogleFile(parentId, name, kind)` | `POST /drive/v3/files` | mimeType: `application/vnd.google-apps.document`, `.spreadsheet`, atau `.presentation` |
| `uploadFile(parentId, file, {onProgress, signal})` | `POST /upload/drive/v3/files?uploadType=multipart` (≤ 5 MB) atau `uploadType=resumable` | Multipart memakai `multipart/related`: bagian 1 metadata JSON (`name`, `parents`), bagian 2 isi file. Resumable: POST metadata dengan header `X-Upload-Content-Type` dan `X-Upload-Content-Length`, ambil URL sesi dari header `Location`, lalu PUT isi file lewat XMLHttpRequest. Uji CORS-nya langsung di browser. |
| `renameItem(id, name)` | `PATCH /drive/v3/files/{id}` | body `{name}` |
| `trashItem(id)` | `PATCH /drive/v3/files/{id}` | body `{trashed:true}` |
| `moveItem(id, newParentId, oldParentId)` | `PATCH /drive/v3/files/{id}?addParents=...&removeParents=...` | hanya ke folder di bawah root |
| `searchInFolder(folderId, text)` | `GET /drive/v3/files` | `q` memuat `name contains` dan `'folderId' in parents and trashed = false` |
| `buildQuery` (helper) | — | Escape tanda kutip tunggal dan backslash pada semua nilai yang masuk ke `q` (termasuk `folderId` dan teks pencarian) |
| `isTokenValid()` / `getTokenExpiry()` | — | dibaca dari memori modul |
| `ensureGisLoaded()` | — | menunggu `window.google` siap |

Semua fungsi mengembalikan `DriveItem` (atau `void`) dan melempar error bertipe (mis. `DriveError` dengan `status` dan `reason`) agar UI bisa memilih pesan yang tepat.

## 7. Arsitektur komponen

Ikuti struktur dan library UI yang sudah ada di proyek. Usulan:

- `src/lib/googleDrive.ts`: data layer (diperluas)
- `src/hooks/useDriveAuth.ts`: status login, login, logout, deteksi sesi berakhir
- `src/hooks/useDriveFolder.ts`: folder aktif, path breadcrumb, cache, muat/segarkan, mutasi (buat, ubah nama, sampah, pindah)
- `src/hooks/useUploadQueue.ts`: antrean unggahan, progres, batal
- `src/components/drive/DriveManager.tsx`: komponen utama (menggantikan contoh `DriveManager` dan `Node` yang lama)
- `DriveToolbar`, `DriveBreadcrumb`, `DriveList`, `DriveRow`, `NewFolderDialog`, `NewFileMenu`, `UploadPanel`, `RenameDialog`, `ConfirmTrashDialog`, `MoveDialog` (P1)

Gunakan state React biasa atau library data fetching yang sudah terpasang di proyek. Jangan menambah dependency baru kecuali ada alasan kuat, dan sebutkan alasannya.

## 8. UX dan teks antarmuka

- Seluruh teks UI berbahasa Indonesia: Hubungkan Google Drive, Folder baru, Unggah, Segarkan, Ubah nama, Buang ke Sampah, Unduh, Keluar.
- Keadaan yang wajib ada: belum login, memuat (skeleton atau spinner), folder kosong, error dengan tombol Coba lagi, sesi berakhir, offline.
- Notifikasi singkat (toast) untuk sukses dan gagal tiap operasi.
- Tombol aksi dinonaktifkan selama operasinya berjalan; cegah klik ganda yang membuat folder kembar.
- Responsif: tabel di desktop, daftar bertumpuk di layar kecil, tombol aksi mudah dijangkau di mobile.
- Dapat diakses: elemen interaktif bisa difokus keyboard, dialog menutup dengan Esc, label tombol ikon jelas.

## 9. Penanganan error dan batas API

| Kondisi | Perilaku |
| --- | --- |
| 401 | Hapus token, tampilkan banner Sesi berakhir |
| 403 `insufficientPermissions` atau scope kurang | Pesan bahwa izin Drive belum sesuai, tombol login ulang |
| 403 `userRateLimitExceeded` atau 429 | Retry dengan exponential backoff + jitter, maksimal 5 kali, lalu tampilkan pesan |
| 404 | Item tidak ditemukan (mungkin sudah dipindah atau dihapus), muat ulang folder |
| 5xx atau jaringan | Pesan dapat dicoba lagi, tombol Coba lagi |

Folder besar: `listChildren` sudah mengambil semua halaman. Bila folder berisi ratusan item dan terasa lambat, pertimbangkan render bertahap (P2).

## 10. Keamanan

- Tidak ada client secret, service account, atau API key rahasia di kode. Client ID OAuth bersifat publik dan boleh ada di bundel.
- Token hanya di memori; jangan simpan atau cetak ke log/console, dan jangan masukkan token atau isi file ke URL.
- Karena token mencakup seluruh Drive, semua operasi harus dibatasi ke subtree root: navigasi hanya lewat `listChildren` dari root; `moveItem` hanya boleh ke folder di bawah root; jangan menerima `folderId` dari URL atau input lain tanpa memverifikasi bahwa folder itu berada di bawah root (telusuri `parents` ke atas sampai root).
- Tidak ada hapus permanen dan tidak ada perubahan izin berbagi.
- Data tidak dikirim ke layanan pihak ketiga; hanya browser ke Google.
- `.env.local` tidak boleh di-commit (cek `.gitignore`).

## 11. Tahapan implementasi

Kerjakan berurutan. Di akhir tiap fase, jalankan type check, lint, dan build, lalu berhenti dan laporkan hasilnya sebelum lanjut.

**Fase 0: Persiapan**

- Baca proyek dan `googleDrive.ts`; tulis ringkasan temuan (framework UI, router, komponen toast/dialog yang tersedia).
- Ubah scope ke `drive`; tambahkan `ensureGisLoaded`, penyimpanan waktu kedaluwarsa token, `DriveError`, `buildQuery`, retry backoff, dan perluasan `DriveItem`.
- Selesai bila: login berhasil dengan scope baru dan `getItem(VITE_ROOT_FOLDER_ID)` mengembalikan folder root.

**Fase 1: Penelusuran dan unduh (FR-1, FR-2, FR-6)**

- Hook auth dan folder, `DriveManager`, breadcrumb, daftar, Segarkan, unduh, status memuat/kosong/error, hak akses per item.
- Selesai bila: seluruh isi folder dan subfolder bisa ditelusuri dan file terunduh dengan benar, termasuk file Google native.

**Fase 2: Buat dan unggah (FR-3, FR-4, FR-5)**

- Folder baru, unggah (multipart dan resumable) dengan antrean dan progres, File baru Google.
- Selesai bila: folder dan file yang dibuat dari website langsung terlihat di Google Drive asli, dan sebaliknya item dari Drive muncul di website setelah Segarkan.

**Fase 3: Ubah, buang, pindah (FR-7, FR-8, FR-9)**

- Ubah nama, buang ke Sampah dengan konfirmasi, pindah dengan batasan subtree.
- Selesai bila: perubahan tercermin di Google Drive; item yang dibuang ada di Sampah Drive dan bisa dipulihkan.

**Fase 4: Penyempurnaan (FR-10, FR-11, P2)**

- Pencarian, pratinjau, muat ulang saat tab aktif, perapian UX, dan uji tambahan.

## 12. Kriteria penerimaan dan uji manual

- [ ] Login dengan akun yang terdaftar di Test users berhasil; akun lain ditolak Google.
- [ ] Isi folder root tampil sama dengan di Google Drive, termasuk subfolder bersarang.
- [ ] Breadcrumb tidak bisa naik di atas root.
- [ ] Folder baru muncul di Drive asli dengan induk yang benar.
- [ ] Unggah file kecil (< 5 MB), file besar (> 5 MB), dan beberapa file sekaligus; progres dan batal bekerja.
- [ ] File Google Docs/Sheets/Slides kosong terbuat dan bisa dibuka.
- [ ] Unduh PDF, file biasa, dan file Google native (export) menghasilkan file yang bisa dibuka.
- [ ] Ubah nama dan buang ke Sampah tercermin di Drive; item bisa dipulihkan dari Sampah.
- [ ] Nama berisi tanda kutip tunggal, spasi, dan huruf non-Latin tidak merusak query atau operasi.
- [ ] Token kedaluwarsa (simulasikan dengan menghapus token) memunculkan banner Sesi berakhir, bukan layar kosong.
- [ ] Pada folder di mana akun hanya Viewer, tombol tulis nonaktif.
- [ ] Tidak ada token atau data sensitif di localStorage, URL, atau console.
- [ ] `tsc`, lint, dan build produksi lolos tanpa error.

Bila proyek memiliki framework tes (mis. Vitest), tambahkan tes untuk fungsi murni: `buildQuery`, format ukuran, penyusun body multipart, dan validasi nama.

## 13. Aturan kerja untuk AI

1. Baca struktur proyek lebih dulu dan ikuti konvensi yang ada (gaya, penamaan, pustaka UI).
2. Kerjakan per fase dan berhenti di akhir tiap fase untuk melapor: apa yang selesai, file yang diubah, apa yang perlu diuji manual.
3. Jangan mengubah fitur lain; semua export lama di `googleDrive.ts` harus tetap kompatibel.
4. Jangan menambah dependency tanpa alasan; jangan menulis kunci rahasia atau token ke kode, log, atau penyimpanan browser.
5. Jangan mengerjakan item di bagian Non-tujuan.
6. Jika ada ambiguitas besar, tanyakan. Jika kecil, ambil asumsi paling aman dan catat di laporan.
7. Setelah semua fase selesai, buat ringkasan singkat cara memakai fitur dan daftar langkah setup Google Cloud Console yang masih harus dilakukan pemilik.

## 14. Asumsi dan hal yang perlu dikonfirmasi

- Stack diasumsikan React + Vite + TypeScript + Tailwind (sesuai contoh sebelumnya); AI memverifikasi di proyek sebenarnya.
- Pengguna: satu atau beberapa operator terpercaya yang sudah masuk Test users, bukan publik.
- Folder root dimiliki atau bisa diedit oleh akun yang login. Bila folder berada di Shared Drive, semua request sudah memakai `supportsAllDrives=true`.
- Ukuran unggahan maksimal 100 MB per file dianggap cukup; ubah konstanta bila perlu.
- Hanya satu folder root, diambil dari `.env.local`.

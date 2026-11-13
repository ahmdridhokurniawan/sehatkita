<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CRITICAL BOUNDARY RULE — LARANGAN MUTLAK MENYENTUH BACKEND

1. **WILAYAH KERJA TERBATAS HANYA DI `frontend/`**
   - Folder `frontend/` dikelola penuh oleh Daffa (`DAFFASUPERPOWER`).
   - Folder `backend/` (`../backend/`) dikelola penuh oleh PIC Backend (Ridho).

2. **DILARANG KERAS MENGUBAH FILE DI `backend/`**
   - AI/Agent yang bekerja pada Frontend (atau milik Daffa) **DILARANG KERAS** membuat, mengedit, me-refactor, memindahkan, atau menghapus file apa pun di dalam `../backend/` — termasuk controller, model, migration, route, seeder, service, konfigurasi, maupun test PHP.
   - **DILARANG KERAS** mengedit `kontrak-api.md` secara sepihak tanpa persetujuan PIC Backend.
   - Membaca file di `../backend/` hanya diperbolehkan untuk mengecek kontrak response/endpoint (read-only), **TIDAK PERNAH** untuk melakukan perubahan kode atau menjalankan perintah mutasi database/migration.

3. **PROSEDUR BILA FITUR UI MEMBUTUHKAN PERUBAHAN BACKEND**
   - Jika suatu fitur UI membutuhkan endpoint baru, kolom database baru, perubahan aturan validasi, atau perubahan struktur response API:
     1. **BERHENTI** di sisi `frontend/` dan jangan sentuh `backend/`.
     2. Implementasikan sisi UI sebatas kontrak API yang sudah ada, atau laporkan daftar kebutuhan perubahan API secara rinci ke user/Daffa untuk diteruskan ke PIC Backend (Ridho).

4. **ATURAN GIT**
   - Saat melakukan `git add` atau `git commit`, **HANYA** stage file di dalam `frontend/` (`git add frontend/`). Pastikan `git diff --name-only --cached` tidak menyentuh `backend/`.

## PRE-EXECUTION PROTOCOL — WAJIB BACA KONTRAK & AUDIT DULU

Sebelum menulis, mengubah, atau menghapus kode apa pun di `frontend/`, AI **WAJIB** menjalankan 3 langkah ini terlebih dahulu:

1. **BACA KONTRAK API TERLEBIH DAHULU (`../kontrak-api.md`)**
   - Periksa endpoint resmi, metode HTTP, parameter query/body, enum status/kategori, aturan peran (role), dan struktur JSON response di `../kontrak-api.md`.
   - **DILARANG** menebak nama field, payload, atau URL endpoint dari ingatan tanpa memverifikasi `../kontrak-api.md`.

2. **AUDIT KODE EKSISTING SEBELUM EKSEKUSI**
   - Baca dan audit file terkait yang sudah ada sebelum mengedit: `frontend/src/lib/api.ts`, `frontend/src/types/index.ts`, `frontend/src/lib/enums.ts`, serta halaman/komponen terkait fitur yang diminta.
   - Cek fungsi helper, komponen UI, atau client API yang sudah tersedia agar tidak membuat kode duplikat, bentrok tipe data, atau merusak fitur lain yang berjalan.

3. **VERIFIKASI SETELAH EKSEKUSI**
   - Setelah perubahan selesai, jalankan pengecekan TypeScript/lint/build di `frontend/` dan pastikan tidak ada error sebelum melaporkan tugas selesai.



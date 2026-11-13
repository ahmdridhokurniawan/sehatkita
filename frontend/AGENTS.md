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


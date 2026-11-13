# Aturan Kerja AI Agent Backend — SehatKita

## CRITICAL BOUNDARY RULE — LARANGAN MUTLAK MENYENTUH FRONTEND

1. **WILAYAH KERJA TERBATAS HANYA DI `backend/`**
   - Folder `backend/` dan `../kontrak-api.md` dikelola penuh oleh PIC Backend (Ridho / `ahmdridhokurniawan`).
   - Folder `../frontend/` dikelola penuh oleh PIC Frontend (Daffa / `DAFFASUPERPOWER`).

2. **DILARANG KERAS MENGUBAH FILE DI `../frontend/`**
   - AI/Agent yang bekerja pada Backend **DILARANG KERAS** membuat, mengedit, me-refactor, memindahkan, atau menghapus file apa pun di dalam `../frontend/`.
   - Membaca file di `../frontend/` hanya diperbolehkan untuk memastikan kompatibilitas pemanggilan API (read-only), **TIDAK PERNAH** untuk mengubah kode frontend.

3. **ATURAN GIT**
   - Saat melakukan `git add` atau `git commit`, **HANYA** stage file di dalam `backend/` (serta `kontrak-api.md` bila ada revisi kontrak API resmi). Pastikan `git diff --name-only --cached` tidak menyentuh `frontend/`.

## PRE-EXECUTION PROTOCOL — WAJIB BACA KONTRAK & AUDIT DULU

Sebelum menulis, mengubah, atau menghapus kode apa pun di `backend/`, AI **WAJIB** menjalankan langkah-langkah berikut terlebih dahulu:

1. **BACA KONTRAK API TERLEBIH DAHULU (`../kontrak-api.md`)**
   - Periksa endpoint resmi, metode HTTP, aturan validasi, enum, hak akses peran (role), struktur response JSON, serta aturan privasi di `../kontrak-api.md`.
   - Jika ada penambahan atau perubahan endpoint/field resmi, perbarui juga `../kontrak-api.md` dan beri catatan yang jelas untuk tim Frontend.

2. **AUDIT KODE EKSISTING SEBELUM EKSEKUSI**
   - Periksa terlebih dahulu file terkait yang sudah ada agar tidak menimbulkan duplikasi kode, mismatch tipe data, atau bug regresi:
     - Rute di `routes/api.php` dan Gate di `app/Providers/AuthServiceProvider.php`.
     - Helper bersama di `app/Http/Controllers/Controller.php` (`wajibPeran`, `responTidakDitemukan`, `dalamBinaan`, `scopeBinaan`, `parsePeriode`, `saringRentangTanggal`, `perHalaman`, `saringCari`, `metaPaginasi`).
     - Service bersama di `app/Services/` (`HealthCalculatorService`, `RujukanOtomatisService`, `InsightService`, `PeringkatService`, `TelegramService`).
     - Daftar `$fillable`, `casts()`, dan relasi pada model di `app/Models/`.
     - Skenario uji eksisting di `tests/Feature/`.
   - Gunakan kembali helper dan service yang sudah ada—jangan membuat logika duplikat.

3. **STANDAR PENULISAN KODE**
   - Tambahkan **komentar penjelasan 1 baris berbahasa Indonesia yang ringkas dan mudah dipahami manusia** pada method dan blok logika non-trivial yang dibuat atau diubah.

4. **VERIFIKASI SETELAH EKSEKUSI**
   - Setelah perubahan selesai, jalankan pengecekan sintaks PHP (`php -l`) dan jalankan test suite lengkap di Docker:
     ```sh
     docker exec -w /var/www/sehatkita/backend laradock-php-fpm-1 php artisan test
     ```
   - Pastikan seluruh test lulus tanpa error sebelum melaporkan tugas selesai.

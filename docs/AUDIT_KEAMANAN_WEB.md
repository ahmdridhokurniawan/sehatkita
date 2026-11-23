# Laporan Audit Keamanan Web — SehatKita

Tanggal Audit: 2026-11-23  
Lingkup: Backend (`backend/`) & Frontend (`frontend/`)

---

## 1. Ringkasan Eksekutif

Audit dilakukan secara statis (*code-level security review*) terhadap autentikasi, otorisasi, manajemen sesi, validasi input, proteksi SQL Injection / XSS, konfigurasi CORS, webhook, serta pembatasan laju permintaan (*rate limiting*).

---

## 2. Temuan & Status Mitigasi

| No | Area | Temuan Awal | Tingkat Risiko | Status & Mitigasi |
|----|------|-------------|----------------|-------------------|
| 1 | **Rate Limiting API** | Hanya `/auth/register` (`10/menit`) dan `/auth/login` (`5/menit`) yang dibatasi; endpoint API terautentikasi & publik lain belum memakai `throttle`. | Sedang | **Diperbaiki:** Rate limiter `api` (`100 request/menit` per user/IP) dipasang pada seluruh grup `/api/v1` di `AppServiceProvider` dan `routes/api.php`. |
| 2 | **Manajemen Sesi & Redis** | Masa berlaku token Sanctum sebelumnya 30 menit dan sesi Laravel menggunakan driver `database`. | Rendah | **Diperbaiki:** Masa sesi & token diatur menjadi **24 jam (1440 menit)**; driver sesi diatur ke `redis` (`SESSION_DRIVER=redis`) dan metadata sesi aktif per user disimpan di Redis/Cache via `SingleIpSessionService`. |
| 3 | **Token di `localStorage` (FE)** | Token Sanctum disimpan di `localStorage` browser (`frontend/middleware.ts`), sehingga rentan apabila ada celah XSS. | Sedang | **Mitigasi Saat Ini:** Tidak ada `eval()`, hanya 2 penggunaan `dangerouslySetInnerHTML` yang terisolasi pada ikon SVG internal (`Icon.tsx`) dan skrip tema statis (`layout.tsx`). **Rekomendasi Lanjutan:** Pindahkan token ke cookie `HttpOnly; Secure; SameSite=Lax` di masa mendatang. |
| 4 | **Upload Media Edukasi** | Penambahan fitur upload foto & video edukasi berisiko menerima file berbahaya bila ekstensi/MIME tidak dibatasi. | Sedang | **Dimitigasi:** Validasi ketat MIME & ukuran file (`image|mimes:jpg,jpeg,png,webp|max:5120` dan `mimetypes:video/mp4,video/webm,video/quicktime|max:51200`), disimpan di disk `public` terpisah, serta penghapusan file lama saat update/delete. |
| 5 | **SQL Injection** | Terdapat beberapa query `DB::raw` / `whereRaw` / `orderByRaw` di `AdminStatistikController`, `DashboardWilayahController`, `ProgramController`, dan `WilayahController`. | Rendah | **Aman:** Seluruh query mentah memakai ekspresi statis atau parameter binding (`?`). Tidak ada interpolasi input user langsung ke SQL. |
| 6 | **Otorisasi & Privasi (IDOR / Scope)** | Akses lintas wilayah / lintas binaan berisiko membocorkan data medis warga. | Tinggi | **Aman:** Diterapkan middleware `auth:sanctum` + `single.ip`, pembatasan scope per role (`wajibPeran`, `dalamBinaan`, `admin_kelurahan` read-only + k-anonymity `< 5` disamarkan, `404` untuk resource di luar scope), serta `log_audit` untuk akses Super Admin. |
| 7 | **Webhook Bot Telegram** | Endpoint webhook publik dapat dipalsukan bila tidak diverifikasi. | Sedang | **Aman:** `TelegramController::webhook` memverifikasi header `X-Telegram-Bot-Api-Secret-Token` dengan `hash_equals`. |
| 8 | **CORS & CSV Formula Injection** | Origin liar & sel CSV/Excel diawali `=`, `+`, `-`, `@`. | Rendah | **Aman:** `config/cors.php` membatasi origin produksi via `CORS_ALLOWED_ORIGINS`; `AdminExportController` melakukan sanitasi `amanCsv()` dan `htmlspecialchars(..., ENT_XML1)`. |

---

## 3. Rekomendasi Tambahan untuk Produksi
1. Pastikan `APP_DEBUG=false` dan `APP_ENV=production` di server produksi.
2. Pastikan service Redis berjalan dan dilindungi password (`REDIS_PASSWORD`), serta `php artisan storage:link` sudah dijalankan untuk akses media edukasi.
3. Aktifkan HTTPS (TLS) penuh agar header `Authorization: Bearer` dan cookie sesi terenkripsi selama transit.

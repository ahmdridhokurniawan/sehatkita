# Materi Presentasi (PPT) — Proyek SehatKita

Dokumentasi ini siap disalin langsung ke PowerPoint / Google Slides / Canva (10 Slide).

---

## Slide 1 — Judul
- **Judul:** **SehatKita — Sistem Monitoring Kesehatan Penyakit Tidak Menular (PTM) Berbasis Web**
- **Subjudul:** Skala Kecamatan & Posbindu PTM — Kota Banjarbaru
- **Disusun oleh:** Tim Magang (Frontend & Backend) — Politeknik Negeri Banjarmasin

---

## Slide 2 — Latar Belakang & Tujuan
- **Masalah:** Pencatatan skrining Posbindu PTM masih tersebar/manual, sulit memantau tren kesehatan warga secara berkala, dan proses rujukan ke faskes belum terdokumentasi cepat.
- **Tujuan:**
  1. Menyediakan platform terintegrasi untuk Warga, Kader Posbindu, Admin Kelurahan, dan Super Admin.
  2. Menghitung status risiko PTM (IMT, Tensi, Gula Darah, Kolesterol, Asam Urat) otomatis sesuai standar Kemenkes RI.
  3. Mempercepat tindak lanjut rujukan resmi serta meningkatkan keaktifan warga melalui gamifikasi.

---

## Slide 3 — Teknologi yang Digunakan
- **Backend:**
  - **PHP 8.3 & Laravel 13** (REST API `/api/v1`)
  - **Laravel Sanctum** (Bearer Token & cookie `HttpOnly` `sehatkita_token`, masa sesi **24 jam / 1440 menit**, pembatasan 1 IP 1 user aktif)
  - **Redis (`predis/predis`)** (Penyimpanan sesi login, cache peringkat, wilayah, faskes, dan ambang kategori)
  - **MySQL / MariaDB** (Produksi/Dev) & **SQLite** (Automated Testing)
  - **Bot Telegram API** (Pengingat skrining PTM & notifikasi program)
- **Frontend:**
  - **Next.js 16 (App Router) & React 19**
  - **TypeScript 5 & Tailwind CSS v4**
  - **Custom SVG Charts & Print-to-PDF / SpreadsheetML Excel Export** (Ringan tanpa bloat dependency)
- **Testing & Quality:**
  - **PHPUnit 12** (103 Feature Tests) & **Jest + React Testing Library** (40 Unit Tests)

---

## Slide 4 — Arsitektur & Kontrak API
- Pemisahan tegas **Frontend (`Next.js`)** dan **Backend (`Laravel REST API`)** yang diikat oleh dokumen tunggal `kontrak-api.md` (Versi 1.10.1).
- Next.js Proxy (`API_PROXY_TARGET`) meneruskan `/api/v1/*` ke backend agar bebas masalah CORS di browser.
- **Rate Limiting:** Seluruh endpoint API dibatasi **100 request/menit** per user/IP (`throttle:api`).

---

## Slide 5 — Hak Akses & Fitur per Peran (4 Role)
1. **Warga (`user`):** Catat kesehatan mandiri, lihat grafik tren di Beranda, ikuti tantangan (progres otomatis), baca/tonton materi edukasi, kumpulkan badge keaktifan, beri survei kepuasan masyarakat.
2. **Kader (`kader`):** Kelola kunjungan Posbindu, catat kesehatan warga binaan (pencarian NIK + Nama), buat/tindak lanjuti rujukan.
3. **Admin Kelurahan (`admin_kelurahan`):** Monitoring dashboard agregat kelurahan (*k-anonymity* `< 5` disamarkan), kelola Posbindu, Program, Edukasi (foto/video), laporan PDF & Excel, serta lihat Indeks Kepuasan Masyarakat.
4. **Super Admin (`super_admin`):** Kelola master data (Indikator, Ambang Kemenkes, Pengguna, Faskes, Wilayah), verifikasi catatan, log audit, ekspor CSV/Excel, dan rekap kepuasan seluruh wilayah.

---

## Slide 6 — Fitur Unggulan & Pembaruan Terbaru
- **Grafik Tren Kesehatan di Beranda:** Pemantauan indikator (IMT, BB, Tensi, Gula Darah, Kolesterol, Asam Urat) langsung di halaman Beranda.
- **Catat Kesehatan Lebih Efisien:** Waktu pemeriksaan & sumber data terisi otomatis sesuai role, dropdown warga menampilkan NIK + Nama, dan jenis gula darah bersifat opsional.
- **Tantangan & Gamifikasi Berbasis Badge:** Filter tantangan per kategori, perhitungan progres otomatis dari capaian target (mis. 10 dari 50 = 20%), simbol badge keaktifan di Achievement, serta peringkat diurutkan berdasarkan jumlah badge.
- **Surat Rujukan PDF Resmi & Laporan Excel:** Kop surat resmi (Logo SehatKita di kiri, teks header di tengah, Logo Banjarbaru di kanan) dan ekspor Excel pada Laporan Admin.
- **Edukasi Multimedia & Kepuasan Masyarakat:** Materi edukasi mendukung foto dan video; warga dapat memberi rating kepuasan layanan yang langsung tampil di Admin & Super Admin.

---

## Slide 7 — Audit Keamanan Sistem Web
- **Autentikasi & Sesi:** Dual-mode Sanctum (Bearer + cookie `HttpOnly` `sehatkita_token`) 24 jam, penyimpanan sesi di Redis, proteksi 1 IP 1 pengguna aktif.
- **Rate Limit:** 100 request/menit di seluruh endpoint API (`trustProxies` aktif untuk IP asli klien).
- **Otorisasi & Privasi Data Medis (UU PDP):** Pembatasan scope wilayah/binaan (mengembalikan `404` bila di luar scope), masking digit tengah NIK saat pencarian (`637205******0001`), *k-anonymity* pada dashboard kelurahan, dan pencatatan `log_audit`.
- **Proteksi Input, Upload & Telegram:** Validasi ketat MIME/ukuran file upload, parameter binding SQL (anti-SQLi), sanitasi CSV/Excel (anti-Formula Injection), token pairing Telegram 30 menit, dan verifikasi `TELEGRAM_WEBHOOK_SECRET`.

---

## Slide 8 — Kendala yang Dihadapi Selama Pengerjaan & Solusinya
1. **Sinkronisasi Kontrak API antara Frontend & Backend:**
   - *Kendala:* Terjadi perbedaan nama field & validasi antara FE dan BE saat pengembangan paralel.
   - *Solusi:* Menjadikan `kontrak-api.md` sebagai satu-satunya sumber kebenaran (*single source of truth*) dan selalu mengaudit tipe TypeScript + controller Laravel sebelum coding.
2. **Performa Proxy & Hashing Password di Lingkungan Lokal (Windows/Docker):**
   - *Kendala:* Proses `bcrypt` login sempat memicu timeout proxy Next.js (`ECONNRESET`).
   - *Solusi:* Menaikkan `experimental.proxyTimeout` di `next.config.ts` dan mengoptimalkan cache Redis untuk data statis (wilayah, faskes, ambang).
3. **Ketersediaan Redis di Lingkungan Lokal & Testing:**
   - *Kendala:* Tidak semua perangkat lokal/CI menjalankan daemon Redis setiap saat.
   - *Solusi:* Menggunakan `CACHE_STORE=failover` (`redis` → `database`) di Laravel dan `array` di `phpunit.xml`, sehingga sesi/cache otomatis memakai Redis saat tersedia tanpa mematahkan test.
4. **Penyelarasan Aturan Medis & Privasi Data:**
   - *Kendala:* Kebutuhan monitoring kelurahan berbenturan dengan privasi individu warga.
   - *Solusi:* Menerapkan *k-anonymity* (menyamarkan kelompok `< 5` orang) dan audit log untuk setiap akses data individu oleh Super Admin.

---

## Slide 9 — Hasil Pengujian Sistem
- **Backend (PHPUnit):** 103 Feature Test kasus uji (Autentikasi, Kontrol Akses, Keamanan & CORS, Catatan Kesehatan, Rujukan, Posbindu, Program/Tantangan, Notifikasi Telegram, Dashboard Wilayah, Kepuasan Masyarakat, Export) — **Lulus 100%**.
- **Frontend (Jest & Next.js Build):** 40 Unit Test komponen/API + kompilasi TypeScript & produksi (`next build`) — **Lulus tanpa error**.

---

## Slide 10 — Penutup
- Sistem **SehatKita** siap digunakan untuk mendukung digitalisasi Posbindu PTM dan pelaporan kesehatan masyarakat di Kota Banjarbaru.
- Terima kasih kepada Pembimbing Lapangan & Tim Penguji atas arahan dan masukannya.

# 🏥 SehatKita — Sistem Monitoring & Skrining PTM

[![Backend CI](https://github.com/ahmdridhokurniawan/sehatkita/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ahmdridhokurniawan/sehatkita/actions)
[![Kontrak API](https://img.shields.io/badge/Kontrak%20API-v1.6.0-blue)](kontrak-api.md)
[![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)](https://php.net)
[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)](https://laravel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**SehatKita** adalah platform pemantauan dan skrining dini **Penyakit Tidak Menular (PTM)** terintegrasi berbasis web untuk skala kelurahan dan kecamatan (studi kasus wilayah kerja Dinas Kesehatan Kota Banjarbaru). Sistem ini memfasilitasi pencatatan mandiri warga, kegiatan pos pembinaan terpadu (Posbindu) oleh kader, monitoring kesehatan agregat oleh pihak kelurahan, dan perumusan kebijakan kesehatan masyarakat oleh Dinas Kesehatan.

---

## 📌 Fitur Utama

1. **Skrining Kesehatan Berkala & Mandiri:**
   - Deteksi Indeks Massa Tubuh (IMT), tekanan darah (sistol/diastol), gula darah (puasa & 2 jam setelah makan), kolesterol total, asam urat, lingkar perut, dan durasi tidur.
   - Ambang batas tensi resmi standar **Kemenkes RI / PERHI** (Sistol normal `< 130 mmHg`, Diastol normal `< 85 mmHg`).
2. **Kalkulasi Skor Risiko & Rujukan Faskes Otomatis:**
   - Normalisasi skor risiko `0–100` berbasis aturan klinis.
   - Pemicu rujukan otomatis ke Puskesmas kelurahan setempat bila tensi mencapai tingkat krisis (`>= 180/110 mmHg`).
3. **Pencatatan Kehadiran & Pemeriksaan Posbindu:**
   - Manajemen sesi pos pembinaan terpadu di setiap kelurahan.
   - Dropdown pencarian warga cepat berbasis awalan NIK 16 digit.
4. **Dashboard Agregat Anonim Kelurahan:**
   - Rekapitulasi sebaran IMT, faktor riwayat keluarga, dan demografi kelompok usia.
   - Penerapan **k-anonymity suppression** (data sel `< 5` disembunyikan demi melindungi privasi warga).
5. **Gamifikasi & Capaian Warga:**
   - Reward EXP dan level gamifikasi untuk setiap keikutsertaan program kesehatan kelurahan.
   - Badge penghargaan dan papan peringkat (*leaderboard*) kelurahan.
6. **Integrasi Bot Telegram & Pengingat Rutin:**
   - Pairing akun warga dengan bot Telegram resmi (`/telegram/status` & webhook).
   - Pengingat otomatis berkala bulanan bagi warga yang belum melakukan skrining dalam 30 hari terakhir.
7. **Layanan Pengaduan & Aspirasi Warga:**
   - Penyampaian keluhan layanan Posbindu/faskes ke pihak kelurahan dan tanggapan resmi dari Admin Kelurahan.
8. **Ekspor Rekapitulasi Data:**
   - Ekspor rekapitulasi data format CSV dengan standar UTF-8 BOM untuk pelaporan Dinkes (Catatan Kesehatan, Posbindu, Rujukan).

---

## 👥 Matriks Hak Akses & Peran Pengguna

| Role | Deskripsi | Hak Akses Utama |
|---|---|---|
| `super_admin` | Dinas Kesehatan Kota | Kelola master data (indikator, ambang, wilayah, faskes), verifikasi log catatan ekstrem, ekspor CSV, pantau statistik keseluruhan se-kota. |
| `admin_kelurahan` | Perangkat Kelurahan | Pantau dashboard agregat kelurahan, kelola jadwal sesi Posbindu, buat program kelurahan, tanggapi pengaduan warga, akses *read-only* rekam medis warga wilayahnya. |
| `kader` | Kader Posbindu | Catat kehadiran dan hasil skrining warga di sesi Posbindu, buat rujukan faskes manual, pantau warga binaan. |
| `user` | Warga Kelurahan | Catat kesehatan mandiri, pantau grafik tren pribadi, tetapkan target kesehatan dinamis, ikuti program tantangan, hubungkan bot Telegram, ajukan pengaduan. |

---

## 🚀 Arsitektur Proyek (Monorepo)

```text
sehatkita/
├── backend/            # RESTful API Service (Laravel 13, Sanctum, SQLite/MySQL)
├── frontend/           # Web Client SPA (Next.js 15, Tailwind CSS, TypeScript)
├── kontrak-api.md      # Spesifikasi resmi kontrak API v1.6.0
└── docker-compose.yml  # Orkestrasi container deployment
```

### Format Respon API Baku
Semua response API dibungkus amplop JSON standar:
```json
{
  "success": true,
  "message": "OK",
  "data": { }
}
```
Untuk respon paginasi:
```json
{
  "success": true,
  "message": "OK",
  "data": [ ],
  "meta": { "page": 1, "per_page": 15, "total": 120, "last_page": 8 }
}
```

---

## 📖 Ringkasan Rute API (Kontrak v1.6.0)

Semua rute beralamat di prefix `/api/v1/`:

### 1. Autentikasi & Profil
- `POST /auth/register` — Registrasi warga (publik, rate-limited)
- `POST /auth/login` — Autentikasi & penerbitan Bearer token
- `POST /auth/logout` — Pencabutan token sesi
- `GET /auth/me` — Info profil pengguna yang sedang login
- `GET /profil` & `PUT /profil` — Pengambilan dan pembaruan profil kesehatan & riwayat keluarga
- `POST /persetujuan` & `DELETE /persetujuan` — Manajemen persetujuan privasi data medis

### 2. Catatan Kesehatan & Posbindu
- `GET /catatan-kesehatan` & `POST /catatan-kesehatan` — Riwayat & input pemeriksaan kesehatan
- `GET /catatan-kesehatan/{id}` & `DELETE /catatan-kesehatan/{id}` — Detail & pembatalan catatan (soft delete)
- `GET /tren` — Deret waktu indikator untuk grafik tren rekam medis
- `GET /posbindu/sesi` & `POST /posbindu/sesi` — Jadwal sesi Posbindu kelurahan
- `POST /posbindu/sesi/{id}/peserta` — Pencatatan kehadiran & hasil skrining peserta Posbindu
- `GET /pengguna/cari-nik` — Autocomplete pencarian warga berbasis NIK untuk kader

### 3. Layanan Pendukung & Komunitas
- `GET /rujukan`, `POST /rujukan`, `PATCH /rujukan/{id}/status` — Alur rujukan fasilitas kesehatan
- `GET /program`, `POST /program/{id}/peserta`, `PATCH /program/{id}/peserta` — Program tantangan sehat
- `GET /target-kesehatan`, `POST /target-kesehatan`, `PATCH /target-kesehatan/{id}/capai` — Target dinamis personal
- `GET /pengaduan`, `POST /pengaduan`, `PATCH /pengaduan/{id}/tanggapi` — Saluran aspirasi warga
- `GET /telegram/status`, `POST /telegram/webhook` — Integrasi notifikasi bot Telegram

### 4. Modul Admin Dinkes (`/admin/*`)
- `GET /admin/statistik` — Metrik keseluruhan sistem
- `GET /admin/export` — Unduh data rekapitulasi format CSV (UTF-8 BOM)
- `GET /admin/catatan-kesehatan/perlu-verifikasi` & `PATCH .../verifikasi` — Verifikasi data kesehatan di luar rentang wajar
- `CRUD /admin/indikator`, `CRUD /admin/ambang-kategori`, `CRUD /admin/faskes`, `CRUD /admin/pengguna` — Master data

---

## 🛠️ Pembagian Tanggung Jawab Tim

Sesuai aturan kepemilikan kode ([`.github/CODEOWNERS`](.github/CODEOWNERS)):
* **Backend, Database, Konfigurasi Server & Kontrak API:** Ahmad Ridho Kurniawan ([@ahmdridhokurniawan](https://github.com/ahmdridhokurniawan))
* **Frontend Web Client & Integrasi Tampilan:** Daffa Aulia ([@DAFFASUPERPOWER](https://github.com/DAFFASUPERPOWER))

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi [MIT](LICENSE).

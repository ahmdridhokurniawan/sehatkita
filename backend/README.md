# ⚙️ SehatKita — Backend API Service

Service API backend untuk sistem **SehatKita**, dibangun menggunakan **Laravel 13**, **Laravel Sanctum**, dan **PHP 8.4**.

---

## 📋 Prasyarat Sistem

- **PHP:** Versi 8.4 atau lebih tinggi
- **Ekstensi PHP:** `mbstring`, `pdo_sqlite`, `sqlite3`, `pdo_mysql`, `bcmath`, `gd`, `zip`
- **Composer:** Versi 2.8+
- **Database:** MariaDB / MySQL 8.0+ (atau SQLite untuk pengujian lokal)

---

## 🛠️ Panduan Instalasi & Menjalankan

### 1. Masuk ke direktori backend
```bash
cd backend
```

### 2. Pasang dependensi
```bash
composer install
```

### 3. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan buat application key:
```bash
cp .env.example .env
php artisan key:generate
```

Sesuaikan konfigurasi database pada `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sehatkita
DB_USERNAME=root
DB_PASSWORD=
```

### 4. Migrasi & Seeding Data Awal
Jalankan migrasi skema tabel beserta seeder data wilayah, indikator, faskes, dan akun demo:
```bash
php artisan migrate:fresh --seed
```

### 5. Jalankan Server Development
```bash
php artisan serve
```
Backend akan aktif di `http://127.0.0.1:8000`.

---

## 🔑 Kredensial Akun Demo (Hasil Seeder)

Semua akun demo memiliki password default: **`demo1234`**

| Role | Email | Wilayah |
|---|---|---|
| **Super Admin Dinkes** | `superadmin@sehatkita.test` | Se-Kota / Dinkes |
| **Admin Kelurahan** | `admin.guntung-paikat@sehatkita.test` | Kelurahan Guntung Paikat |
| **Kader Posbindu** | `kader.guntung-paikat@sehatkita.test` | Kelurahan Guntung Paikat |
| **Warga Demo** | *(tersedia dari WargaDummySeeder)* | Kelurahan setempat |

---

## 🧪 Pengujian Otomatis (Testing)

Proyek ini dilengkapi dengan 45 test fitur (*feature tests*) yang menguji autentikasi, kontrol akses (*role-based access control*), kalkulasi rekam medis, dan validasi kontrak API:

```bash
php artisan test
```

Semua pengujian berjalan secara otomatis dan terisolasi menggunakan database in-memory SQLite.

---

## ⏰ Otomatisasi Jadwal Cron (Scheduler)

Sistem menggunakan scheduler Laravel untuk menjalankan pengingat skrining bulanan via Bot Telegram (`reminder:skrining-ptm`):

```bash
# Menjalankan scheduler sekali secara manual
php artisan schedule:run

# Menjalankan worker scheduler lokal untuk pengujian
php artisan schedule:work
```

---

## 📂 Struktur Direktori Utama

- `app/Http/Controllers/` — Penangan endpoint API sesuai modul kontrak
- `app/Models/` — Model Eloquent dan relasi 18 tabel database
- `app/Services/` — Layanan logika bisnis: `HealthCalculatorService`, `InsightService`, `PeringkatService`, `TelegramService`
- `app/Console/Commands/` — Perintah artisan terjadwal
- `database/migrations/` — Definisi skema tabel database
- `database/seeders/` — Seeder wilayah Banjarbaru, indikator, faskes, dan data uji
- `tests/Feature/` — Kumpulan pengujian otomatis fungsionalitas API

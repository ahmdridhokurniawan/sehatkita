# SehatKita — Backend API Service

[![Laravel](https://img.shields.io/badge/Laravel-13.17-FF2D20?logo=laravel&logoColor=white)](https://laravel.com)
[![PHP](https://img.shields.io/badge/PHP-%5E8.3-777BB4?logo=php&logoColor=white)](https://php.net)
[![Sanctum](https://img.shields.io/badge/Auth-Laravel%20Sanctum%204.3-0F172A)](https://laravel.com/docs/sanctum)
[![Kontrak API](https://img.shields.io/badge/Kontrak%20API-v1.8.4-2563EB)](../kontrak-api.md)

Service API backend untuk platform **SehatKita**, dibangun menggunakan **Laravel 13**, **Laravel Sanctum**, dan **PHP ^8.3** (diuji di PHP 8.3 & 8.4). Mengacu pada [kontrak-api.md](../kontrak-api.md) (`v1.8.4`) sebagai sumber kebenaran endpoint.

> Untuk panduan lengkap menjalankan **Backend + Frontend + Bot Telegram secara bersamaan**, lihat [README.md](../README.md) di direktori root.

---

## Prasyarat Sistem

- **PHP:** `^8.3` (diuji di PHP 8.3 & 8.4)
- **Ekstensi PHP:** `mbstring`, `pdo_sqlite`, `sqlite3`, `pdo_mysql`, `bcmath`, `gd`, `zip`
- **Composer:** `2.8+`
- **Database:** MariaDB / MySQL (atau SQLite in-memory untuk `php artisan test`)
- **Bot Telegram:** `TELEGRAM_BOT_TOKEN` & `TELEGRAM_BOT_USERNAME` dari `@BotFather` di `.env`

---

## Panduan Instalasi & Menjalankan

### Opsi A — Menggunakan Laradock (Docker)

Jika environment memakai Laradock (`mariadb`, `redis`, `php-fpm`, `nginx`, `workspace`):

1. Pastikan konfigurasi database & Bot Telegram di `backend/.env` mengarah ke service `mariadb`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=mariadb
   DB_PORT=3306
   DB_DATABASE=sehatkita
   DB_USERNAME=root
   DB_PASSWORD=root

   TELEGRAM_BOT_TOKEN=<token_dari_botfather>
   TELEGRAM_BOT_USERNAME=<username_bot_tanpa_at>
   ```
2. Jalankan migrasi & seeder dari dalam container `laradock-workspace-1`:
   ```bash
   docker exec -it laradock-workspace-1 bash -lc "cd /var/www/sehatkita/backend && composer install && cp -n .env.example .env && php artisan key:generate && php artisan migrate:fresh --seed"
   ```
3. Bersihkan cache konfigurasi/route jika ada pembaruan kode:
   ```bash
   docker exec -it laradock-workspace-1 bash -lc "cd /var/www/sehatkita/backend && php artisan optimize:clear"
   ```

### Opsi B — Lokal Tanpa Docker

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Sesuaikan koneksi MySQL/MariaDB lokal serta token Telegram di `.env` (`DB_HOST=127.0.0.1`), lalu jalankan:

```bash
php artisan migrate:fresh --seed
php artisan serve
```

Server API lokal aktif di `http://127.0.0.1:8000` (base URL API: `http://127.0.0.1:8000/api/v1`).

---

## Kredensial Akun Demo (Hasil Seeder)

Semua akun demo memiliki password default: **`demo1234`**

| Role | Contoh Email | Cakupan |
|---|---|---|
| **Super Admin Dinkes** | `superadmin@sehatkita.test` | Master data, statistik kota, verifikasi anomali, ekspor CSV, log audit |
| **Admin Kelurahan** | `admin.loktabatutara@sehatkita.test`, `admin.guntungpaikat@sehatkita.test` *(tersedia untuk seluruh 8 kelurahan)* | Agregat kelurahan, sesi Posbindu, program kelurahan, verifikasi catatan anomali kelurahan, tanggapi pengaduan |
| **Kader Posbindu** | `kader.loktabatutara@sehatkita.test`, `kader2.loktabatutara@sehatkita.test`, `kader.guntungpaikat@sehatkita.test`, `kader2.guntungpaikat@sehatkita.test` | Pencatatan peserta Posbindu, warga binaan, rujukan faskes, verifikasi bukti program |
| **Warga** | `warga.loktabatutara@sehatkita.test` (Budi Santoso), `warga.guntungpaikat@sehatkita.test` (M. Rizky Pratama), `warga.{slug}@sehatkita.test` | Catatan mandiri, grafik tren, target kesehatan, refleksi, program, pengaduan |

> Pola slug kelurahan di `PenggunaWilayahSeeder` menghilangkan spasi (huruf kecil):
> `loktabatutara`, `guntungpaikat`, `kemuning`, `loktabatselatan`, `sungaibesar`, `mentaos`, `sungaiulin`, `guntungpayung`.

---

## Bot Telegram & Scheduler

Sistem menyediakan long-polling Bot Telegram untuk pairing akun warga (`/start <token>`) dengan `Cache::lock` anti-duplikasi serta scheduler harian pukul `08:00` di `routes/console.php` untuk pengingat skrining PTM (> 30 hari), jadwal Posbindu H-1, dan tenggat target kesehatan hari ini (`reminder:skrining-ptm`).

### Di Laradock (`DB_HOST=mariadb`)

```bash
# Menjalankan long-polling Bot Telegram di dalam container workspace
docker exec -it laradock-workspace-1 bash -lc "cd /var/www/sehatkita/backend && php artisan telegram:poll"

# Menjalankan worker scheduler pengingat harian 08:00
docker exec -it laradock-workspace-1 bash -lc "cd /var/www/sehatkita/backend && php artisan schedule:work"

# Tes kirim pengingat manual sekali jalan
docker exec -it laradock-workspace-1 bash -lc "cd /var/www/sehatkita/backend && php artisan reminder:skrining-ptm"
```

### Di Lokal Tanpa Docker

```bash
# Menjalankan long-polling Bot Telegram
php artisan telegram:poll
php artisan telegram:poll --once

# Menjalankan worker scheduler lokal
php artisan schedule:work

# Menjalankan pengingat skrining PTM sekali secara manual
php artisan reminder:skrining-ptm
```

---

## Pengujian Otomatis

```bash
php artisan test

# Memeriksa konsistensi gaya kode Laravel Pint
php ./vendor/bin/pint --test app routes
```

Suite pengujian berjalan terisolasi menggunakan database in-memory SQLite dan mencakup **83 tests (439 assertions)** pada 9 file `tests/Feature/` (`AccessControlTest`, `AuthTest`, `BugFixesTest`, `CatatanKesehatanTest`, `CorsTest`, `DashboardWilayahTest`, `ProgramApiTest`, `SeederTest`, `TelegramNotificationsTest`).

---

## Struktur Direktori Utama

- `app/Http/Controllers/` — Penangan endpoint API sesuai modul kontrak (`/api/v1/*`)
- `app/Models/` — 18 Model Eloquent (`AmbangKategori`, `BadgePengguna`, `CatatanKesehatan`, `Faskes`, `Indikator`, `KunjunganPosbindu`, `LogAudit`, `Pengaduan`, `Pengguna`, `PesertaProgram`, `Profil`, `Program`, `Refleksi`, `RiwayatWilayah`, `Rujukan`, `SesiPosbindu`, `TargetKesehatan`, `Wilayah`)
- `app/Services/` — Layanan logika bisnis (`HealthCalculatorService`, `InsightService`, `PeringkatService`, `RujukanOtomatisService`, `SuratRujukanService`, `TelegramService`)
- `app/Console/Commands/` — `KirimPengingatSkrining` (`reminder:skrining-ptm`), `TelegramPollCommand` (`telegram:poll`)
- `database/migrations/` — Definisi skema tabel database
- `database/seeders/` — `WilayahSeeder`, `IndikatorSeeder`, `FaskesSeeder`, `PenggunaWilayahSeeder`, `WargaDummySeeder`, `DatabaseSeeder`
- `routes/` — `api.php` (`/v1`), `console.php` (jadwal harian `08:00`), `web.php`
- `tests/Feature/` — Kumpulan pengujian otomatis integrasi dan regresi API

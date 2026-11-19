# SehatKita — Frontend Web Application

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Kontrak API](https://img.shields.io/badge/Kontrak%20API-v1.8.4-2563EB)](../kontrak-api.md)

Aplikasi web **SehatKita** untuk pemantauan dan skrining dini Penyakit Tidak Menular (PTM) berbasis peran (*role-based*), dibangun dengan **Next.js 16 (App Router)**, **React 19**, **TypeScript**, dan **Tailwind CSS v4**. Mengacu pada [kontrak-api.md](../kontrak-api.md) (`v1.8.4`).

> Untuk panduan menjalankan **Frontend + Backend + Bot Telegram secara bersamaan**, lihat [README.md](../README.md) di direktori root.

---

## Prasyarat

- **Node.js:** `20+` dan `npm`
- **Backend API:** Laravel Backend (`../backend`) berjalan via Laradock atau `php artisan serve`

---

## Setup & Menjalankan Frontend

### Opsi A — Bersama Laradock (`http://sehatkita.test`)

Nginx Laradock meneruskan `/` ke Next.js pada port **`3002`** dan `/api/*` ke `laradock-php-fpm-1`.

1. Pastikan `frontend/.env.local` berisi:
   ```env
   NEXT_PUBLIC_API_URL=http://sehatkita.test/api/v1
   NEXT_PUBLIC_API_BASE_URL=http://sehatkita.test/api/v1
   ```
2. Pasang dependensi dan jalankan di port **`3002`**:
   ```bash
   cd frontend
   npm install
   npx next dev -p 3002
   # Atau jalankan build produksi:
   # npm run build && npx next start -p 3002
   ```
3. Buka **`http://sehatkita.test`** di browser.

### Opsi B — Lokal dengan `php artisan serve` (`http://localhost:3000`)

1. Salin `frontend/.env.example` menjadi `frontend/.env.local`:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   ```
2. Atur `API_PROXY_TARGET=http://127.0.0.1:8000` di `.env.local` dan biarkan `NEXT_PUBLIC_API_URL` kosong/dikomentari. Dengan konfigurasi ini, browser memanggil origin yang sama (`/api/v1/*`) lalu Next.js meneruskannya ke backend lewat `rewrites()` di `next.config.ts` tanpa masalah CORS.
3. Jalankan dev server:
   ```bash
   npm run dev
   ```
4. Buka **`http://localhost:3000`** di browser.

---

## Perintah Pengembangan, Build, & Pengujian

```bash
# Development server
npm run dev                  # Port default 3000
npx next dev -p 3002         # Port 3002 (untuk proxy Nginx Laradock sehatkita.test)

# Build & Preview Produksi
npm run build
npm start                    # Port 3000
npx next start -p 3002       # Port 3002

# Kualitas Kode & Pengujian
npx tsc --noEmit             # Cek tipe TypeScript
npm run lint                 # Pemeriksaan ESLint
npm test                     # Jalankan Jest + React Testing Library
```

Suite pengujian saat ini menjalankan **6 test suites (20 tests)**:
- `src/app/login/page.test.tsx`
- `src/app/onboarding/page.test.tsx`
- `src/components/charts/Charts.test.tsx`
- `src/components/ui/Button.test.tsx`
- `src/lib/api.test.ts`
- `src/lib/celebration.test.ts`

---

## Autentikasi, Proteksi Rute, & Akun Login

- **Mekanisme Token (`src/lib/api.ts`):** Menggunakan Bearer token Laravel Sanctum opaque yang disimpan di `localStorage` / `sessionStorage`.
- **Pembagian Proteksi Rute (lihat `middleware.ts`):**
  - `middleware.ts` berupa *passthrough* (tidak melakukan dekode token).
  - `AppShell` (`src/components/app/AppShell.tsx`) menjaga navigasi UI di sisi klien — mengarahkan ke `/login` bila belum login dan `/unauthorized` bila peran tidak cocok.
  - **Backend API** merupakan penjaga otorisasi final untuk seluruh endpoint.
- **Akun Login Demo:** Menggunakan akun nyata hasil seeder backend dengan password **`demo1234`** (misalnya `superadmin@sehatkita.test`, `admin.loktabatutara@sehatkita.test`, `kader.loktabatutara@sehatkita.test`, `warga.loktabatutara@sehatkita.test`). File `src/lib/demo.ts` hanya berisi data statis pratinjau di landing page.

---

## Struktur Direktori Aktual

```text
frontend/
├── src/
│   ├── app/                      # App Router (Next.js 16)
│   │   ├── page.tsx              # Landing page publik
│   │   ├── kalkulator/           # Kalkulator faktor risiko PTM publik
│   │   ├── login/                # Halaman masuk
│   │   ├── register/             # Halaman registrasi warga
│   │   ├── onboarding/           # Alur onboarding & persetujuan privasi (4 langkah)
│   │   ├── dashboard/            # Dashboard role-based (user, kader, admin_kelurahan, super_admin)
│   │   ├── catatan-kesehatan/    # Input & riwayat catatan kesehatan
│   │   ├── rekam-medis/          # Rekam medis & verifikasi cepat kelurahan
│   │   ├── insight/              # Insight klinis & ambang kategori
│   │   ├── tren/                 # Grafik tren indikator kesehatan
│   │   ├── rujukan/              # Rujukan faskes, kelurahan, & cetak surat rujukan
│   │   ├── posbindu/             # Sesi Posbindu, presensi peserta, & riwayat kunjungan
│   │   ├── program/              # Tantangan program kesehatan, bukti foto, & verifikasi peserta
│   │   ├── peringkat/            # Papan peringkat EXP & badge kelurahan
│   │   ├── target-kesehatan/     # Target dinamis & refleksi mingguan
│   │   ├── pengaduan/            # Layanan aspirasi & pengaduan warga
│   │   ├── laporan/              # Laporan pribadi & agregat kelurahan (siap cetak)
│   │   ├── profil/               # Profil kesehatan, keluarga, & preferensi
│   │   ├── setelan/              # Tautan pairing Bot Telegram, tema, & persetujuan privasi
│   │   ├── admin/                # Panel administrasi:
│   │   │   ├── statistik/        #   Ringkasan global (super_admin)
│   │   │   ├── verifikasi/       #   Antrean verifikasi anomali (super_admin & admin_kelurahan)
│   │   │   ├── pengguna/         #   Manajemen pengguna & mutasi wilayah (super_admin)
│   │   │   ├── faskes/           #   Master faskes & koordinat peta (super_admin)
│   │   │   ├── indikator/        #   Master indikator & ambang kategori (super_admin)
│   │   │   ├── pengaduan/        #   Tindak lanjut pengaduan (super_admin)
│   │   │   └── log-audit/        #   Jejak audit aktivitas sensitif (super_admin)
│   │   ├── bantuan/, batasan-medis/, kebijakan-privasi/, syarat-ketentuan/, kontak/, unauthorized/
│   ├── components/               # admin, app, auth, catatan, charts, dashboard, insight, landing, ui, warga
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # api.ts, celebration.ts, demo.ts, enums.ts, format.ts, icons.ts, labels.ts, session.ts, theme.ts, validasi.ts
│   ├── styles/                   # design-system.css, arclo-theme.css, dashboard.css, public.css
│   └── types/                    # Definisi TypeScript API & domain
├── public/                       # Aset statis
├── middleware.ts                 # Passthrough handler
├── next.config.ts                # Rewrite proxy /api/v1/* & allowedDevOrigins
├── jest.config.ts                # Konfigurasi Jest
└── package.json
```

---

## Referensi

- [README.md](../README.md) — Panduan utama monorepo (Backend + Frontend + Bot Telegram)
- [kontrak-api.md](../kontrak-api.md) — Kontrak API v1.8.4
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Catatan deployment frontend

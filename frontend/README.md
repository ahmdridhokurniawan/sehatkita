# sehatkita Frontend

**Sistem monitoring kesehatan kecamatan (PTM)** — aplikasi Next.js 16 role-based untuk masyarakat, kader posbindu, admin kelurahan, dan super admin.

## Struktur Aplikasi

```
frontend/
├── src/
│   ├── app/                          # App Router (Next.js 16)
│   │   ├── (auth)/                   # Auth routes (login, register, onboarding)
│   │   ├── dashboard/                # Dashboard role-based (conditional render)
│   │   ├── dashboard/kelurahan/      # Dashboard admin_kelurahan (tier 3)
│   │   ├── laporan/                  # Laporan agregat kelurahan (tier 3)
│   │   ├── program/                  # Manajemen program posbindu (tier 3)
│   │   ├── program/[id]/             # Detail program: peserta, sesi, pencapaian (tier 3)
│   │   ├── rujukan/kelurahan/        # List rujukan per kelurahan (tier 3)
│   │   ├── pengaturan/               # 5 halaman pengaturan super_admin (tier 4)
│   │   │   ├── wilayah/
│   │   │   ├── faskes/
│   │   │   ├── pengguna/
│   │   │   ├── indikator/
│   │   │   └── ambang/
│   │   ├── profil/                   # User profile
│   │   ├── notifikasi/               # Notifications
│   │   ├── rekam-medis/              # Medical records
│   │   ├── insight/                  # Health insights
│   │   ├── tren/                     # Trends
│   │   ├── rujukan/                  # Referral list
│   │   ├── catatan-kesehatan/        # Health notes
│   │   └── unauthorized/             # 403 error page
│   ├── components/
│   │   ├── app/                      # App layout & shell
│   │   ├── ui/                       # UI primitives (Button, Badge, Icon, etc.)
│   │   ├── dashboard/                # Dashboard components (tier 1-4)
│   │   └── charts/                   # Chart components (Bar, Line, etc.)
│   ├── hooks/                        # React hooks (useUser, etc.)
│   ├── lib/
│   │   ├── demo.ts                   # Demo data (4 role akun)
│   │   ├── dummy.ts                  # Dummy data (dashboard, program, rujukan, etc.)
│   │   ├── format.ts                 # Format utils (tanggal, angka, dll)
│   │   ├── labels.ts                 # Label constants (role, status, dll)
│   │   ├── session.ts                # Session utils (demo user simulation)
│   │   └── [utilities]
│   ├── types/                        # TypeScript types (User, Program, etc.)
│   ├── styles/                       # Global styles (CSS)
│   └── [pages & components]
├── middleware.ts                     # Route permission guard (role-based)
├── public/                           # Static assets
├── tailwind.config.ts                # Tailwind v4 config
└── tsconfig.json                     # TypeScript config
```

## Role & Permission Matrix

| Role | Dashboard | Pengaturan | Laporan | Program | Rujukan Kelurahan | Dashboard Kelurahan |
|------|-----------|-----------|---------|---------|------------------|-------------------|
| user | ✅ (tier 1) | ❌ | ❌ | ❌ | ❌ | ❌ |
| kader | ✅ (tier 2) | ❌ | ❌ | ✅ | ❌ | ❌ |
| admin_kelurahan | ✅ (tier 3) | ❌ | ✅ | ✅ | ✅ | ✅ |
| super_admin | ✅ (tier 4) | ✅ | ❌ | ❌ | ❌ | ❌ |

## Setup Dev Server

### Prerequisites
- Node.js 18+
- Docker (untuk MariaDB backend — optional, tidak perlu untuk FE-only dev)

### Install & Run

```bash
# 1. Navigate ke frontend folder
cd C:/Users/asus/sehatkita/frontend

# 2. Install dependencies
npm install

# 3. Run dev server (port 3002)
npm run dev

# 4. Open browser
# http://localhost:3002
```

### Build Production

```bash
# Build
npm run build

# Preview build
npm start
```

## Testing Flow

### Demo Akun

4 demo akun tersedia di `lib/demo.ts`:

| Email | Role | Password | Akses |
|-------|------|----------|-------|
| `user@demo.sehatkita.id` | user | sehat123 | Dashboard user (tier 1) |
| `kader@demo.sehatkita.id` | kader | sehat123 | Dashboard kader (tier 2) + Program |
| `admin@demo.sehatkita.id` | admin_kelurahan | sehat123 | Dashboard admin (tier 3) + Laporan, Program, Rujukan |
| `superadmin@demo.sehatkita.id` | super_admin | sehat123 | Dashboard super admin (tier 4) + Pengaturan |

### Login Flow (Demo Simulation)

1. Buka http://localhost:3002
2. Klik "Masuk" → `/login`
3. Pilih akun demo dari dropdown
4. Submit (no backend required)
5. Redirect → `/onboarding` (consent form) → `/dashboard` (role-specific)

### Role-Based Access Test

**User (tier 1):**
- ✅ `/dashboard` — dashboard user (kartu status, indikator, insight, dll)
- ❌ `/pengaturan/wilayah` → redirect `/unauthorized`
- ❌ `/laporan` → redirect `/unauthorized`

**Kader (tier 2):**
- ✅ `/dashboard` — dashboard kader (aktivitas, sesi, peserta)
- ✅ `/program` — list & manajemen program
- ❌ `/laporan` → redirect `/unauthorized`

**Admin Kelurahan (tier 3):**
- ✅ `/dashboard/kelurahan` — dashboard admin
- ✅ `/laporan` — laporan agregat (chart, filter, export)
- ✅ `/program` + `/program/[id]` — manajemen & detail program
- ✅ `/rujukan/kelurahan` — list rujukan
- ❌ `/pengaturan/wilayah` → redirect `/unauthorized`

**Super Admin (tier 4):**
- ✅ `/dashboard` — dashboard super admin
- ✅ `/pengaturan/*` — kelurahan, faskes, pengguna, indikator, ambang
- ❌ `/laporan` → redirect `/unauthorized`

### Tab Navigation Test

**Program Detail** (`/program/1`):
- Tab "Detail" — info program, tujuan, penanggung jawab
- Tab "Peserta" — daftar peserta, status (normal/waspada/berbahaya)
- Tab "Sesi" — daftar sesi, kehadiran per sesi
- Tab "Pencapaian" — metrik program (target, realisasi, kehadiran %)

## Middleware Guard

Route protection via `middleware.ts`:

```typescript
// Permission matrix
/pengaturan/*            → super_admin
/laporan                 → admin_kelurahan
/rujukan/kelurahan       → admin_kelurahan
/dashboard/kelurahan     → admin_kelurahan
/program                 → admin_kelurahan, kader
```

- Unauthenticated → redirect `/login`
- Invalid role → redirect `/unauthorized`
- Cookie `demo_user_role` set by `useUser()` hook

## Demo Data

- **Akun**: 4 role di `lib/demo.ts`
- **Dashboard**: Dummy data di `lib/dummy.ts`
- **Charts**: Mock data (Bar, Line, Pie via SVG)
- **Status Badge**: Warna-coded (safe/warning/danger)

## Project Commands

```bash
# Development
npm run dev              # Start dev server (port 3002)

# Build & Test
npm run build            # Production build
npm start                # Preview build
npm run lint             # ESLint check
npx tsc --noEmit         # TypeScript check

# Git Workflow (from repo root)
git checkout -b daffa/feature-name
# ... edit & test ...
git add -A && git commit -m "feat(area): deskripsi"
git push -u origin daffa/feature-name
bash scripts/pr-merge.sh "daffa/feature-name" "title" "body-file.md"
```

## Tech Stack

- **Next.js 16.3.8** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide Icons**
- **Chart Components** (Bar, Line, Pie via SVG)

## Fase D — Dashboard & Role Guard (Complete)

✅ 6 PR merged, 26 rute, role-based middleware guard

### Deliverables
- 4 dashboard (tier 1-4 role-based)
- 5 halaman pengaturan super_admin
- 3 halaman detail tier 3 (laporan, program, rujukan)
- Detail program dengan tab navigation
- Middleware guard + unauthorized page

### Testing
Demo flow: login → role-specific dashboard → protected routes test → middleware validation

## Next Steps

1. **Fase E** — aplikasi tier 1 detail (catatan kesehatan, insight, tren, program daftar)
2. **API Integration** — ganti dummy data jadi kontrak v1.2 endpoints
3. **Deployment** — build & hosting

## References

- **Kontrak API**: `kontrak-api.md` (v1.2)
- **Backend**: `backend/` folder (Laravel 13 + Sanctum)
- **Prototype**: `C:\Users\asus\sehatkita-prototype` (~35 HTML pages reference)

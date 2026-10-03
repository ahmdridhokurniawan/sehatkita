# Kontrak API — Sistem Monitoring Kesehatan PTM (Skala Kecamatan)

**Versi:** 1.1 (BEKU)
**Base URL:** `http://pm-monitoring.test/api/v1`
**Backend:** Laravel + Sanctum (token)
**Frontend:** konsumen token (SPA/desktop)

> **Aturan pakai dokumen ini:**
> 1. Setelah dokumen ini disetujui, **bentuk field dan nama field tidak boleh berubah tanpa kesepakatan dua orang.** FE boleh mulai bikin UI pakai data dummy sesuai bentuk di sini.
> 2. Perubahan yang tidak bisa dihindari → catat di bagian **Changelog** paling bawah, naikkan versi minor, kabari partner.
> 3. Field yang **dihitung server** (ditandai `read-only`) tidak boleh dikirim FE saat POST/PUT. FE hanya menampilkan.

---

## 0. Keputusan Desain yang Sudah Dikunci

| # | Keputusan | Alasan |
|---|---|---|
| 1 | **Penamaan seragam bahasa Indonesia** untuk tabel & path endpoint domain. Istilah teknis standar tetap Inggris (`auth`, `admin`, `dashboard`, `id`, `created_at`, `name`, `email`) | Satu gaya, mudah dibaca di laporan magang. `auth`/`admin`/`dashboard` adalah istilah baku Laravel — diterjemahkan malah bikin bingung |
| 2 | **Kolom `konsumsi_manis` masuk** ke `catatan_kesehatan` | Fiturnya ada di dokumen fitur, jangan sampai kolomnya hilang |
| 3 | **`wilayah_id` dipilih sendiri user saat register** dari dropdown `/wilayah` | Sesuai dokumen fitur. Bisa diubah `super_admin` bila salah |
| 4 | Field teknis Laravel tetap Inggris: `id`, `created_at`, `updated_at`, `user_id`, `name`, `email`, `page`, `per_page` | Mengganti `user_id` → `pengguna_id` memaksa FE & BE kerja ekstra tanpa manfaat |
| 5 | **PDF laporan digenerate FE**, BE kirim JSON | BE tidak perlu urus layout PDF (hemat berhari-hari) |

---

## 1. Konvensi Umum

### 1.1 Header

| Header | Nilai | Kapan |
|---|---|---|
| `Accept` | `application/json` | **selalu** |
| `Content-Type` | `application/json` | saat kirim body |
| `Authorization` | `Bearer {token}` | semua endpoint kecuali register & login |

### 1.2 Envelope Response (SUKSES)

```json
{
  "success": true,
  "message": "OK",
  "data": { }
}
```

### 1.3 Envelope Response (SUKSES + PAGINASI)

```json
{
  "success": true,
  "message": "OK",
  "data": [ ],
  "meta": {
    "page": 1,
    "per_page": 15,
    "total": 120,
    "last_page": 8
  }
}
```

Query param paginasi: `?page=1&per_page=15` (`per_page` maks 100).

### 1.4 Envelope Response (GAGAL)

```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "bb_kg": ["Berat badan wajib diisi."]
  }
}
```

`errors` hanya muncul pada 422. Pada error lain `errors` dihilangkan.

### 1.5 Kode HTTP yang Dipakai

| Kode | Arti | Kapan |
|---|---|---|
| 200 | OK | GET/PUT/PATCH sukses |
| 201 | Created | POST sukses membuat data |
| 401 | Unauthorized | token tidak ada / kadaluarsa |
| 403 | Forbidden | token valid tapi role tidak berhak (bukan soal wilayah) |
| 404 | Not Found | id tidak ada **atau** di luar scope wilayah user |
| 422 | Unprocessable Entity | validasi gagal |
| 429 | Too Many Requests | rate limit login |

> **Catatan keamanan (penting):** resource di luar scope wilayah mengembalikan **404, bukan 403**. Ini sengaja — supaya admin kelurahan A tidak bisa "menebak" keberadaan data kelurahan B.

### 1.6 Format Nilai

| Tipe | Format | Contoh |
|---|---|---|
| Tanggal | `YYYY-MM-DD` | `2026-10-03` |
| Tanggal+waktu | ISO 8601 | `2026-10-03T14:22:00+08:00` |
| Angka desimal | JSON number, 2 desimal untuk IMT | `25.09` |
| Boolean | `true` / `false` | `true` |
| Enum | string huruf kecil | `"mandiri"` |
| Null | `null` (bukan `""`) | `null` |

### 1.7 Enum (Kunci — jangan salah tulis)

| Nama | Nilai sah |
|---|---|
| `role` | `super_admin`, `admin_kelurahan`, `kader`, `user` |
| `sumber` | `mandiri`, `kader`, `puskesmas` |
| `jenis_gula_darah` | `puasa`, `2jam_pp` |
| `jenis_kelamin` | `L`, `P` |
| `status_rujukan` | `baru`, `dihubungi`, `tertangani`, `ditolak` |
| `status_kesehatan` | `normal`, `perlu_perhatian`, `berisiko` |
| `kategori_imt` | `kurus`, `normal`, `gemuk`, `obesitas` |
| `tingkat_aktivitas` | `ringan`, `sedang`, `berat` |
| `konsumsi_manis` | `jarang`, `sering`, `setiap_hari` |
| `jenis_program` | `olahraga`, `edukasi`, `pemeriksaan`, `lainnya` |
| `status_program` | `akan_datang`, `berjalan`, `selesai` |
| `status_peserta` | `terdaftar`, `selesai`, `berhenti` |
| `level_insight` | `info`, `peringatan`, `bahaya` |

---

## 2. Role & Scope Wilayah

| Role | Cakupan data |
|---|---|
| `super_admin` | seluruh kecamatan + master data |
| `admin_kelurahan` | agregat kelurahan miliknya saja |
| `kader` | data masyarakat yang ditugaskan kepadanya |
| `user` | data dirinya sendiri saja |

**Middleware backend tiap route:** `auth:sanctum` → `role:{...}` → `scope.wilayah`.

---

## 3. Peta Nama Endpoint → Tabel

Supaya BE & FE tidak salah sebut. **Path = bahasa Indonesia.**

| Path (§) | Tabel DB |
|---|---|
| `/auth/*` (§4) | `pengguna` |
| `/profil` (§5) | `profil` |
| `/persetujuan` (§5) | kolom `consent_at` di `pengguna` |
| `/wilayah` (§6) | `wilayah` |
| `/faskes` (§6) | `faskes` |
| `/catatan-kesehatan` (§7) | `catatan_kesehatan` |
| `/dashboard/pribadi`, `/tren`, `/insight` (§8) | `catatan_kesehatan` (agregasi) |
| `/dashboard/kelurahan` (§9) | `catatan_kesehatan` + `pengguna` + `rujukan` (agregasi) |
| `/posbindu/*` (§10) | `sesi_posbindu`, `kunjungan_posbindu` |
| `/rujukan` (§11) | `rujukan` |
| `/program` (§12) | `program`, `peserta_program` |
| `/target`, `/refleksi` (§13) | `profil` / `refleksi` |
| `/laporan/*` (§14) | agregasi |
| `/admin/*` (§15) | `indikator`, `ambang_kategori`, `pengguna`, `faskes`, `log_audit` |

---

## 4. Modul Auth

### 4.1 POST `/auth/register`

Publik. Mendaftarkan masyarakat (`role` otomatis `user`). **`wilayah_id` dipilih sendiri** dari dropdown `/wilayah`.

**Request**
```json
{
  "name": "Budi Santoso",
  "email": "budi@mail.com",
  "password": "rahasia123",
  "password_confirmation": "rahasia123",
  "wilayah_id": 3
}
```

**Sukses 201**
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "user": {
      "id": 12,
      "name": "Budi Santoso",
      "email": "budi@mail.com",
      "role": "user",
      "wilayah_id": 3,
      "wilayah": { "id": 3, "nama": "Kelurahan Sungai Besar" },
      "consent_at": null
    },
    "token": "12|xxxxxxxxxxxxxxxxxxxx"
  }
}
```

> FE wajib mengarahkan user ke form consent setelah register (`consent_at` masih `null`).

### 4.2 POST `/auth/login`

Publik. Rate limit: 5 percobaan/menit/IP.

**Request**
```json
{
  "email": "budi@mail.com",
  "password": "rahasia123",
  "device_name": "desktop-app"
}
```

**Sukses 200** — bentuk sama dengan register (`user` + `token`).

**Gagal 422**
```json
{
  "success": false,
  "message": "Email atau password salah.",
  "errors": { "email": ["Email atau password salah."] }
}
```

### 4.3 POST `/auth/logout`

Auth. Cabut token yang sedang dipakai.

**Sukses 200**
```json
{ "success": true, "message": "Logout berhasil", "data": null }
```

### 4.4 GET `/auth/me`

Auth. Dipakai FE saat aplikasi dibuka untuk memulihkan sesi dari token tersimpan.

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 12,
    "name": "Budi Santoso",
    "email": "budi@mail.com",
    "role": "user",
    "wilayah_id": 3,
    "consent_at": "2026-10-03T09:00:00+08:00",
    "profil": {
      "tgl_lahir": "1998-04-11",
      "usia": 28,
      "jenis_kelamin": "L",
      "tinggi_cm": 170,
      "tingkat_aktivitas": "sedang",
      "merokok": false,
      "riwayat_keluarga": ["hipertensi", "diabetes"]
    }
  }
}
```

---

## 5. Modul Profil & Persetujuan

### 5.1 GET `/profil`

Auth (`user`).

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "user_id": 12,
    "tgl_lahir": "1998-04-11",
    "usia": 28,
    "jenis_kelamin": "L",
    "tinggi_cm": 170,
    "tingkat_aktivitas": "sedang",
    "merokok": false,
    "riwayat_keluarga": ["hipertensi"],
    "updated_at": "2026-10-03T09:00:00+08:00"
  }
}
```

### 5.2 PUT `/profil`

Auth (`user`). Kirim **seluruh** field (bukan partial). `tinggi_cm` dipakai untuk hitung IMT.

**Request**
```json
{
  "tgl_lahir": "1998-04-11",
  "jenis_kelamin": "L",
  "tinggi_cm": 170,
  "tingkat_aktivitas": "sedang",
  "merokok": false,
  "riwayat_keluarga": ["hipertensi"]
}
```

**Sukses 200** — bentuk sama dengan GET.

**Validasi:** `tgl_lahir` sebelum hari ini; `tinggi_cm` 50–250; `jenis_kelamin` ∈ enum; `riwayat_keluarga` array of string (boleh `[]`).

### 5.3 POST `/persetujuan`

Auth (`user`). Catat persetujuan (menulis `pengguna.consent_at`).

**Request**
```json
{ "versi_kebijakan": "1.0", "setuju": true }
```

**Sukses 200**
```json
{
  "success": true,
  "message": "Persetujuan dicatat",
  "data": { "consent_at": "2026-10-03T09:00:00+08:00", "versi_kebijakan": "1.0" }
}
```

### 5.4 DELETE `/persetujuan`

Auth (`user`). Tarik izin. **Efek:** user tidak bisa mencatat kesehatan baru & keluar dari agregat. Data lama tetap tersimpan (audit).

**Sukses 200**
```json
{ "success": true, "message": "Persetujuan ditarik", "data": { "consent_at": null } }
```

---

## 6. Modul Master (Wilayah & Faskes)

### 6.1 GET `/wilayah`

Publik (dipakai form register). Query: `?tipe=kecamatan|kelurahan&parent_id=1`

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "id": 1, "nama": "Kecamatan Landasan Ulin", "tipe": "kecamatan", "kode": "6372", "parent_id": null },
    { "id": 3, "nama": "Kelurahan Sungai Besar", "tipe": "kelurahan", "kode": "6372001", "parent_id": 1 }
  ]
}
```

### 6.2 GET `/faskes`

Auth. Query: `?wilayah_id=3`

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "nama": "Puskesmas Landasan Ulin",
      "jenis": "puskesmas",
      "alamat": "Jl. ...",
      "telepon": "0511xxxx",
      "wilayah_id": 1
    }
  ]
}
```

---

## 7. Modul Catatan Kesehatan (Inti)

### 7.1 Aturan Penting

- **Append-only.** Tidak ada endpoint UPDATE. Salah input → DELETE lalu buat baru.
- **Field read-only** (dihitung server, FE tidak mengirim): `imt`, `kategori_imt`, `kategori_tensi`, `kategori_gula_darah`, `kategori_kolesterol`, `kategori_asam_urat`, `status_kesehatan`, `perlu_verifikasi`.
- **`tinggi_cm`** diambil dari profil, bukan dikirim ulang.
- Data tidak lengkap tetap boleh disimpan (mis. hanya catat berat badan). Server menghitung apa pun yang bisa dihitung.

### 7.2 POST `/catatan-kesehatan`

Auth (`user` untuk `sumber=mandiri`; `kader` untuk `sumber=kader`).

**Request**
```json
{
  "dicatat_pada": "2026-10-03",
  "sumber": "mandiri",
  "bb_kg": 72.5,
  "sistol": 138,
  "diastol": 88,
  "gula_darah": 110,
  "jenis_gula_darah": "puasa",
  "kolesterol": 200,
  "asam_urat": 6.1,
  "lingkar_perut": 92,
  "tidur_jam": 6,
  "merokok": true,
  "konsumsi_manis": "sering",
  "catatan": "Kurang tidur karena lembur"
}
```

Semua field angka **opsional** kecuali `dicatat_pada` dan `sumber`.

> Untuk `sumber=kader`, wajib tambahan `user_id` (anggota yang diukur) dan `sesi_posbindu_id`.

**Sukses 201**
```json
{
  "success": true,
  "message": "Data kesehatan tersimpan",
  "data": {
    "id": 41,
    "user_id": 12,
    "dicatat_pada": "2026-10-03",
    "sumber": "mandiri",
    "bb_kg": 72.5,
    "tinggi_cm": 170,
    "imt": 25.09,
    "kategori_imt": "gemuk",
    "sistol": 138,
    "diastol": 88,
    "kategori_tensi": "perlu_perhatian",
    "gula_darah": 110,
    "jenis_gula_darah": "puasa",
    "kategori_gula_darah": "normal",
    "kolesterol": 200,
    "kategori_kolesterol": "perlu_perhatian",
    "asam_urat": 6.1,
    "kategori_asam_urat": "normal",
    "lingkar_perut": 92,
    "tidur_jam": 6,
    "merokok": true,
    "konsumsi_manis": "sering",
    "status_kesehatan": "perlu_perhatian",
    "perlu_verifikasi": false,
    "catatan": "Kurang tidur karena lembur",
    "dicatat_oleh": { "id": 5, "name": "Kader A" },
    "created_at": "2026-10-03T14:22:00+08:00"
  }
}
```

**Validasi rentang (422 bila di luar):**

| Field | Rentang wajar |
|---|---|
| `bb_kg` | 20 – 300 |
| `sistol` | 60 – 260 |
| `diastol` | 30 – 160 |
| `gula_darah` | 20 – 700 |
| `kolesterol` | 50 – 600 |
| `asam_urat` | 1 – 20 |
| `lingkar_perut` | 40 – 200 |
| `tidur_jam` | 0 – 24 |

> **Nilai di luar rentang wajar** → disimpan TAPI `perlu_verifikasi = true` dan dikeluarkan dari perhitungan agregat sampai diverifikasi admin.

### 7.3 GET `/catatan-kesehatan`

Auth. Query: `?page=1&per_page=15&indikator=imt&dari=2026-07-01&sampai=2026-10-03`
- `user` → otomatis hanya miliknya.
- `kader` → tambahan `?user_id=12` untuk riwayat anggota binaannya.
- `admin_kelurahan`/`super_admin` → **tidak boleh** endpoint ini untuk data individu (pakai dashboard agregat).

**Sukses 200** (array objek seperti §7.2 + paginasi).

### 7.4 GET `/catatan-kesehatan/{id}`

Auth. Detail satu log. Di luar scope → 404. **Sukses 200** — objek seperti §7.2.

### 7.5 DELETE `/catatan-kesehatan/{id}`

Auth (`user` pemilik, atau `super_admin`). Hapus satu log (koreksi salah input).

**Sukses 200**
```json
{ "success": true, "message": "Data dihapus", "data": null }
```

---

## 8. Modul Analitik & Dashboard Pribadi

### 8.1 GET `/dashboard/pribadi`

Auth (`user`).

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "status_kesehatan": "perlu_perhatian",
    "skor_risiko": 42,
    "indikator_terkini": {
      "bb_kg": 72.5,
      "tinggi_cm": 170,
      "imt": 25.09,
      "kategori_imt": "gemuk",
      "sistol": 138,
      "diastol": 88,
      "kategori_tensi": "perlu_perhatian",
      "gula_darah": 110,
      "kolesterol": 200,
      "asam_urat": 6.1,
      "lingkar_perut": 92,
      "dicatat_pada": "2026-10-03",
      "sumber": "mandiri"
    },
    "perbandingan": {
      "periode_ini": "2026-10",
      "periode_lalu": "2026-09",
      "bb_selisih_kg": -1.2,
      "imt_selisih": -0.42,
      "sistol_selisih": -4
    },
    "target": { "bb_target_kg": 68, "progress_persen": 60 },
    "jadwal_skrining_berikutnya": [
      { "indikator": "gula_darah", "jatuh_tempo": "2026-11-03", "status": "akan_datang" }
    ],
    "rujukan_aktif": null
  }
}
```

> `indikator_terkini` = log terbaru per indikator (bisa dari tanggal berbeda). `null` bila belum pernah dicatat.

### 8.2 GET `/tren`

Auth (`user`). Query: `?indikator=imt&periode=3m`
- `indikator` ∈ `bb_kg`, `imt`, `sistol`, `diastol`, `gula_darah`, `kolesterol`, `asam_urat`, `lingkar_perut`. Boleh multi: `?indikator=imt,bb_kg`
- `periode` ∈ `1m`, `3m`, `6m`, `1y`

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "periode": "3m",
    "series": [
      {
        "indikator": "imt",
        "satuan": "kg/m2",
        "titik": [
          { "tanggal": "2026-08-03", "nilai": 26.1 },
          { "tanggal": "2026-09-03", "nilai": 25.5 },
          { "tanggal": "2026-10-03", "nilai": 25.09 }
        ]
      }
    ]
  }
}
```

### 8.3 GET `/insight`

Auth (`user`). Insight berbasis aturan (if-then, bukan ML).

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "kode": "BB_NAIK_3MINGGU",
      "level": "peringatan",
      "teks": "Berat badan mengalami peningkatan selama 3 minggu terakhir.",
      "dibuat_pada": "2026-10-03T08:00:00+08:00"
    },
    {
      "kode": "BELUM_SKRINING_GULA",
      "level": "info",
      "teks": "Anda belum melakukan skrining gula darah selama 7 bulan. Jadwalkan pemeriksaan.",
      "dibuat_pada": "2026-10-03T08:00:00+08:00"
    }
  ]
}
```

`level` ∈ `info`, `peringatan`, `bahaya`.

---

## 9. Modul Dashboard Kelurahan (Agregat Anonim)

### 9.1 GET `/dashboard/kelurahan`

Auth (`admin_kelurahan`, `super_admin`). **Selalu agregat.** `admin_kelurahan` terkunci ke wilayahnya; `super_admin` boleh `?wilayah_id=3`.

Query: `?periode=3m&wilayah_id=3`

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "wilayah": { "id": 3, "nama": "Kelurahan Sungai Besar" },
    "periode": "3m",
    "total_peserta": 214,
    "total_pengguna_aktif": 178,
    "total_pencatatan": 940,
    "distribusi_imt": [
      { "kategori": "kurus", "jumlah": 12 },
      { "kategori": "normal", "jumlah": 120 },
      { "kategori": "gemuk", "jumlah": 62 },
      { "kategori": "obesitas", "jumlah": 20 }
    ],
    "distribusi_risiko": [
      { "faktor": "hipertensi", "jumlah": 48 },
      { "faktor": "diabetes", "jumlah": 21 },
      { "faktor": "obesitas", "jumlah": 20 }
    ],
    "distribusi_kelompok_usia": [
      { "kelompok": "20-24", "jumlah": 18 },
      { "kelompok": "25-29", "jumlah": 34 },
      { "kelompok": "50-54", "jumlah": 9 }
    ],
    "rujukan": {
      "total": 30,
      "baru": 8,
      "dihubungi": 10,
      "tertangani": 10,
      "ditolak": 2,
      "belum_ditindaklanjuti": 8
    },
    "kepatuhan_pencatatan_persen": 71,
    "tren": [
      { "periode": "2026-08", "total_pencatatan": 280 },
      { "periode": "2026-09", "total_pencatatan": 320 },
      { "periode": "2026-10", "total_pencatatan": 340 }
    ]
  }
}
```

### 9.2 Aturan Suppression (WAJIB — jangan dilewat)

- Sel agregat dengan **jumlah < 5** **tidak dikirim** ke response. Contoh: kelompok usia yang cuma 3 orang → entri itu **dihilangkan sepenuhnya**, bukan ditulis `{"jumlah": 3}`.
- `admin_kelurahan` **tidak pernah** menerima data individu lewat endpoint ini. Tidak ada field nama/email/user_id di response.
- Usia disajikan dalam **kelompok**, bukan tanggal lahir.
- Log dengan `perlu_verifikasi = true` **tidak dihitung** dalam agregat.
- Semua aturan ini di **query layer** (SQL), bukan disaring di FE.

> **Ini titik yang paling diuji penguji.** Kalau FE yang menyembunyikan, itu klaim palsu. FE hanya menampilkan apa yang dikirim; penyaringan ada di backend.

---

## 10. Modul Posbindu

### 10.1 GET `/posbindu/sesi`

Auth (`kader`, `admin_kelurahan`, `super_admin`). Query: `?wilayah_id=3&dari=2026-10-01&status=akan_datang`

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 7,
      "wilayah_id": 3,
      "tanggal": "2026-10-10",
      "lokasi": "Balai Kelurahan Sungai Besar",
      "kader": { "id": 5, "name": "Kader A" },
      "catatan": "Pemeriksaan rutin bulanan",
      "jumlah_peserta": 42,
      "hadir": 30
    }
  ]
}
```

### 10.2 POST `/posbindu/sesi`

Auth (`admin_kelurahan`, `super_admin`).

**Request**
```json
{
  "wilayah_id": 3,
  "tanggal": "2026-10-10",
  "lokasi": "Balai Kelurahan Sungai Besar",
  "kader_id": 5,
  "catatan": "Pemeriksaan rutin bulanan"
}
```

**Sukses 201** — objek sesi seperti §10.1.

### 10.3 GET `/posbindu/sesi/{id}`

Auth. Detail sesi + daftar peserta.

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 7,
    "tanggal": "2026-10-10",
    "lokasi": "Balai Kelurahan Sungai Besar",
    "kader": { "id": 5, "name": "Kader A" },
    "peserta": [
      { "kunjungan_id": 51, "user_id": 12, "name": "Budi Santoso", "hadir": true, "dicatat": true },
      { "kunjungan_id": 52, "user_id": 13, "name": "Siti Aminah", "hadir": false, "dicatat": false }
    ]
  }
}
```

### 10.4 PUT `/posbindu/sesi/{id}`

Auth (`admin_kelurahan`, `super_admin`). Ubah tanggal/lokasi/kader/catatan. **Sukses 200.**

### 10.5 POST `/posbindu/sesi/{id}/peserta`

Auth (`kader`, `admin_kelurahan`).

**Request**
```json
{
  "user_id": 12,
  "hadir": true,
  "catatan_kesehatan": {
    "bb_kg": 72.5,
    "sistol": 138,
    "diastol": 88,
    "gula_darah": 110,
    "jenis_gula_darah": "puasa"
  }
}
```

> Bila `catatan_kesehatan` diisi, backend otomatis membuat baris `catatan_kesehatan` dengan `sumber=kader` dan `sesi_posbindu_id` sesi ini. `hadir: false` → tidak boleh ada `catatan_kesehatan`.

**Sukses 201**
```json
{
  "success": true,
  "message": "Peserta ditambahkan",
  "data": { "kunjungan_id": 53, "user_id": 14, "hadir": true, "catatan_kesehatan_id": 88 }
}
```

### 10.6 GET `/posbindu/kunjungan`

Auth (`kader`, `user`). Query: `?user_id=12`

**Sukses 200** (array + paginasi)
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "kunjungan_id": 51,
      "sesi_id": 7,
      "tanggal": "2026-10-10",
      "lokasi": "Balai Kelurahan Sungai Besar",
      "hadir": true,
      "catatan_kesehatan_id": 88
    }
  ]
}
```

---

## 11. Modul Rujukan

### 11.1 POST `/rujukan`

Auth (`kader`, `admin_kelurahan`).

**Request**
```json
{
  "user_id": 12,
  "faskes_id": 1,
  "alasan": "Tekanan darah tinggi pada 2 pengukuran terakhir"
}
```

**Sukses 201**
```json
{
  "success": true,
  "message": "Rujukan dibuat",
  "data": {
    "id": 15,
    "user_id": 12,
    "faskes": { "id": 1, "nama": "Puskesmas Landasan Ulin" },
    "alasan": "Tekanan darah tinggi pada 2 pengukuran terakhir",
    "status": "baru",
    "dibuat_oleh": { "id": 5, "name": "Kader A" },
    "ditangani_oleh": null,
    "catatan": null,
    "created_at": "2026-10-03T14:30:00+08:00",
    "updated_at": "2026-10-03T14:30:00+08:00"
  }
}
```

### 11.2 GET `/rujukan`

Auth.
- `user` → hanya rujukan miliknya.
- `kader`/`admin_kelurahan` → rujukan di wilayahnya.

Query: `?status=baru&wilayah_id=3&dari=...&sampai=...`

**Sukses 200** (array + paginasi) — objek seperti §11.1.

### 11.3 PATCH `/rujukan/{id}/status`

Auth (`kader`, `admin_kelurahan`).

**Request**
```json
{ "status": "dihubungi", "catatan": "Sudah dihubungi via telepon, jadwal kontrol Senin" }
```

**Sukses 200** — objek rujukan terbaru. `ditangani_oleh` & `updated_at` terisi otomatis dari token.

---

## 12. Modul Program Kesehatan

### 12.1 GET `/program`

Auth. Query: `?status=berjalan`

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 4,
      "judul": "Program 21 Hari Hidup Sehat",
      "jenis": "olahraga",
      "target_peserta": 100,
      "jumlah_peserta": 64,
      "mulai": "2026-10-06",
      "selesai": "2026-10-27",
      "status": "berjalan",
      "diikuti": true
    }
  ]
}
```

### 12.2 POST `/program`

Auth (`admin_kelurahan`, `super_admin`). Request: `wilayah_id`, `judul`, `jenis`, `target_peserta`, `mulai`, `selesai`. **Sukses 201.**

### 12.3 POST `/program/{id}/peserta`

Auth (`user`). Ikut program.

**Sukses 201**
```json
{ "success": true, "message": "Berhasil mengikuti program", "data": { "status": "terdaftar" } }
```

### 12.4 PATCH `/program/{id}/peserta`

Auth (`user`, `admin_kelurahan`). Ubah status: `terdaftar` | `selesai` | `berhenti`.

---

## 13. Modul Target & Refleksi

### 13.1 PUT `/target`

Auth (`user`).

**Request**
```json
{ "bb_target_kg": 68, "target_aktivitas_per_minggu": 3, "target_air_ml": 2000 }
```

**Sukses 200**
```json
{
  "success": true,
  "message": "Target disimpan",
  "data": { "bb_target_kg": 68, "target_aktivitas_per_minggu": 3, "target_air_ml": 2000 }
}
```

### 13.2 POST `/refleksi`

Auth (`user`).

**Request**
```json
{ "minggu": "2026-W40", "catatan": "Minggu ini sulit menjaga pola makan." }
```

**Sukses 201** — `{ "id": 9, "minggu": "2026-W40", "catatan": "...", "created_at": "..." }`

---

## 14. Modul Laporan

### 14.1 GET `/laporan/pribadi`

Auth (`user`). Query: `?periode=3m`

**Sukses 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "periode": "3m",
    "user": { "name": "Budi Santoso", "usia": 28, "jenis_kelamin": "L" },
    "ringkasan": { "status_kesehatan": "perlu_perhatian", "skor_risiko": 42, "total_pencatatan": 11 },
    "catatan": [
      { "dicatat_pada": "2026-08-03", "sumber": "mandiri", "bb_kg": 73.7, "imt": 26.1, "sistol": 140, "diastol": 90 }
    ],
    "rujukan": [
      { "tanggal": "2026-09-15", "faskes": "Puskesmas Landasan Ulin", "status": "tertangani" }
    ],
    "disclaimer": "Sistem ini bukan alat diagnosis medis. Konsultasikan hasil dengan tenaga kesehatan."
  }
}
```

### 14.2 GET `/laporan/kelurahan`

Auth (`admin_kelurahan`, `super_admin`). Agregat, mengikuti suppression §9.2. Query: `?periode=3m`
**Sukses 200** — struktur seperti `/dashboard/kelurahan`, plus `disclaimer`.

---

## 15. Modul Admin (Master Data)

Butuh role `super_admin` (kecuali ditulis lain).

| Method | Path | Fungsi |
|---|---|---|
| GET | `/admin/indikator` | Daftar indikator kesehatan |
| POST | `/admin/indikator` | Tambah indikator |
| PUT | `/admin/indikator/{id}` | Ubah indikator |
| DELETE | `/admin/indikator/{id}` | Hapus indikator |
| GET | `/admin/ambang-kategori` | Daftar ambang batas |
| POST | `/admin/ambang-kategori` | Tambah ambang |
| PUT | `/admin/ambang-kategori/{id}` | Ubah ambang |
| DELETE | `/admin/ambang-kategori/{id}` | Hapus ambang |
| GET | `/admin/pengguna` | Daftar user + filter role |
| POST | `/admin/pengguna` | Buat akun kader/admin kelurahan |
| PUT | `/admin/pengguna/{id}` | Ubah data/role/wilayah user |
| DELETE | `/admin/pengguna/{id}` | Nonaktifkan user |
| GET | `/admin/faskes` | Daftar faskes |
| POST | `/admin/faskes` | Tambah faskes |
| PUT | `/admin/faskes/{id}` | Ubah faskes |
| DELETE | `/admin/faskes/{id}` | Hapus faskes |
| GET | `/admin/log-audit` | Riwayat aktivitas |
| GET | `/admin/statistik` | Statistik keseluruhan sistem |

**Contoh bentuk `ambang-kategori` (yang bikin IMT jadi „gemuk"):**
```json
{
  "id": 4,
  "indikator": { "kode": "imt", "nama": "Indeks Massa Tubuh", "satuan": "kg/m2" },
  "batas_min": 25.0,
  "batas_max": 29.9,
  "kategori": "gemuk",
  "status": "perlu_perhatian",
  "skor": 2
}
```

> Inilah sebabnya kategori **tidak di-hardcode di kode** — admin bisa ubah `batas_max` tanpa deploy.

---

## 16. Matriks Hak Akses (Ringkas)

| Endpoint | super_admin | admin_kelurahan | kader | user | publik |
|---|---|---|---|---|---|
| POST /auth/register | – | – | – | – | ✅ |
| POST /auth/login | – | – | – | – | ✅ |
| GET /auth/me | ✅ | ✅ | ✅ | ✅ | – |
| POST /auth/logout | ✅ | ✅ | ✅ | ✅ | – |
| GET /profil | – | – | – | ✅ | – |
| PUT /profil | – | – | – | ✅ | – |
| POST/DELETE /persetujuan | – | – | – | ✅ | – |
| GET /wilayah | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /faskes | ✅ | ✅ | ✅ | ✅ | – |
| POST /catatan-kesehatan | ✅ | – | ✅* | ✅* | – |
| GET /catatan-kesehatan | ✅ | – | ✅* | ✅* | – |
| DELETE /catatan-kesehatan/{id} | ✅ | – | – | ✅* | – |
| GET /dashboard/pribadi | – | – | – | ✅ | – |
| GET /tren | – | – | ✅* | ✅* | – |
| GET /insight | – | – | – | ✅ | – |
| GET /dashboard/kelurahan | ✅ | ✅* | – | – | – |
| GET/POST /posbindu/sesi | ✅ | ✅* | ✅ (GET) | – | – |
| POST /posbindu/sesi/{id}/peserta | ✅ | ✅* | ✅* | – | – |
| GET /posbindu/kunjungan | ✅ | ✅* | ✅* | ✅* | – |
| POST /rujukan | ✅ | ✅* | ✅* | – | – |
| GET /rujukan | ✅ | ✅* | ✅* | ✅* | – |
| PATCH /rujukan/{id}/status | ✅ | ✅* | ✅* | – | – |
| GET /program | ✅ | ✅ | ✅ | ✅ | – |
| POST /program | ✅ | ✅* | – | – | – |
| POST/PATCH /program/{id}/peserta | ✅ | ✅* | – | ✅* | – |
| PUT /target, POST /refleksi | – | – | – | ✅ | – |
| GET /laporan/pribadi | – | – | – | ✅ | – |
| GET /laporan/kelurahan | ✅ | ✅* | – | – | – |
| /admin/* | ✅ | – | – | – | – |

`*` = dibatasi scope wilayah / kepemilikan data.

---

## 17. Lampiran: Daftar Tabel (14 + 1) — versi Indonesia

Acuan migrasi BE. Nama final, jangan diubah tanpa changelog.

| # | Tabel | Isi kolom inti |
|---|---|---|
| 1 | `wilayah` | id, parent_id, nama, tipe, kode |
| 2 | `pengguna` | id, name, email, password, role, wilayah_id, consent_at, versi_kebijakan |
| 3 | `profil` | user_id, tgl_lahir, jenis_kelamin, tinggi_cm, tingkat_aktivitas, merokok, riwayat_keluarga (json), bb_target_kg, target_aktivitas_per_minggu, target_air_ml |
| 4 | `catatan_kesehatan` | id, user_id, dicatat_oleh, dicatat_pada, sumber, sesi_posbindu_id, bb_kg, sistol, diastol, gula_darah, jenis_gula_darah, kolesterol, asam_urat, lingkar_perut, tidur_jam, merokok, **konsumsi_manis**, catatan, perlu_verifikasi — **append-only** |
| 5 | `indikator` | id, kode, nama, satuan, kelompok |
| 6 | `ambang_kategori` | id, indikator_id, batas_min, batas_max, kategori, status, skor |
| 7 | `sesi_posbindu` | id, wilayah_id, tanggal, lokasi, kader_id, catatan |
| 8 | `kunjungan_posbindu` | id, sesi_id, user_id, hadir, dicatat_oleh, catatan_kesehatan_id |
| 9 | `rujukan` | id, user_id, faskes_id, alasan, dibuat_oleh, status, ditangani_oleh, catatan |
| 10 | `faskes` | id, wilayah_id, nama, jenis, alamat, telepon, lat, lng |
| 11 | `pengobatan` | id, user_id, nama_obat, dosis, mulai, selesai, aktif |
| 12 | `log_audit` | id, user_id, aksi, model, model_id, ip, user_agent, created_at |
| 13 | `program` | id, wilayah_id, judul, jenis, target_peserta, mulai, selesai, status |
| 14 | `peserta_program` | program_id, user_id, status, selesai_pada |
| +1 | `refleksi` | id, user_id, minggu, catatan |

> Catatan: tabel `pengguna` menggantikan tabel bawaan Laravel `users`. Model `User` **wajib** set `protected $table = 'pengguna';`.

---

## 18. Checklist FE ↔ BE

- [ ] FE pakai data dummy sesuai bentuk §7.2, §8.1, §9.1 — 3 response paling sering dipakai.
- [ ] BE selesaikan migrasi + `ApiResource` minggu 1 supaya FE lihat JSON asli lebih cepat.
- [ ] Sepakati cara simpan token di FE (localStorage vs secure store).
- [ ] Setiap endpoint baru di luar dokumen ini → tambah ke sini dulu, baru ngoding.

---

## Changelog

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1.0 | 2026-10-03 | Draft awal kontrak | BE |
| 1.1 | 2026-10-03 | Penamaan tabel & path diseragamkan ke bahasa Indonesia (`/health-logs`→`/catatan-kesehatan`, `/profile`→`/profil`, `/consent`→`/persetujuan`, `/programs`→`/program`, `/admin/users`→`/admin/pengguna`, `/admin/audit-log`→`/admin/log-audit`); tambah kolom `konsumsi_manis` + enum; tambah §0 keputusan desain & §3 peta endpoint→tabel; tambah lampiran daftar tabel Indonesia | BE |

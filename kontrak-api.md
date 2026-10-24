# Kontrak API — Sistem Monitoring Kesehatan PTM (Skala Kecamatan)

**Versi 1.5.1** · 2026-10-24 · Base URL `http://pm-monitoring.test/api/v1` · Laravel + Sanctum (token) · FE: SPA/desktop

> **Aturan pakai dokumen ini:**
>
> 1. Setelah disetujui, **bentuk dan nama field tidak boleh berubah tanpa kesepakatan dua orang.** FE boleh membuat UI dengan data dummy sesuai bentuk di sini.
> 2. Perubahan tak terhindarkan → catat di **Changelog** (§24), naikkan versi, kabari partner. Versi di header harus sama dengan baris terakhir Changelog.
> 3. Field yang **dihitung server** (`read-only`) tidak boleh dikirim FE saat POST/PUT.
> 4. Lampiran (§22–§23) bersifat **non-normatif**.
> 5. Contoh response menampilkan isi `data` saja bila amplop sama dengan §1.2.

---

## 0. Keputusan Desain yang Dikunci

| #   | Keputusan                                                                                                                                                                                  | Alasan                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 1   | Penamaan tabel & path domain **bahasa Indonesia**; istilah teknis Laravel tetap Inggris (`auth`, `admin`, `dashboard`, `id`, `created_at`, `name`, `email`, `user_id`, `page`, `per_page`) | Satu gaya, tanpa kerja ekstra FE/BE             |
| 2   | Kolom `konsumsi_manis` ada di `catatan_kesehatan`                                                                                                                                          | Fitur ada di dokumen fitur                      |
| 3   | `wilayah_id` dipilih sendiri user saat register; hanya `super_admin` yang bisa mengubah                                                                                                    | Sesuai dokumen fitur                            |
| 4   | PDF laporan digenerate FE, BE kirim JSON                                                                                                                                                   | BE tidak mengurus layout                        |
| 5   | **Ambang & kategori kesehatan diambil dari tabel `ambang_kategori`**, tidak di-hardcode. `status`/`level` diturunkan dari `skor` (§1.5), tidak disimpan terpisah. | Admin bisa mengubah tanpa deploy; satu sumber kebenaran |
| 6   | **Rujukan otomatis dipicu saat catatan disimpan**, bukan saat `GET /insight`. Maksimal **satu rujukan per log**; log ber-flag `perlu_verifikasi` **tidak** memicu; verifikasi `setuju:true` tidak memicu ulang. | GET tidak boleh menulis data; hindari rujukan ganda |
| 7   | `admin_kelurahan` **tidak pernah** melihat data individu (hanya agregat dan rujukan teredaksi)                                                                                             | Privasi; dasar pengujian                        |
| 8   | Notifikasi **ditunda** (§20)                                                                                                                                                               | Belum ada bentuk response/tabel yang disepakati |
| 9   | **Consent wajib** untuk `POST /catatan-kesehatan` **dan** `PUT /profil`; tanpa consent → 422 | Profil memuat riwayat keluarga; data kesehatan tidak boleh terkumpul tanpa izin |
| 10  | **Tarik consent** menghentikan pencatatan baru, tetapi pemilik tetap dapat **membaca & menghapus** data lamanya; keluar dari agregat/peringkat/laporan | Transparansi pemilik data; audit tetap tersedia |
| 11  | Akses/ubah `super_admin` pada data individu **dan perubahan status rujukan** wajib dicatat di `log_audit` | Dasar pengujian audit |

---

## 1. Konvensi Umum

### 1.1 Header

| Header          | Nilai              | Kapan                                   |
| --------------- | ------------------ | --------------------------------------- |
| `Accept`        | `application/json` | selalu                                  |
| `Content-Type`  | `application/json` | saat kirim body                         |
| `Authorization` | `Bearer {token}`   | semua endpoint kecuali register & login |

### 1.2 Amplop Response

Sukses:

```json
{ "success": true, "message": "OK", "data": {} }
```

Sukses + paginasi (`?page=1&per_page=15`; `per_page` 1–100, di luar itu → **422**):

```json
{
  "success": true,
  "message": "OK",
  "data": [],
  "meta": { "page": 1, "per_page": 15, "total": 120, "last_page": 8 }
}
```

Gagal (`errors` hanya pada 422):

```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": { "bb_kg": ["Berat badan harus berupa angka."] }
}
```

### 1.3 Kode HTTP

| Kode      | Arti              | Kapan                                                            |
| --------- | ----------------- | ---------------------------------------------------------------- |
| 200 / 201 | OK / Created      | sukses                                                           |
| 401       | Unauthorized      | token tidak ada / kedaluwarsa                                    |
| 403       | Forbidden         | token valid tapi **role** tidak berhak                           |
| 404       | Not Found         | id tidak ada **atau di luar scope** (wilayah/binaan/kepemilikan) |
| 422       | Unprocessable     | validasi gagal                                                   |
| 429       | Too Many Requests | rate limit login / register                                      |

> **Keamanan:** di luar scope → **404, bukan 403**, agar data tidak bisa ditebak keberadaannya. Parameter `user_id`/`wilayah_id` di luar scope juga **404**, tidak pernah diabaikan diam-diam.

### 1.4 Format Nilai

| Tipe          | Format                      | Contoh                      |
| ------------- | --------------------------- | --------------------------- |
| Tanggal       | `YYYY-MM-DD`                | `2026-10-03`                |
| Tanggal+waktu | ISO 8601                    | `2026-10-03T14:22:00+08:00` |
| Desimal       | JSON number (IMT 2 desimal) | `25.09`                     |
| Enum          | string huruf kecil          | `"mandiri"`                 |
| Kosong        | `null` (bukan `""`)         | `null`                      |

### 1.5 Enum (kunci)

| Nama                                                               | Nilai sah                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `role`                                                             | `super_admin`, `admin_kelurahan`, `kader`, `user`                                                    |
| `sumber`                                                           | `mandiri`, `kader`, `puskesmas`                                                                      |
| `jenis_gula_darah`                                                 | `puasa`, `2jam_pp`                                                                                   |
| `jenis_kelamin`                                                    | `L`, `P`                                                                                             |
| `status_rujukan`                                                   | `baru`, `dihubungi`, `tertangani`, `ditolak`                                                         |
| `status_kesehatan`                                                 | `normal`, `perlu_perhatian`, `berisiko`                                                              |
| `kategori_imt`                                                     | `kurus`, `normal`, `gemuk`, `obesitas`                                                               |
| `kategori_tensi`                                                   | `normal`, `perlu_perhatian`, `tinggi`, `krisis`                                                      |
| `kategori_gula_darah`, `kategori_kolesterol`, `kategori_asam_urat` | `normal`, `perlu_perhatian`, `tinggi`                                                                |
| `tingkat_aktivitas`                                                | `ringan`, `sedang`, `berat`                                                                          |
| `konsumsi_manis`                                                   | `jarang`, `sering`, `setiap_hari`                                                                    |
| `riwayat_keluarga`                                                 | `hipertensi`, `diabetes`, `jantung`, `stroke`, `kolesterol`, `asma`, `kanker`, `ginjal`, `tidak_ada` |
| `jenis_program`                                                    | `olahraga`, `edukasi`, `pemeriksaan`, `lainnya`                                                      |
| `status_program`                                                   | `akan_datang`, `berjalan`, `selesai` (dihitung dari tanggal)                                         |
| `status_peserta`                                                   | `terdaftar`, `selesai`, `berhenti`                                                                   |
| `status_sesi`                                                      | `akan_datang`, `berlangsung`, `selesai` (dihitung dari tanggal)                                      |
| `level_insight`                                                    | `info`, `peringatan`, `bahaya`                                                                       |
| `wilayah.tipe`                                                     | `kecamatan`, `kelurahan`                                                                             |
| `faskes.jenis`                                                     | `puskesmas`, `klinik`, `rumah_sakit`, `posbindu`                                                     |

**Pemetaan baku skor → status → level** (satu-satunya kosakata; dipakai di seluruh dokumen):

| `skor` (dari `ambang_kategori`) | `status_kesehatan` | `level_insight` | Arti   |
| ------------------------------- | ------------------ | --------------- | ------ |
| 0                               | `normal`           | `info`          | aman   |
| 1                               | `perlu_perhatian`  | `peringatan`    | siaga  |
| ≥ 2                             | `berisiko`         | `bahaya`        | bahaya |

---

## 2. Role & Scope

| Role              | Cakupan data                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `super_admin`     | seluruh kecamatan + master data                                  |
| `admin_kelurahan` | **hanya agregat** kelurahan miliknya + rujukan teredaksi (§11.2) |
| `kader`           | warga dengan `pengguna.kader_id` = dirinya                       |
| `user`            | data dirinya sendiri                                             |

Middleware: `auth:sanctum` → `role:{...}` → `scope.wilayah`.

- Warga baru punya `kader_id = null`. Hanya `super_admin` yang menugaskan kader (`PUT /admin/pengguna/{id}`). Warga tanpa kader tetap masuk agregat kelurahan.
- Setiap akses/ubah `super_admin` pada data individu **wajib dicatat di `log_audit`**, satu baris per request:
  - `aksi = baca_data_individu`: `GET /profil?user_id=`, `GET /catatan-kesehatan`, `GET /catatan-kesehatan/{id}`, `GET /rujukan`.
  - `aksi = ubah_data_individu`: `POST /catatan-kesehatan` (`sumber=puskesmas`), `DELETE /catatan-kesehatan/{id}`, verifikasi `PATCH /admin/catatan-kesehatan/{id}/verifikasi`, `PATCH /rujukan/{id}/status`.
  - Isi: `user_id` pelaku, `model`, `model_id`, `aksi`, `ip`, `user_agent`, `created_at`; **tanpa nilai kesehatan**.
- Pengguna `aktif = false` tidak bisa login (respons sama dengan password salah).

---

## 3. Peta Endpoint → Tabel

| Path (§)                                       | Tabel                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `/auth/*` (§4)                                 | `pengguna`                                                        |
| `/profil`, `/persetujuan` (§5)                 | `profil`, `pengguna.consent_at`                                   |
| `/wilayah`, `/faskes` (§6)                     | `wilayah`, `faskes`                                               |
| `/catatan-kesehatan` (§7)                      | `catatan_kesehatan`                                               |
| `/dashboard/pribadi`, `/tren`, `/insight` (§8) | `catatan_kesehatan`, `ambang_kategori`                            |
| `/dashboard/kelurahan` (§9)                    | agregasi `catatan_kesehatan` + `pengguna` + `rujukan`             |
| `/posbindu/*` (§10)                            | `sesi_posbindu`, `kunjungan_posbindu`                             |
| `/rujukan` (§11)                               | `rujukan`                                                         |
| `/program`, `/peringkat` (§12)                 | `program`, `peserta_program`, `badge_pengguna`, `pengguna`        |
| `/target`, `/refleksi` (§13)                   | `profil`, `refleksi`                                              |
| `/laporan/*` (§14)                             | agregasi                                                          |
| `/admin/*` (§15)                               | `indikator`, `ambang_kategori`, `pengguna`, `faskes`, `log_audit` |

---

## 4. Modul Auth

### 4.1 POST `/auth/register` (publik)

Mendaftarkan warga (`role` otomatis `user`). Rate limit: **10 percobaan/menit per IP** (lewat batas → **429**).

```json
{
  "name": "Budi Santoso",
  "email": "budi@mail.com",
  "password": "rahasia123",
  "password_confirmation": "rahasia123",
  "wilayah_id": 3
}
```

**201** `data`:

```json
{
  "user": {
    "id": 12,
    "name": "Budi Santoso",
    "email": "budi@mail.com",
    "role": "user",
    "wilayah_id": 3,
    "wilayah": { "id": 3, "nama": "Kelurahan Sungai Besar" },
    "consent_at": null
  },
  "token": "12|xxxxxxxxxxxx"
}
```

**Validasi:** `password` min 8 karakter & sama dengan konfirmasi; `email` unik (case-insensitive, disimpan lowercase) → 422 bila sudah ada; `wilayah_id` harus bertipe `kelurahan`. Setelah register, FE menampilkan prompt persetujuan (§5.3).

### 4.2 POST `/auth/login` (publik)

Rate limit: 5 percobaan/menit per kombinasi **email + IP**.

```json
{
  "email": "budi@mail.com",
  "password": "rahasia123",
  "device_name": "desktop-app"
}
```

**200** — bentuk sama dengan register. FE langsung ke `/dashboard/pribadi`; profil **tidak wajib** lengkap.

- Login hanya memeriksa `Hash::check`; **aturan panjang password hanya di register**. Email dibandingkan case-insensitive. `device_name` opsional (default `unknown`).
- Gagal (password salah, email tidak ada, atau `aktif = false`) → **422**:

```json
{
  "success": false,
  "message": "Email atau password salah.",
  "errors": { "email": ["Email atau password salah."] }
}
```

### 4.3 POST `/auth/logout` (auth)

Mencabut token yang dipakai. **200** `data: null`.

### 4.4 GET `/auth/me` (auth)

Memulihkan sesi dari token tersimpan. `profil` bernilai `null` bila belum pernah diisi.

```json
{
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
    "riwayat_keluarga": ["hipertensi"]
  }
}
```

---

## 5. Modul Profil & Persetujuan

### 5.1 GET `/profil` (auth)

Tanpa query → profil sendiri. `?user_id=12` → hanya `kader` (warga binaannya) dan `super_admin` (dicatat di `log_audit`); di luar scope → 404.

Bila profil belum diisi → **200** dengan semua field `null` dan `profil_lengkap: false`.

```json
{
  "user_id": 12,
  "tgl_lahir": "1998-04-11",
  "usia": 28,
  "jenis_kelamin": "L",
  "tinggi_cm": 170,
  "tingkat_aktivitas": "sedang",
  "merokok": false,
  "riwayat_keluarga": ["hipertensi"],
  "tampil_di_peringkat": false,
  "profil_lengkap": true,
  "updated_at": "2026-10-03T09:00:00+08:00"
}
```

> Objek `profil` pada §4.4 adalah **subset** (tanpa `user_id`, `tampil_di_peringkat`, `profil_lengkap`, `updated_at`). `usia` dihitung server (`read-only`).

### 5.2 PUT `/profil` (user)

Kirim **seluruh** field; baris belum ada → dibuat (upsert). `tinggi_cm` dipakai menghitung IMT.

```json
{
  "tgl_lahir": "1998-04-11",
  "jenis_kelamin": "L",
  "tinggi_cm": 170,
  "tingkat_aktivitas": "sedang",
  "merokok": false,
  "riwayat_keluarga": ["hipertensi"],
  "tampil_di_peringkat": false
}
```

**200** — bentuk sama dengan GET. **Validasi:** `tgl_lahir` sebelum hari ini; `tinggi_cm` **120–220** (di luar itu → 422; beda dengan §7.2 yang hanya mem-flag nilai kader); enum sah; `riwayat_keluarga` array enum (pakai `["tidak_ada"]` bila tak ada); `tampil_di_peringkat` boolean. `tampil_di_peringkat` opsional: bila tidak dikirim saat update, **nilai lama dipertahankan** (tidak di-reset ke `false`).

**Consent:** `consent_at = null` → **422** `{"errors":{"consent":["Persetujuan data belum diberikan."]}}`.

### 5.3 POST `/persetujuan` (user)

```json
{ "versi_kebijakan": "1.0", "setuju": true }
```

**200** `data`: `{"consent_at":"2026-10-03T09:00:00+08:00","versi_kebijakan":"1.0"}`

### 5.4 DELETE `/persetujuan` (user)

Tarik izin → `consent_at = null`. **Efek:**

- Tidak bisa mencatat kesehatan baru (**422**, §7.1) dan tidak bisa `PUT /profil` (**422**, §5.2).
- Keluar dari agregat, peringkat, dan laporan.
- Data lama **tetap tersimpan**: pemilik masih boleh `GET`/`DELETE` data lamanya; `super_admin` boleh membacanya (tercatat di `log_audit`).
- `rujukan` yang sudah ada **tetap ada** (sudah menjadi tindak lanjut); dapat dihapus manual oleh yang berhak (§7.5).

---

## 6. Modul Master

### 6.1 GET `/wilayah` (publik)

Query: `?tipe=kecamatan|kelurahan&parent_id=1&search=`

```json
[
  {
    "id": 1,
    "nama": "Kecamatan Landasan Ulin",
    "tipe": "kecamatan",
    "kode": "6372",
    "parent_id": null
  },
  {
    "id": 3,
    "nama": "Kelurahan Sungai Besar",
    "tipe": "kelurahan",
    "kode": "6372001",
    "parent_id": 1
  }
]
```

### 6.2 GET `/faskes` (auth)

Query: `?wilayah_id=3&search=`

```json
[
  {
    "id": 1,
    "nama": "Puskesmas Landasan Ulin",
    "jenis": "puskesmas",
    "alamat": "Jl. ...",
    "telepon": "0511xxxx",
    "wilayah_id": 1
  }
]
```

---

## 7. Modul Catatan Kesehatan (Inti)

### 7.1 Aturan

- **Append-only.** Tidak ada UPDATE. Hanya `perlu_verifikasi` (oleh admin, §15) dan `deleted_at` (soft delete) yang boleh berubah. Salah input → DELETE lalu buat baru.
- **Read-only** (dihitung server, jangan dikirim; bila dikirim → **422**): `imt`, `tinggi_cm`, semua `kategori_*`, `skor_*`, `status_kesehatan`, `perlu_verifikasi`, `dicatat_oleh`, `created_at`.
- **Snapshot:** `tinggi_cm`, semua `kategori_*`, dan **`skor_*` per indikator** dihitung saat insert dan **disimpan di baris log** (bukan dihitung ulang dari `ambang_kategori` saat baca).
- **Profil belum ada / `tinggi_cm` null:** log tetap tersimpan, `imt` dan `kategori_imt` = `null` (bukan 422).
- **Kelengkapan:** selain `dicatat_pada` dan `sumber`, **minimal satu** pengukuran harus terisi (`bb_kg`, `sistol`+`diastol`, `gula_darah`, `kolesterol`, `asam_urat`, `lingkar_perut`, `tidur_jam`). `sistol` dan `diastol` harus berpasangan. `gula_darah` wajib disertai `jenis_gula_darah`. Pelanggaran → 422.
- **Consent:** `consent_at = null` atau ditarik → **422** `{"errors":{"consent":["Persetujuan data belum diberikan."]}}` (berlaku untuk `mandiri` dan `kader`).

### 7.2 POST `/catatan-kesehatan`

Auth: `user` (`sumber=mandiri`), `kader` (`sumber=kader`), `super_admin` (koreksi/audit, wajib `user_id`).

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

Wajib: `dicatat_pada`, `sumber`, dan minimal satu pengukuran (§7.1). Untuk `sumber=kader` tambah `user_id` (warga binaan) dan `sesi_posbindu_id`; `tinggi_cm` boleh dikirim **hanya bila** `profil.tinggi_cm` warga masih `null` (disimpan sebagai snapshot).

**201** `data`:

```json
{
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
  "kategori_gula_darah": "perlu_perhatian",
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
  "dicatat_oleh": { "id": 12, "name": "Budi Santoso" },
  "created_at": "2026-10-03T14:22:00+08:00"
}
```

**Dua lapis rentang:**

1. **Mustahil → 422**, tidak disimpan.
2. **Mungkin tapi tidak wajar → disimpan** dengan `perlu_verifikasi = true`, dikecualikan dari agregat, insight, dan rujukan otomatis sampai diverifikasi admin (§15).

| Field               | Mustahil (422)  | Wajar (di luar ini → flag) |
| ------------------- | --------------- | -------------------------- |
| `bb_kg`             | ≤ 0 atau > 500  | 20 – 300                   |
| `sistol`            | ≤ 0 atau > 400  | 60 – 260                   |
| `diastol`           | ≤ 0 atau > 300  | 30 – 160                   |
| `gula_darah`        | ≤ 0 atau > 1500 | 20 – 700                   |
| `kolesterol`        | ≤ 0 atau > 1500 | 50 – 600                   |
| `asam_urat`         | ≤ 0 atau > 50   | 1 – 20                     |
| `lingkar_perut`     | ≤ 0 atau > 300  | 40 – 200                   |
| `tidur_jam`         | < 0 atau > 24   | 3 – 12                     |
| `tinggi_cm` (kader) | < 50 atau > 250 | 120 – 220                  |

**422 juga untuk:** tipe bukan angka (field angka memakai rule `numeric`), `dicatat_pada` melebihi hari ini, `sumber` di luar enum, pelanggaran kelengkapan, consent, field read-only yang dikirim, atau `sumber=kader` tanpa `user_id`/`sesi_posbindu_id`. Kasus **bukan 422**: `diastol` ≥ `sistol` → tetap disimpan dengan `perlu_verifikasi = true`.

### 7.3 GET `/catatan-kesehatan`

Query: `?page=&per_page=&indikator=imt&dari=&sampai=&search=&user_id=`

- `user` → hanya miliknya; `user_id` milik orang lain → **404**.
- `kader` → `?user_id=` warga binaannya; di luar binaan → **404**.
- `admin_kelurahan` → **tidak boleh** (403); pakai §9.
- `super_admin` → boleh (audit/verifikasi), dicatat di `log_audit`.
- `indikator=imt` → hanya log yang punya nilai `imt`.

**200** array objek §7.2 + paginasi.

### 7.4 GET `/catatan-kesehatan/{id}`

Di luar scope → 404. **200** objek §7.2.

### 7.5 DELETE `/catatan-kesehatan/{id}`

`user` pemilik; `kader` hanya log warga binaannya (aturan sama dengan GET, selain itu 404); `super_admin`. Soft delete. **200** `data: null`.

---

## 8. Modul Analitik & Dashboard Pribadi

### 8.1 GET `/dashboard/pribadi` (user)

**200** `data`:

```json
{
  "status_kesehatan": "perlu_perhatian",
  "skor_risiko": 36,
  "profil_lengkap": true,
  "indikator_terkini": {
    "bb_kg": 72.5,
    "tinggi_cm": 170,
    "imt": 25.09,
    "kategori_imt": "gemuk",
    "sistol": 138,
    "diastol": 88,
    "kategori_tensi": "perlu_perhatian",
    "gula_darah": 110,
    "kategori_gula_darah": "perlu_perhatian",
    "kolesterol": 200,
    "kategori_kolesterol": "perlu_perhatian",
    "asam_urat": 6.1,
    "kategori_asam_urat": "normal",
    "lingkar_perut": 92,
    "dicatat_pada": "2026-10-03",
    "sumber": "mandiri"
  },
  "perbandingan": {
    "periode_ini": "2026-10",
    "periode_lalu": "2026-09",
    "bb_selisih_kg": -1.2,
    "imt_selisih": -0.41,
    "sistol_selisih": -2
  },
  "target": { "bb_target_kg": 68, "bb_awal_kg": 77.0, "progress_persen": 50 },
  "gamifikasi": {
    "exp_total": 120,
    "level_gamifikasi": 2,
    "badge": ["peserta_aktif"],
    "rank_kelurahan": 7
  },
  "jadwal_skrining_berikutnya": [
    {
      "indikator": "gula_darah",
      "jatuh_tempo": "2026-11-02",
      "status": "akan_datang"
    }
  ],
  "rujukan_aktif": null
}
```

- `indikator_terkini` = log terbaru **per indikator** (bisa dari tanggal berbeda); `null` bila belum pernah dicatat. Log `perlu_verifikasi = true` dilewati.
- `perbandingan` = nilai log terakhir bulan ini dikurangi nilai log terakhir bulan lalu.
- Profil belum diisi → `profil_lengkap: false`, nilai yang butuh profil (mis. `imt`) = `null`. Dashboard tetap bisa dibuka.

**Rumus (definitif):**

- `skor_risiko = round( Σ skor / Σ skor_maks × 100 )` atas indikator yang terukur. `skor` dari `ambang_kategori` pada log terbaru; `skor_maks`: IMT 2, tensi 3, gula 2, kolesterol 2, asam urat 2. Tensi memakai kategori yang **lebih berat** antara sistol dan diastol.
- Contoh di atas: IMT 1 + tensi 1 + gula 1 + kolesterol 1 + asam urat 0 = 4; Σ maks = 11; 4/11 = **36**.
- `status_kesehatan` mengikuti **skor tertinggi** per indikator (tabel pemetaan §1.5): di contoh skor tertinggi 1 → `perlu_perhatian`.
- `progress_persen = (bb_awal_kg − bb_terkini) / (bb_awal_kg − bb_target_kg) × 100`, dibatasi 0–100. Contoh: (77,0 − 72,5) / (77,0 − 68) = **50**.
- `jatuh_tempo` skrining = tanggal log terakhir indikator + `indikator.interval_skrining_hari` (default 30).
- `level_gamifikasi = floor(exp_total / 100) + 1`. `rank_kelurahan` dihitung (§12.5), `null` bila peserta peringkat < 5.

### 8.2 GET `/tren` (user; kader dengan `?user_id=` warga binaan)

Query: `?indikator=imt&periode=3m` — `indikator` ∈ `bb_kg`, `imt`, `sistol`, `diastol`, `gula_darah`, `kolesterol`, `asam_urat`, `lingkar_perut` (boleh multi: `imt,bb_kg`); `periode` ∈ `1m` (30 hari), `3m`, `6m`, `1y`.

**Agregasi:** satu titik **per hari** = nilai log **terakhir** hari itu; log `perlu_verifikasi` dilewati.

```json
{
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
```

> Path API tetap `/tren`. Label menu UI boleh "Rekam Medis" (lihat §21, TODO-KONFIRMASI #3).

### 8.3 GET `/insight` (user)

Insight berbasis aturan (if-then, bukan ML), **dihitung saat dibaca dan tidak menulis data**. Query opsional `?level=peringatan,bahaya`.

**Ambang & kategori** — isi tabel `ambang_kategori` (seed awal; admin dapat mengubah, §15). Notasi `[min, max)`: batas bawah termasuk, batas atas tidak, **tanpa celah dan tanpa tumpang tindih**.

> ⚠️ Angka klinis di bawah adalah **asumsi seeder** (mengacu pada klasifikasi umum) dan **wajib divalidasi tenaga kesehatan/pembimbing** sebelum dipakai.

| Indikator                    | Rentang        | Kategori          | Skor             | `memicu_rujukan` |
| ---------------------------- | -------------- | ----------------- | ---------------- | ---------------- |
| `imt` (kg/m²)                | < 18,5         | `kurus`           | 1                | tidak            |
|                              | \[18,5 ; 25,0) | `normal`          | 0                | tidak            |
|                              | \[25,0 ; 30,0) | `gemuk`           | 1                | tidak            |
|                              | ≥ 30,0         | `obesitas`        | 2                | tidak            |
| `sistol` (mmHg)              | < 120          | `normal`          | 0                | tidak            |
|                              | \[120 ; 140)   | `perlu_perhatian` | 1                | tidak            |
|                              | \[140 ; 180)   | `tinggi`          | 2                | tidak            |
|                              | ≥ 180          | `krisis`          | 3                | **ya**           |
| `diastol` (mmHg)             | < 80           | `normal`          | 0                | tidak            |
|                              | \[80 ; 90)     | `perlu_perhatian` | 1                | tidak            |
|                              | \[90 ; 110)    | `tinggi`          | 2                | tidak            |
|                              | ≥ 110          | `krisis`          | 3                | **ya**           |
| `gula_darah` puasa (mg/dL)   | < 100          | `normal`          | 0                | tidak            |
|                              | \[100 ; 126)   | `perlu_perhatian` | 1                | tidak            |
|                              | ≥ 126          | `tinggi`          | 2                | tidak            |
| `gula_darah` 2jam_pp (mg/dL) | < 140          | `normal`          | 0                | tidak            |
|                              | \[140 ; 200)   | `perlu_perhatian` | 1                | tidak            |
|                              | ≥ 200          | `tinggi`          | 2                | tidak            |
| `kolesterol` (mg/dL)         | < 200          | `normal`          | 0                | tidak            |
|                              | \[200 ; 240)   | `perlu_perhatian` | 1                | tidak            |
|                              | ≥ 240          | `tinggi`          | 2                | tidak            |
| `asam_urat` (mg/dL)          | < 7,0          | `normal`          | 0                | tidak            |
|                              | \[7,0 ; 9,0)   | `perlu_perhatian` | 1                | tidak            |
|                              | ≥ 9,0          | `tinggi`          | 2                | tidak            |
| `delta_bb_kg` (21 hari)      | ≥ 3,0          | `naik_cepat`      | — (insight saja) | tidak            |

Kategori `krisis` hanya ada pada tensi. Level insight diturunkan dari `skor` memakai pemetaan §1.5 (0 → `info`, 1 → `peringatan`, ≥ 2 → `bahaya`).

**Kode insight:**

| Kode                                              | Kondisi                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `IMT_KURUS`, `IMT_GEMUK`, `IMT_OBESITAS`          | kategori IMT log terbaru                                                                          |
| `TENSI_PERHATIAN`, `TENSI_TINGGI`, `TENSI_KRISIS` | kategori tensi                                                                                    |
| `GULA_PERHATIAN`, `GULA_TINGGI`                   | kategori gula darah (sesuai `jenis_gula_darah`)                                                   |
| `KOLESTEROL_PERHATIAN`, `KOLESTEROL_TINGGI`       | kategori kolesterol                                                                               |
| `ASAM_URAT_PERHATIAN`, `ASAM_URAT_TINGGI`         | kategori asam urat                                                                                |
| `BB_NAIK_3MINGGU`                                 | `bb_kg` terbaru dikurangi log tertua dalam 21 hari terakhir ≥ ambang `delta_bb_kg` → `peringatan` |
| `BELUM_SKRINING_GULA`                             | tidak ada `gula_darah` dalam 180 hari → `info`                                                    |
| `BELUM_ADA_CATATAN`                               | belum ada catatan sama sekali → `info`                                                            |

Log `perlu_verifikasi = true` tidak dipakai. Contoh konsisten dengan §7.2/§8.1 (IMT 25,09; tensi 138/88; BB turun 1,2 kg sehingga `BB_NAIK_3MINGGU` tidak muncul):

```json
[
  {
    "kode": "IMT_GEMUK",
    "level": "peringatan",
    "teks": "IMT Anda 25,09 (kategori gemuk). Pertimbangkan pola makan dan aktivitas fisik.",
    "dibuat_pada": "2026-10-03T14:22:00+08:00"
  },
  {
    "kode": "TENSI_PERHATIAN",
    "level": "peringatan",
    "teks": "Tekanan darah 138/88 mmHg perlu diperhatikan. Pantau secara berkala.",
    "dibuat_pada": "2026-10-03T14:22:00+08:00"
  }
]
```

**Rujukan otomatis (dipicu saat simpan, bukan saat GET):**

- **Pemicu:** event/job setelah `POST /catatan-kesehatan` berhasil, bila ada indikator log baru yang masuk baris `memicu_rujukan = ya` (seed: hanya tensi `krisis`). `perlu_verifikasi = true` tidak memicu.
- **Bentuk:** baris `rujukan` baru: `status = baru`, `otomatis = true` (read-only), `dibuat_oleh = null`, `indikator` terisi (mis. `tensi`).
- **Faskes:** `faskes.jenis = puskesmas` di wilayah user → bila tidak ada, wilayah induk (kecamatan) → bila tetap tidak ada, rujukan tidak dibuat (insight tetap tampil).
- **Anti-duplikat:** user + `indikator` yang sama sudah punya rujukan `baru`/`dihubungi` → tidak dibuat lagi.
- **Teks:** _"Rujukan ini saran sistem, bukan diagnosis medis."_ (wajib tampil di UI dan pada `alasan`).
- `# TODO-KONFIRMASI` #2 (§21): apakah kader harus mengonfirmasi dulu sebelum rujukan otomatis aktif, dan apakah ambang pemicu perlu diperluas.

---

## 9. Modul Dashboard Kelurahan (Agregat Anonim)

### 9.1 GET `/dashboard/kelurahan` (admin_kelurahan, super_admin)

**Selalu agregat.** `admin_kelurahan` terkunci ke wilayahnya (`wilayah_id` lain → 404); `super_admin` boleh `?wilayah_id=3`. Query: `?periode=3m&wilayah_id=3`.

**200** `data`:

```json
{
  "wilayah": { "id": 3, "nama": "Kelurahan Sungai Besar" },
  "periode": "3m",
  "total_peserta": 214,
  "total_pengguna_aktif": 178,
  "total_pencatatan": 940,
  "distribusi_imt": [
    { "kategori": "kurus", "jumlah": 12 },
    { "kategori": "normal", "jumlah": 110 },
    { "kategori": "gemuk", "jumlah": 52 },
    { "kategori": "obesitas", "jumlah": 18 }
  ],
  "distribusi_riwayat_keluarga": [
    { "faktor": "hipertensi", "jumlah": 48 },
    { "faktor": "diabetes", "jumlah": 21 },
    { "faktor": "kolesterol", "jumlah": 20 }
  ],
  "distribusi_kelompok_usia": [
    { "kelompok": "20-24", "jumlah": 18 },
    { "kelompok": "25-29", "jumlah": 34 },
    { "kelompok": "50-54", "jumlah": 9 }
  ],
  "rujukan": { "baru": 8, "dihubungi": 10, "tertangani": 10 },
  "kepatuhan_pencatatan_persen": 83,
  "tren": [
    { "periode": "2026-08", "total_pencatatan": 280 },
    { "periode": "2026-09", "total_pencatatan": 320 },
    { "periode": "2026-10", "total_pencatatan": 340 }
  ],
  "ada_data_disembunyikan": true
}
```

**Definisi:**

- `total_peserta` = user role `user` di wilayah itu dengan consent aktif.
- `total_pengguna_aktif` = peserta dengan ≥ 1 catatan dalam `periode`. `kepatuhan_pencatatan_persen` = aktif / peserta × 100, dibulatkan (178/214 = 83).
- `total_pencatatan` = jumlah baris log dalam `periode` tanpa `perlu_verifikasi` (jumlah `tren` = 940).
- `distribusi_imt` dihitung per user dari log IMT terbaru; penyebutnya hanya user yang punya ≥1 log IMT pada `periode`, sehingga jumlah kategori bisa < `total_peserta` (contoh: 192 dari 214).
- Contoh `distribusi_kelompok_usia` **dipangkas**; kelompok dengan jumlah < 5 tidak dikirim (§9.2).
- `distribusi_riwayat_keluarga` dari `profil.riwayat_keluarga` (**self-report**, bukan nilai terukur; nilai enum §1.5). Menggantikan nama lama `distribusi_risiko`.
- `distribusi_kelompok_usia` = kelompok 5 tahunan dari `tgl_lahir`, dihitung per user.
- `rujukan` hanya memuat status yang jumlahnya ≥ 5 (pada contoh `ditolak` tersembunyi, sehingga **`total` tidak dikirim**).
- `ada_data_disembunyikan` = `true` bila ada sel yang disuppress.

### 9.2 Aturan Suppression (WAJIB)

- Sel dengan **jumlah < 5 tidak dikirim** sama sekali (bukan ditulis `{"jumlah":3}`).
- **Complementary suppression:** sel tersembunyi tidak boleh bisa dihitung dari angka total. Bila dalam satu kelompok **tepat satu** sel tersembunyi dan totalnya dapat dihitung (mis. dari `total_peserta`), sembunyikan juga sel terkecil berikutnya. Field `total` pada sebuah kelompok dihilangkan bila ada sel yang tersembunyi.
- `admin_kelurahan` tidak pernah menerima data individu lewat endpoint ini (tanpa nama/email/`user_id`).
- Usia hanya dalam kelompok, bukan tanggal lahir. Log `perlu_verifikasi` tidak dihitung.
- Semua aturan ini **di query layer (SQL)**, bukan disaring di FE.

> Ini titik yang paling diuji penguji. Jika FE yang menyembunyikan, itu klaim palsu.

---

## 10. Modul Posbindu

### 10.1 GET `/posbindu/sesi` (kader, admin_kelurahan, super_admin)

Query: `?wilayah_id=3&dari=2026-10-01&status=akan_datang&search=`. `kader` hanya melihat sesi dengan `kader_id` = dirinya; `admin_kelurahan` sesi wilayahnya. `status` dihitung dari `tanggal` (`akan_datang` > hari ini, `berlangsung` = hari ini, `selesai` < hari ini); tidak ada kolom `status`.

```json
[
  {
    "id": 7,
    "wilayah_id": 3,
    "tanggal": "2026-10-10",
    "lokasi": "Balai Kelurahan Sungai Besar",
    "kader": { "id": 5, "name": "Kader A" },
    "catatan": "Pemeriksaan rutin bulanan",
    "status": "akan_datang",
    "jumlah_peserta": 42,
    "hadir": 30
  }
]
```

### 10.2 POST `/posbindu/sesi` (admin_kelurahan, super_admin)

```json
{
  "wilayah_id": 3,
  "tanggal": "2026-10-10",
  "lokasi": "Balai Kelurahan Sungai Besar",
  "kader_id": 5,
  "catatan": "Pemeriksaan rutin bulanan"
}
```

**201** objek sesi §10.1. `kader_id` harus role `kader` dan sewilayah.

### 10.3 GET `/posbindu/sesi/{id}` (kader, admin_kelurahan, super_admin)

- `user` → **404**. Sesi di luar wilayah/kader → 404.
- `admin_kelurahan` → **tanpa** `peserta`; hanya `jumlah_peserta` dan `hadir`.
- `kader` → `peserta` hanya warga binaannya.

Untuk `kader`/`super_admin`:

```json
{
  "id": 7,
  "tanggal": "2026-10-10",
  "lokasi": "Balai Kelurahan Sungai Besar",
  "kader": { "id": 5, "name": "Kader A" },
  "jumlah_peserta": 42,
  "hadir": 30,
  "peserta": [
    {
      "kunjungan_id": 51,
      "user_id": 12,
      "name": "Budi Santoso",
      "hadir": true,
      "dicatat": true
    },
    {
      "kunjungan_id": 52,
      "user_id": 13,
      "name": "Siti Aminah",
      "hadir": false,
      "dicatat": false
    }
  ]
}
```

### 10.4 PUT `/posbindu/sesi/{id}` (admin_kelurahan, super_admin)

Ubah tanggal/lokasi/kader/catatan. **200** objek sesi.

### 10.5 POST `/posbindu/sesi/{id}/peserta` (kader, super_admin)

`kader` hanya pada sesi miliknya dan warga binaannya (di luar itu → **404**). `admin_kelurahan` **tidak** berhak (data individu).

```json
{
  "user_id": 14,
  "hadir": true,
  "catatan_kesehatan": {
    "bb_kg": 58.0,
    "sistol": 126,
    "diastol": 82,
    "gula_darah": 95,
    "jenis_gula_darah": "puasa",
    "tinggi_cm": 158
  }
}
```

- Bila `catatan_kesehatan` diisi, server membuat baris log `sumber=kader`, `sesi_posbindu_id` sesi ini, dan **`dicatat_pada` = `sesi.tanggal`** (tidak dikirim). Aturan §7 berlaku (kelengkapan, consent → 422).
- `hadir: false` + `catatan_kesehatan` → 422. Warga sudah terdaftar di sesi itu → **422** (cegah duplikat).

**201** `data`: `{"kunjungan_id":53,"user_id":14,"hadir":true,"catatan_kesehatan_id":89}`

### 10.6 GET `/posbindu/kunjungan` (user, kader, super_admin)

`user` hanya miliknya; `kader` `?user_id=` warga binaan; di luar scope → 404.

```json
[
  {
    "kunjungan_id": 51,
    "sesi_id": 7,
    "tanggal": "2026-10-10",
    "lokasi": "Balai Kelurahan Sungai Besar",
    "hadir": true,
    "catatan_kesehatan_id": 88
  }
]
```

### 10.7 DELETE `/posbindu/sesi/{id}` (admin_kelurahan, super_admin)

**422** bila sudah ada kunjungan berisi catatan kesehatan (hapus catatannya dulu). **200** `data: null`.

---

## 11. Modul Rujukan

### 11.1 POST `/rujukan` (kader, super_admin)

`user_id` harus warga binaan kader; di luar scope → 404.

```json
{
  "user_id": 12,
  "faskes_id": 1,
  "alasan": "Tekanan darah tinggi pada 2 pengukuran terakhir"
}
```

**201** `data` (rujukan manual):

```json
{
  "id": 15,
  "user_id": 12,
  "faskes": { "id": 1, "nama": "Puskesmas Landasan Ulin" },
  "alasan": "Tekanan darah tinggi pada 2 pengukuran terakhir",
  "status": "baru",
  "otomatis": false,
  "indikator": null,
  "dibuat_oleh": { "id": 5, "name": "Kader A" },
  "ditangani_oleh": null,
  "catatan": null,
  "created_at": "2026-10-03T14:30:00+08:00",
  "updated_at": "2026-10-03T14:30:00+08:00"
}
```

Rujukan otomatis (§8.3) memakai bentuk yang sama dengan `otomatis: true`, `indikator: "tensi"`, `dibuat_oleh: null`.

### 11.2 GET `/rujukan` (auth)

Query: `?status=baru&wilayah_id=3&dari=&sampai=&search=`

- `user` → miliknya. `kader` → warga binaannya. Keduanya menerima objek lengkap §11.1.
- `super_admin` → semua, boleh `?wilayah_id=`.
- `admin_kelurahan` → rujukan di wilayahnya dalam bentuk **teredaksi** (tanpa `user_id`, nama, dan `alasan`); `wilayah_id` di luar wilayahnya → **404**.

Bentuk teredaksi untuk `admin_kelurahan`:

```json
{
  "id": 16,
  "faskes": { "id": 1, "nama": "Puskesmas Landasan Ulin" },
  "status": "baru",
  "otomatis": true,
  "indikator": "tensi",
  "created_at": "2026-10-03T14:40:00+08:00",
  "updated_at": "2026-10-03T14:40:00+08:00"
}
```

### 11.3 PATCH `/rujukan/{id}/status` (kader, admin_kelurahan, super_admin)

Status hanya maju: `baru` → `dihubungi` → `tertangani` | `ditolak`. `catatan` wajib untuk `ditolak`.

```json
{
  "status": "dihubungi",
  "catatan": "Sudah dihubungi via telepon, jadwal kontrol Senin"
}
```

**200** objek rujukan terbaru (bentuk sesuai role pemanggil). `ditangani_oleh` dan `updated_at` terisi otomatis dari token.

---

## 12. Modul Program (Tantangan/Penyuluhan) & Peringkat

Modul ini adalah **tantangan/penyuluhan** (mis. push-up) dengan reward EXP, level, dan badge. Path tetap `/program`. `exp_total` dan `level_gamifikasi` milik **user** (kolom di `pengguna`), `badge` di tabel `badge_pengguna`.

### 12.1 GET `/program` (auth)

Query: `?status=berjalan&search=`. `status` dihitung dari `mulai`/`selesai`. `diikuti` dan `status_saya` hanya bermakna untuk role `user` (selain itu `false` dan `null`).

```json
[
  {
    "id": 4,
    "judul": "Tantangan Push-up 21 Hari",
    "jenis": "olahraga",
    "kategori_aktivitas": "push_up",
    "target_peserta": 100,
    "jumlah_peserta": 64,
    "mulai": "2026-09-28",
    "selesai": "2026-10-27",
    "status": "berjalan",
    "exp_reward": 100,
    "badge_reward": "jagoan_pushup",
    "diikuti": true,
    "status_saya": "terdaftar"
  }
]
```

### 12.2 POST `/program` (admin_kelurahan, super_admin)

Body: `wilayah_id`, `judul`, `jenis`, `kategori_aktivitas`, `target_peserta`, `mulai`, `selesai`, `exp_reward` (default 50), `badge_reward` (opsional). **Tanpa** `status`. **201** objek program.

### 12.3 POST `/program/{id}/peserta` (user)

Ikut program. **201** `data`: `{"status":"terdaftar"}`. Sudah terdaftar → 422.

### 12.4 PATCH `/program/{id}/peserta` (user, kader, admin_kelurahan, super_admin)

```json
{ "user_id": 12, "status": "selesai" }
```

- `user` hanya boleh `berhenti` untuk dirinya (`user_id` diabaikan). `selesai` hanya oleh `kader` (warga binaan), `admin_kelurahan` (wilayahnya), atau `super_admin`, agar reward tidak diklaim sendiri.
- Saat `selesai` (sekali saja, idempoten): server menambah `exp_reward` ke `pengguna.exp_total`, memperbarui `level_gamifikasi`, dan mencatat `badge_reward` ke `badge_pengguna`.

**200** `data`: `{"status":"selesai","exp_didapat":100,"exp_total":220,"level_gamifikasi":3,"badge_baru":"jagoan_pushup"}`

### 12.5 GET `/peringkat` (auth)

Query: `?wilayah_id=3`. Peringkat dihitung (tidak disimpan) dari `exp_total` warga satu kelurahan. **Bukan data kesehatan.** Nama tampil **hanya bila** user mengaktifkan `tampil_di_peringkat` (§5.2); selain itu `"Peserta anonim"`. Bila peserta peringkat < 5, `daftar` kosong dan `rank` = `null` (suppression §9.2).

```json
{
  "wilayah": { "id": 3, "nama": "Kelurahan Sungai Besar" },
  "peserta_peringkat": 86,
  "daftar": [
    {
      "rank": 1,
      "nama": "Siti Aminah",
      "exp_total": 540,
      "level_gamifikasi": 6
    },
    {
      "rank": 2,
      "nama": "Peserta anonim",
      "exp_total": 510,
      "level_gamifikasi": 6
    }
  ],
  "saya": { "rank": 7, "exp_total": 120 }
}
```

`saya` hanya untuk role `user`. `daftar` maksimal 10.

---

## 13. Modul Target & Refleksi

### 13.1 GET `/target` (user)

Bila belum pernah diisi, semua field `null`.

```json
{
  "bb_target_kg": 68,
  "bb_awal_kg": 77.0,
  "target_aktivitas_per_minggu": 3,
  "target_air_ml": 2000
}
```

### 13.2 PUT `/target` (user)

```json
{ "bb_target_kg": 68, "target_aktivitas_per_minggu": 3, "target_air_ml": 2000 }
```

**200** — bentuk sama dengan GET. `bb_awal_kg` **read-only**: diisi server dari `bb_kg` log terbaru saat `bb_target_kg` pertama kali diset (tetap `null` bila belum ada log berat badan; `progress_persen` di §8.1 ikut `null`). Baris `profil` dibuat bila belum ada.

### 13.3 POST `/refleksi` (user)

`minggu` = ISO-8601 week `YYYY-Www` (Senin awal minggu). Satu refleksi per user per minggu; kirim ulang minggu yang sama → **422**.

```json
{ "minggu": "2026-W40", "catatan": "Minggu ini sulit menjaga pola makan." }
```

**201** `data`: `{"id":9,"minggu":"2026-W40","catatan":"...","created_at":"2026-10-03T20:00:00+08:00"}`

### 13.4 GET `/refleksi` (user)

Query: `?page=&per_page=`. **200** array refleksi miliknya + paginasi, terbaru dulu.

---

## 14. Modul Laporan

### 14.1 GET `/laporan/pribadi` (user)

Query: `?periode=3m`

```json
{
  "periode": "3m",
  "user": { "name": "Budi Santoso", "usia": 28, "jenis_kelamin": "L" },
  "ringkasan": {
    "status_kesehatan": "perlu_perhatian",
    "skor_risiko": 36,
    "total_pencatatan": 11
  },
  "catatan": [
    {
      "dicatat_pada": "2026-09-03",
      "sumber": "mandiri",
      "bb_kg": 73.7,
      "imt": 25.5,
      "sistol": 140,
      "diastol": 90
    }
  ],
  "rujukan": [
    {
      "tanggal": "2026-09-15",
      "faskes": "Puskesmas Landasan Ulin",
      "status": "tertangani"
    }
  ],
  "disclaimer": "Sistem ini bukan alat diagnosis medis. Konsultasikan hasil dengan tenaga kesehatan."
}
```

### 14.2 GET `/laporan/kelurahan` (admin_kelurahan, super_admin)

Agregat, mengikuti suppression §9.2. **200** struktur seperti `/dashboard/kelurahan` ditambah `disclaimer`.

---

## 15. Modul Admin (Master Data)

Butuh role `super_admin`.

| Method     | Path                                        | Fungsi                                                                                         |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| GET/POST   | `/admin/indikator`                          | Daftar / tambah indikator (`kode`, `nama`, `satuan`, `kelompok`, `interval_skrining_hari`)     |
| PUT/DELETE | `/admin/indikator/{id}`                     | Ubah / hapus indikator                                                                         |
| GET/POST   | `/admin/ambang-kategori`                    | Daftar / tambah ambang                                                                         |
| PUT/DELETE | `/admin/ambang-kategori/{id}`               | Ubah / hapus ambang                                                                            |
| GET/POST   | `/admin/pengguna`                           | Daftar (filter role) / buat akun kader atau admin kelurahan                                    |
| PUT        | `/admin/pengguna/{id}`                      | Ubah data/role/wilayah dan **tetapkan `kader_id`** warga                                       |
| DELETE     | `/admin/pengguna/{id}`                      | Nonaktifkan: `aktif = false` dan semua token dicabut                                           |
| GET/POST   | `/admin/faskes`                             | Daftar / tambah faskes                                                                         |
| PUT/DELETE | `/admin/faskes/{id}`                        | Ubah / hapus faskes                                                                            |
| GET        | `/admin/log-audit`                          | Riwayat aktivitas, termasuk `baca_data_individu` oleh `super_admin`                            |
| GET        | `/admin/statistik`                          | Statistik keseluruhan sistem                                                                   |
| GET        | `/admin/catatan-kesehatan/perlu-verifikasi` | Log ber-flag `perlu_verifikasi` (`?wilayah_id=`)                                               |
| PATCH      | `/admin/catatan-kesehatan/{id}/verifikasi`  | `{"setuju":true}` → `perlu_verifikasi=false` (masuk agregat); `{"setuju":false}` → soft delete |

**Bentuk `ambang-kategori`** (rentang `[batas_min, batas_max)`; `batas_max` eksklusif):

```json
{
  "id": 4,
  "indikator": {
    "kode": "imt",
    "nama": "Indeks Massa Tubuh",
    "satuan": "kg/m2"
  },
  "jenis_gula_darah": null,
  "batas_min": 25.0,
  "batas_max": 30.0,
  "kategori": "gemuk",
  "skor": 1,
  "memicu_rujukan": false
}
```

`jenis_gula_darah` hanya terisi untuk indikator gula darah. POST/PUT yang membuat **celah atau tumpang tindih** rentang pada indikator yang sama → 422. Perubahan ambang hanya berlaku untuk log **baru** (riwayat memakai snapshot, §7.1).

---

## 16. Matriks Hak Akses

`*` = dibatasi scope (wilayah / binaan / kepemilikan). Selain tanda ✅ → 403 (role) atau 404 (di luar scope).

| Endpoint                                     | super_admin | admin_kelurahan  | kader | user                    | publik |
| -------------------------------------------- | ----------- | ---------------- | ----- | ----------------------- | ------ |
| POST /auth/register, /auth/login             | –           | –                | –     | –                       | ✅     |
| GET /auth/me, POST /auth/logout              | ✅          | ✅               | ✅    | ✅                      | –      |
| GET /profil                                  | ✅ (audit)  | –                | ✅\*  | ✅\*                    | –      |
| PUT /profil                                  | –           | –                | –     | ✅                      | –      |
| POST, DELETE /persetujuan                    | –           | –                | –     | ✅                      | –      |
| GET /wilayah                                 | ✅          | ✅               | ✅    | ✅                      | ✅     |
| GET /faskes                                  | ✅          | ✅               | ✅    | ✅                      | –      |
| POST /catatan-kesehatan                      | ✅          | –                | ✅\*  | ✅\*                    | –      |
| GET /catatan-kesehatan, /{id}                | ✅ (audit)  | –                | ✅\*  | ✅\*                    | –      |
| DELETE /catatan-kesehatan/{id}               | ✅          | –                | ✅\*  | ✅\*                    | –      |
| GET /dashboard/pribadi, /insight             | –           | –                | –     | ✅                      | –      |
| GET /tren                                    | –           | –                | ✅\*  | ✅\*                    | –      |
| GET /dashboard/kelurahan, /laporan/kelurahan | ✅          | ✅\*             | –     | –                       | –      |
| GET /posbindu/sesi, /posbindu/sesi/{id}      | ✅          | ✅\* (agregat)   | ✅\*  | –                       | –      |
| POST, PUT, DELETE /posbindu/sesi             | ✅          | ✅\*             | –     | –                       | –      |
| POST /posbindu/sesi/{id}/peserta             | ✅          | –                | ✅\*  | –                       | –      |
| GET /posbindu/kunjungan                      | ✅          | –                | ✅\*  | ✅\*                    | –      |
| POST /rujukan                                | ✅          | –                | ✅\*  | –                       | –      |
| GET /rujukan                                 | ✅          | ✅\* (teredaksi) | ✅\*  | ✅\*                    | –      |
| PATCH /rujukan/{id}/status                   | ✅          | ✅\*             | ✅\*  | –                       | –      |
| GET /admin/catatan-kesehatan/perlu-verifikasi; PATCH .../verifikasi | ✅ | – | – | – | – |
| GET /program, /peringkat                     | ✅          | ✅               | ✅    | ✅                      | –      |
| POST /program                                | ✅          | ✅\*             | –     | –                       | –      |
| POST /program/{id}/peserta                   | –           | –                | –     | ✅                      | –      |
| PATCH /program/{id}/peserta                  | ✅          | ✅\*             | ✅\*  | ✅\* (hanya `berhenti`) | –      |
| GET, PUT /target; GET, POST /refleksi        | –           | –                | –     | ✅                      | –      |
| GET /laporan/pribadi                         | –           | –                | –     | ✅                      | –      |
| /admin/\*                                    | ✅          | –                | –     | –                       | –      |

---

## 17. Lampiran: Daftar Tabel (16 tabel: 15 aktif + `pengobatan` cadangan)

Acuan migrasi BE. Nama final; jangan diubah tanpa Changelog.

| #   | Tabel                | Kolom inti                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `wilayah`            | id, parent_id, nama, tipe, kode                                                                                                                                                                                                                                                                                                                                                                                 |
| 2   | `pengguna`           | id, name, email, password, role, wilayah_id, kader_id (nullable), **aktif**, consent_at, versi_kebijakan, **exp_total**, **level_gamifikasi**                                                                                                                                                                                                                                                                   |
| 3   | `profil`             | user_id, tgl_lahir, jenis_kelamin, tinggi_cm, tingkat_aktivitas, merokok, riwayat_keluarga (json), **tampil_di_peringkat**, bb_target_kg, **bb_awal_kg**, target_aktivitas_per_minggu, target_air_ml                                                                                                                                                                                                            |
| 4   | `catatan_kesehatan`  | id, user_id, dicatat_oleh, dicatat_pada, sumber, sesi_posbindu_id, bb_kg, tinggi_cm (snapshot), imt, kategori_imt, sistol, diastol, kategori_tensi, gula_darah, jenis_gula_darah, kategori_gula_darah, kolesterol, kategori_kolesterol, asam_urat, kategori_asam_urat, lingkar_perut, tidur_jam, merokok, konsumsi_manis, status_kesehatan, skor_imt, skor_tensi, skor_gula_darah, skor_kolesterol, skor_asam_urat, catatan, perlu_verifikasi, deleted_at, created_at — **append-only** |
| 5   | `indikator`          | id, kode, nama, satuan, kelompok, **interval_skrining_hari**                                                                                                                                                                                                                                                                                                                                                    |
| 6   | `ambang_kategori`    | id, indikator_id, jenis_gula_darah (nullable), batas_min, batas_max, kategori, skor, **memicu_rujukan**                                                                                                                                                                                                                                                                                                 |
| 7   | `sesi_posbindu`      | id, wilayah_id, tanggal, lokasi, kader_id, catatan                                                                                                                                                                                                                                                                                                                                                              |
| 8   | `kunjungan_posbindu` | id, sesi_id, user_id, hadir, dicatat_oleh, catatan_kesehatan_id — unik (sesi_id, user_id)                                                                                                                                                                                                                                                                                                                       |
| 9   | `rujukan`            | id, user_id, faskes_id, alasan, **otomatis**, **indikator** (nullable), dibuat_oleh (nullable = sistem), status, ditangani_oleh, catatan, created_at, updated_at                                                                                                                                                                                                                                                |
| 10  | `faskes`             | id, wilayah_id, nama, jenis, alamat, telepon, lat, lng (lat/lng cadangan, belum ada endpoint peta)                                                                                                                                                                                                                                                                                                              |
| 11  | `pengobatan`         | id, user_id, nama_obat, dosis, mulai, selesai, aktif — **cadangan: belum ada endpoint, migrasi ditunda**                                                                                                                                                                                                                                                                                                        |
| 12  | `log_audit`          | id, user_id, aksi, model, model_id, ip, user_agent, created_at                                                                                                                                                                                                                                                                                                                                                  |
| 13  | `program`            | id, wilayah_id, judul, jenis, **kategori_aktivitas**, target_peserta, mulai, selesai, **exp_reward**, **badge_reward** (`status` dihitung)                                                                                                                                                                                                                                                                      |
| 14  | `peserta_program`    | program_id, user_id, status, selesai_pada                                                                                                                                                                                                                                                                                                                                                                       |
| 15  | `refleksi`           | id, user_id, minggu, catatan, created_at — unik (user_id, minggu)                                                                                                                                                                                                                                                                                                                                               |
| 16  | `badge_pengguna`     | id, user_id, badge, diraih_pada                                                                                                                                                                                                                                                                                                                                                                                 |

> Tabel `pengguna` menggantikan `users` bawaan Laravel. Model `User` **wajib** memakai `protected $table = 'pengguna';`.

---

## 18. Checklist FE ↔ BE

- [ ] FE membuat UI dengan data dummy sesuai §7.2, §8.1, §9.1 (tiga response paling sering).
- [ ] BE menyelesaikan migrasi + `ApiResource` minggu 1 agar FE melihat JSON asli.
- [ ] Putuskan penyimpanan token di FE (§21 #1).
- [ ] Endpoint baru di luar dokumen ini → tulis di sini dulu, baru ngoding.

---

## 19. Pencarian

Parameter `search=` hanya untuk endpoint **koleksi daftar**; di endpoint agregat (`/dashboard/*`, `/laporan/*`, `/insight`, `/tren`, `/peringkat`) dan endpoint tulis, `search` **diabaikan**. Memakai `LIKE` berparameter (bukan string mentah), case-insensitive, dengan karakter `%` dan `_` di-escape. Pencarian tetap berada dalam scope pemanggil.

| Endpoint                   | Kolom yang dicari                                                       |
| -------------------------- | ----------------------------------------------------------------------- |
| `/wilayah`                 | `nama`, `kode`                                                          |
| `/faskes`, `/admin/faskes` | `nama`, `alamat`                                                        |
| `/catatan-kesehatan`       | `catatan`                                                               |
| `/posbindu/sesi`           | `lokasi`, `catatan`                                                     |
| `/rujukan`                 | `faskes.nama`, `alasan` (hanya untuk role yang berhak melihat `alasan`) |
| `/program`                 | `judul`, `kategori_aktivitas`                                           |
| `/admin/pengguna`          | `name`, `email`                                                         |
| `/admin/log-audit`         | `aksi`, `model`                                                         |

Contoh: `GET /catatan-kesehatan?search=lembur`.

---

## 20. Dicabut / Ditunda

**Dicabut dari usulan v1.2:**

| Usulan                                       | Keputusan                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Rename `/tren` → `/rekam-medis`              | Dibatalkan. Path tetap `/tren`; label menu UI boleh "Rekam Medis" (§21 #3) |
| Role `kelurahan` sebagai alias               | Dibatalkan. Enum role tetap 4 nilai; `admin_kelurahan` sudah ada           |
| `next_notifications` di `/dashboard/pribadi` | Dicabut                                                                    |

**Ditunda (belum dijadwalkan; jangan dikarang di BE/FE):** notifikasi (`GET /notifikasi`, tabel `notifikasi`), lupa/reset password, verifikasi email, refresh/kedaluwarsa token, `PUT`/`DELETE /program/{id}`, peta faskes (`lat`/`lng`), modul `pengobatan`.

**Kebijakan token:** Sanctum token tidak kedaluwarsa otomatis. FE **wajib** menghapus token tersimpan dan mengarahkan ke login saat menerima `401`.

---

## 21. TODO-KONFIRMASI (butuh keputusan pembimbing/tim)

1. **Penyimpanan token di FE:** `localStorage` (rentan XSS) atau secure store (jika desktop)?
2. **Rujukan otomatis:** perlukah konfirmasi kader sebelum aktif? Pemicu saat ini hanya tensi `krisis` (`memicu_rujukan`); perlukah diperluas ke skor 2 (risiko rujukan membanjir)?
3. **"Rekam Medis":** hanya label menu, atau path API ikut diganti? (Bila diganti, ubah §3, §8.2, §16.)
4. **Ambang klinis (§8.3):** divalidasi tenaga kesehatan/puskesmas.
5. **Rujukan teredaksi** untuk `admin_kelurahan` (§11.2): cukup, atau perlu data lain?
6. Nama penulis di kolom "Oleh" Changelog.

---

## 22. Lampiran A — Catatan Produk & UI/UX (non-normatif)

Bagian ini bukan kontrak API.

**Landing page**

- **Hero:** logo, nama aplikasi, tagline; judul besar _"Sistem Monitoring Kesehatan PTM"_.
- **Deskripsi & keunggulan** (boleh animasi): mengumpulkan data kesehatan, menghitung IMT, insight berbasis aturan (aman/siaga/bahaya), rujukan otomatis, gamifikasi (tantangan, badge, EXP, peringkat kelurahan), mode light/dark. Dashboard diperbarui **berkala (polling)**, bukan realtime.
- **Ilustrasi** (opsional): gambar/SVG, boleh animasi CSS/JS.
- **FAQ** dengan anchor (registrasi, consent, data yang dikumpulkan, cara membaca insight).
- **Footer:** About (proyek, tim, kontak), Copyright, tautan Privacy Policy & Terms of Service.
- **Mode light/dark:** variabel CSS, toggle ikon matahari/bulan, semua komponen mengikuti.

**Aplikasi**

- **Sidebar navigation** di semua halaman; tombol tidak menumpuk (grup tombol atau dropdown); tata letak kiri–kanan yang interaktif dan mudah dipahami.
- **Form catatan kesehatan:** dikelompokkan, ada tooltip, tampilan menarik; field wajib bertanda `*`, field opsional tanpa tanda.
- **Input angka:** field angka hanya menerima angka (FE memblokir huruf; BE tetap memvalidasi `numeric`).
- **Alur:** login → `/dashboard/pribadi` tanpa harus melengkapi profil; banner "Lengkapi profil" dan prompt persetujuan; profil diisi lewat `/profil`.
- Tanggal lahir: date picker dibatasi `max = hari ini`.

---

## 23. Lampiran B — Daftar Bug yang Diminta Pembimbing (non-normatif)

| Bug                                | Akar masalah                                                 | Perbaikan                                                                | Cara tes                                    |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------- |
| Login lolos padahal password salah | Hanya cek panjang/format, tidak `Hash::check`                | Wajib `Hash::check`; gagal → 422 (§4.2)                                  | Password salah → 422                        |
| Email sama bisa daftar             | Tidak ada rule unik                                          | `unique:pengguna,email`, disimpan lowercase                              | Daftar dua kali → 422                       |
| Register 404                       | Route belum terdaftar / prefix `v1` salah                    | Daftarkan `POST /api/v1/auth/register`                                   | Panggil endpoint → 201                      |
| Tanggal lahir melebihi hari ini    | Tidak ada batas                                              | BE `before:today`; FE `max = hari ini`                                   | Tanggal besok → 422                         |
| Data tidak lengkap bisa tersimpan  | Tidak ada aturan kelengkapan                                 | Aturan §7.1 (wajib + minimal satu pengukuran)                            | Log kosong → 422                            |
| Role kelurahan                     | `admin_kelurahan` sudah ada di enum, seeder/menu belum jalan | Pastikan seeder, middleware `role:`, dan menu FE berfungsi (tanpa alias) | Login `admin_kelurahan` → dashboard agregat |

---

## 24. Changelog

| Versi | Tanggal    | Perubahan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Oleh |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.0   | 2026-10-03 | Draft awal kontrak                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | BE   |
| 1.1   | 2026-10-03 | Penamaan tabel & path diseragamkan ke bahasa Indonesia; kolom `konsumsi_manis`; §0 keputusan desain, §3 peta endpoint→tabel; lampiran daftar tabel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | BE   |
| 1.2   | 2026-10-03 | Usulan: `/rekam-medis`, alias role `kelurahan`, `GET /notifications`, gamifikasi, landing page & UI/UX — sebagian ditolak di 1.3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | FE   |
| 1.3   | 2026-10-23 | Audit: kontradiksi 422 vs `perlu_verifikasi`; endpoint verifikasi admin; `pengguna.kader_id`; snapshot `tinggi_cm` + soft delete; rumus skor/insight/agregat; enum `riwayat_keluarga`; `GET /target`, `GET /refleksi`, `DELETE /posbindu/sesi/{id}`; 404 untuk scope; `program.status` turunan; `search` dibatasi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | BE   |
| 1.4   | 2026-10-23 | Konsolidasi: sisa v1.2 dibersihkan, UI dipindah ke lampiran, changelog satu tabel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | BE   |
| 1.5   | 2026-10-24 | **(1)** Ambang & kategori lengkap tanpa celah di §8.3 (`ambang_kategori`, kolom `memicu_rujukan`, kategori `krisis`/`tinggi`); pemetaan skor→status→level §1.5; rumus `skor_risiko` baru (36) dan `progress_persen`. **(2)** Rujukan otomatis dipicu saat simpan; kolom `rujukan.otomatis`, `rujukan.indikator`; anti-duplikat; fallback faskes. **(3)** Validasi: dua lapis rentang (mustahil 422 / wajar flag), `tidur_jam` wajar 0–24 → 3–12, minimal satu pengukuran, pasangan sistol-diastol, consent → 422, `jenis_gula_darah` wajib. **(4)** `catatan_kesehatan` append-only + snapshot `kategori_*`. **(5)** Privasi: §10.3, §10.5 (hanya kader/super_admin, 404, duplikat 422), §11.2 rujukan teredaksi untuk `admin_kelurahan`, `log_audit` akses super_admin; `POST /rujukan` hanya kader/super_admin. **(6)** Dashboard kelurahan: `distribusi_risiko` → `distribusi_riwayat_keluarga`, field `rujukan.total` dan `belum_ditindaklanjuti` dihapus, `ada_data_disembunyikan`, complementary suppression. **(7)** Gamifikasi: `exp_total`/`level_gamifikasi` di `pengguna`, tabel `badge_pengguna`, `program.kategori_aktivitas/exp_reward/badge_reward`, `GET /peringkat`, `profil.tampil_di_peringkat`; field reward dihapus dari `peserta_program`; `PATCH /program/{id}/peserta` menerima `user_id`. **(8)** `pengguna.aktif`, `profil.bb_awal_kg`, `indikator.interval_skrining_hari`; `GET /profil` kosong → 200 + `profil_lengkap:false`; `auth/me.profil` bisa `null`. **(9)** Login: rate limit per email+IP, tanpa aturan panjang password. **(10)** `/tren` satu titik per hari. **(11)** Enum baru (`kategori_*`, `wilayah.tipe`, `faskes.jenis`, `status_sesi`); §19 kolom pencarian; §21 TODO-KONFIRMASI; lampiran UI & bug dalam satu dokumen | BE   |
| 1.5.1 | 2026-10-24 | Klarifikasi tanpa ubah bentuk: consent juga untuk `PUT /profil`; tarik consent → pemilik tetap bisa baca/hapus data lama; rujukan tetap ada; tinggi profil 120–220 (422); `tampil_di_peringkat` tidak di-reset; read-only dikirim → 422; snapshot `skor_*`; `ambang_kategori.status` dihapus; audit mencakup verifikasi & ubah status rujukan; register rate limit; `per_page` 1–100; TODO #4/#7 selesai | BE |

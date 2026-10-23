# Catatan UI/UX, Landing Page & Daftar Bug

> Dipindahkan dari `kontrak-api.md` v1.3. **Bukan bagian kontrak API** — kontrak hanya mengatur bentuk request/response, endpoint, dan tabel. Dokumen ini untuk kebutuhan tampilan.
>
> Yang sudah diangkat ke kontrak: rumus insight (§8.3), reward program (§12), alur login → dashboard (§4.2), validasi numerik form (§7.2). Sisanya di bawah ini masih berlaku sebagai catatan produk, belum jadi kontrak.

---

## 19. Landing Page

### 19.1 Hero & Judul
- Hero menampilkan logo, nama aplikasi, dan tagline singkat yang menjelaskan tujuan utama sistem monitoring kesehatan.
- Judul besar: *"Sistem Monitoring Kesehatan PTM"*.

### 19.2 Deskripsi & Keunggulan (bisa animasi)
- Ringkas: mengumpulkan data kesehatan, menghitung IMT, memberi insight, dan rujukan otomatis.
- **Keunggulan**:
  1. **Realtime** – data langsung terlihat di dashboard.
  2. **Insight berbasis aturan** – level `info`, `peringatan`, `bahaya`.
  3. **Gamifikasi** – tantangan, badge, EXP, rank kelurahan.
  4. **Mode Light/Dark** – pilihan tampilan.

### 19.3 Ilustrasi (opsional)
- Gambar atau SVG ilustrasi (contoh peta daerah, ikon kesehatan) yang dapat diganti dengan animasi CSS/JS.

### 19.4 FAQ
- Daftar pertanyaan umum (registrasi, consent, data yang dikumpulkan, cara mengakses insight, dsb.) dengan anchor untuk navigasi cepat.

### 19.5 Footer
- **About** – deskripsi singkat proyek, tim, dan kontak.
- **Copyright** – tahun dan hak cipta.
- Link ke *Privacy Policy* & *Terms of Service*.

### 19.6 Mode Light / Dark
- Implementasi CSS variabel `--mode-light` & `--mode-dark`.
- Toggle di UI (ikon matahari/bulan).
- Semua komponen harus responsif terhadap kedua mode.

---

## 20. Daftar Bug & Perbaikan
- **Login**: password harus minimal 8 karakter; selain itu tidak boleh lolos.
- **Login gagal**: respons `422` dengan pesan *"Email atau password salah"*.
- **Register 404**: endpoint sudah tersedia `/auth/register`.
- **Email duplikat**: registrasi gagal dengan `422` bila email sudah ada.
- **Tanggal lahir**: tidak boleh lebih besar dari hari ini.
- **Validasi kelengkapan**: data tidak boleh tersimpan jika field wajib belum diisi.
- **Role baru**: penambahan role `kelurahan` (alias `admin_kelurahan`).

---

## 21. UI/UX & Navigasi
- **Sidebar navigation** di semua halaman untuk menghindari penumpukan tombol.
- **Tombol** tidak menumpuk; gunakan grup tombol atau menu dropdown.
- **Form catatan kesehatan**: tampilkan tanda `*` pada field wajib, hapus tanda pada optional.
- **Input numerik**: hanya menerima angka (tidak boleh huruf).
- **Desain**: tata letak kiri‑kanan interaktif, mudah dipahami.

---

## 22. Insight & Rujukan Otomatis
- **Level**: `info`, `peringatan`, `bahaya`.
- **Contoh rumus**:
  - **BB naik > 3 kg dalam 3 minggu** → `peringatan`.
  - **IMT > 30** → `bahaya`.
  - **Gula darah puasa > 126** → `bahaya`.
- **Rujukan otomatis**: bila level `bahaya`, server otomatis membuat entri di tabel `rujukan` dan meng‑set status `baru`.
- **Notifikasi**: endpoint baru `GET /notifications` mengembalikan daftar notifikasi (insight & rujukan) dalam format envelope.

---

## 23. Pencarian (Search)
- Semua endpoint mendukung query parameter `search=` (atau `q=`) untuk pencarian teks dalam koleksi masing‑masing.
- Contoh: `GET /catatan-kesehatan?search=diabet` atau `GET /wilayah?search=Sungai`.

---

## 24. Renaming Tren → Rekam Medis
- Endpoint sebelumnya `/tren` diganti menjadi `/rekam-medis`.
- Semua referensi di kontrak dan dokumentasi harus menggunakan istilah *Rekam Medis*.

---

## 25. Gamifikasi & Tantangan
- Modul **Program** diubah menjadi **Tantangan/Penyuluhan**.
- Tambahan field pada tabel `program` & `peserta_program`:
  - `badge` (string), `exp` (integer), `level` (integer), `rank_kelurahan` (string).
- Endpoint tetap `/program`, tetapi response kini mencakup reward fields.

---

## 26. Alur Login → Dashboard
- Setelah `POST /auth/login` berhasil, FE langsung diarahkan ke `/dashboard/pribadi` (tanpa keharusan mengisi data profil lengkap).
- Pengisian profil dapat dilakukan terpisah melalui endpoint `/profil`.

---

## 27. Notifikasi Endpoint
- **GET /notifications** – Mengembalikan daftar notifikasi terbaru (insight level `bahaya`/`peringatan`, rujukan otomatis, badge earned, dll.) dalam envelope response.

---

## 28. Perubahan pada Modul Catatan Kesehatan ( §7 )
- **Validasi numerik**: semua field angka (`bb_kg`, `sistol`, `diastol`, `gula_darah`, `kolesterol`, `asam_urat`, `lingkar_perut`, `tidur_jam`) **hanya menerima angka**.
- **Tanda wajib**: pada UI, field yang wajib diisi diberi tanda `*`; field opsional tanpa tanda.
- **Form**: tata letak form dibuat lebih menarik, dengan grup field dan bantuan tooltip.

---

## 29. Perubahan pada Modul Insight ( §8 )
- Tambahan **rumus perhitungan** (lihat §22) dan contoh kode pseudo‑logic.
- Endpoint `/insight` kini dapat menerima query `level=` untuk filter level (`info`, `peringatan`, `bahaya`).

---

## 30. Perubahan pada Modul Program ( §12 )
- Nama endpoint tetap `/program`, tapi dokumentasi menyebut **Tantangan/Penyuluhan** dan menambahkan field reward (badge, exp, level, rank).
- Contoh response GET `/program` kini mencakup `badge`, `exp`, `level`, `rank_kelurahan` bila ada.

---

## 31. Perubahan pada Modul Dashboard Pribadi ( §8.1 )
- Response kini menyertakan `next_notifications` (array) yang berisi notifikasi yang akan datang (insight, rujukan, reward).

---

## 32. Perubahan pada Matriks Hak Akses ( §16 )
- Tambahan permission untuk endpoint baru `GET /notifications` (semua role yang sudah ter‑auth).

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1.0 | 2026-10-03 | Draft awal kontrak | BE |
| 1.1 | 2026-10-03 | Penamaan tabel & path diseragamkan ke bahasa Indonesia (`/health-logs`→`/catatan-kesehatan`, `/profile`→`/profil`, `/consent`→`/persetujuan`, `/programs`→`/program`, `/admin/users`→`/admin/pengguna`, `/admin/audit-log`→`/admin/log-audit`); tambah kolom `konsumsi_manis` + enum; tambah §0 keputusan desain & §3 peta endpoint→tabel; tambah lampiran daftar tabel Indonesia | BE |

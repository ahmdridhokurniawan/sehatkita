# Backlog Revisi — SehatKita (revisi Kakak Pembimbing Magang)

Tanggal: 2026-11-09. Sumber: pesan revisi pembimbing.

Kode area: **[FE]** frontend (Daffa) · **[BE]** backend (Ridho) · **[FE+BE]** butuh dua-duanya.

---

## A. USER / WARGA

| ID | Item | Area | Prioritas | Catatan |
|----|------|------|-----------|---------|
| U1 | Card "berisiko" terlalu polos | FE | Sedang | polish styling card |
| U2 | Card indikator boros tempat, tidak konsisten | FE | Tinggi | rapikan grid + ukuran seragam |
| U3 | Jadwal diubah jadi kalender | FE | Sedang | ganti list → kalender |
| U4 | Sistol/diastol jangan disingkat | FE | Tinggi | `SYS`/`DIA` → "Sistol"/"Diastol" |
| U5 | Tampilan motivasi saat target tercapai | FE | Sedang | state sukses |
| U6 | Logout validasi "apakah pengen keluar" | FE | Tinggi | modal konfirmasi |
| U7 | Notifikasi integrasi Telegram (bot) | FE+BE | Rendah | ada `TelegramController`; perlu cek endpoint notif BE |
| U8 | Reminder "apakah kamu sudah cek gula darah bulan ini?" | FE+BE | Rendah | butuh scheduler/notif BE |
| U9 | Hapus "Atur target" → fitur baru "Target" (berat badan, tinggi badan, massa otot, dst) | FE+BE | Tinggi | form FE; simpan macam-macam target butuh model BE baru |
| U10 | Kalkulator BMI | FE | Tinggi | murni FE (hitung dari bb/tb), bisa langsung |
| U11 | Kemungkinan tampilan 3D | FE | Rendah | perlu scope: three.js asli / hanya efek |
| U12 | Warga pindah kelurahan | BE | Rendah | butuh skema riwayat wilayah |
| U13 | "history" bukan "insight" | FE | Tinggi | rename label |
| U14 | Fitur panduan (di dalam insight) | FE | Sedang | halaman baru |

## B. KADER

| ID | Item | Area | Prioritas | Catatan |
|----|------|------|-----------|---------|
| K1 | Bagian memuat lebih menarik | FE | Sedang | pakai lottiefiles.com (animasi loading) |
| K2 | Tambah NIK di semua akun (tidak hanya kader) | BE | Tinggi | seeder belum isi NIK → kolom kosong |
| K3 | Referensi tampilan dari dribbble.com | FE | Sedang | sumber desain |

## C. ADMIN

| ID | Item | Area | Prioritas | Catatan |
|----|------|------|-----------|---------|
| A1 | Rekam medis tetap tampil, admin hanya bisa melihat (read-only) | FE | Tinggi | **BENTROK:** backend 403 (privasi, kata Ridho). Keputusan 2026-11-09: frontend-only — sembunyikan halaman utk admin, jangan sentuh BE |
| A2 | Admin bisa menambah tantangan per kelurahan | FE+BE | Sedang | butuh endpoint BE baru |
| A3 | Fitur pengaduan | FE+BE | Sedang | fitur baru |

## D. SUPER ADMIN

| ID | Item | Area | Prioritas | Catatan |
|----|------|------|-----------|---------|
| S1 | Perhitungan EXP warga di tantangan | BE | Tinggi | logika EXP = wilayah Ridho |
| S2 | "Validasi gagal di tamba program" | BE? | Tinggi | **perlu klarifikasi** — maksudnya error saat tambah program? |
| S3 | Beranda: grafik + export data | FE+BE | Sedang | grafik FE; export butuh endpoint BE |

---

## Prioritas kerja (saran)

**Langsung (FE murni, cepat):**
U4 → U10 → U13 → U6 → U2 → U1 → U3 → U5 → K1 → U14

**Butuh keputusan/klarifikasi dulu:**
- A1 (bentrok privasi vs permintaan supervisor)
- S2 (maksud "validasi gagal")

**Blokir backend (kirim ke Ridho):**
U7, U8, U9(model), U12, K2, A2, A3(sebagian), S1, S3(export)

## Keputusan tercatat
- 2026-11-09: A1 → frontend-only, sembunyikan rekam medis utk admin (backend 403, jangan sentuh).

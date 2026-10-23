# BUGLOG — Daftar Bug & Perbaikan UI/Sistem

Dokumen ini mencatat daftar bug dan perbaikan sistem dari temuan audit.

## 1. Modul Auth & Validasi
- **Login**: pastikan password minimal 8 karakter tervalidasi dengan baik; jika kurang dari 8 karakter, tidak boleh lolos.
- **Login Gagal**: respon `422` dengan pesan *"Email atau password salah"*.
- **Register**: endpoint publik `/auth/register` wajib menangani registrasi masyarakat secara benar.
- **Email Duplikat**: registrasi gagal dengan `422` bila email sudah digunakan.

## 2. Profil & Data
- **Tanggal Lahir**: tidak boleh lebih besar dari hari ini (validasi batas waktu).
- **Validasi Kelengkapan**: data tidak boleh tersimpan jika field wajib belum diisi.

# Aturan Pembagian Wilayah Kerja AI Agent — SehatKita

Repository ini memiliki pemisahan tugas tegas antara **Frontend (`frontend/`)** dan **Backend (`backend/`)**. Semua AI coding assistant (Claude Code, Antigravity, Codex, Cursor, Copilot, dll.) **WAJIB** mematuhi batas wilayah kerja di bawah ini sebelum mengubah file apa pun.

## 1. Cek Identitas & Wilayah Tugas

Periksa `git config user.name` / `git config user.email` serta konteks prompt user:

- **Jika user adalah Daffa (`DAFFASUPERPOWER` / `mdffaulia@gmail.com`) atau sedang mengerjakan tugas Frontend (`frontend/`):**
  - **HANYA BOLEH** mengubah file di dalam `frontend/`.
  - **DILARANG KERAS** membuat, mengedit, menghapus, atau memindahkan file apa pun di `backend/` (termasuk controller, model, migration, seeder, service, routes, dan test PHP) serta **DILARANG** mengubah `kontrak-api.md` sepihak.
  - Jika fitur UI butuh endpoint/kolom/validasi baru di backend, **hentikan perubahan kode pada `frontend/`** dan laporkan daftar kebutuhan API ke user agar dikerjakan oleh PIC Backend (Ridho).
  - Saat commit, pastikan hanya men-stage `frontend/` (`git add frontend/`).

- **Jika user adalah Ridho (`ahmdridhokurniawan`) atau sedang mengerjakan tugas Backend (`backend/`):**
  - **HANYA BOLEH** mengubah file di dalam `backend/` dan dokumentasi `kontrak-api.md` (kecuali file aturan bersama seperti `AGENTS.md` / `CLAUDE.md` atas permintaan eksplisit).
  - **DILARANG KERAS** mengubah file aplikasi di `frontend/`.

## 2. Rujukan Kontrak

- Selalu ikuti `kontrak-api.md` sebagai satu-satunya sumber kebenaran kontrak endpoint, parameter, dan format response antara Frontend dan Backend.
- Untuk detail aturan khusus Frontend, ikuti juga `frontend/AGENTS.md`.

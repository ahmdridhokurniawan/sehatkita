# Catatan untuk Ridho (Backend)

**Topik:** Password change endpoint — untuk frontend keamanan page

---

## Status
Frontend sudah membuat halaman `/setelan/keamanan` (settings → security) dengan form ubah password.

Tapi **PUT /auth/password endpoint belum ada** di backend.

---

## Yang Dibutuhkan

### Endpoint
```
PUT /auth/password
```

### Auth
- Role: user, kader, admin_kelurahan, super_admin (semua user)
- Bearer token required

### Request Body
```json
{
  "password_lama": "oldpass123",
  "password_baru": "newpass123",
  "password_baru_konfirmasi": "newpass123"
}
```

### Response (Sukses 200)
```json
{
  "success": true,
  "message": "Password berhasil diubah",
  "data": {
    "id": 1,
    "name": "Daffa",
    "email": "daffa@...",
    "updated_at": "2026-10-19T06:37:00Z"
  }
}
```

### Validasi
- password_lama wajib match dengan current password (else 400 Unauthorized)
- password_baru minimal 8 karakter (else 422 Unprocessable)
- password_baru === password_baru_konfirmasi (else 422)

---

## Next
Frontend UI ready → tinggal BE implement endpoint → frontend connect via `auth.changePassword()` di `/lib/api.ts`

**Priority:** low (MVP sudah lengkap tanpa ini, keamanan non-blocking)

---

**Status:** Frontend Fase A–H + Admin complete. Waiting BE endpoints.

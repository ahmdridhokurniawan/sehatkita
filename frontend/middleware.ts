import { NextResponse } from "next/server";

/**
 * CATATAN PENTING
 * ---------------
 * Dulu file ini memblokir rute berdasarkan peran dengan cara men-decode JWT
 * dari cookie `auth_token`. Itu tidak pernah bisa jalan:
 *
 *   1. Token yang dipakai aplikasi adalah token Sanctum opaque
 *      ("45|abcdef..."), BUKAN JWT — jadi `token.split(".")` tidak pernah
 *      menghasilkan 3 bagian dan peran selalu terbaca null.
 *   2. Token disimpan di localStorage, sedangkan middleware hanya bisa membaca
 *      cookie. Middleware tidak akan pernah melihat token itu.
 *
 * Efek bugnya: /program, /laporan, /admin selalu me-redirect ke /login
 * walaupun pengguna sudah login.
 *
 * Pembagian tugas yang benar:
 *   - Middleware  : tidak membatasi apa pun (token tak terlihat di sini).
 *   - AppShell    : mengarahkan ke /login bila belum login, ke /unauthorized
 *                   bila peran tidak cocok (token sudah terbaca di browser).
 *   - Backend API : pagar terakhir dan satu-satunya yang tepercaya — setiap
 *                   endpoint memeriksa token + peran sendiri.
 *
 * Jangan kembalikan pengecekan peran ke sini kecuali token dipindah ke cookie
 * httpOnly dan backend mengeluarkan JWT.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua path kecuali aset statis Next.js dan favicon.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

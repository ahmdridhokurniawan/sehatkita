import type { NextConfig } from "next";

/**
 * Alamat backend hanya dipakai SERVER, bukan browser.
 *
 * Kalau `API_PROXY_TARGET` disetel, Next.js meneruskan /api/v1/* ke backend
 * itu. Browser selalu memanggil origin yang sama (/api/v1), jadi CORS tidak
 * pernah ikut bermain dan preflight pun tidak ada. Ini menghilangkan kelas bug
 * "Failed to fetch" yang muncul ketika origin frontend tidak terdaftar di
 * backend — dan perbaikannya cukup di sisi frontend.
 *
 * Diisi saat start, bukan saat build:
 *   API_PROXY_TARGET=http://pm-monitoring.test npm run dev
 */
const target = (process.env.API_PROXY_TARGET ?? "http://pm-monitoring.test").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  // Proxy Next.js punya batas tunggu bawaan 30 detik. Login memanggil bcrypt
  // dan di laptop ini butuh 10-48 detik (CPU lambat + Docker bind mount),
  // sehingga proxy memutus koneksi lebih dulu: "socket hang up" / ECONNRESET,
  // lalu halaman menampilkan "Respons backend tidak valid (status 500)".
  // Naikkan batasnya supaya proxy menunggu selama backend masih bekerja.
  experimental: {
    proxyTimeout: 180_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

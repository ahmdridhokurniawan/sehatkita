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

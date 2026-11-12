import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SehatKita — Monitoring Kesehatan Masyarakat",
    short_name: "SehatKita",
    description:
      "Platform monitoring kesehatan PTM untuk warga dan kelurahan Kota Banjarbaru.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F3F6F4",
    theme_color: "#7D8D39",
    lang: "id",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/logo-banjarbaru-transparan.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

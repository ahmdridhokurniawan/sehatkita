import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SehatKita — Monitoring Kesehatan Masyarakat",
    short_name: "SehatKita",
    description:
      "Platform monitoring kesehatan PTM untuk warga dan kelurahan Kota Banjarbaru.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6FAF7",
    theme_color: "#0F7347",
    lang: "id",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo-banjarbaru-transparan.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}

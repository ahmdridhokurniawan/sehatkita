import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pusat Bantuan — SehatKita",
  description:
    "Panduan lengkap penggunaan SehatKita: cara mendaftar, mencatat indikator kesehatan, membaca analisis kesehatan, ikut Posbindu, dan mengelola privasi data.",
};

export default function BantuanLayout({ children }: { children: React.ReactNode }) {
  return children;
}

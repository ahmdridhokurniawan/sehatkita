import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontak Resmi — SehatKita",
  description:
    "Informasi kontak resmi pengelola SehatKita pada Dinas Kesehatan Kota Banjarbaru serta saluran pendampingan Kader Posbindu dan pengaduan layanan.",
};

export default function KontakLayout({ children }: { children: React.ReactNode }) {
  return children;
}

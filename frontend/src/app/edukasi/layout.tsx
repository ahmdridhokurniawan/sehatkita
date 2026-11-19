import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edukasi Kesehatan PTM — SehatKita",
  description: "Materi edukasi pengendalian PTM terpisah dengan pencatatan progres belajar pribadi.",
};

export default function EdukasiLayout({ children }: { children: React.ReactNode }) {
  return children;
}

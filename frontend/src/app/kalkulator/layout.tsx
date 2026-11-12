import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalkulator Kesehatan — SehatKita",
  description:
    "Hitung IMT, berat badan ideal, kebutuhan kalori harian (BMR/TDEE), kebutuhan air minum, MAP tekanan darah, dan evaluasi gula darah puasa/2JPP.",
};

export default function KalkulatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}

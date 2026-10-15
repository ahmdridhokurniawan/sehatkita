import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SKRIP_TEMA } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SehatKita — Monitoring Kesehatan Masyarakat",
  description:
    "Platform monitoring kesehatan PTM untuk kelurahan: catat indikator kesehatan, dapatkan insight, dan ikuti program kesehatan wilayah.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="light" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Terapkan tema sebelum render agar tidak berkedip */}
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { SKRIP_TEMA } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SehatKita — Monitoring Kesehatan Masyarakat",
  description:
    "Platform monitoring kesehatan PTM untuk kelurahan: catat indikator kesehatan, dapatkan insight, dan ikuti program kesehatan wilayah.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Terapkan tema sebelum render agar tidak berkedip */}
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

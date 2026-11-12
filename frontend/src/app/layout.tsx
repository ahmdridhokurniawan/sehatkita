import type { Metadata, Viewport } from "next";
import { SKRIP_TEMA } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "SehatKita — Monitoring Kesehatan Masyarakat",
    template: "%s — SehatKita",
  },
  applicationName: "SehatKita",
  description:
    "Platform monitoring kesehatan PTM untuk kelurahan: catat indikator kesehatan, dapatkan insight, dan ikuti program kesehatan wilayah.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Terapkan tema sebelum render agar tidak berkedip */}
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

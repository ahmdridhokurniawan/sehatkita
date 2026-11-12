"use client";

import { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
        background: "var(--bg)",
      }}
    >
      <div className="card" style={{ maxWidth: 460, width: "100%", textAlign: "center", padding: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <BrandLockup variant="sm" />
        </div>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--danger-bg)",
            color: "var(--danger)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 14px",
          }}
        >
          <Icon name="alert-triangle" size={24} />
        </div>
        <h1 className="h3">Terjadi Kesalahan Tampilan</h1>
        <p className="tiny mt-8">
          Halaman mengalami kendala saat dimuat. Silakan coba muat ulang atau kembali ke halaman utama.
        </p>
        <div className="row justify-center gap-10 mt-20 wrap">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            <Icon name="refresh" size={16} /> Coba Lagi
          </button>
          <Link href="/" className="btn btn-outline">
            <Icon name="home" size={16} /> Ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

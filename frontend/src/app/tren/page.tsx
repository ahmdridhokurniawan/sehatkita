"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Menu "Tren" sudah DIGANTI menjadi "Rekam Medis"
 * (revisi pembimbing magang). Halaman ini hanya mengalihkan
 * supaya tautan lama tidak 404.
 */
export default function TrenRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rekam-medis");
  }, [router]);
  return (
    <main className="center" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <p className="tiny">Mengalihkan ke Rekam Medis…</p>
    </main>
  );
}

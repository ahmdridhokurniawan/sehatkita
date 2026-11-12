"use client";

import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";

export default function LottieLoading({ label = "Memuat…" }: { label?: string }) {
  const [animasi, setAnimasi] = useState<unknown>(null);

  useEffect(() => {
    let aktif = true;
    fetch("/lottie/loading.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aktif) setAnimasi(data);
      })
      .catch(() => {
        if (aktif) setAnimasi(null);
      });
    return () => {
      aktif = false;
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-2)" }}>
      <div style={{ width: 90, height: 90, margin: "0 auto", display: "grid", placeItems: "center" }}>
        {animasi ? <Lottie src={animasi as object} autoplay loop /> : <span className="spinner" />}
      </div>
      <p className="tiny" style={{ marginTop: 8 }}>
        {label}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";

export default function LottieLoading({ label = "Memuat…" }: { label?: string }) {
  const [animasi, setAnimasi] = useState<unknown>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    setSiap(true);
    fetch("/lottie/loading.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setAnimasi)
      .catch(() => setAnimasi(null));
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-2)" }}>
      <div style={{ width: 90, height: 90, margin: "0 auto" }}>
        {siap && animasi ? <Lottie src={animasi as object} autoplay loop /> : <span>…</span>}
      </div>
      <p className="tiny" style={{ marginTop: 8 }}>
        {label}
      </p>
    </div>
  );
}

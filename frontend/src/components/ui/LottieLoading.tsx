"use client";

import { Lottie } from "lottie-react";
import loadingAnimation from "../../../public/lottie/loading.json";

type LottieLoadingProps = {
  label?: string;
  compact?: boolean;
};

/** Indikator loading Lottie bersama dengan rasio proporsional dan pewarnaan adaptif tema. */
export default function LottieLoading({ label = "Memuat…", compact = false }: LottieLoadingProps) {
  const width = compact ? 64 : 116;
  const height = compact ? 50 : 92;

  return (
    <div
      className={compact ? "lottie-loading is-compact" : "lottie-loading"}
      style={
        compact
          ? { textAlign: "center", color: "var(--text)" }
          : { textAlign: "center", padding: "72px 20px", color: "var(--text-2)" }
      }
    >
      <div
        className="lottie-themed"
        style={{ width, height, margin: "0 auto", display: "grid", placeItems: "center" }}
      >
        <Lottie src={loadingAnimation} autoplay loop style={{ width: "100%", height: "100%" }} />
      </div>
      {label ? (
        <p className="tiny" style={{ marginTop: compact ? 6 : 10, fontWeight: compact ? 600 : 500 }}>
          {label}
        </p>
      ) : null}
    </div>
  );
}

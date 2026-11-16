"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Menjaga tampilan skeleton tetap aktif minimal `minMs` milidetik (default 1500ms)
 * agar konten tidak berkedip pada respons API cepat, namun tanpa menambah jeda
 * jika respons API sudah melampaui durasi minimum tersebut.
 */
export function useMinLoading(loading: boolean, minMs = 1500): boolean {
  const [holding, setHolding] = useState(loading && minMs > 0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (minMs <= 0) return;

    if (loading) {
      startedAtRef.current = Date.now();
      const startTimer = window.setTimeout(() => {
        setHolding(true);
      }, 0);
      return () => window.clearTimeout(startTimer);
    }

    const startedAt = startedAtRef.current;
    if (startedAt === null) {
      const clearTimer = window.setTimeout(() => {
        setHolding(false);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minMs - elapsed);

    const endTimer = window.setTimeout(() => {
      startedAtRef.current = null;
      setHolding(false);
    }, remaining);

    return () => window.clearTimeout(endTimer);
  }, [loading, minMs]);

  return loading || holding;
}

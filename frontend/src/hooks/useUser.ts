"use client";

import { useMemo } from "react";
import { getUserSimulasi } from "@/lib/session";
import { AKUN_DEMO, DASHBOARD_PRIBADI_DEMO } from "@/lib/demo";
import type { User } from "@/types";

/**
 * Hook: ambil data user yang sedang login (simulasi demo).
 * Return User | null (belum login atau akun tidak ditemukan).
 */
export function useUser(): User | null {
  return useMemo(() => {
    const email = getUserSimulasi();
    if (!email) return null;

    const akun = AKUN_DEMO.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!akun) return null;

    // Buat User object dari akun demo
    return {
      id: AKUN_DEMO.indexOf(akun) + 1,
      name: akun.name,
      email: akun.email,
      role: akun.role as any,
      wilayah_id: 1, // demo: hardcoded
      wilayah: { id: 1, nama: "Kecamatan Demo" },
      consent_at: "2026-10-01T00:00:00Z", // demo: sudah consent
    };
  }, []);
}

/**
 * Alias untuk useUser (compat lama).
 */
export function getCurrentUser(): User | null {
  return useUser();
}

"use client";

import { useEffect, useState } from "react";
import { auth, getToken } from "@/lib/api";
import type { User } from "@/types";

export interface UseUserResult {
  /** Data user dari GET /auth/me, null bila belum login / token tidak valid */
  user: User | null;
  /** true selama request /auth/me masih berjalan (hanya pada load pertama) */
  loading: boolean;
}

/* ------------------------------------------------------------
 * Cache tingkat modul: /auth/me dipanggil SEKALI per load halaman,
 * jadi pindah halaman tidak memicu loading ulang / kedip "Memuat…".
 * ------------------------------------------------------------ */
let cachedUser: User | null = null;
let cachedLoaded = false;
let pending: Promise<User | null> | null = null;
const listeners = new Set<() => void>();

function beritahu(): void {
  listeners.forEach((cb) => cb());
}

function muatUser(): Promise<User | null> {
  if (pending) return pending;
  if (!getToken()) {
    cachedUser = null;
    cachedLoaded = true;
    return Promise.resolve(null);
  }

  pending = auth
    .me()
    .then((u) => {
      cachedUser = u;
      return u;
    })
    .catch(() => {
      cachedUser = null;
      return null;
    })
    .finally(() => {
      cachedLoaded = true;
      pending = null;
      beritahu();
    });

  return pending;
}

/** Panggil saat logout / token dihapus. */
export function clearUserCache(): void {
  cachedUser = null;
  cachedLoaded = false;
  pending = null;
  beritahu();
}

/** Paksa muat ulang data user (mis. setelah simpan profil). */
export function refreshUser(): Promise<User | null> {
  clearUserCache();
  return muatUser();
}

/**
 * Hook: ambil user yang sedang login dari backend (GET /auth/me).
 * Hasil di-cache, jadi navigasi antar halaman tidak loading lagi.
 */
export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(() => cachedUser);
  const [loading, setLoading] = useState<boolean>(() => !cachedLoaded);

  useEffect(() => {
    let aktif = true;
    const sync = () => {
      if (!aktif) return;
      setUser(cachedUser);
      setLoading(!cachedLoaded);
    };
    listeners.add(sync);

    if (!cachedLoaded) {
      muatUser().then((u) => {
        if (!aktif) return;
        setUser(u);
        setLoading(false);
      });
    }

    return () => {
      aktif = false;
      listeners.delete(sync);
    };
  }, []);

  return { user, loading };
}

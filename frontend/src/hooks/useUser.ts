"use client";

import { useEffect, useState } from "react";
import { auth, getToken } from "@/lib/api";
import type { User } from "@/types";

export interface UseUserResult {
  /** Data user dari GET /auth/me, null bila belum login / token tidak valid */
  user: User | null;
  /** true selama request /auth/me masih berjalan */
  loading: boolean;
}

/**
 * Hook: ambil user yang sedang login dari backend (GET /auth/me).
 * Token dibaca dari localStorage (`sehatkita_token`).
 */
export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aktif = true;

    if (!getToken()) {
      setLoading(false);
      return;
    }

    auth
      .me()
      .then((u) => {
        if (aktif) setUser(u);
      })
      .catch(() => {
        if (aktif) setUser(null);
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });

    return () => {
      aktif = false;
    };
  }, []);

  return { user, loading };
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { auth, getToken } from "@/lib/api";
import type { User } from "@/types";

export interface UseUserResult {
  /** Data user dari GET /auth/me (atau snapshot sesi saat boot), null bila belum login */
  user: User | null;
  /** true hanya saat /auth/me masih berjalan dan belum ada snapshot sesi */
  loading: boolean;
}

const USER_SNAPSHOT_KEY = "sehatkita_user_snapshot";
const SERVER_SNAPSHOT: UseUserResult = { user: null, loading: true };

/* ------------------------------------------------------------
 * Cache tingkat modul + snapshot sessionStorage:
 * - Mempertahankan identitas role & user seketika saat browser F5
 *   agar sidebar tidak berkedip ke menu role default.
 * - /auth/me tetap diverifikasi di latar belakang sekali per muatan.
 * ------------------------------------------------------------ */
let cachedUser: User | null = null;
let cachedUserJson: string | null = null;
let cachedLoaded = false;
let snapshotChecked = false;
let cacheEpoch = 0;
let pending: Promise<User | null> | null = null;
let clientSnapshot: UseUserResult = { user: null, loading: true };
const listeners = new Set<() => void>();

function simpanSnapshotSesi(u: User | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (!u || !getToken()) {
      sessionStorage.removeItem(USER_SNAPSHOT_KEY);
      return null;
    }
    const serialized = JSON.stringify(u);
    sessionStorage.setItem(USER_SNAPSHOT_KEY, serialized);
    return serialized;
  } catch {
    return null;
  }
}

function bacaSnapshotSesi(): void {
  if (snapshotChecked || typeof window === "undefined") return;
  snapshotChecked = true;
  if (!getToken()) {
    simpanSnapshotSesi(null);
    return;
  }
  try {
    const raw = sessionStorage.getItem(USER_SNAPSHOT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as User | null;
    if (parsed && typeof parsed === "object" && typeof parsed.role === "string") {
      cachedUser = parsed;
      cachedUserJson = raw;
      clientSnapshot = { user: parsed, loading: false };
    }
  } catch {
    simpanSnapshotSesi(null);
  }
}

function perbaruiClientSnapshot(): void {
  const nextLoading = !cachedLoaded && cachedUser === null;
  if (clientSnapshot.user === cachedUser && clientSnapshot.loading === nextLoading) {
    return;
  }
  clientSnapshot = { user: cachedUser, loading: nextLoading };
}

function beritahu(): void {
  perbaruiClientSnapshot();
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getClientSnapshot(): UseUserResult {
  bacaSnapshotSesi();
  if (typeof window !== "undefined" && !getToken()) {
    if (cachedUser !== null || !cachedLoaded) {
      cachedUser = null;
      cachedUserJson = null;
      cachedLoaded = true;
      simpanSnapshotSesi(null);
      perbaruiClientSnapshot();
    }
    return clientSnapshot;
  }
  perbaruiClientSnapshot();
  return clientSnapshot;
}

function getServerSnapshot(): UseUserResult {
  return SERVER_SNAPSHOT;
}

function muatUser(): Promise<User | null> {
  if (!getToken()) {
    cachedUser = null;
    cachedUserJson = null;
    cachedLoaded = true;
    pending = null;
    simpanSnapshotSesi(null);
    beritahu();
    return Promise.resolve(null);
  }
  if (pending) return pending;

  const epoch = cacheEpoch;
  pending = auth
    .me()
    .then((u) => {
      if (epoch !== cacheEpoch || !getToken()) return null;
      const nextJson = JSON.stringify(u);
      const changed = nextJson !== cachedUserJson;
      if (changed) {
        cachedUser = u;
        cachedUserJson = nextJson;
      }
      simpanSnapshotSesi(u);
      return u;
    })
    .catch(() => {
      if (epoch === cacheEpoch) {
        cachedUser = null;
        cachedUserJson = null;
        simpanSnapshotSesi(null);
      }
      return null;
    })
    .finally(() => {
      if (epoch === cacheEpoch) {
        cachedLoaded = true;
        pending = null;
        beritahu();
      }
    });

  return pending;
}

/** Panggil saat logout / token dihapus. */
export function clearUserCache(): void {
  cacheEpoch += 1;
  cachedUser = null;
  cachedUserJson = null;
  cachedLoaded = false;
  snapshotChecked = true;
  pending = null;
  simpanSnapshotSesi(null);
  beritahu();
}

/** Paksa muat ulang data user (mis. setelah simpan profil). */
export function refreshUser(): Promise<User | null> {
  clearUserCache();
  return muatUser();
}

/**
 * Hook: ambil user yang sedang login dari backend (GET /auth/me).
 * Menggunakan cache modul + snapshot sesi agar tidak memicu kedipan sidebar saat reload.
 */
export function useUser(): UseUserResult {
  const snapshot = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (!cachedLoaded || (snapshot.loading && Boolean(getToken()))) {
      void muatUser();
    }
  }, [snapshot.loading, snapshot.user]);

  return snapshot;
}

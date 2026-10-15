"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { getUserSesi } from "@/lib/session";

// Langganan kosong — hanya untuk tahu "sudah jalan di browser?"
const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

export default function Home() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();

  useEffect(() => {
    if (!diBrowser) return;

    const token = getToken();
    const user = getUserSesi();

    if (token && user) {
      // Sudah login → sudah isi profil (consent_at)? dashboard : onboarding
      if (user.consent_at) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    } else {
      router.replace("/login");
    }
  }, [diBrowser, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-400">Memuat…</p>
    </main>
  );
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getUserSimulasi, sudahOnboarding } from "@/lib/session";

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

    const email = getUserSimulasi();

    if (email !== "" && sudahOnboarding(email)) {
      router.replace("/dashboard");
    } else if (email !== "") {
      router.replace("/onboarding");
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

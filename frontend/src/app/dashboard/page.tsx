"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  getUserSimulasi,
  sudahOnboarding,
  logoutSimulasi,
} from "@/lib/session";

// Langganan kosong — dipakai hanya untuk tahu "sudah jalan di browser?"
const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(
    langgananKosong,
    () => true, // di browser
    () => false // di server (saat render pertama)
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();

  const email = diBrowser ? getUserSimulasi() : "";
  const bolehMasuk = email !== "" && sudahOnboarding(email);

  useEffect(() => {
    if (!diBrowser) return; // tunggu sampai jalan di browser
    if (email === "") {
      router.replace("/login"); // belum login → ke login
    } else if (!bolehMasuk) {
      router.replace("/onboarding"); // belum isi formulir → ke formulir
    }
  }, [diBrowser, email, bolehMasuk, router]);

  // Tampil sementara selagi memeriksa / mengalihkan
  if (!bolehMasuk) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Memuat…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Selamat datang, {email}!
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Halaman ini akan dibangun pada tahap berikutnya.
        </p>
        <button
          onClick={() => {
            logoutSimulasi();
            router.push("/login");
          }}
          className="mt-6 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Keluar
        </button>
      </div>
    </main>
  );
}
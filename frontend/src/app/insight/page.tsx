"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getUserSimulasi, sudahOnboarding } from "@/lib/session";
import { dummyInsight } from "@/lib/dummy";
import { LABEL_LEVEL_INSIGHT } from "@/lib/labels";
import type { LevelInsight } from "@/lib/enums";

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

const TONE_LEVEL: Record<LevelInsight, "info" | "peringatan" | "bahaya"> = {
  info: "info",
  peringatan: "peringatan",
  bahaya: "bahaya",
};

const URUTAN_LEVEL: LevelInsight[] = ["bahaya", "peringatan", "info"];

function formatTanggal(iso: string): string {
  const tanggal = iso.split("T")[0];
  const [tahun, bulan, hari] = (tanggal ?? "").split("-");
  if (!tahun || !bulan || !hari) return iso;
  return `${hari}/${bulan}/${tahun}`;
}

export default function InsightPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();
  const [filter, setFilter] = useState<LevelInsight | "semua">("semua");

  const email = diBrowser ? getUserSimulasi() : "";
  const bolehMasuk = email !== "" && sudahOnboarding(email);

  useEffect(() => {
    if (!diBrowser) return;
    if (email === "") {
      router.replace("/login");
    } else if (!bolehMasuk) {
      router.replace("/onboarding");
    }
  }, [diBrowser, email, bolehMasuk, router]);

  const terurut = useMemo(
    () =>
      [...dummyInsight].sort(
        (a, b) => URUTAN_LEVEL.indexOf(a.level) - URUTAN_LEVEL.indexOf(b.level),
      ),
    [],
  );

  const hitung = (l: LevelInsight) => dummyInsight.filter((i) => i.level === l).length;
  const daftar = filter === "semua" ? terurut : terurut.filter((i) => i.level === filter);

  if (!bolehMasuk) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Memuat…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Insight Kesehatan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Saran otomatis berdasarkan catatan terakhirmu
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </Link>
        </header>

        <Card title="Ringkasan" subtitle="Jumlah insight per tingkat">
          <div className="flex flex-wrap gap-3">
            {URUTAN_LEVEL.map((l) => (
              <div key={l} className="flex items-center gap-2">
                <Badge tone={TONE_LEVEL[l]}>{LABEL_LEVEL_INSIGHT[l]}</Badge>
                <span className="text-sm font-semibold text-slate-800">{hitung(l)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Filter Tingkat" subtitle="Ketuk untuk menyaring insight">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("semua")}
              className={
                filter === "semua"
                  ? "rounded-full bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              Semua ({dummyInsight.length})
            </button>
            {URUTAN_LEVEL.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setFilter(l)}
                className={
                  filter === l
                    ? "rounded-full bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white"
                    : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                }
              >
                {LABEL_LEVEL_INSIGHT[l]} ({hitung(l)})
              </button>
            ))}
          </div>
        </Card>

        {daftar.length === 0 ? (
          <Card title="Daftar Insight">
            <p className="text-sm text-slate-400">Tidak ada insight pada tingkat ini.</p>
          </Card>
        ) : (
          daftar.map((i) => (
            <Card key={i.kode}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TONE_LEVEL[i.level]}>{LABEL_LEVEL_INSIGHT[i.level]}</Badge>
                  <span className="font-mono text-xs text-slate-400">{i.kode}</span>
                </div>
                <p className="text-sm text-slate-700">{i.teks}</p>
                <p className="text-xs text-slate-400">Dibuat {formatTanggal(i.dibuat_pada)}</p>
              </div>
            </Card>
          ))
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Insight berbasis aturan (bukan ML). Data sementara (dummy) — nanti dari GET /insight.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getUserSimulasi, sudahOnboarding } from "@/lib/session";
import { dummyProgram } from "@/lib/dummy";
import { LABEL_JENIS_PROGRAM, LABEL_STATUS_PROGRAM } from "@/lib/labels";
import type { StatusProgram } from "@/lib/enums";

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

const TONE_STATUS: Record<StatusProgram, "info" | "peringatan" | "sukses"> = {
  akan_datang: "info",
  berjalan: "peringatan",
  selesai: "sukses",
};

const URUTAN_STATUS: StatusProgram[] = ["berjalan", "akan_datang", "selesai"];

function formatTanggal(iso: string): string {
  const [tahun, bulan, hari] = iso.split("-");
  if (!tahun || !bulan || !hari) return iso;
  return `${hari}/${bulan}/${tahun}`;
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export default function ProgramPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();
  const [filter, setFilter] = useState<StatusProgram | "semua">("semua");

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
      [...dummyProgram].sort(
        (a, b) => URUTAN_STATUS.indexOf(a.status) - URUTAN_STATUS.indexOf(b.status),
      ),
    [],
  );

  const hitung = (s: StatusProgram) => dummyProgram.filter((p) => p.status === s).length;
  const daftar = filter === "semua" ? terurut : terurut.filter((p) => p.status === filter);

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
            <h1 className="text-xl font-bold text-slate-900">Program Kesehatan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Program di wilayahmu — ikut untuk menjaga kesehatan
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </Link>
        </header>

        <Card title="Ringkasan" subtitle="Jumlah program per status">
          <dl className="grid grid-cols-3 gap-x-4 gap-y-4">
            {URUTAN_STATUS.map((s) => (
              <Baris key={s} label={LABEL_STATUS_PROGRAM[s]} value={String(hitung(s))} />
            ))}
          </dl>
        </Card>

        <Card title="Filter Status" subtitle="Ketuk untuk menyaring program">
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
              Semua ({dummyProgram.length})
            </button>
            {URUTAN_STATUS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={
                  filter === s
                    ? "rounded-full bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white"
                    : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                }
              >
                {LABEL_STATUS_PROGRAM[s]} ({hitung(s)})
              </button>
            ))}
          </div>
        </Card>

        {daftar.length === 0 ? (
          <Card title="Daftar Program">
            <p className="text-sm text-slate-400">Tidak ada program dengan status ini.</p>
          </Card>
        ) : (
          daftar.map((p) => {
            const persen = p.target_peserta > 0 ? Math.round((p.jumlah_peserta / p.target_peserta) * 100) : 0;
            return (
              <Card key={p.id} title={p.judul} subtitle={LABEL_JENIS_PROGRAM[p.jenis]}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE_STATUS[p.status]}>{LABEL_STATUS_PROGRAM[p.status]}</Badge>
                    {p.diikuti ? <Badge tone="sukses">Sudah Diikuti</Badge> : null}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                    <Baris label="Mulai" value={formatTanggal(p.mulai)} />
                    <Baris label="Selesai" value={formatTanggal(p.selesai)} />
                    <Baris
                      label="Peserta"
                      value={`${p.jumlah_peserta} / ${p.target_peserta}`}
                    />
                    <Baris label="Terisi" value={`${persen}%`} />
                  </dl>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(persen, 100)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Data sementara (dummy). Nanti diambil dari GET /program.
        </p>
      </div>
    </main>
  );
}

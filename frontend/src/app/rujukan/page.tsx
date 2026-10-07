"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getUserSimulasi, sudahOnboarding } from "@/lib/session";
import { dummyRujukan } from "@/lib/dummy";
import { LABEL_STATUS_RUJUKAN } from "@/lib/labels";
import type { StatusRujukan } from "@/lib/enums";

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

const TONE_STATUS: Record<StatusRujukan, "info" | "peringatan" | "sukses" | "bahaya"> = {
  baru: "info",
  dihubungi: "peringatan",
  tertangani: "sukses",
  ditolak: "bahaya",
};

const URUTAN_STATUS: StatusRujukan[] = ["baru", "dihubungi", "tertangani", "ditolak"];

function formatTanggal(iso: string): string {
  const tanggal = iso.split("T")[0];
  const [tahun, bulan, hari] = (tanggal ?? "").split("-");
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

export default function RujukanPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();
  const [filter, setFilter] = useState<StatusRujukan | "semua">("semua");

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

  if (!bolehMasuk) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Memuat…</p>
      </main>
    );
  }

  const hitung = (s: StatusRujukan) => dummyRujukan.filter((r) => r.status === s).length;
  const daftar =
    filter === "semua" ? dummyRujukan : dummyRujukan.filter((r) => r.status === filter);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Rujukan</h1>
            <p className="mt-1 text-sm text-slate-500">Daftar rujukan ke fasilitas kesehatan</p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </Link>
        </header>

        <Card title="Ringkasan" subtitle="Jumlah rujukan per status">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {URUTAN_STATUS.map((s) => (
              <Baris key={s} label={LABEL_STATUS_RUJUKAN[s]} value={String(hitung(s))} />
            ))}
          </dl>
        </Card>

        <Card title="Filter Status" subtitle="Ketuk untuk menyaring daftar">
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
              Semua ({dummyRujukan.length})
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
                {LABEL_STATUS_RUJUKAN[s]} ({hitung(s)})
              </button>
            ))}
          </div>
        </Card>

        {daftar.length === 0 ? (
          <Card title="Daftar Rujukan">
            <p className="text-sm text-slate-400">Tidak ada rujukan dengan status ini.</p>
          </Card>
        ) : (
          daftar.map((r) => (
            <Card key={r.id} title={`Rujukan #${r.id}`} subtitle={r.faskes.nama}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TONE_STATUS[r.status]}>{LABEL_STATUS_RUJUKAN[r.status]}</Badge>
                  <span className="text-xs text-slate-400">
                    Dibuat {formatTanggal(r.created_at)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Alasan</p>
                  <p className="text-sm text-slate-700">{r.alasan}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Baris label="Dibuat oleh" value={r.dibuat_oleh.name} />
                  <Baris label="Ditangani oleh" value={r.ditangani_oleh?.name ?? "—"} />
                </dl>
                {r.catatan ? (
                  <div>
                    <p className="text-xs text-slate-400">Catatan</p>
                    <p className="text-sm text-slate-700">{r.catatan}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          ))
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Data sementara (dummy). Nanti diambil dari GET /rujukan.
        </p>
      </div>
    </main>
  );
}

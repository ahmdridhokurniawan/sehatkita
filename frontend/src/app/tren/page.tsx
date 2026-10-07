"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/ui/Card";
import { getUserSimulasi, sudahOnboarding } from "@/lib/session";
import { dummyTren } from "@/lib/dummy";
import { LABEL_INDIKATOR } from "@/lib/labels";

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

const DAFTAR_PERIODE = ["1m", "3m", "6m", "1y"] as const;

const LABEL_PERIODE: Record<string, string> = {
  "1m": "1 bulan",
  "3m": "3 bulan",
  "6m": "6 bulan",
  "1y": "1 tahun",
};

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function labelIndikator(kode: string): string {
  return LABEL_INDIKATOR[kode] ?? kode;
}

function formatTanggal(iso: string): string {
  const [th, bl, hr] = iso.split("-");
  if (!th || !bl || !hr) return iso;
  return `${Number(hr)} ${NAMA_BULAN[Number(bl) - 1] ?? bl}`;
}

export default function TrenPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();
  const [kodeAktif, setKodeAktif] = useState("");
  const [periode, setPeriode] = useState("3m");

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

  const series = dummyTren.series;
  const aktif = series.find((s) => s.indikator === kodeAktif) ?? series[0];
  const titik = aktif?.titik ?? [];

  const dataGrafik = titik.map((t) => ({
    label: formatTanggal(t.tanggal),
    nilai: t.nilai,
  }));

  const awal = titik[0]?.nilai;
  const akhir = titik[titik.length - 1]?.nilai;
  const selisih = awal !== undefined && akhir !== undefined ? akhir - awal : null;

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
            <h1 className="text-xl font-bold text-slate-900">Tren Kesehatan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Perkembangan indikator dari waktu ke waktu
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </Link>
        </header>

        <Card title="Pilih Indikator" subtitle="Ketuk untuk melihat grafiknya">
          <div className="flex flex-wrap gap-2">
            {series.map((s) => {
              const terpilih = s.indikator === aktif?.indikator;
              return (
                <button
                  key={s.indikator}
                  type="button"
                  onClick={() => setKodeAktif(s.indikator)}
                  className={
                    terpilih
                      ? "rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                      : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  }
                >
                  {labelIndikator(s.indikator)}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Pilih Periode" subtitle="Rentang waktu yang ditampilkan">
          <div className="flex flex-wrap gap-2">
            {DAFTAR_PERIODE.map((p) => {
              const terpilih = p === periode;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriode(p)}
                  className={
                    terpilih
                      ? "rounded-full bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white"
                      : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  }
                >
                  {LABEL_PERIODE[p]}
                </button>
              );
            })}
          </div>
          {periode !== dummyTren.periode ? (
            <p className="mt-2 text-xs text-amber-600">
              Mode dummy: contoh data hanya tersedia untuk {LABEL_PERIODE[dummyTren.periode]}.
              Grafik tetap memakai data {LABEL_PERIODE[dummyTren.periode]}.
            </p>
          ) : null}
        </Card>

        <Card
          title={aktif ? labelIndikator(aktif.indikator) : "Grafik"}
          subtitle={aktif ? `Satuan: ${aktif.satuan}` : undefined}
        >
          {titik.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada data.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGrafik} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    domain={["auto", "auto"]}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${value} ${aktif?.satuan ?? ""}`,
                      labelIndikator(aktif?.indikator ?? ""),
                    ]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nilai"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#059669" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {selisih !== null ? (
          <Card title="Ringkasan Perubahan" subtitle="Dari titik pertama ke terakhir">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-400">Nilai awal</dt>
                <dd className="text-sm font-semibold text-slate-800">
                  {awal} {aktif?.satuan}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Nilai akhir</dt>
                <dd className="text-sm font-semibold text-slate-800">
                  {akhir} {aktif?.satuan}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Selisih</dt>
                <dd
                  className={
                    selisih > 0
                      ? "text-sm font-semibold text-rose-600"
                      : selisih < 0
                        ? "text-sm font-semibold text-emerald-600"
                        : "text-sm font-semibold text-slate-800"
                  }
                >
                  {selisih > 0 ? "+" : ""}
                  {selisih.toFixed(2)} {aktif?.satuan}
                </dd>
              </div>
            </dl>
          </Card>
        ) : null}

        <p className="pt-2 text-center text-xs text-slate-400">
          Data sementara (dummy). Nanti diambil dari GET /tren.
        </p>
      </div>
    </main>
  );
}

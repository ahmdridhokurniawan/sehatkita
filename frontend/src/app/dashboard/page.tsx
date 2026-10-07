"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getUserSimulasi, sudahOnboarding, logoutSimulasi } from "@/lib/session";
import { dummyDashboardPribadi, dummyInsight } from "@/lib/dummy";
import {
  LABEL_STATUS_KESEHATAN,
  LABEL_KATEGORI_IMT,
  LABEL_LEVEL_INSIGHT,
} from "@/lib/labels";
import type {
  StatusKesehatan,
  KategoriImt,
  LevelInsight,
  Sumber,
} from "@/lib/enums";

// Langganan kosong — dipakai hanya untuk tahu "sudah jalan di browser?"
const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(
    langgananKosong,
    () => true, // di browser
    () => false // di server (saat render pertama)
  );
}

// Warna badge untuk tiap status
const TONE_STATUS: Record<StatusKesehatan, "sukses" | "peringatan" | "bahaya"> = {
  normal: "sukses",
  perlu_perhatian: "peringatan",
  berisiko: "bahaya",
};

const TONE_IMT: Record<KategoriImt, "info" | "sukses" | "peringatan" | "bahaya"> = {
  kurus: "info",
  normal: "sukses",
  gemuk: "peringatan",
  obesitas: "bahaya",
};

const TONE_INSIGHT: Record<LevelInsight, "info" | "peringatan" | "bahaya"> = {
  info: "info",
  peringatan: "peringatan",
  bahaya: "bahaya",
};

const LABEL_SUMBER: Record<Sumber, string> = {
  mandiri: "Mandiri",
  kader: "Kader",
  puskesmas: "Puskesmas",
};

// Bantuan tampilan angka
function tampil(nilai: number | null, satuan = ""): string {
  if (nilai === null) return "—";
  return `${nilai}${satuan}`;
}

function selisih(nilai: number | null, satuan = ""): string {
  if (nilai === null) return "—";
  const tanda = nilai > 0 ? "+" : "";
  return `${tanda}${nilai}${satuan}`;
}

function formatTanggal(iso: string): string {
  const [tahun, bulan, hari] = iso.slice(0, 10).split("-");
  if (!tahun || !bulan || !hari) return iso;
  return `${hari}/${bulan}/${tahun}`;
}

// Satu baris kecil "label : nilai" di dalam kartu
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
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

  const d = dummyDashboardPribadi;
  const i = d.indikator_terkini;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Kepala halaman */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">{email}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
            <Link
              href="/insight"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Insight
            </Link>
            <Link
              href="/rujukan"
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Rujukan
            </Link>
            <Link
              href="/tren"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Tren
            </Link>
            <Link
              href="/dashboard/kelurahan"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Kelurahan
            </Link>
            <Link
              href="/profil"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Profil
            </Link>
            <Link
              href="/catatan-kesehatan"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Catatan Kesehatan
            </Link>
            <button
              onClick={() => {
                logoutSimulasi();
                router.push("/login");
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Keluar
            </button>
          </div>

        </header>

        {/* Status kesehatan */}
        <Card title="Status Kesehatan" subtitle="Ringkasan kondisi terkini">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-900">{d.skor_risiko}</p>
              <p className="text-xs text-slate-400">Skor risiko (0–100)</p>
            </div>
            <Badge tone={TONE_STATUS[d.status_kesehatan]}>
              {LABEL_STATUS_KESEHATAN[d.status_kesehatan]}
            </Badge>
          </div>
        </Card>

        {/* Indikator terkini */}
        <Card
          title="Indikator Terkini"
          subtitle={`Dicatat ${formatTanggal(i.dicatat_pada)} · ${LABEL_SUMBER[i.sumber]}`}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <Stat label="Berat badan" value={tampil(i.bb_kg, " kg")} />
            <Stat label="Tinggi badan" value={tampil(i.tinggi_cm, " cm")} />
            <div>
              <dt className="text-xs text-slate-400">IMT</dt>
              <dd className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                {tampil(i.imt)}
                {i.kategori_imt && (
                  <Badge tone={TONE_IMT[i.kategori_imt]}>
                    {LABEL_KATEGORI_IMT[i.kategori_imt]}
                  </Badge>
                )}
              </dd>
            </div>
            <Stat
              label="Tekanan darah"
              value={
                i.sistol !== null && i.diastol !== null
                  ? `${i.sistol}/${i.diastol} mmHg`
                  : "—"
              }
            />
            <Stat label="Gula darah" value={tampil(i.gula_darah, " mg/dL")} />
            <Stat label="Kolesterol" value={tampil(i.kolesterol, " mg/dL")} />
            <Stat label="Asam urat" value={tampil(i.asam_urat, " mg/dL")} />
            <Stat label="Lingkar perut" value={tampil(i.lingkar_perut, " cm")} />
          </dl>
        </Card>

        {/* Perbandingan periode */}
        <Card
          title="Perbandingan Periode"
          subtitle={`${d.perbandingan.periode_ini} dibanding ${d.perbandingan.periode_lalu}`}
        >
          <dl className="grid grid-cols-3 gap-4">
            <Stat label="Berat badan" value={selisih(d.perbandingan.bb_selisih_kg, " kg")} />
            <Stat label="IMT" value={selisih(d.perbandingan.imt_selisih)} />
            <Stat label="Sistol" value={selisih(d.perbandingan.sistol_selisih, " mmHg")} />
          </dl>
        </Card>

        {/* Target */}
        <Card title="Target Berat Badan">
          {d.target.bb_target_kg === null ? (
            <p className="text-sm text-slate-400">Belum ada target.</p>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Target:{" "}
                <span className="font-semibold text-slate-900">
                  {d.target.bb_target_kg} kg
                </span>
              </p>
              {d.target.progress_persen !== null && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${d.target.progress_persen}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Progres {d.target.progress_persen}%
                  </p>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Jadwal skrining */}
        <Card title="Jadwal Skrining Berikutnya">
          {d.jadwal_skrining_berikutnya.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada jadwal.</p>
          ) : (
            <ul className="space-y-2">
              {d.jadwal_skrining_berikutnya.map((j) => (
                <li key={j.indikator} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{j.indikator}</span>
                  <span className="text-xs text-slate-400">
                    {formatTanggal(j.jatuh_tempo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Insight / saran */}
        <Card title="Saran untuk Anda" subtitle="Dari analisis data terkini">
          <ul className="space-y-3">
            {dummyInsight.map((ins) => (
              <li key={ins.kode} className="flex items-start gap-3">
                <Badge tone={TONE_INSIGHT[ins.level]}>
                  {LABEL_LEVEL_INSIGHT[ins.level]}
                </Badge>
                <p className="text-sm text-slate-700">{ins.teks}</p>
              </li>
            ))}
          </ul>
        </Card>

        <p className="pt-2 text-center text-xs text-slate-400">
          Data sementara (dummy). Nanti tersambung ke API asli.
        </p>
      </div>
    </main>
  );
}
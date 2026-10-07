"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getUserSimulasi, sudahOnboarding } from "@/lib/session";
import { dummyDashboardKelurahan } from "@/lib/dummy";
import { LABEL_KATEGORI_IMT } from "@/lib/labels";
import type { KategoriImt } from "@/lib/enums";
import type { DistribusiItem } from "@/types";

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

const LABEL_PERIODE: Record<string, string> = {
  "3m": "3 bulan terakhir",
  "6m": "6 bulan terakhir",
  "12m": "12 bulan terakhir",
};

const LABEL_FAKTOR: Record<string, string> = {
  hipertensi: "Hipertensi",
  diabetes: "Diabetes",
  obesitas: "Obesitas",
  jantung: "Jantung",
  stroke: "Stroke",
  kolesterol: "Kolesterol tinggi",
  asma: "Asma",
};

// Ubah kode dari API jadi tulisan cantik.
// PENTING (§9.2): kita TIDAK menyaring/menghitung ulang apa pun di sini.
// Aturan privasi (sel < 5 disembunyikan) sudah dijalankan backend.
function labelItem(item: DistribusiItem, jenis: "imt" | "risiko" | "usia"): string {
  if (jenis === "imt" && item.kategori) {
    return LABEL_KATEGORI_IMT[item.kategori as KategoriImt] ?? item.kategori;
  }
  if (jenis === "risiko" && item.faktor) {
    return LABEL_FAKTOR[item.faktor] ?? item.faktor;
  }
  return item.kelompok ?? "—";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function Bar({ label, jumlah, maks }: { label: string; jumlah: number; maks: number }) {
  const persen = maks > 0 ? Math.round((jumlah / maks) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{jumlah}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${persen}%` }} />
      </div>
    </div>
  );
}

function DaftarDistribusi({
  judul,
  subjudul,
  item,
  jenis,
}: {
  judul: string;
  subjudul: string;
  item: DistribusiItem[];
  jenis: "imt" | "risiko" | "usia";
}) {
  const maks = item.reduce((a, b) => Math.max(a, b.jumlah), 0);
  return (
    <Card title={judul} subtitle={subjudul}>
      {item.length === 0 ? (
        <p className="text-sm text-slate-400">Tidak ada data.</p>
      ) : (
        <div className="space-y-3">
          {item.map((it) => (
            <Bar
              key={labelItem(it, jenis)}
              label={labelItem(it, jenis)}
              jumlah={it.jumlah}
              maks={maks}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

export default function DashboardKelurahanPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();

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

  const d = dummyDashboardKelurahan;
  const maksTren = d.tren.reduce((a, b) => Math.max(a, b.total_pencatatan), 0);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard Kelurahan</h1>
            <p className="mt-1 text-sm text-slate-500">
              {d.wilayah.nama} · {LABEL_PERIODE[d.periode] ?? d.periode}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </Link>
        </header>

        <Card title="Ringkasan Wilayah" subtitle="Agregat anonim — tanpa data pribadi">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <Stat label="Total peserta" value={String(d.total_peserta)} />
            <Stat label="Pengguna aktif" value={String(d.total_pengguna_aktif)} />
            <Stat label="Total pencatatan" value={String(d.total_pencatatan)} />
            <Stat label="Kepatuhan" value={`${d.kepatuhan_pencatatan_persen}%`} />
          </dl>
        </Card>

        <DaftarDistribusi
          judul="Distribusi IMT"
          subjudul="Jumlah peserta per kategori"
          item={d.distribusi_imt}
          jenis="imt"
        />
        <DaftarDistribusi
          judul="Distribusi Faktor Risiko"
          subjudul="Jumlah peserta per faktor risiko"
          item={d.distribusi_risiko}
          jenis="risiko"
        />
        <DaftarDistribusi
          judul="Distribusi Kelompok Usia"
          subjudul="Jumlah peserta per rentang usia"
          item={d.distribusi_kelompok_usia}
          jenis="usia"
        />

        <Card title="Tindak Lanjut Rujukan" subtitle="Rekap status rujukan">
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-slate-900">{d.rujukan.total}</p>
            <Badge tone="info">Total rujukan</Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <Stat label="Baru" value={String(d.rujukan.baru)} />
            <Stat label="Dihubungi" value={String(d.rujukan.dihubungi)} />
            <Stat label="Tertangani" value={String(d.rujukan.tertangani)} />
            <Stat label="Ditolak" value={String(d.rujukan.ditolak)} />
            <Stat
              label="Belum ditindaklanjuti"
              value={String(d.rujukan.belum_ditindaklanjuti)}
            />
          </dl>
        </Card>

        <Card title="Tren Pencatatan" subtitle="Jumlah pencatatan per bulan">
          {d.tren.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada data.</p>
          ) : (
            <div className="space-y-3">
              {d.tren.map((t) => (
                <Bar
                  key={t.periode}
                  label={t.periode}
                  jumlah={t.total_pencatatan}
                  maks={maksTren}
                />
              ))}
            </div>
          )}
        </Card>

        <p className="pt-2 text-center text-xs text-slate-400">
          Data agregat ditampilkan apa adanya dari server. Aturan privasi (sel dengan jumlah
          &lt; 5 disembunyikan) dijalankan di backend. Data sementara (dummy).
        </p>
      </div>
    </main>
  );
}
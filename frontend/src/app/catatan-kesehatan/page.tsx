"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CatatanForm from "@/components/catatan/CatatanForm";
import { getUserSimulasi, sudahOnboarding } from "@/lib/session";
import { dummyCatatanKesehatan, dummyUser } from "@/lib/dummy";
import {
  LABEL_STATUS_KESEHATAN,
  LABEL_KATEGORI_IMT,
  LABEL_SUMBER,
  LABEL_JENIS_GULA_DARAH,
} from "@/lib/labels";
import type { StatusKesehatan, KategoriImt } from "@/lib/enums";
import type { CatatanKesehatan, CatatanKesehatanInput } from "@/types";

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

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

function formatTanggal(iso: string): string {
  const [tahun, bulan, hari] = iso.slice(0, 10).split("-");
  if (!tahun || !bulan || !hari) return iso;
  return `${hari}/${bulan}/${tahun}`;
}

function tampil(nilai: number | null, satuan = ""): string {
  if (nilai === null) return "—";
  return `${nilai}${satuan}`;
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export default function CatatanKesehatanPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();
  const [daftar, setDaftar] = useState<CatatanKesehatan[]>(dummyCatatanKesehatan);
  const [formTerbuka, setFormTerbuka] = useState(false);

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

  function tambahCatatan(input: CatatanKesehatanInput) {
    const tinggi = dummyUser.profil?.tinggi_cm ?? null;
    const bb = input.bb_kg ?? null;
    const imt =
      bb !== null && tinggi !== null
        ? Math.round((bb / ((tinggi / 100) ** 2)) * 100) / 100
        : null;

    const baru: CatatanKesehatan = {
      id: Date.now(),
      user_id: dummyUser.id,
      dicatat_pada: input.dicatat_pada,
      sumber: input.sumber,
      bb_kg: bb,
      sistol: input.sistol ?? null,
      diastol: input.diastol ?? null,
      gula_darah: input.gula_darah ?? null,
      jenis_gula_darah: input.jenis_gula_darah ?? null,
      kolesterol: input.kolesterol ?? null,
      asam_urat: input.asam_urat ?? null,
      lingkar_perut: input.lingkar_perut ?? null,
      tidur_jam: input.tidur_jam ?? null,
      merokok: input.merokok ?? null,
      konsumsi_manis: input.konsumsi_manis ?? null,
      catatan: input.catatan ?? null,
      tinggi_cm: tinggi,
      imt,
      // Kategori & status dihitung SERVER (kontrak 7.1) - di simulasi dibiarkan kosong
      kategori_imt: null,
      kategori_tensi: null,
      kategori_gula_darah: null,
      kategori_kolesterol: null,
      kategori_asam_urat: null,
      status_kesehatan: null,
      perlu_verifikasi: false,
      dicatat_oleh: null,
      created_at: new Date().toISOString(),
    };

    setDaftar((prev) => [baru, ...prev]);
  }

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
        {/* Kepala halaman */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Catatan Kesehatan</h1>
            <p className="mt-1 text-sm text-slate-500">Riwayat pengukuran kamu</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => setFormTerbuka((v) => !v)}>
              {formTerbuka ? "Tutup" : "Catat Sekarang"}
            </Button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Kembali
            </Link>
          </div>
        </header>

        {/* Form tambah (muncul kalau tombol diklik) */}
        {formTerbuka && (
          <Card
            title="Catatan Baru"
            subtitle="Isi yang kamu ukur saja - sisanya boleh dikosongkan"
          >
            <CatatanForm onTambah={tambahCatatan} />
          </Card>
        )}

        {/* Daftar catatan */}
        {daftar.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-400">Belum ada catatan.</p>
          </Card>
        ) : (
          daftar.map((c) => (
            <Card
              key={c.id}
              title={formatTanggal(c.dicatat_pada)}
              subtitle={`Sumber: ${LABEL_SUMBER[c.sumber]}`}
            >
              <div className="space-y-4">
                {c.status_kesehatan && (
                  <Badge tone={TONE_STATUS[c.status_kesehatan]}>
                    {LABEL_STATUS_KESEHATAN[c.status_kesehatan]}
                  </Badge>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                  <Baris label="Berat badan" value={tampil(c.bb_kg, " kg")} />
                  <Baris label="Tinggi badan" value={tampil(c.tinggi_cm, " cm")} />
                  <div>
                    <dt className="text-xs text-slate-400">IMT</dt>
                    <dd className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {tampil(c.imt)}
                      {c.kategori_imt && (
                        <Badge tone={TONE_IMT[c.kategori_imt]}>
                          {LABEL_KATEGORI_IMT[c.kategori_imt]}
                        </Badge>
                      )}
                    </dd>
                  </div>
                  <Baris
                    label="Tekanan darah"
                    value={
                      c.sistol !== null && c.diastol !== null
                        ? `${c.sistol}/${c.diastol} mmHg`
                        : "—"
                    }
                  />
                  <Baris label="Gula darah" value={tampil(c.gula_darah, " mg/dL")} />
                  <Baris label="Kolesterol" value={tampil(c.kolesterol, " mg/dL")} />
                  <Baris label="Asam urat" value={tampil(c.asam_urat, " mg/dL")} />
                  <Baris label="Lingkar perut" value={tampil(c.lingkar_perut, " cm")} />
                  <Baris label="Tidur" value={tampil(c.tidur_jam, " jam")} />
                </dl>

                <div className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  {c.jenis_gula_darah && (
                    <p>Jenis gula darah: {LABEL_JENIS_GULA_DARAH[c.jenis_gula_darah]}</p>
                  )}
                  {c.dicatat_oleh && <p>Dicatat oleh: {c.dicatat_oleh.name}</p>}
                  {c.catatan && <p className="italic">“{c.catatan}”</p>}
                </div>
              </div>
            </Card>
          ))
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Data sementara (dummy). Nanti tersambung ke API asli.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { JENIS_KELAMIN, TINGKAT_AKTIVITAS } from "@/lib/enums";
import type { JenisKelamin, TingkatAktivitas } from "@/lib/enums";
import {
  getUserSimulasi,
  sudahOnboarding,
  getProfilSimulasi,
  simpanProfilSimulasi,
  RIWAYAT_KELUARGA_OPTIONS,
} from "@/lib/session";
import { dummyUser } from "@/lib/dummy";
import { LABEL_JENIS_KELAMIN, LABEL_TINGKAT_AKTIVITAS } from "@/lib/labels";
import type { ProfilRingkas } from "@/types";

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

const PROFIL_KOSONG: ProfilRingkas = {
  tgl_lahir: "",
  usia: 0,
  jenis_kelamin: "L",
  tinggi_cm: 0,
  tingkat_aktivitas: "sedang",
  merokok: false,
  riwayat_keluarga: [],
};

type FormState = {
  tgl_lahir: string;
  jenis_kelamin: string;
  tinggi_cm: string;
  tingkat_aktivitas: string;
  merokok: boolean;
  riwayat_keluarga: string[];
};

type Errors = Partial<
  Record<"tgl_lahir" | "jenis_kelamin" | "tinggi_cm" | "tingkat_aktivitas", string>
>;

function keForm(p: ProfilRingkas): FormState {
  return {
    tgl_lahir: p.tgl_lahir,
    jenis_kelamin: p.jenis_kelamin,
    tinggi_cm: p.tinggi_cm === 0 ? "" : String(p.tinggi_cm),
    tingkat_aktivitas: p.tingkat_aktivitas,
    merokok: p.merokok,
    riwayat_keluarga: [...p.riwayat_keluarga],
  };
}

function formatTanggal(iso: string): string {
  const [tahun, bulan, hari] = iso.slice(0, 10).split("-");
  if (!tahun || !bulan || !hari) return iso;
  return `${hari}/${bulan}/${tahun}`;
}

function labelRiwayat(nilai: string): string {
  const ketemu = RIWAYAT_KELUARGA_OPTIONS.find((o) => o.value === nilai);
  return ketemu ? ketemu.label : nilai;
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export default function ProfilPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();
  const [modeUbah, setModeUbah] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [profilEdit, setProfilEdit] = useState<ProfilRingkas | null>(null);

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

  const tersimpan = diBrowser && email !== "" ? getProfilSimulasi(email) : null;
  const profil = profilEdit ?? tersimpan ?? dummyUser.profil ?? PROFIL_KOSONG;

  function mulaiUbah() {
    setForm(keForm(profil));
    setErrors({});
    setSukses(false);
    setModeUbah(true);
  }

  function batalUbah() {
    setForm(null);
    setErrors({});
    setModeUbah(false);
  }

  function ubahForm<K extends keyof FormState>(kunci: K, nilai: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [kunci]: nilai } : prev));
  }

  function toggleRiwayat(nilai: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            riwayat_keluarga: prev.riwayat_keluarga.includes(nilai)
              ? prev.riwayat_keluarga.filter((v) => v !== nilai)
              : [...prev.riwayat_keluarga, nilai],
          }
        : prev
    );
  }

  function validasi(f: FormState): Errors {
    const e: Errors = {};

    if (f.tgl_lahir.trim() === "") {
      e.tgl_lahir = "Tanggal lahir wajib diisi";
    } else if (new Date(f.tgl_lahir) >= new Date()) {
      e.tgl_lahir = "Tanggal lahir harus sebelum hari ini";
    }

    if (f.jenis_kelamin === "") e.jenis_kelamin = "Pilih jenis kelamin";

    const tinggi = Number(f.tinggi_cm);
    if (f.tinggi_cm.trim() === "") {
      e.tinggi_cm = "Tinggi badan wajib diisi";
    } else if (Number.isNaN(tinggi) || tinggi < 50 || tinggi > 250) {
      e.tinggi_cm = "Harus antara 50-250 cm";
    }

    if (f.tingkat_aktivitas === "") e.tingkat_aktivitas = "Pilih tingkat aktivitas";

    return e;
  }

  function simpan(ev: FormEvent) {
    ev.preventDefault();
    if (!form) return;

    const e = validasi(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const baru: ProfilRingkas = {
      ...profil,
      tgl_lahir: form.tgl_lahir,
      jenis_kelamin: form.jenis_kelamin as JenisKelamin,
      tinggi_cm: Number(form.tinggi_cm),
      tingkat_aktivitas: form.tingkat_aktivitas as TingkatAktivitas,
      merokok: form.merokok,
      riwayat_keluarga: form.riwayat_keluarga,
    };

    simpanProfilSimulasi(email, baru);
    setProfilEdit(baru);
    setForm(null);
    setModeUbah(false);
    setSukses(true);
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
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Profil</h1>
            <p className="mt-1 text-sm text-slate-500">{email}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!modeUbah && <Button onClick={mulaiUbah}>Ubah</Button>}
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Kembali
            </Link>
          </div>
        </header>

        {sukses && (
          <p className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
            Profil tersimpan (simulasi).
          </p>
        )}

        {modeUbah && form ? (
          <Card title="Ubah Profil" subtitle="Kirim seluruh data, lalu simpan">
            <form onSubmit={simpan} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Tanggal Lahir"
                  type="date"
                  value={form.tgl_lahir}
                  error={errors.tgl_lahir}
                  onChange={(e) => ubahForm("tgl_lahir", e.target.value)}
                />
                <Select
                  label="Jenis Kelamin"
                  value={form.jenis_kelamin}
                  error={errors.jenis_kelamin}
                  onChange={(e) => ubahForm("jenis_kelamin", e.target.value)}
                >
                  <option value="">-- Pilih --</option>
                  {Object.entries(JENIS_KELAMIN).map(([, nilai]) => (
                    <option key={nilai} value={nilai}>
                      {LABEL_JENIS_KELAMIN[nilai]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Tinggi Badan (cm)"
                  inputMode="decimal"
                  placeholder="170"
                  value={form.tinggi_cm}
                  error={errors.tinggi_cm}
                  onChange={(e) => ubahForm("tinggi_cm", e.target.value)}
                />
                <Select
                  label="Tingkat Aktivitas"
                  value={form.tingkat_aktivitas}
                  error={errors.tingkat_aktivitas}
                  onChange={(e) => ubahForm("tingkat_aktivitas", e.target.value)}
                >
                  <option value="">-- Pilih --</option>
                  {Object.entries(TINGKAT_AKTIVITAS).map(([, nilai]) => (
                    <option key={nilai} value={nilai}>
                      {LABEL_TINGKAT_AKTIVITAS[nilai]}
                    </option>
                  ))}
                </Select>
              </div>

              <Checkbox
                label="Saya merokok"
                checked={form.merokok}
                onChange={(e) => ubahForm("merokok", e.target.checked)}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Riwayat Penyakit Keluarga{" "}
                  <span className="font-normal text-slate-400">
                    (boleh lebih dari satu, atau kosongkan)
                  </span>
                </p>
                <div className="space-y-2">
                  {RIWAYAT_KELUARGA_OPTIONS.map((opt) => (
                    <Checkbox
                      key={opt.value}
                      label={opt.label}
                      checked={form.riwayat_keluarga.includes(opt.value)}
                      onChange={() => toggleRiwayat(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Simpan Perubahan</Button>
                <Button type="button" variant="outline" onClick={batalUbah}>
                  Batal
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card title="Data Diri" subtitle="Informasi yang kamu isi saat onboarding">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Baris label="Tanggal lahir" value={formatTanggal(profil.tgl_lahir)} />
              <Baris label="Usia" value={`${profil.usia} tahun`} />
              <Baris
                label="Jenis kelamin"
                value={LABEL_JENIS_KELAMIN[profil.jenis_kelamin]}
              />
              <Baris label="Tinggi badan" value={`${profil.tinggi_cm} cm`} />
              <Baris
                label="Tingkat aktivitas"
                value={LABEL_TINGKAT_AKTIVITAS[profil.tingkat_aktivitas]}
              />
              <Baris label="Merokok" value={profil.merokok ? "Ya" : "Tidak"} />
            </dl>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400">Riwayat penyakit keluarga</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {profil.riwayat_keluarga.length === 0 ? (
                  <span className="text-sm text-slate-500">Tidak ada</span>
                ) : (
                  profil.riwayat_keluarga.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {labelRiwayat(r)}
                    </span>
                  ))
                )}
              </div>
            </div>
          </Card>
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Data sementara (dummy). Nanti tersambung ke API asli.
        </p>
      </div>
    </main>
  );
}

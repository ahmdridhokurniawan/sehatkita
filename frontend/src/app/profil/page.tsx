"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { JENIS_KELAMIN, TINGKAT_AKTIVITAS } from "@/lib/enums";
import type { JenisKelamin, TingkatAktivitas } from "@/lib/enums";
import {
  getUserSimulasi,
  getProfilSimulasi,
  simpanProfilSimulasi,
  RIWAYAT_KELUARGA_OPTIONS,
} from "@/lib/session";
import { dummyUser } from "@/lib/dummy";
import { LABEL_JENIS_KELAMIN, LABEL_TINGKAT_AKTIVITAS } from "@/lib/labels";
import type { ProfilRingkas } from "@/types";

/* ------------------------------------------------------------------
   Profil — halaman masyarakat. Data diri + form ubah (tanda wajib *).
   ------------------------------------------------------------------ */

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

type Errors = Partial<Record<"tgl_lahir" | "jenis_kelamin" | "tinggi_cm" | "tingkat_aktivitas", string>>;

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
      <div className="tiny">{label}</div>
      <div className="text-sm fw-600">{value}</div>
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
  // §26 — halaman profil TIDAK mensyaratkan onboarding (justru di sini data diri diisi).
  const bolehMasuk = email !== "";

  useEffect(() => {
    if (!diBrowser) return;
    if (email === "") {
      router.replace("/login");
    }
  }, [diBrowser, email, router]);

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
      <AppShell noFab>
        <p className="tiny center">Memuat…</p>
      </AppShell>
    );
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Profil</h1>
          <p className="tiny">{email}</p>
        </div>
        {!modeUbah && (
          <button className="btn btn-sm btn-outline" type="button" onClick={mulaiUbah}>
            <Icon name="pencil" size={15} /> Ubah
          </button>
        )}
      </div>

      {sukses && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--safe)" }}>
          <div className="row gap-10 items-center">
            <span className="text-safe">
              <Icon name="check-circle" size={18} />
            </span>
            <span className="text-sm">Profil tersimpan (simulasi).</span>
          </div>
        </div>
      )}

      {modeUbah && form ? (
        <div className="card">
          <div className="row-between mb-12">
            <strong className="text-sm">Ubah Data Diri</strong>
            <span className="tiny">
              <span className="req">*</span> wajib diisi
            </span>
          </div>
          <form onSubmit={simpan}>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <Input
                label="Tanggal Lahir"
                type="date"
                required
                value={form.tgl_lahir}
                error={errors.tgl_lahir}
                onChange={(e) => ubahForm("tgl_lahir", e.target.value)}
              />
              <Select
                label="Jenis Kelamin"
                required
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

            <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
              <Input
                label="Tinggi Badan (cm)"
                required
                inputMode="decimal"
                placeholder="170"
                value={form.tinggi_cm}
                error={errors.tinggi_cm}
                onChange={(e) => ubahForm("tinggi_cm", e.target.value)}
              />
              <Select
                label="Tingkat Aktivitas"
                required
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

            <div className="mt-12">
              <Checkbox
                label="Saya merokok"
                checked={form.merokok}
                onChange={(e) => ubahForm("merokok", e.target.checked)}
              />
            </div>

            <div className="mt-12">
              <p className="label">
                Riwayat Penyakit Keluarga <span className="opt">(opsional)</span>
              </p>
              <div className="grid grid-2" style={{ gap: 4 }}>
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

            <div className="row gap-8 mt-16">
              <Button type="submit" icon="check">
                Simpan Perubahan
              </Button>
              <Button type="button" variant="outline" onClick={batalUbah}>
                Batal
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <strong className="text-sm">Data Diri</strong>
          <div className="grid grid-3 mt-12" style={{ gap: 12 }}>
            <Baris label="Tanggal lahir" value={formatTanggal(profil.tgl_lahir)} />
            <Baris label="Usia" value={`${profil.usia} tahun`} />
            <Baris label="Jenis kelamin" value={LABEL_JENIS_KELAMIN[profil.jenis_kelamin]} />
            <Baris label="Tinggi badan" value={`${profil.tinggi_cm} cm`} />
            <Baris label="Tingkat aktivitas" value={LABEL_TINGKAT_AKTIVITAS[profil.tingkat_aktivitas]} />
            <Baris label="Merokok" value={profil.merokok ? "Ya" : "Tidak"} />
          </div>

          <div className="mt-16" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <p className="tiny">Riwayat penyakit keluarga</p>
            <div className="row gap-6 mt-8" style={{ flexWrap: "wrap" }}>
              {profil.riwayat_keluarga.length === 0 ? (
                <span className="text-sm">Tidak ada</span>
              ) : (
                profil.riwayat_keluarga.map((r) => (
                  <span className="badge badge-primary" key={r}>
                    {labelRiwayat(r)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Data sementara (demo) — nanti tersambung ke API asli.
      </p>
    </AppShell>
  );
}

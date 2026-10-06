"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { JENIS_KELAMIN, TINGKAT_AKTIVITAS } from "@/lib/enums";
import {
  RIWAYAT_KELUARGA_OPTIONS,
  tandaiOnboardingSelesai,
  getUserSimulasi,

} from "@/lib/session";

export default function OnboardingPage() {
  const router = useRouter();

  // ── Data diri ──
  const [tglLahir, setTglLahir] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [tinggiCm, setTinggiCm] = useState("");
  const [aktivitas, setAktivitas] = useState("");
  const [merokok, setMerokok] = useState(false);
  const [riwayat, setRiwayat] = useState<string[]>([]);

  // ── Persetujuan ──
  const [setuju, setSetuju] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function toggleRiwayat(value: string) {
    setRiwayat((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // Validasi di sisi frontend (sama aturannya dengan kontrak §5.2)
  function validasi(): boolean {
    const err: Record<string, string> = {};

    if (!tglLahir) {
      err.tglLahir = "Tanggal lahir wajib diisi.";
    } else if (new Date(tglLahir) >= new Date()) {
      err.tglLahir = "Tanggal lahir harus sebelum hari ini.";
    }

    if (!jenisKelamin) err.jenisKelamin = "Pilih jenis kelamin.";

    if (!tinggiCm) {
      err.tinggiCm = "Tinggi badan wajib diisi.";
    } else {
      const n = Number(tinggiCm);
      if (Number.isNaN(n) || n < 50 || n > 250) {
        err.tinggiCm = "Tinggi badan harus antara 50–250 cm.";
      }
    }

    if (!aktivitas) err.aktivitas = "Pilih tingkat aktivitas.";

    if (!setuju) {
      err.setuju = "Kamu harus menyetujui kebijakan untuk melanjutkan.";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validasi()) return;

    setLoading(true);
    // TODO (Tahap 3): ganti dengan pemanggilan API sungguhan
    // await profil.update({ tgl_lahir: tglLahir, jenis_kelamin: jenisKelamin,
    //   tinggi_cm: Number(tinggiCm), tingkat_aktivitas: aktivitas,
    //   merokok, riwayat_keluarga: riwayat });
    // await persetujuan.setuju({ versi_kebijakan: "1.0", setuju: true });

    // Simulasi sementara — hanya untuk melihat UI bekerja
    setTimeout(() => {
      tandaiOnboardingSelesai(getUserSimulasi());
      router.push("/dashboard");
    }, 800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Judul */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white">
            SK
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Lengkapi Data Diri
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Isi sekali saja — setelah ini kamu langsung masuk ke dashboard.
          </p>
        </div>

        {/* Kartu formulir */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          noValidate
        >
          <Input
            label="Tanggal Lahir"
            name="tgl_lahir"
            type="date"
            value={tglLahir}
            onChange={(e) => setTglLahir(e.target.value)}
            error={errors.tglLahir}
          />

          <Select
            label="Jenis Kelamin"
            name="jenis_kelamin"
            value={jenisKelamin}
            onChange={(e) => setJenisKelamin(e.target.value)}
            error={errors.jenisKelamin}
          >
            <option value="">-- Pilih --</option>
            <option value={JENIS_KELAMIN.L}>Laki-laki</option>
            <option value={JENIS_KELAMIN.P}>Perempuan</option>
          </Select>

          <Input
            label="Tinggi Badan (cm)"
            name="tinggi_cm"
            type="number"
            min={50}
            max={250}
            placeholder="170"
            value={tinggiCm}
            onChange={(e) => setTinggiCm(e.target.value)}
            error={errors.tinggiCm}
          />

          <Select
            label="Tingkat Aktivitas"
            name="tingkat_aktivitas"
            value={aktivitas}
            onChange={(e) => setAktivitas(e.target.value)}
            error={errors.aktivitas}
          >
            <option value="">-- Pilih --</option>
            <option value={TINGKAT_AKTIVITAS.RINGAN}>Ringan</option>
            <option value={TINGKAT_AKTIVITAS.SEDANG}>Sedang</option>
            <option value={TINGKAT_AKTIVITAS.BERAT}>Berat</option>
          </Select>

          <Checkbox
            label="Saya merokok"
            name="merokok"
            checked={merokok}
            onChange={(e) => setMerokok(e.target.checked)}
          />

          {/* Riwayat penyakit keluarga */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Riwayat Penyakit Keluarga{" "}
              <span className="font-normal text-slate-400">
                (boleh pilih lebih dari satu, atau kosongkan)
              </span>
            </p>
            <div className="space-y-2">
              {RIWAYAT_KELUARGA_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  name={`riwayat_${opt.value}`}
                  checked={riwayat.includes(opt.value)}
                  onChange={() => toggleRiwayat(opt.value)}
                />
              ))}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Persetujuan */}
          <Checkbox
            label="Saya menyetujui kebijakan privasi SehatKita dan bersedia data kesehatan saya digunakan untuk pemantauan."
            name="setuju"
            checked={setuju}
            onChange={(e) => setSetuju(e.target.checked)}
            error={errors.setuju}
          />

          <Button type="submit" fullWidth loading={loading}>
            {loading ? "Menyimpan..." : "Simpan & Lanjut ke Dashboard"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          © 2026 SehatKita — Monitoring Kesehatan PTM
        </p>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LegalInfoModal, { type LegalTopic } from "@/components/landing/LegalInfoModal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { JENIS_KELAMIN, TINGKAT_AKTIVITAS } from "@/lib/enums";
import {
  RIWAYAT_KELUARGA_OPTIONS,
} from "@/lib/session";
import { profil, persetujuan, ApiError } from "@/lib/api";
import { todayLocalISO } from "@/lib/format";
import { useUser, clearUserCache } from "@/hooks/useUser";

const STORY_META = [
  {
    judul: "Halo! Kenalan dulu",
    sub: "Data dasar ini membantu kami menyesuaikan acuan kesehatanmu.",
  },
  {
    judul: "Profil fisik & kebiasaan",
    sub: "Digunakan untuk menghitung IMT dan kebutuhan aktivitas harian.",
  },
  {
    judul: "Riwayat kesehatan keluarga",
    sub: "Opsional — pilih jika ada riwayat di keluarga, atau langsung lanjut.",
  },
  {
    judul: "Satu langkah terakhir",
    sub: "Periksa ringkasan datamu dan setujui kebijakan privasi.",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/login");
    }
  }, [loadingUser, user, router]);

  // ── Navigasi Story ──
  const [step, setStep] = useState(0);
  const [arah, setArah] = useState<"next" | "prev">("next");

  // ── Data diri ──
  const [tglLahir, setTglLahir] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [tinggiCm, setTinggiCm] = useState("");
  const [aktivitas, setAktivitas] = useState("");
  const [merokok, setMerokok] = useState(false);
  const [riwayat, setRiwayat] = useState<string[]>([]);

  // ── Persetujuan ──
  const [setuju, setSetuju] = useState(false);
  const [legalTopic, setLegalTopic] = useState<LegalTopic | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleRiwayat(value: string) {
    setRiwayat((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function validasiLangkah(targetStep: number): boolean {
    const err: Record<string, string> = {};
    const todayStr = todayLocalISO();

    if (targetStep === 0 || targetStep === -1) {
      if (!tglLahir) {
        err.tglLahir = "Tanggal lahir wajib diisi.";
      } else if (tglLahir >= todayStr) {
        err.tglLahir = "Tanggal lahir harus sebelum hari ini.";
      }
      if (!jenisKelamin) err.jenisKelamin = "Pilih jenis kelamin.";
    }

    if (targetStep === 1 || targetStep === -1) {
      if (!tinggiCm) {
        err.tinggiCm = "Tinggi badan wajib diisi.";
      } else {
        const n = Number(tinggiCm);
        if (Number.isNaN(n) || n < 120 || n > 220) {
          err.tinggiCm = "Tinggi badan harus antara 120–220 cm.";
        }
      }
      if (!aktivitas) err.aktivitas = "Pilih tingkat aktivitas.";
    }

    if (targetStep === 3 || targetStep === -1) {
      if (!setuju) {
        err.setuju = "Kamu harus menyetujui kebijakan untuk melanjutkan.";
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  }

  function lanjutStep() {
    if (!validasiLangkah(step)) return;
    setAlert("");
    setArah("next");
    setStep((s) => Math.min(3, s + 1));
  }

  function kembaliStep() {
    setErrors({});
    setAlert("");
    setArah("prev");
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validasiLangkah(-1)) {
      if (!tglLahir || tglLahir >= todayLocalISO() || !jenisKelamin) {
        setArah("prev");
        setStep(0);
      } else if (!tinggiCm || Number(tinggiCm) < 120 || Number(tinggiCm) > 220 || !aktivitas) {
        setArah("prev");
        setStep(1);
      }
      return;
    }

    setAlert("");
    setLoading(true);

    try {
      // §5.3 POST /persetujuan WAJIB dijalankan sebelum PUT /profil (backend tolak 422 jika consent_at masih null)
      await persetujuan.setuju("1.0");

      const riwayatTerpilih = riwayat.filter((v) => v !== "tidak_ada");

      // §5.2 PUT /profil — kirim seluruh field
      await profil.update({
        tgl_lahir: tglLahir,
        jenis_kelamin: jenisKelamin,
        tinggi_cm: Number(tinggiCm),
        tingkat_aktivitas: aktivitas,
        merokok,
        riwayat_keluarga: riwayatTerpilih.length ? riwayatTerpilih : ["tidak_ada"],
        tampil_di_peringkat: false,
      });

      clearUserCache();

      router.push("/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const keyMap: Record<string, string> = {
          tgl_lahir: "tglLahir",
          jenis_kelamin: "jenisKelamin",
          tinggi_cm: "tinggiCm",
          tingkat_aktivitas: "aktivitas",
          consent: "setuju",
          setuju: "setuju",
        };
        const map: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(apiErr.errors)) {
          map[keyMap[key] ?? key] = msgs[0] ?? "Nilai tidak valid";
        }
        setErrors(map);
        if (map.tglLahir || map.jenisKelamin) {
          setArah("prev");
          setStep(0);
        } else if (map.tinggiCm || map.aktivitas) {
          setArah("prev");
          setStep(1);
        }
      }
      setAlert(apiErr.message || "Gagal menyimpan data. Coba lagi.");
      setLoading(false);
    }
  }

  if (loadingUser || !user) {
    return (
      <main className="flex h-dvh items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">Memeriksa sesi akun…</p>
      </main>
    );
  }

  const meta = STORY_META[step];

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(640px_360px_at_90%_8%,rgba(16,185,129,0.08),transparent_70%),radial-gradient(520px_320px_at_10%_92%,rgba(13,98,78,0.06),transparent_72%),#f8faf9] px-4 py-4">
      <div className="w-full max-w-lg">
        {/* Story progress bar */}
        <div className="mb-4 grid grid-cols-4 gap-2" aria-label={`Langkah ${step + 1} dari 4`}>
          {STORY_META.map((_, idx) => (
            <div
              key={idx}
              className="h-1.5 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  idx <= step ? "w-full bg-emerald-700" : "w-0 bg-emerald-700"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Kartu Story */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.22)] sm:p-7"
          noValidate
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-700 uppercase">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-700 text-[11px] font-bold text-white">
                SK
              </span>
              Langkah {step + 1} / 4
            </span>
            <span className="text-xs text-slate-400">SehatKita</span>
          </div>

          {alert ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {alert}
            </div>
          ) : null}

          <div
            key={`${step}-${arah}`}
            className={arah === "next" ? "onboarding-step-next" : "onboarding-step-prev"}
          >
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {meta.judul}
            </h1>
            <p className="mt-1 mb-5 text-sm text-slate-500">{meta.sub}</p>

            {step === 0 ? (
              <div className="space-y-4">
                <Input
                  label="Tanggal Lahir"
                  name="tgl_lahir"
                  type="date"
                  max={todayLocalISO()}
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
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <Input
                  label="Tinggi Badan (cm)"
                  name="tinggi_cm"
                  type="number"
                  min={120}
                  max={220}
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
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {RIWAYAT_KELUARGA_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`rounded-xl border px-3 py-2 transition-colors ${
                      riwayat.includes(opt.value)
                        ? "border-emerald-600 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50/40"
                    }`}
                  >
                    <Checkbox
                      label={opt.label}
                      name={`riwayat_${opt.value}`}
                      checked={riwayat.includes(opt.value)}
                      onChange={() => toggleRiwayat(opt.value)}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600">
                  <span className="rounded-md bg-white px-2.5 py-1 font-medium border border-slate-200">
                    {jenisKelamin === JENIS_KELAMIN.L ? "Laki-laki" : "Perempuan"}
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1 font-medium border border-slate-200">
                    Tinggi {tinggiCm} cm
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1 font-medium border border-slate-200 capitalize">
                    Aktivitas {aktivitas}
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1 font-medium border border-slate-200">
                    {riwayat.length ? `${riwayat.length} riwayat keluarga` : "Tanpa riwayat keluarga"}
                  </span>
                </div>

                <Checkbox
                  label={
                    <>
                      Saya menyetujui{" "}
                      <button
                        type="button"
                        className="auth-inline-link"
                        onClick={() => setLegalTopic("privasi")}
                      >
                        kebijakan privasi SehatKita
                      </button>{" "}
                      dan bersedia data kesehatan saya digunakan untuk pemantauan.
                    </>
                  }
                  name="setuju"
                  checked={setuju}
                  onChange={(e) => setSetuju(e.target.checked)}
                  error={errors.setuju}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-24 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={kembaliStep} disabled={loading}>
                Kembali
              </Button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <Button type="button" onClick={lanjutStep}>
                {step === 2 && riwayat.length === 0 ? "Lewati" : "Lanjut"}
              </Button>
            ) : (
              <Button type="submit" loading={loading}>
                {loading ? "Menyimpan..." : "Simpan & Lanjut ke Dashboard"}
              </Button>
            )}
          </div>
        </form>
      </div>

      <LegalInfoModal
        topic={legalTopic}
        onChangeTopic={setLegalTopic}
        onClose={() => setLegalTopic(null)}
      />
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Empty";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { JENIS_KELAMIN, TINGKAT_AKTIVITAS } from "@/lib/enums";
import type { JenisKelamin, TingkatAktivitas } from "@/lib/enums";
import { RIWAYAT_KELUARGA_OPTIONS } from "@/lib/session";
import { LABEL_FAKTOR, LABEL_JENIS_KELAMIN, LABEL_ROLE, LABEL_TINGKAT_AKTIVITAS } from "@/lib/labels";
import { inisial, todayLocalISO } from "@/lib/format";
import { profil as profilApi, auth as authApi, telegram as telegramApi, clearToken, ApiError, type TelegramStatus } from "@/lib/api";
import { useUser, refreshUser, clearUserCache } from "@/hooks/useUser";
import type { Profil } from "@/types";

const PROFIL_KOSONG: Profil = {
  user_id: 0,
  tgl_lahir: null,
  usia: null,
  jenis_kelamin: null,
  tinggi_cm: null,
  tingkat_aktivitas: null,
  merokok: null,
  riwayat_keluarga: [],
  tampil_di_peringkat: false,
  profil_lengkap: false,
  updated_at: null,
};

type FormState = {
  tgl_lahir: string;
  jenis_kelamin: string;
  tinggi_cm: string;
  tingkat_aktivitas: string;
  merokok: boolean;
  riwayat_keluarga: string[];
  tampil_di_peringkat: boolean;
};

type Errors = Partial<Record<"tgl_lahir" | "jenis_kelamin" | "tinggi_cm" | "tingkat_aktivitas" | "riwayat_keluarga", string>>;

function keForm(p: Profil): FormState {
  return {
    tgl_lahir: p.tgl_lahir ?? "",
    jenis_kelamin: p.jenis_kelamin ?? "",
    tinggi_cm: p.tinggi_cm == null ? "" : String(p.tinggi_cm),
    tingkat_aktivitas: p.tingkat_aktivitas ?? "",
    merokok: p.merokok ?? false,
    riwayat_keluarga: (p.riwayat_keluarga ?? []).filter((v) => v !== "tidak_ada"),
    tampil_di_peringkat: p.tampil_di_peringkat ?? false,
  };
}

function formatTanggal(iso: string | null): string {
  if (!iso) return "—";
  const [tahun, bulan, hari] = iso.slice(0, 10).split("-");
  if (!tahun || !bulan || !hari) return iso;
  return `${hari}/${bulan}/${tahun}`;
}

function labelRiwayat(nilai: string): string {
  const ketemu = RIWAYAT_KELUARGA_OPTIONS.find((o) => o.value === nilai);
  return ketemu ? ketemu.label : LABEL_FAKTOR[nilai] ?? nilai.replace(/_/g, " ");
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
  const { user } = useUser();
  const adalahWarga = user?.role === "user";
  const consentAktif = user ? Boolean(user.consent_at) : true;
  const sudahDiBrowser = typeof window !== "undefined";

  const [profil, setProfil] = useState<Profil>(PROFIL_KOSONG);
  const [form, setForm] = useState<FormState | null>(null);
  const [profilLoadedUserId, setProfilLoadedUserId] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [modeUbah, setModeUbah] = useState(false);
  const [nikTerlihat, setNikTerlihat] = useState(false);
  const [nikDisalin, setNikDisalin] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // --- Notifikasi Telegram (khusus warga) ---
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [tgLoadedUserId, setTgLoadedUserId] = useState<number | null>(null);
  const [tgErr, setTgErr] = useState("");
  const [tgPutus, setTgPutus] = useState(false);

  const userId = user?.id ?? null;
  const loading = Boolean(sudahDiBrowser && (!user || (adalahWarga && profilLoadedUserId !== userId)));
  const tgLoading = Boolean(adalahWarga && userId !== null && tgLoadedUserId !== userId);

  useEffect(() => {
    if (!adalahWarga || userId === null) return;
    let aktif = true;
    telegramApi
      .status()
      .then((s) => {
        if (!aktif) return;
        setTelegramStatus(s);
        setTgErr("");
      })
      .catch(() => aktif && setTgErr("Gagal memuat status Telegram"))
      .finally(() => {
        if (aktif) setTgLoadedUserId(userId);
      });
    return () => {
      aktif = false;
    };
  }, [adalahWarga, userId]);

  async function putuskanTelegram() {
    setTgPutus(true);
    setTgErr("");
    try {
      await telegramApi.putuskan();
      setTelegramStatus(await telegramApi.status());
    } catch {
      setTgErr("Gagal memutuskan sambungan Telegram");
    } finally {
      setTgPutus(false);
    }
  }

  // Fetch profil on mount (khusus warga yang memiliki data kesehatan pribadi)
  useEffect(() => {
    if (!sudahDiBrowser || !adalahWarga || userId === null) return;
    let aktif = true;
    profilApi
      .get()
      .then((res) => {
        if (!aktif) return;
        setProfil(res);
        setError("");
      })
      .catch((err) => {
        if (!aktif) return;
        const msg = err instanceof ApiError ? err.message : "Gagal muat profil";
        setError(msg);
        console.error("Fetch profil:", err);
      })
      .finally(() => {
        if (aktif) setProfilLoadedUserId(userId);
      });
    return () => {
      aktif = false;
    };
  }, [sudahDiBrowser, adalahWarga, userId]);

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
    const todayStr = todayLocalISO();

    if (f.tgl_lahir.trim() === "") {
      e.tgl_lahir = "Tanggal lahir wajib diisi";
    } else if (f.tgl_lahir >= todayStr) {
      e.tgl_lahir = "Tanggal lahir harus sebelum hari ini";
    }

    if (f.jenis_kelamin === "") e.jenis_kelamin = "Pilih jenis kelamin";

    const tinggi = Number(f.tinggi_cm);
    if (f.tinggi_cm.trim() === "") {
      e.tinggi_cm = "Tinggi badan wajib diisi";
    } else if (Number.isNaN(tinggi) || tinggi < 120 || tinggi > 220) {
      e.tinggi_cm = "Harus antara 120–220 cm";
    }

    if (f.tingkat_aktivitas === "") e.tingkat_aktivitas = "Pilih tingkat aktivitas";

    return e;
  }

  async function simpan(ev: FormEvent) {
    ev.preventDefault();
    if (!form) return;

    if (!consentAktif) {
      setError("Persetujuan data belum aktif. Berikan persetujuan di Pengaturan Privasi terlebih dahulu.");
      return;
    }

    const e = validasi(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      const riwayatTerpilih = form.riwayat_keluarga.filter((v) => v !== "tidak_ada");
      const payload = {
        tgl_lahir: form.tgl_lahir,
        jenis_kelamin: form.jenis_kelamin as JenisKelamin,
        tinggi_cm: Number(form.tinggi_cm),
        tingkat_aktivitas: form.tingkat_aktivitas as TingkatAktivitas,
        merokok: form.merokok,
        riwayat_keluarga: riwayatTerpilih.length ? riwayatTerpilih : ["tidak_ada"],
        tampil_di_peringkat: form.tampil_di_peringkat,
      };
      const res = await profilApi.update(payload);
      setProfil(res);
      setForm(null);
      setModeUbah(false);
      setSukses(true);
      setError("");
      setTimeout(() => setSukses(false), 3000);
      await refreshUser();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Errors = {};
        if (apiErr.errors.tgl_lahir?.[0]) map.tgl_lahir = apiErr.errors.tgl_lahir[0];
        if (apiErr.errors.jenis_kelamin?.[0]) map.jenis_kelamin = apiErr.errors.jenis_kelamin[0];
        if (apiErr.errors.tinggi_cm?.[0]) map.tinggi_cm = apiErr.errors.tinggi_cm[0];
        if (apiErr.errors.tingkat_aktivitas?.[0]) map.tingkat_aktivitas = apiErr.errors.tingkat_aktivitas[0];
        if (apiErr.errors.riwayat_keluarga?.[0]) map.riwayat_keluarga = apiErr.errors.riwayat_keluarga[0];
        setErrors(map);
      }
      const consentMsg = apiErr.errors?.consent?.[0];
      setError(consentMsg || apiErr.message || "Gagal simpan profil");
    } finally {
      setSaving(false);
    }
  }

  const nikNilai = user?.nik ?? "";
  const nikTampil = !nikNilai
    ? "Belum terdaftar"
    : nikTerlihat
      ? nikNilai
      : `${nikNilai.slice(0, 6)}••••••${nikNilai.slice(-4)}`;

  async function salinNik() {
    if (!nikNilai || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(nikNilai);
      setNikDisalin(true);
      setTimeout(() => setNikDisalin(false), 1800);
    } catch {
      // Abaikan bila clipboard ditolak browser
    }
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Profil</h1>
          <p className="tiny">
            {user && !adalahWarga
              ? "Informasi identitas dan pengaturan akun Anda."
              : "Informasi identitas akun, NIK & data kesehatan Anda."}
          </p>
        </div>
        {!modeUbah && !loading && adalahWarga && (
          <button className="btn btn-sm btn-outline" type="button" onClick={mulaiUbah}>
            <Icon name="pencil" size={15} /> Ubah Data Diri
          </button>
        )}
      </div>

      <div className="card mb-16">
        <div className="row-between" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 14, alignItems: "center", minWidth: 0 }}>
            <div
              className="ava"
              aria-hidden="true"
              style={{
                width: 52,
                height: 52,
                fontSize: "1.05rem",
                background: "var(--primary)",
                color: "var(--on-primary)",
              }}
            >
              {inisial(user?.name || "Pengguna")}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong className="h3" style={{ fontSize: "1.08rem" }}>
                  {user?.name || "Memuat…"}
                </strong>
                {user?.role ? (
                  <span className="badge badge-primary">{LABEL_ROLE[user.role] || user.role}</span>
                ) : null}
                {!loading && (!user || user.role === "user") ? (
                  <span className={`badge ${profil.profil_lengkap ? "badge-safe" : "badge-warning"}`}>
                    {profil.profil_lengkap ? "Profil lengkap" : "Profil belum lengkap"}
                  </span>
                ) : null}
              </div>
              <div className="tiny mt-4">
                {user?.email || "—"}
                {user?.wilayah?.nama ? ` · ${user.wilayah.nama}` : ""}
              </div>
            </div>
          </div>
        </div>

        <div
          className="grid grid-3 mt-16"
          style={{
            gap: 12,
            borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
            paddingTop: 14,
          }}
        >
          {adalahWarga && (
            <div>
              <div className="tiny">NIK (16 Digit)</div>
              <div className="row" style={{ gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                <span
                  className="text-sm fw-600"
                  style={{ fontVariantNumeric: "tabular-nums", letterSpacing: nikTerlihat ? ".03em" : undefined }}
                >
                  {nikTampil}
                </span>
                {nikNilai ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ minHeight: 26, padding: "2px 7px", fontSize: ".72rem" }}
                      onClick={() => setNikTerlihat((v) => !v)}
                      aria-label={nikTerlihat ? "Sembunyikan NIK" : "Tampilkan NIK"}
                    >
                      <Icon name={nikTerlihat ? "eye-off" : "eye"} size={13} />
                      {nikTerlihat ? "Tutup" : "Lihat"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ minHeight: 26, padding: "2px 7px", fontSize: ".72rem" }}
                      onClick={salinNik}
                      aria-label="Salin NIK"
                    >
                      <Icon name={nikDisalin ? "check" : "copy"} size={13} />
                      {nikDisalin ? "Tersalin" : "Salin"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}
          <Baris label="Nama Lengkap" value={user?.name || "—"} />
          <Baris label="Email" value={user?.email || "—"} />
          <Baris label="Kelurahan / Wilayah" value={user?.wilayah?.nama || "—"} />
          {adalahWarga && (
            <>
              <Baris
                label="Persetujuan Data"
                value={user?.consent_at ? `Aktif (${formatTanggal(user.consent_at)})` : "Belum aktif"}
              />
              <Baris
                label="Tampil di Peringkat"
                value={loading ? "…" : profil.tampil_di_peringkat ? "Ditampilkan" : "Peserta anonim"}
              />
            </>
          )}
        </div>
      </div>

      {adalahWarga && !consentAktif && (
        <div className="alert alert-warning mb-12">
          <Icon name="alert-triangle" size={18} />
          <div className="row-between wrap gap-10 items-center" style={{ flex: 1 }}>
            <span className="text-sm">
              Persetujuan data sedang nonaktif. Aktifkan dulu untuk dapat memperbarui data diri.
            </span>
            <Link href="/setelan/privasi" className="btn btn-sm btn-outline">
              Atur Privasi
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-12">
          <Icon name="alert-circle" size={18} />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {sukses && (
        <div className="alert alert-success mb-12">
          <Icon name="check-circle" size={18} />
          <div className="text-sm">Profil tersimpan.</div>
        </div>
      )}

      {loading ? (
        <Loading variant="cards" text="Memuat profil…" />
      ) : !adalahWarga ? null : modeUbah && form ? (
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
                max={todayLocalISO()}
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
              {errors.riwayat_keluarga ? <div className="err-msg show">{errors.riwayat_keluarga}</div> : null}
            </div>

            <div className="mt-12">
              <Checkbox
                label={
                  <div>
                    <div className="text-sm fw-600">Tampilkan nama di peringkat</div>
                    <div className="tiny">
                      Bila dimatikan, kamu tetap ikut peringkat tetapi tampil sebagai &quot;Peserta anonim&quot;.
                    </div>
                  </div>
                }
                checked={form.tampil_di_peringkat}
                onChange={(e) => ubahForm("tampil_di_peringkat", e.target.checked)}
              />
            </div>

            <div className="row gap-8 mt-16">
              <Button type="submit" icon="check" disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan Perubahan"}
              </Button>
              <Button type="button" variant="outline" onClick={batalUbah} disabled={saving}>
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
            <Baris label="Usia" value={profil.usia == null ? "—" : `${profil.usia} tahun`} />
            <Baris
              label="Jenis kelamin"
              value={
                profil.jenis_kelamin ? LABEL_JENIS_KELAMIN[profil.jenis_kelamin] : "—"
              }
            />
            <Baris
              label="Tinggi badan"
              value={profil.tinggi_cm == null ? "—" : `${profil.tinggi_cm} cm`}
            />
            <Baris
              label="Tingkat aktivitas"
              value={
                profil.tingkat_aktivitas
                  ? LABEL_TINGKAT_AKTIVITAS[profil.tingkat_aktivitas]
                  : "—"
              }
            />
            <Baris
              label="Merokok"
              value={profil.merokok == null ? "—" : profil.merokok ? "Ya" : "Tidak"}
            />
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

      <div className="card card-list mt-16">
        {adalahWarga && (
          <Link href="/setelan" className="li">
            <span className="li-ico">
              <Icon name="settings" size={18} />
            </span>
            <div className="li-main">
              <strong className="text-sm">Pengaturan</strong>
              <span className="tiny">Privasi &amp; persetujuan data</span>
            </div>
            <span className="li-side">
              <Icon name="chevron-right" size={18} />
            </span>
          </Link>
        )}

        {adalahWarga && (
          <div className="li row-between wrap" style={{ gap: 12 }}>
            <div className="row gap-10 items-center">
              <span className="li-ico">
                <Icon name="send" size={18} />
              </span>
              <div className="li-main">
                <strong className="text-sm">Notifikasi Telegram</strong>
                {tgLoading ? (
                  <span className="tiny">Memuat status…</span>
                ) : tgErr ? (
                  <span className="err-text">{tgErr}</span>
                ) : telegramStatus?.terhubung ? (
                  <span className="tiny">
                    Terhubung ke <strong>{telegramStatus.chat_id}</strong>
                  </span>
                ) : (
                  <span className="tiny">Pengingat &amp; info program via bot</span>
                )}
              </div>
            </div>
            {!tgLoading && !tgErr ? (
              telegramStatus?.terhubung ? (
                <Button variant="danger" size="sm" onClick={putuskanTelegram} loading={tgPutus}>
                  Putuskan
                </Button>
              ) : (
                <a
                  href={telegramStatus?.link_telegram ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  Hubungkan Telegram
                </a>
              )
            ) : null}
          </div>
        )}

        <div className="li row-between wrap" style={{ gap: 12 }}>
          <div className="row gap-10 items-center">
            <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <Icon name="log-out" size={18} />
            </span>
            <div className="li-main">
              <strong className="text-sm" style={{ color: "var(--danger)" }}>Keluar</strong>
              <span className="tiny">Akhiri sesi di perangkat ini</span>
            </div>
          </div>
          <Button variant="danger" size="sm" icon="log-out" onClick={() => setKonfirmasiKeluar(true)}>
            Keluar
          </Button>
        </div>
      </div>

      <Modal
        open={konfirmasiKeluar}
        onClose={() => setKonfirmasiKeluar(false)}
        title="Keluar dari akun"
      >
        <p className="text-sm">Yakin ingin mengakhiri sesi di perangkat ini?</p>
        <div className="row-between mt-16">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setKonfirmasiKeluar(false)}
          >
            Batal
          </button>
          <Button
            variant="danger"
            onClick={async () => {
              const logoutReq = authApi.logout();
              clearUserCache();
              try {
                await logoutReq;
              } catch {
                /* token sudah mati */
              } finally {
                clearToken();
                clearUserCache();
                router.replace("/login");
              }
            }}
          >
            Keluar
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}

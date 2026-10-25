"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Modal from "@/components/ui/Modal";
import AuthAside from "@/components/auth/AuthAside";
import { auth, setToken, wilayah as wilayahApi, ApiError } from "@/lib/api";
import type { Wilayah } from "@/types";

type Err = Record<string, string>;

export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [wilayahId, setWilayahId] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [errors, setErrors] = useState<Err>({});
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);
  const [kebijakan, setKebijakan] = useState(false);

  // §6.1 — daftar wilayah dari backend (publik)
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [wilayahGagal, setWilayahGagal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [kecamatan, kelurahan] = await Promise.all([
          wilayahApi.list({ tipe: "kecamatan" }),
          wilayahApi.list({ tipe: "kelurahan" }),
        ]);
        const namaKec = new Map(kecamatan.map((k) => [k.id, k.nama]));
        setWilayahList(
          kelurahan.map((k) => ({ ...k, parent_nama: namaKec.get(k.parent_id ?? -1) }))
        );
      } catch {
        setWilayahGagal(true);
      }
    })();
  }, []);

  // Kelompokkan wilayah per kecamatan untuk <optgroup>
  const perKecamatan = useMemo(() => {
    return wilayahList.reduce<Record<string, Wilayah[]>>((acc, w) => {
      const kec = (w as Wilayah & { parent_nama?: string }).parent_nama || "Lainnya";
      (acc[kec] = acc[kec] || []).push(w);
      return acc;
    }, {});
  }, [wilayahList]);

  function validasi(): boolean {
    const err: Err = {};
    if (!nama) err.name = "Nama wajib diisi.";
    if (!email) err.email = "Email wajib diisi.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) err.email = "Format email tidak valid.";
    if (!wilayahId) err.wilayah_id = "Pilih kelurahan Anda.";
    if (!password || password.length < 8) err.password = "Password minimal 8 karakter.";
    if (password !== konfirmasi) err.password_confirmation = "Konfirmasi tidak sama.";
    if (!setuju) err.setuju = "Anda harus menyetujui kebijakan penggunaan data.";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setAlert("");
    if (!validasi()) return;

    setLoading(true);
    try {
      const res = await auth.register({
        name: nama,
        email,
        password,
        password_confirmation: konfirmasi,
        wilayah_id: parseInt(wilayahId),
      });

      // Simpan token ke localStorage
      setToken(res.token);

      // User baru (consent_at null) → redirect ke onboarding (kontrak §26)
      if (res.user.consent_at === null) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setLoading(false);
      const apiErr = err as ApiError;
      if (apiErr.status === 422 && apiErr.errors) {
        const errMap: Err = {};
        for (const [key, msgs] of Object.entries(apiErr.errors)) {
          errMap[key] = msgs[0] || "Validasi gagal";
        }
        setErrors(errMap);
        setAlert(apiErr.message || "Validasi gagal.");
      } else {
        setAlert(apiErr.message || "Registrasi gagal. Coba lagi.");
      }
    }
  }

  return (
    <div className="auth-wrap">
      <AuthAside
        judul="Mulai perjalanan hidup lebih sehat hari ini."
        teks="Daftar gratis dan hubungkan akun Anda dengan kelurahan di Kota Banjarbaru."
        fitur={[
          ["check-circle", "Catat hasil pemeriksaan kapan saja"],
          ["check-circle", "Pantau perkembangan indikator"],
          ["check-circle", "Ikuti kegiatan Posbindu wilayah"],
        ]}
        catatan="© 2026 SehatKita. Hak cipta dilindungi."
      />

      <main className="auth-main">
        <div className="auth-card">
          <div className="row-between mb-24">
            <div>
              <h1 className="h2">Buat akun baru</h1>
              <p className="tiny mt-4">
                Registrasi publik membuat akun dengan peran <b>Masyarakat</b>.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Link href="/" className="btn btn-sm btn-outline" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="arrow-left" size={16} /> Kembali
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {alert ? (
            <div className="alert alert-danger mb-16">
              <Icon name="alert-circle" />
              <div>{alert}</div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="label" htmlFor="name">
                Nama lengkap <span className="req">*</span>
              </label>
              <input
                className={`input ${errors.name ? "is-error" : ""}`}
                type="text"
                id="name"
                name="name"
                placeholder="Nama sesuai identitas"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
              <div className={`err-msg ${errors.name ? "show" : ""}`}>{errors.name}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="email">
                Email <span className="req">*</span>
              </label>
              <div className="input-icon">
                <Icon name="mail" size={18} />
                <input
                  className={`input ${errors.email ? "is-error" : ""}`}
                  type="email"
                  id="email"
                  name="email"
                  inputMode="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={`err-msg ${errors.email ? "show" : ""}`}>{errors.email}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="wilayah_id">
                Kelurahan <span className="req">*</span>
              </label>
              <select
                className={`select ${errors.wilayah_id ? "is-error" : ""}`}
                id="wilayah_id"
                name="wilayah_id"
                value={wilayahId}
                onChange={(e) => setWilayahId(e.target.value)}
              >
                <option value="">Pilih kelurahan…</option>
                {Object.keys(perKecamatan).map((kec) => (
                  <optgroup label={kec} key={kec}>
                    {perKecamatan[kec].map((w) => (
                      <option value={w.id} key={w.id}>
                        {w.nama}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="hint">
                {wilayahGagal
                  ? "Gagal memuat wilayah. Muat ulang halaman."
                  : "Pilih kelurahan tempat Anda tinggal."}
              </div>
              <div className={`err-msg ${errors.wilayah_id ? "show" : ""}`}>{errors.wilayah_id}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">
                Password <span className="req">*</span>
              </label>
              <input
                className={`input ${errors.password ? "is-error" : ""}`}
                type="password"
                id="password"
                name="password"
                placeholder="Min. 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className={`err-msg ${errors.password ? "show" : ""}`}>{errors.password}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password_confirmation">
                Konfirmasi <span className="req">*</span>
              </label>
              <input
                className={`input ${errors.password_confirmation ? "is-error" : ""}`}
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                placeholder="Ulangi password"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
              />
              <div className={`err-msg ${errors.password_confirmation ? "show" : ""}`}>
                {errors.password_confirmation}
              </div>
            </div>

            <label className="check mt-16">
              <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
              <span className="tiny">
                Saya menyetujui{" "}
                <a
                  href="#"
                  className="text-primary fw-600"
                  onClick={(e) => {
                    e.preventDefault();
                    setKebijakan(true);
                  }}
                >
                  Kebijakan Penggunaan Data
                </a>{" "}
                SehatKita.
              </span>
            </label>
            <div className={`err-msg ${errors.setuju ? "show" : ""}`}>{errors.setuju}</div>

            <button type="submit" className="btn btn-primary btn-lg btn-block mt-20" disabled={loading}>
              {loading ? "Mendaftar…" : "Daftar"}
            </button>
          </form>

          <p className="center tiny mt-20">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary fw-700">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>

      <Modal open={kebijakan} onClose={() => setKebijakan(false)} title="Kebijakan Penggunaan Data">
        <p className="tiny mt-12">
          SehatKita mengumpulkan data kesehatan yang Anda catat untuk menampilkan riwayat, insight, dan program
          kesehatan wilayah. Data individual hanya dapat diakses oleh Anda dan petugas berwenang. Data agregat yang
          ditampilkan kepada admin kelurahan tidak memuat identitas pribadi, dan kelompok dengan jumlah kurang dari 5
          orang disembunyikan.
        </p>
        <p className="tiny mt-8">Anda dapat membatalkan persetujuan kapan saja melalui pengaturan akun.</p>
        <div className="modal-foot mt-20">
          <button className="btn btn-primary" onClick={() => setKebijakan(false)} type="button">
            Mengerti
          </button>
        </div>
      </Modal>
    </div>
  );
}

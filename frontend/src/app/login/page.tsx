"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Modal from "@/components/ui/Modal";
import AuthAside from "@/components/auth/AuthAside";
import LegalInfoModal, { type LegalTopic } from "@/components/landing/LegalInfoModal";
import { auth, clearToken, getToken, mintaSesiDariTabLain, setToken, ApiError } from "@/lib/api";
import { clearUserCache } from "@/hooks/useUser";

type Err = { email?: string; password?: string };

function tujuanSetelahLogin(): string {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") && !next.startsWith("/register")) {
    return next;
  }
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [cekSesi, setCekSesi] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return Boolean(getToken()) || typeof BroadcastChannel !== "undefined";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ingat, setIngat] = useState(true);
  const [lihatPw, setLihatPw] = useState(false);
  const [errors, setErrors] = useState<Err>({});
  const [alert, setAlert] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lupa, setLupa] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const [legalTopic, setLegalTopic] = useState<LegalTopic | null>(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      let token = getToken();
      if (!token) {
        token = await mintaSesiDariTabLain();
      }
      if (!aktif) return;
      if (!token) {
        setCekSesi(false);
        return;
      }
      try {
        await auth.me();
        if (!aktif) return;
        router.replace(tujuanSetelahLogin());
      } catch {
        clearToken(false);
        clearUserCache();
        if (aktif) setCekSesi(false);
      }
    })();

    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      ch = new BroadcastChannel("sehatkita_auth");
      ch.onmessage = (ev: MessageEvent<{ type?: string; token?: string; remember?: boolean }>) => {
        if (ev.data?.type === "LOGIN" && ev.data.token) {
          setToken(ev.data.token, Boolean(ev.data.remember), false);
          clearUserCache();
          router.replace(tujuanSetelahLogin());
        }
      };
    }

      return () => {
      aktif = false;
      ch?.close();
    };
  }, [router]);

  function validasi(): boolean {
    const err: Err = {};
    const emailBersih = email.trim();
    if (!emailBersih) err.email = "Email wajib diisi.";
    else if (!/^\S+@\S+\.\S+$/.test(emailBersih)) err.email = "Format email tidak valid.";
    if (!password) {
      err.password = "Password wajib diisi.";
    } else if (password.length < 8) {
      err.password = "Password minimal 8 karakter.";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setAlert("");
    if (!validasi()) return;

    setLoading(true);
    try {
      const res = await auth.login({ email: email.trim(), password, device_name: "web-app" });

      // Simpan token di localStorage (ingat saya) atau sessionStorage (hanya sesi browser ini)
      setToken(res.token, ingat);
      clearUserCache(res.user);
      if (process.env.NODE_ENV === "test") {
        router.replace(tujuanSetelahLogin());
      } else {
        window.location.replace(tujuanSetelahLogin());
      }
    } catch (err: unknown) {
      setLoading(false);
      const apiErr = err instanceof ApiError ? err : new ApiError("Terjadi kesalahan. Coba lagi.", 0);
      if (apiErr.status === 422 || apiErr.status === 401) {
        const pesan = apiErr.message || "Email atau password salah.";
        setAlert(pesan);
        setErrors({ email: pesan });
      } else {
        setAlert(apiErr.message || "Terjadi kesalahan. Coba lagi.");
      }
    }
  }

  async function salinFormatReset() {
    const teks = `Permohonan Reset Akun SehatKita\nEmail terdaftar: ${email || "[isi email akun]"}\nKelurahan: [isi kelurahan]`;
    try {
      await navigator.clipboard?.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      setTersalin(false);
    }
  }

  if (cekSesi) {
    return (
      <div className="auth-wrap" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="row" style={{ gap: 10, color: "var(--ink-2)" }}>
          <Icon name="activity" size={20} />
          <span className="text-sm fw-600">Memeriksa sesi masuk…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <AuthAside
        judul="Kenali Kondisi Tubuhmu. Cegah Risiko Sejak Dini."
        teks="Masuk untuk memantau riwayat kesehatan, mengikuti program kelurahan, dan membangun kebiasaan hidup lebih sehat."
        fitur={[
          {
            icon: "file-text",
            tag: "Pemantauan Rutin",
            title: "Catat & pantau indikator kesehatan",
            desc: "Berat badan, tekanan darah, gula darah, dan kolesterol tersimpan rapi di satu tempat.",
          },
          {
            icon: "sparkles",
            tag: "Insight Klinis",
            title: "Analisis status kesehatan otomatis",
            desc: "Lihat zona hijau, kuning, dan merah sesuai ambang resmi Kemenkes RI.",
          },
          {
            icon: "award",
            tag: "Program Kelurahan",
            title: "Tantangan sehat & jadwal Posbindu",
            desc: "Terhubung langsung dengan kader wilayah dan agenda posbindu setempat.",
          },
          {
            icon: "shield-check",
            tag: "Privasi Terjaga",
            title: "Data terlindungi & kontrol penuh Anda",
            desc: "Riwayat pribadi hanya diakses sesuai izin persetujuan pengguna.",
          },
        ]}
      />

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-topbar">
            <Link href="/" className="btn btn-sm btn-outline auth-back-btn">
              <Icon name="arrow-left" size={16} /> Kembali
            </Link>
            <ThemeToggle />
          </div>

          <Link href="/" className="auth-mobile-brand" aria-label="Beranda SehatKita">
            <BrandLockup variant="sm" />
            <div className="txt">
              SehatKita
              <small>Kota Banjarbaru</small>
            </div>
          </Link>

          <div className="auth-head">
            <span className="auth-aside-badge">
              <Icon name="shield-check" size={13} /> Portal Kesehatan Warga
            </span>
            <h1 className="h2">Masuk ke akun Anda</h1>
            <p className="tiny mt-4">Gunakan email dan password yang terdaftar.</p>
          </div>

          {alert ? (
            <div className="alert alert-danger mb-16" role="alert">
              <Icon name="alert-circle" />
              <div>{alert}</div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
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
                  autoComplete="username"
                  inputMode="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={`err-msg ${errors.email ? "show" : ""}`}>{errors.email}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">
                Password <span className="req">*</span>
              </label>
              <div className="input-icon has-end">
                <Icon name="lock" size={18} />
                <input
                  className={`input ${errors.password ? "is-error" : ""}`}
                  type={lihatPw ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="input-end-btn"
                  aria-label={lihatPw ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={lihatPw}
                  onClick={() => setLihatPw((v) => !v)}
                >
                  <Icon name={lihatPw ? "eye-off" : "eye"} size={18} />
                </button>
              </div>
              <div className={`err-msg ${errors.password ? "show" : ""}`}>{errors.password}</div>
            </div>

            <div className="row-between mt-16">
              <label className="check">
                <input type="checkbox" checked={ingat} onChange={(e) => setIngat(e.target.checked)} />
                <span className="tiny">Ingat saya di perangkat ini</span>
              </label>
              <button
                type="button"
                className="link-btn tiny fw-600"
                onClick={() => {
                  setTersalin(false);
                  setLupa(true);
                }}
              >
                Lupa password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block mt-20" disabled={loading}>
              {loading ? "Masuk…" : "Masuk"}
            </button>
          </form>

          <p className="center tiny mt-20 auth-foot-note">
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary fw-700">
              Daftar sekarang
            </Link>
          </p>

          <div className="auth-legal-links" aria-label="Informasi hukum dan bantuan">
            <button type="button" className="auth-legal-btn" onClick={() => setLegalTopic("privasi")}>
              Kebijakan Privasi
            </button>
            <button type="button" className="auth-legal-btn" onClick={() => setLegalTopic("syarat")}>
              Syarat &amp; Ketentuan
            </button>
            <button type="button" className="auth-legal-btn" onClick={() => setLegalTopic("medis")}>
              Catatan Penting
            </button>
            <button type="button" className="auth-legal-btn" onClick={() => setLegalTopic("kontak")}>
              Kontak Resmi
            </button>
          </div>
        </div>
      </main>

      <Modal
        open={lupa}
        onClose={() => setLupa(false)}
        title="Bantuan Lupa Password"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={salinFormatReset}>
              <Icon name={tersalin ? "check" : "copy"} size={16} />
              {tersalin ? "Format Tersalin" : "Salin Format Pesan"}
            </button>
            <button className="btn btn-primary" onClick={() => setLupa(false)} type="button">
              Mengerti
            </button>
          </>
        }
      >
        <p className="text-sm">
          Reset kata sandi mandiri lewat email belum tersedia saat ini. Untuk keamanan akun warga, pemulihan akun dibantu
          langsung oleh petugas kelurahan atau pengelola sistem.
        </p>
        <div className="alert alert-info mt-12">
          <Icon name="info" size={18} />
          <div>
            <strong>Langkah cepat:</strong> salin format pesan di bawah lalu kirim ke petugas/kader kelurahan Anda
            untuk verifikasi identitas.
          </div>
        </div>
      </Modal>

      <LegalInfoModal
        topic={legalTopic}
        onChangeTopic={setLegalTopic}
        onClose={() => setLegalTopic(null)}
      />
    </div>
  );
}

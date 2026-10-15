"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Modal from "@/components/ui/Modal";
import AuthAside from "@/components/auth/AuthAside";
import { loginSimulasi } from "@/lib/session";
import { AKUN_DEMO, LABEL_ROLE_DEMO } from "@/lib/demo";

type Err = { email?: string; password?: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ingat, setIngat] = useState(true);
  const [lihatPw, setLihatPw] = useState(false);
  const [errors, setErrors] = useState<Err>({});
  const [alert, setAlert] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lupa, setLupa] = useState(false);

  function validasi(): boolean {
    const err: Err = {};
    if (!email) err.email = "Email wajib diisi.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) err.email = "Format email tidak valid.";
    if (!password) err.password = "Password wajib diisi.";
    else if (password.length < 8) err.password = "Password minimal 8 karakter.";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  function isiDemo(e: string, pw: string) {
    setEmail(e);
    setPassword(pw);
    setErrors({});
    setAlert("");
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setAlert("");
    if (!validasi()) return;

    setLoading(true);
    // TODO (tahap integrasi): ganti dengan Api.login sungguhan.
    // Login sukses HANYA bila backend memvalidasi kredensial.
    const akun = AKUN_DEMO.find((a) => a.email.toLowerCase() === email.toLowerCase());
    setTimeout(() => {
      setLoading(false);
      if (akun && akun.password === password) {
        loginSimulasi(email);
        router.push("/dashboard");
      } else {
        setAlert("Email atau password salah. Periksa kembali kredensial Anda.");
        setErrors({ password: "Kredensial tidak cocok." });
      }
    }, 700);
  }

  return (
    <div className="auth-wrap">
      <AuthAside
        judul="Kenali Kondisi Tubuhmu. Cegah Risiko Sejak Dini."
        teks="Masuk untuk memantau riwayat kesehatan, mengikuti program kelurahan, dan membangun kebiasaan hidup lebih sehat."
        fitur={[
          ["file-text", "Catat & pantau indikator kesehatan"],
          ["sparkles", "Dapatkan insight dari data Anda"],
          ["award", "Ikuti tantangan kesehatan wilayah"],
          ["shield-check", "Data terlindungi & sesuai izin"],
        ]}
      />

      <main className="auth-main">
        <div className="auth-card">
          <div className="row-between mb-24">
            <div>
              <h1 className="h2">Masuk ke akun Anda</h1>
              <p className="tiny mt-4">Gunakan email dan password yang terdaftar.</p>
            </div>
            <ThemeToggle />
          </div>

          {alert ? (
            <div className="alert alert-danger mb-16">
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
              <div className="input-icon" style={{ position: "relative" }}>
                <Icon name="lock" size={18} />
                <input
                  className={`input ${errors.password ? "is-error" : ""}`}
                  type={lihatPw ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  style={{ paddingRight: 44 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-icon btn-sm btn-ghost"
                  style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)" }}
                  aria-label="Tampilkan password"
                  onClick={() => setLihatPw((v) => !v)}
                >
                  <Icon name="eye" size={18} />
                </button>
              </div>
              <div className={`err-msg ${errors.password ? "show" : ""}`}>{errors.password}</div>
            </div>

            <div className="row-between mt-16">
              <label className="check">
                <input type="checkbox" checked={ingat} onChange={(e) => setIngat(e.target.checked)} />
                <span className="tiny">Ingat saya</span>
              </label>
              <a
                href="#"
                className="tiny text-primary fw-600"
                onClick={(e) => {
                  e.preventDefault();
                  setLupa(true);
                }}
              >
                Lupa password?
              </a>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block mt-20" disabled={loading}>
              {loading ? "Masuk…" : "Masuk"}
            </button>
          </form>

          <p className="center tiny mt-20">
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary fw-700">
              Daftar sekarang
            </Link>
          </p>

          <div className="demo-accounts">
            <div className="da-title">
              <Icon name="info" size={14} /> Akun Data Demo (prototipe) — klik untuk mengisi
            </div>
            <div>
              {AKUN_DEMO.map((a) => (
                <button type="button" key={a.email} onClick={() => isiDemo(a.email, a.password)}>
                  <span>
                    <b>{LABEL_ROLE_DEMO[a.role] || a.role}</b> · {a.email}
                  </span>
                  <span className="badge badge-primary">{a.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Modal open={lupa} onClose={() => setLupa(false)} title="Lupa password?">
        <p className="tiny">
          Fitur reset password belum tersedia pada kontrak API saat ini. Hubungi petugas kelurahan atau admin untuk
          bantuan pengaturan ulang akun.
        </p>
        <div className="modal-foot mt-20">
          <button className="btn btn-primary" onClick={() => setLupa(false)} type="button">
            Mengerti
          </button>
        </div>
      </Modal>
    </div>
  );
}

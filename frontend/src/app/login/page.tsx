"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { auth, setToken, ApiError } from "@/lib/api";
import { simpanUserSesi } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);

  // Validasi sederhana di sisi frontend (sebelum dikirim ke backend)
  function validasi(): boolean {
    const err: typeof errors = {};
    if (!email) {
      err.email = "Email wajib diisi.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      err.email = "Format email tidak valid.";
    }
    if (!password) {
      err.password = "Kata sandi wajib diisi.";
    } else if (password.length < 8) {
      err.password = "Kata sandi minimal 8 karakter.";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validasi()) return;

    setLoading(true);
    setPesan("");
    try {
      // §4.2 POST /auth/login → { user, token }
      const data = await auth.login({ email, password, device_name: "web" });
      setToken(data.token);
      simpanUserSesi(data.user);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        // 422 → tampilkan error per-field dari backend
        if (err.errors?.email) setErrors({ email: err.errors.email[0] });
        else if (err.errors?.password) setErrors({ password: err.errors.password[0] });
        else setPesan(err.message);
      } else {
        setPesan("Tidak dapat terhubung ke server. Coba lagi.");
      }
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / judul */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white">
            SK
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Masuk ke SehatKita</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sistem Monitoring Kesehatan Masyarakat
          </p>
        </div>

        {/* Kartu form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {pesan && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {pesan}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <Input
              label="Kata Sandi"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <Button type="submit" fullWidth loading={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Daftar di sini
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © 2026 SehatKita — Monitoring Kesehatan PTM
        </p>
      </div>
    </main>
  );
}

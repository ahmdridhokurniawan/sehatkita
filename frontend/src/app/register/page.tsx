"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { auth, wilayah as wilayahApi, setToken, ApiError } from "@/lib/api";
import { simpanUserSesi } from "@/lib/session";
import type { Wilayah } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [wilayahId, setWilayahId] = useState("");

  const [daftarWilayah, setDaftarWilayah] = useState<Wilayah[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);

  // Ambil daftar kelurahan untuk dropdown (§6.1 GET /wilayah)
  useEffect(() => {
    wilayahApi
      .list({ tipe: "kelurahan" })
      .then(setDaftarWilayah)
      .catch(() => setPesan("Gagal memuat daftar wilayah."));
  }, []);

  function validasi(): boolean {
    const err: Record<string, string> = {};
    if (!name) err.name = "Nama wajib diisi.";
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
    if (konfirmasi !== password) {
      err.konfirmasi = "Konfirmasi kata sandi tidak cocok.";
    }
    if (!wilayahId) err.wilayahId = "Pilih wilayah.";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validasi()) return;

    setLoading(true);
    setPesan("");
    try {
      // §4.1 POST /auth/register → { user, token }
      const data = await auth.register({
        name,
        email,
        password,
        password_confirmation: konfirmasi,
        wilayah_id: Number(wilayahId),
      });
      setToken(data.token);
      simpanUserSesi(data.user);
      // Pengguna baru → arahkan ke onboarding untuk lengkapi data diri
      router.push("/onboarding");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          const map: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.errors)) map[k] = v[0];
          setErrors(map);
        } else {
          setPesan(err.message);
        }
      } else {
        setPesan("Tidak dapat terhubung ke server. Coba lagi.");
      }
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white">
            SK
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Akun</h1>
          <p className="mt-1 text-sm text-slate-500">
            Buat akun untuk mulai memantau kesehatanmu
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {pesan && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {pesan}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Nama Lengkap"
              name="name"
              type="text"
              placeholder="Nama kamu"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />

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
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <Input
              label="Konfirmasi Kata Sandi"
              name="password_confirmation"
              type="password"
              placeholder="Ulangi kata sandi"
              autoComplete="new-password"
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              error={errors.konfirmasi}
            />

            <Select
              label="Wilayah (Kelurahan)"
              name="wilayah_id"
              value={wilayahId}
              onChange={(e) => setWilayahId(e.target.value)}
              error={errors.wilayahId}
            >
              <option value="">-- Pilih Kelurahan --</option>
              {daftarWilayah.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nama}
                </option>
              ))}
            </Select>

            <Button type="submit" fullWidth loading={loading}>
              {loading ? "Memproses..." : "Daftar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Masuk di sini
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

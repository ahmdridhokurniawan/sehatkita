"use client";

import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type FormState = {
  passwordLama: string;
  passwordBaru: string;
  passwordBaru2: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function SetelanKeamananPage() {
  const [form, setForm] = useState<FormState>({
    passwordLama: "",
    passwordBaru: "",
    passwordBaru2: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [berhasil, setBerhasil] = useState(false);
  const [loading, setLoading] = useState(false);

  function ubah<K extends keyof FormState>(key: K, nilai: string) {
    setForm((prev) => ({ ...prev, [key]: nilai }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validasi(f: FormState): Errors {
    const e: Errors = {};

    if (f.passwordLama.trim() === "") {
      e.passwordLama = "Password lama wajib diisi";
    }

    if (f.passwordBaru.trim() === "") {
      e.passwordBaru = "Password baru wajib diisi";
    } else if (f.passwordBaru.length < 8) {
      e.passwordBaru = "Minimal 8 karakter";
    }

    if (f.passwordBaru2.trim() === "") {
      e.passwordBaru2 = "Konfirmasi password wajib diisi";
    } else if (f.passwordBaru !== f.passwordBaru2) {
      e.passwordBaru2 = "Password tidak cocok";
    }

    return e;
  }

  function simpan(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validasi(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    // Simulasi API call
    setTimeout(() => {
      setLoading(false);
      setBerhasil(true);
      setForm({ passwordLama: "", passwordBaru: "", passwordBaru2: "" });
      setTimeout(() => setBerhasil(false), 3000);
    }, 1000);
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Keamanan</h1>
          <p className="tiny">Kelola password & login security.</p>
        </div>
      </div>

      {berhasil && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--safe)" }}>
          <div className="row gap-10 items-center">
            <span className="text-safe">
              <Icon name="check-circle" size={18} />
            </span>
            <span className="text-sm">Password berhasil diubah (demo).</span>
          </div>
        </div>
      )}

      <form onSubmit={simpan}>
        <div className="card">
          <div className="app-section-title mb-12">
            <h2>Ubah Password</h2>
          </div>

          <Input
            label="Password Lama"
            type="password"
            placeholder="Masukkan password lama"
            required
            value={form.passwordLama}
            error={errors.passwordLama}
            onChange={(e) => ubah("passwordLama", e.target.value)}
          />

          <Input
            label="Password Baru"
            type="password"
            placeholder="Minimal 8 karakter"
            required
            value={form.passwordBaru}
            error={errors.passwordBaru}
            onChange={(e) => ubah("passwordBaru", e.target.value)}
            className="mt-12"
          />

          <Input
            label="Konfirmasi Password"
            type="password"
            placeholder="Ulangi password baru"
            required
            value={form.passwordBaru2}
            error={errors.passwordBaru2}
            onChange={(e) => ubah("passwordBaru2", e.target.value)}
            className="mt-12"
          />

          <div className="mt-16">
            <Button type="submit" icon="lock" disabled={loading}>
              {loading ? "Mengubah..." : "Ubah Password"}
            </Button>
          </div>
        </div>
      </form>

      <div className="card mt-16">
        <div className="app-section-title mb-12">
          <h2>Sesi Login</h2>
        </div>

        <div className="li">
          <span className="li-ico">
            <Icon name="smartphone" size={18} />
          </span>
          <div className="li-main">
            <strong className="text-sm">Perangkat Saat Ini</strong>
            <span className="tiny">Chrome di Windows • IP: 192.168.1.1</span>
          </div>
          <div className="li-side">
            <span className="badge badge-safe">Aktif</span>
          </div>
        </div>

        <div className="mt-12">
          <Button type="button" variant="outline" icon="log-out">
            Logout Semua Perangkat
          </Button>
        </div>
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Keamanan akun tersimpan di server (demo).
      </p>
    </AppShell>
  );
}

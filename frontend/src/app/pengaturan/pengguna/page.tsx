"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const PENGGUNA_DEMO = [
  { id: 1, nama: "Budi Santoso", email: "budi@sehatkita.id", role: "user", status: "aktif", dibuat: "2026-01-15" },
  { id: 2, nama: "Kader A", email: "kader@sehatkita.id", role: "kader", status: "aktif", dibuat: "2026-02-20" },
  { id: 3, nama: "Admin Sungai Besar", email: "admin@sehatkita.id", role: "admin_kelurahan", status: "aktif", dibuat: "2026-03-10" },
  { id: 4, nama: "Super Admin", email: "super@sehatkita.id", role: "super_admin", status: "aktif", dibuat: "2026-01-01" },
  { id: 5, nama: "Rina Wijaya", email: "rina@sehatkita.id", role: "user", status: "tidak_aktif", dibuat: "2026-04-05" },
];

const ROLE_LABELS: Record<string, string> = {
  user: "Masyarakat",
  kader: "Kader Posbindu",
  admin_kelurahan: "Admin Kelurahan",
  super_admin: "Super Admin",
};

const ROLE_TONE: Record<string, "safe" | "warning" | "danger"> = {
  user: "safe",
  kader: "warning",
  admin_kelurahan: "warning",
  super_admin: "danger",
};

export default function SettingsPenggunaPage() {
  const [pengguna, setPengguna] = useState(PENGGUNA_DEMO);
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell greet="Manajemen Pengguna">
      <section>
        <div className="app-section-title">
          <h2>Daftar Pengguna</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={14} /> Tambah
          </Button>
        </div>

        {showForm && (
          <div className="card mt-12">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input type="text" className="input" placeholder="Masukkan nama" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input" placeholder="contoh@sehatkita.id" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="input">
                <option>Masyarakat (user)</option>
                <option>Kader Posbindu (kader)</option>
                <option>Admin Kelurahan (admin_kelurahan)</option>
                <option>Super Admin (super_admin)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Wilayah (opsional)</label>
              <select className="input">
                <option>Sungai Besar</option>
                <option>Guntung Payung</option>
              </select>
            </div>
            <div className="form-group row-end" style={{ gap: 8 }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button>Simpan</Button>
            </div>
          </div>
        )}

        <div className="card mt-12">
          {pengguna.map((p) => (
            <div className="li li-hover" key={p.id}>
              <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                <Icon name="user" size={18} />
              </span>
              <div className="li-main">
                <strong>{p.nama}</strong>
                <span className="tiny">{p.email}</span>
              </div>
              <div className="row-end" style={{ gap: 8, alignItems: "center" }}>
                <Badge tone={ROLE_TONE[p.role]}>{ROLE_LABELS[p.role]}</Badge>
                <Badge tone={p.status === "aktif" ? "safe" : "danger"}>{p.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="lock" size={13} /> Perubahan role hanya dapat dilakukan oleh Super Admin.
      </p>
    </AppShell>
  );
}

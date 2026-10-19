"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const FASKES_DEMO = [
  { id: 1, nama: "Puskesmas Landasan Ulin", jenis: "puskesmas", alamat: "Jl. Pendidikan No. 1", kontak: "0812-3456789" },
  { id: 2, nama: "Puskesmas Banjarbaru Utara", jenis: "puskesmas", alamat: "Jl. Gatot Subroto No. 5", kontak: "0812-3456790" },
  { id: 3, nama: "Klinik Sehat Sentosa", jenis: "klinik", alamat: "Jl. Ahmad Yani No. 10", kontak: "0812-3456791" },
  { id: 4, nama: "Klinik Mulia", jenis: "klinik", alamat: "Jl. Diponegoro No. 3", kontak: "0812-3456792" },
];

export default function SettingsFaskesPage() {
  const [faskes, setFaskes] = useState(FASKES_DEMO);
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell greet="Manajemen Faskes">
      <section>
        <div className="app-section-title">
          <h2>Daftar Faskes</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={14} /> Tambah
          </Button>
        </div>

        {showForm && (
          <div className="card mt-12">
            <div className="form-group">
              <label className="form-label">Nama Faskes</label>
              <input type="text" className="input" placeholder="Puskesmas / Klinik..." />
            </div>
            <div className="form-group">
              <label className="form-label">Jenis Faskes</label>
              <select className="input">
                <option>Puskesmas</option>
                <option>Klinik</option>
                <option>Rumah Sakit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <input type="text" className="input" placeholder="Jalan, nomor..." />
            </div>
            <div className="form-group">
              <label className="form-label">Kontak (Telepon)</label>
              <input type="tel" className="input" placeholder="+62..." />
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
          {faskes.map((f) => (
            <div className="li li-hover" key={f.id}>
              <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <Icon name="home" size={18} />
              </span>
              <div className="li-main">
                <strong>{f.nama}</strong>
                <span className="tiny">{f.alamat}</span>
                <span className="tiny">{f.kontak}</span>
              </div>
              <Badge tone={f.jenis === "puskesmas" ? "safe" : "warning"}>{f.jenis}</Badge>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Faskes digunakan untuk rujukan dan referensi medis.
      </p>
    </AppShell>
  );
}

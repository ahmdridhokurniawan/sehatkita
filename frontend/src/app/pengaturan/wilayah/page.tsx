"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { User } from "@/types";

const WILAYAH_DEMO = [
  {
    id: 1,
    kecamatan: "Landasan Ulin",
    kelurahan: "Sungai Besar",
    kader: 5,
    peserta: 214,
    dibuat: "2026-01-15",
  },
  {
    id: 2,
    kecamatan: "Landasan Ulin",
    kelurahan: "Guntung Payung",
    kader: 3,
    peserta: 156,
    dibuat: "2026-02-20",
  },
  {
    id: 3,
    kecamatan: "Landasan Ulin",
    kelurahan: "Syamsudin Noor",
    kader: 4,
    peserta: 189,
    dibuat: "2026-03-10",
  },
];

export default function SettingsWilayahPage() {
  const [wilayah, setWilayah] = useState(WILAYAH_DEMO);
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell greet="Manajemen Wilayah">
      <section>
        <div className="app-section-title">
          <h2>Daftar Kelurahan</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={14} /> Tambah
          </Button>
        </div>

        {showForm && (
          <div className="card mt-12">
            <div className="form-group">
              <label className="form-label">Kecamatan</label>
              <select className="input">
                <option>Landasan Ulin</option>
                <option>Banjarbaru Utara</option>
                <option>Cempaka</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Kelurahan</label>
              <input type="text" className="input" placeholder="Masukkan nama kelurahan" />
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
          {wilayah.map((w) => (
            <div className="li li-hover" key={w.id}>
              <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
                <Icon name="map-pin" size={18} />
              </span>
              <div className="li-main">
                <strong>{w.kelurahan}</strong>
                <span className="tiny">{w.kecamatan}</span>
              </div>
              <div className="row-end" style={{ gap: 16, alignItems: "center" }}>
                <div className="text-right">
                  <div className="tiny fw-600">{w.kader} kader</div>
                  <div className="tiny">{w.peserta} peserta</div>
                </div>
                <Icon name="chevron-right" size={18} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Perubahan wilayah akan mempengaruhi laporan agregat.
      </p>
    </AppShell>
  );
}

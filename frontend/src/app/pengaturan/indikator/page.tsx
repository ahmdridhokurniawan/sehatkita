"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const INDIKATOR_DEMO = [
  { id: 1, nama: "Berat Badan", satuan: "kg", tipe: "numeric", kategori: "antropometri" },
  { id: 2, nama: "Tinggi Badan", satuan: "cm", tipe: "numeric", kategori: "antropometri" },
  { id: 3, nama: "Indeks Massa Tubuh (IMT)", satuan: "kg/m²", tipe: "calculated", kategori: "antropometri" },
  { id: 4, nama: "Tekanan Darah Sistolik", satuan: "mmHg", tipe: "numeric", kategori: "vital" },
  { id: 5, nama: "Tekanan Darah Diastolik", satuan: "mmHg", tipe: "numeric", kategori: "vital" },
  { id: 6, nama: "Gula Darah Puasa", satuan: "mg/dL", tipe: "numeric", kategori: "laboratorium" },
  { id: 7, nama: "Kolesterol Total", satuan: "mg/dL", tipe: "numeric", kategori: "laboratorium" },
];

export default function SettingsIndikatorPage() {
  const [indikator, setIndikator] = useState(INDIKATOR_DEMO);
  const [showForm, setShowForm] = useState(false);

  const KATEGORI_LABEL: Record<string, string> = {
    antropometri: "Antropometri",
    vital: "Vital Sign",
    laboratorium: "Laboratorium",
  };

  return (
    <AppShell greet="Manajemen Indikator">
      <section>
        <div className="app-section-title">
          <h2>Daftar Indikator Kesehatan</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={14} /> Tambah
          </Button>
        </div>

        {showForm && (
          <div className="card mt-12">
            <div className="form-group">
              <label className="form-label">Nama Indikator</label>
              <input type="text" className="input" placeholder="Contoh: Berat Badan" />
            </div>
            <div className="form-group">
              <label className="form-label">Satuan</label>
              <input type="text" className="input" placeholder="Contoh: kg, cm, mmHg" />
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="input">
                <option>Antropometri</option>
                <option>Vital Sign</option>
                <option>Laboratorium</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipe</label>
              <select className="input">
                <option>Numeric (Input manual)</option>
                <option>Calculated (Otomatis)</option>
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
          {indikator.map((ind) => (
            <div className="li li-hover" key={ind.id}>
              <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                <Icon name="trending-up" size={18} />
              </span>
              <div className="li-main">
                <strong>{ind.nama}</strong>
                <span className="tiny">
                  {KATEGORI_LABEL[ind.kategori]} • {ind.satuan}
                </span>
              </div>
              <Badge tone={ind.tipe === "numeric" ? "safe" : "warning"}>{ind.tipe}</Badge>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Indikator digunakan untuk pencatatan dan analisis kesehatan.
      </p>
    </AppShell>
  );
}

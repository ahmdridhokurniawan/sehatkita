"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const AMBANG_DEMO = [
  { id: 1, indikator: "IMT", kategori: "Kurus", min: 0, max: 18.4, warna: "danger" },
  { id: 2, indikator: "IMT", kategori: "Normal", min: 18.5, max: 24.9, warna: "safe" },
  { id: 3, indikator: "IMT", kategori: "Gemuk", min: 25, max: 29.9, warna: "warning" },
  { id: 4, indikator: "IMT", kategori: "Obesitas", min: 30, max: 999, warna: "danger" },
  { id: 5, indikator: "Tekanan Darah Sistolik", kategori: "Normal", min: 0, max: 120, warna: "safe" },
  { id: 6, indikator: "Tekanan Darah Sistolik", kategori: "Elevated", min: 121, max: 129, warna: "warning" },
  { id: 7, indikator: "Tekanan Darah Sistolik", kategori: "Hipertensi Tahap 1", min: 130, max: 139, warna: "warning" },
  { id: 8, indikator: "Tekanan Darah Sistolik", kategori: "Hipertensi Tahap 2", min: 140, max: 999, warna: "danger" },
];

export default function SettingsAmbangPage() {
  const [ambang, setAmbang] = useState(AMBANG_DEMO);
  const [showForm, setShowForm] = useState(false);

  const WARNA_LABEL: Record<string, string> = {
    safe: "Sehat",
    warning: "Waspada",
    danger: "Berbahaya",
  };

  const WARNA_TONE: Record<string, "safe" | "warning" | "danger"> = {
    safe: "safe",
    warning: "warning",
    danger: "danger",
  };

  return (
    <AppShell greet="Manajemen Ambang Risiko">
      <section>
        <div className="app-section-title">
          <h2>Konfigurasi Ambang Indikator</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={14} /> Tambah
          </Button>
        </div>

        {showForm && (
          <div className="card mt-12">
            <div className="form-group">
              <label className="form-label">Indikator</label>
              <select className="input">
                <option>IMT</option>
                <option>Tekanan Darah Sistolik</option>
                <option>Tekanan Darah Diastolik</option>
                <option>Gula Darah Puasa</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <input type="text" className="input" placeholder="Contoh: Normal, Elevated" />
            </div>
            <div className="row-between" style={{ gap: 12 }}>
              <div className="form-group flex-1">
                <label className="form-label">Nilai Minimal</label>
                <input type="number" className="input" placeholder="0" />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Nilai Maksimal</label>
                <input type="number" className="input" placeholder="999" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status Risiko</label>
              <select className="input">
                <option>Sehat (Hijau)</option>
                <option>Waspada (Kuning)</option>
                <option>Berbahaya (Merah)</option>
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
          {ambang.map((a) => (
            <div className="li li-hover" key={a.id}>
              <span className="li-ico" style={{ background: "var(--muted-bg)", color: "var(--muted)" }}>
                <Icon name="sliders" size={18} />
              </span>
              <div className="li-main">
                <strong>{a.indikator}</strong>
                <span className="tiny">
                  {a.kategori} ({a.min}–{a.max})
                </span>
              </div>
              <Badge tone={WARNA_TONE[a.warna]}>{WARNA_LABEL[a.warna]}</Badge>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <div className="app-section-title">
          <h2>Poin Risiko (Scoring)</h2>
        </div>
        <div className="card mt-12">
          <div className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="check-circle" size={18} />
            </span>
            <div className="li-main">
              <strong>Sehat (Hijau)</strong>
              <span className="tiny">Poin risiko: 0</span>
            </div>
          </div>
          <div className="li">
            <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Icon name="alert-circle" size={18} />
            </span>
            <div className="li-main">
              <strong>Waspada (Kuning)</strong>
              <span className="tiny">Poin risiko: 1</span>
            </div>
          </div>
          <div className="li">
            <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <Icon name="x-circle" size={18} />
            </span>
            <div className="li-main">
              <strong>Berbahaya (Merah)</strong>
              <span className="tiny">Poin risiko: 2</span>
            </div>
          </div>
        </div>
      </div>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Ambang digunakan untuk penilaian risiko kesehatan otomatis.
      </p>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { tanggal, angka } from "@/lib/format";

const PROGRAM_DEMO = [
  {
    id: 1,
    nama: "Program Ibu Hamil",
    deskripsi: "Pemeriksaan rutin & edukasi gizi untuk ibu hamil",
    peserta: 28,
    mulai: "2026-01-01",
    status: "berjalan",
    kader: { id: 5, name: "Kader A" },
  },
  {
    id: 2,
    nama: "Program Balita Sehat",
    deskripsi: "Penimbangan & pencatatan tumbuh kembang balita",
    peserta: 45,
    mulai: "2026-02-15",
    status: "berjalan",
    kader: { id: 5, name: "Kader A" },
  },
  {
    id: 3,
    nama: "Program Lansia Hipertensi",
    deskripsi: "Monitor tekanan darah & edukasi gaya hidup",
    peserta: 32,
    mulai: "2026-03-01",
    status: "berjalan",
    kader: { id: 6, name: "Kader B" },
  },
  {
    id: 4,
    nama: "Program Deteksi Dini Penyakit",
    deskripsi: "Skrining PTM untuk masyarakat dewasa",
    peserta: 0,
    mulai: "2026-11-01",
    status: "akan_datang",
    kader: null,
  },
];

const LABEL_STATUS: Record<string, string> = {
  berjalan: "Berjalan",
  selesai: "Selesai",
  akan_datang: "Akan datang",
};

const STATUS_TONE: Record<string, "safe" | "warning" | "danger"> = {
  berjalan: "safe",
  selesai: "warning",
  akan_datang: "danger",
};

export default function ProgramKelurahanPage() {
  const [program, setProgram] = useState(PROGRAM_DEMO);
  const [showForm, setShowForm] = useState(false);

  const totalPeserta = program.filter((p) => p.status === "berjalan").reduce((sum, p) => sum + p.peserta, 0);

  return (
    <AppShell greet="Manajemen Program Posbindu">
      {/* Ringkasan */}
      <section>
        <div className="app-section-title">
          <h2>Program Kelurahan</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={14} /> Buat Program
          </Button>
        </div>

        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="card card-metric">
            <div className="tiny">Program Berjalan</div>
            <div className="metric-val">{program.filter((p) => p.status === "berjalan").length}</div>
          </div>
          <div className="card card-metric">
            <div className="tiny">Total Peserta</div>
            <div className="metric-val">{angka(totalPeserta)}</div>
          </div>
        </div>
      </section>

      {/* Form buat program */}
      {showForm && (
        <section>
          <div className="card">
            <h3 className="text-lg fw-600 mb-12">Buat Program Baru</h3>
            <div className="form-group">
              <label className="form-label">Nama Program</label>
              <input type="text" className="input" placeholder="Contoh: Program Ibu Hamil" />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="input" placeholder="Tujuan & aktivitas program..." style={{ minHeight: 80 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Penanggung Jawab (Kader)</label>
              <select className="input">
                <option>Pilih kader...</option>
                <option>Kader A</option>
                <option>Kader B</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Mulai</label>
              <input type="date" className="input" />
            </div>
            <div className="form-group row-end" style={{ gap: 8 }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button>Buat Program</Button>
            </div>
          </div>
        </section>
      )}

      {/* Daftar program */}
      <section>
        <div className="app-section-title">
          <h2>Daftar Program</h2>
        </div>
        <div className="card mt-12">
          {program.map((p) => (
            <Link href={`/program/${p.id}`} key={p.id} className="li li-hover" style={{ textDecoration: "none", color: "inherit" }}>
              <span
                className="li-ico"
                style={{
                  background: p.status === "berjalan" ? "var(--success-bg)" : p.status === "akan_datang" ? "var(--warning-bg)" : "var(--muted-bg)",
                  color: p.status === "berjalan" ? "var(--success)" : p.status === "akan_datang" ? "var(--warning)" : "var(--muted)",
                }}
              >
                <Icon name="flag" size={18} />
              </span>
              <div className="li-main">
                <strong>{p.nama}</strong>
                <span className="tiny">{p.deskripsi}</span>
                <span className="tiny">
                  {p.kader ? `PJ: ${p.kader.name}` : "PJ: belum ditentukan"} • Dimulai: {tanggal(p.mulai, "short")}
                </span>
              </div>
              <div className="row-end" style={{ gap: 8, alignItems: "center" }}>
                <div className="text-right">
                  <div className="tiny fw-600">{angka(p.peserta)}</div>
                  <div className="tiny">peserta</div>
                </div>
                <Badge tone={STATUS_TONE[p.status] || "primary"}>{LABEL_STATUS[p.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Statistik */}
      <section>
        <div className="app-section-title">
          <h2>Ringkasan Status</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          {[
            { status: "berjalan", label: "Berjalan", count: program.filter((p) => p.status === "berjalan").length },
            { status: "selesai", label: "Selesai", count: program.filter((p) => p.status === "selesai").length },
            { status: "akan_datang", label: "Akan datang", count: program.filter((p) => p.status === "akan_datang").length },
          ].map((s) => (
            <div className="card card-flat" key={s.status}>
              <div className="row-between">
                <span className="tiny fw-600">{s.label}</span>
                <strong>{s.count}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Program dikelola oleh kader & dimonitor oleh admin kelurahan.
      </p>
    </AppShell>
  );
}

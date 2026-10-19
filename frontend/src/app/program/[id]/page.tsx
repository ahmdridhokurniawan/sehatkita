"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { tanggal, angka } from "@/lib/format";

// Demo program detail
const PROGRAM_DETAIL = {
  id: 1,
  nama: "Program Ibu Hamil",
  deskripsi: "Pemeriksaan rutin & edukasi gizi untuk ibu hamil",
  tujuan: "Menurunkan angka kematian ibu dan bayi melalui monitoring kesehatan rutin",
  mulai: "2026-01-01",
  kader: { id: 5, name: "Kader A" },
  status: "berjalan",
  peserta_target: 30,
  peserta_aktif: 28,
  sesi_rencana: 12,
  sesi_terlaksana: 8,
};

const PESERTA_DEMO = [
  { id: 1, nama: "Ibu Siti", usia_kehamilan: "7 bulan", berat_badan: 68, tekanan_darah: "120/80", status: "normal" },
  { id: 2, nama: "Ibu Rina", usia_kehamilan: "6 bulan", berat_badan: 72, tekanan_darah: "135/85", status: "waspada" },
  { id: 3, nama: "Ibu Ayu", usia_kehamilan: "5 bulan", berat_badan: 65, tekanan_darah: "118/78", status: "normal" },
  { id: 4, nama: "Ibu Dina", usia_kehamilan: "8 bulan", berat_badan: 75, tekanan_darah: "140/90", status: "berbahaya" },
];

const SESI_DEMO = [
  { id: 7, tanggal: "2026-10-10", lokasi: "Balai Kelurahan", peserta_hadir: 22, peserta_target: 25 },
  { id: 8, tanggal: "2026-10-17", lokasi: "Balai Kelurahan", peserta_hadir: 24, peserta_target: 25 },
  { id: 9, tanggal: "2026-11-10", lokasi: "Balai Kelurahan", peserta_hadir: 0, peserta_target: 25, status: "akan_datang" },
];

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const program = PROGRAM_DETAIL; // Di production: fetch dari API
  const [tab, setTab] = useState<"detail" | "peserta" | "sesi" | "pencapaian">("detail");

  const persentaseKehadiran = Math.round((SESI_DEMO.filter((s) => s.peserta_hadir > 0).reduce((sum, s) => sum + s.peserta_hadir, 0) / (2 * 25)) * 100);

  return (
    <AppShell greet={`${program.nama}`}>
      {/* Header program */}
      <section>
        <div className="app-section-title">
          <Link href="/program" className="text-sm" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Icon name="chevron-left" size={16} /> Kembali
          </Link>
        </div>

        <div className="card">
          <div className="row-between mb-12">
            <div>
              <h2 className="text-lg fw-600 mb-4">{program.nama}</h2>
              <p className="text-sm text-muted mb-8">{program.deskripsi}</p>
              <div className="text-sm">
                <div className="mb-4">
                  <strong>Tujuan:</strong> {program.tujuan}
                </div>
                <div className="mb-4">
                  <strong>Penanggung Jawab:</strong> {program.kader.name}
                </div>
                <div>
                  <strong>Periode:</strong> Mulai {tanggal(program.mulai, "short")}
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge tone={program.status === "berjalan" ? "safe" : "warning"}>{program.status}</Badge>
            </div>
          </div>

          {/* Progress ringkas */}
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="card card-flat">
              <div className="tiny">Peserta Target</div>
              <div className="metric-val">{angka(program.peserta_target)}</div>
              <div className="tiny mt-4">Terdaftar: {angka(program.peserta_aktif)}</div>
            </div>
            <div className="card card-flat">
              <div className="tiny">Sesi Terlaksana</div>
              <div className="metric-val">{program.sesi_terlaksana}/{program.sesi_rencana}</div>
              <div className="tiny mt-4">Kehadiran: {persentaseKehadiran}%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab navigation */}
      <section>
        <div className="tabs mt-12" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
          {[
            { key: "detail", label: "Detail", icon: "info" },
            { key: "peserta", label: "Peserta", icon: "users", badge: PESERTA_DEMO.length },
            { key: "sesi", label: "Sesi", icon: "calendar", badge: SESI_DEMO.length },
            { key: "pencapaian", label: "Pencapaian", icon: "trophy" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className="tab"
              style={{
                padding: "12px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                borderBottom: tab === t.key ? "2px solid var(--primary)" : "transparent",
                color: tab === t.key ? "var(--primary)" : "var(--muted-foreground)",
                fontSize: "14px",
                fontWeight: tab === t.key ? 600 : 400,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name={t.icon as any} size={14} /> {t.label} {t.badge ? <Badge tone="safe">{t.badge}</Badge> : ""}
            </button>
          ))}
        </div>
      </section>

      {/* Tab: Detail */}
      {tab === "detail" && (
        <section>
          <div className="card mt-12">
            <div className="li">
              <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
                <Icon name="info" size={18} />
              </span>
              <div className="li-main">
                <strong>Deskripsi Program</strong>
                <span className="tiny mt-4">{program.deskripsi}</span>
              </div>
            </div>
            <div className="li">
              <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <Icon name="target" size={18} />
              </span>
              <div className="li-main">
                <strong>Tujuan Program</strong>
                <span className="tiny mt-4">{program.tujuan}</span>
              </div>
            </div>
            <div className="li">
              <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                <Icon name="user" size={18} />
              </span>
              <div className="li-main">
                <strong>Penanggung Jawab</strong>
                <span className="tiny mt-4">{program.kader.name}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tab: Peserta */}
      {tab === "peserta" && (
        <section>
          <div className="card mt-12">
            {PESERTA_DEMO.map((p) => (
              <div className="li" key={p.id}>
                <span
                  className="li-ico"
                  style={{
                    background: p.status === "normal" ? "var(--success-bg)" : p.status === "waspada" ? "var(--warning-bg)" : "var(--danger-bg)",
                    color: p.status === "normal" ? "var(--success)" : p.status === "waspada" ? "var(--warning)" : "var(--danger)",
                  }}
                >
                  <Icon name="user" size={18} />
                </span>
                <div className="li-main">
                  <strong>{p.nama}</strong>
                  <span className="tiny">
                    Usia kehamilan: {p.usia_kehamilan} • BB: {p.berat_badan} kg • TD: {p.tekanan_darah}
                  </span>
                </div>
                <Badge tone={p.status === "normal" ? "safe" : p.status === "waspada" ? "warning" : "danger"}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Sesi */}
      {tab === "sesi" && (
        <section>
          <div className="card mt-12">
            {SESI_DEMO.map((s) => (
              <div className="li" key={s.id}>
                <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                  <Icon name="calendar-check" size={18} />
                </span>
                <div className="li-main">
                  <strong>{tanggal(s.tanggal, "day")}</strong>
                  <span className="tiny">{s.lokasi}</span>
                </div>
                <div className="text-right">
                  <div className="tiny fw-600">
                    {s.peserta_hadir}/{s.peserta_target}
                  </div>
                  <div className="tiny">peserta</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Pencapaian */}
      {tab === "pencapaian" && (
        <section>
          <div className="card mt-12">
            <div className="li">
              <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <Icon name="check-circle" size={18} />
              </span>
              <div className="li-main">
                <strong>Pencapaian Target Peserta</strong>
                <span className="tiny">{persentaseKehadiran}% dari target</span>
              </div>
              <strong>{program.peserta_aktif}/{program.peserta_target}</strong>
            </div>
            <div className="li">
              <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                <Icon name="calendar" size={18} />
              </span>
              <div className="li-main">
                <strong>Realisasi Sesi</strong>
                <span className="tiny">Sesi terlaksana dari rencana</span>
              </div>
              <strong>
                {program.sesi_terlaksana}/{program.sesi_rencana}
              </strong>
            </div>
            <div className="li">
              <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <Icon name="users-check" size={18} />
              </span>
              <div className="li-main">
                <strong>Kehadiran Peserta</strong>
                <span className="tiny">Rerata kehadiran per sesi</span>
              </div>
              <strong>{persentaseKehadiran}%</strong>
            </div>
            <div className="li">
              <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                <Icon name="alert-circle" size={18} />
              </span>
              <div className="li-main">
                <strong>Peserta Waspada/Berbahaya</strong>
                <span className="tiny">Perlu tindak lanjut</span>
              </div>
              <strong>{PESERTA_DEMO.filter((p) => p.status !== "normal").length}</strong>
            </div>
          </div>
        </section>
      )}

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Detail program diperbarui dari pencatatan kader di lapangan.
      </p>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { tanggal, jam } from "@/lib/format";

const SESI_DETAIL = {
  id: 7,
  tanggal: "2026-10-10",
  jam_mulai: "09:00",
  jam_selesai: "11:00",
  lokasi: "Balai Kelurahan Cilandak",
  alamat: "Jl. Pendidikan No. 123, Jakarta Selatan",
  pembimbing: "Bidan Sri",
  topik: "Pemeriksaan Kesehatan & Edukasi Gizi Ibu Hamil",
  materi_pokok: [
    "Pentingnya pemeriksaan rutin saat kehamilan",
    "Asupan nutrisi yang tepat untuk ibu hamil",
    "Tanda bahaya kehamilan dan kapan harus ke rumah sakit",
    "Persiapan persalinan yang aman",
  ],
  peserta_target: 25,
  peserta_hadir: 22,
  peserta_absen: 3,
  status: "selesai",
};

const PESERTA_HADIR = [
  { id: 1, nama: "Ibu Siti", jam_hadir: "09:05", catatan: "Normal" },
  { id: 2, nama: "Ibu Rina", jam_hadir: "09:15", catatan: "Terlambat 15 min" },
  { id: 3, nama: "Ibu Ayu", jam_hadir: "09:02", catatan: "Normal" },
  { id: 4, nama: "Ibu Dina", jam_hadir: null, catatan: "Absen" },
];

export default function SesiDetailPage({ params }: { params: { id: string; sesiId: string } }) {
  const [tab, setTab] = useState<"detail" | "peserta" | "materi">("detail");
  const persentaseKehadiran = Math.round((SESI_DETAIL.peserta_hadir / SESI_DETAIL.peserta_target) * 100);

  return (
    <AppShell noFab>
      {/* Breadcrumb */}
      <div className="app-section-title mb-12">
        <Link href={`/program/${params.id}`} className="text-sm" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="chevron-left" size={16} /> Kembali ke Program
        </Link>
      </div>

      {/* Header sesi */}
      <div className="card mb-16">
        <div className="row-between mb-12">
          <div>
            <h1 className="h3">Sesi {tanggal(SESI_DETAIL.tanggal, "short")}</h1>
            <p className="tiny text-muted">
              {jam(SESI_DETAIL.jam_mulai)} - {jam(SESI_DETAIL.jam_selesai)}
            </p>
          </div>
          <Badge tone={SESI_DETAIL.status === "selesai" ? "safe" : "warning"}>
            {SESI_DETAIL.status === "selesai" ? "Selesai" : "Akan Datang"}
          </Badge>
        </div>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <div>
            <div className="tiny">Pembimbing</div>
            <div className="text-sm fw-600 mt-4">{SESI_DETAIL.pembimbing}</div>
          </div>
          <div>
            <div className="tiny">Lokasi</div>
            <div className="text-sm fw-600 mt-4">{SESI_DETAIL.lokasi}</div>
          </div>
        </div>

        <div className="mt-12">
          <div className="tiny">Alamat Lengkap</div>
          <div className="text-sm mt-4">{SESI_DETAIL.alamat}</div>
        </div>

        {/* Ringkasan kehadiran */}
        <div className="grid grid-3 mt-16" style={{ gap: 12 }}>
          <div className="card card-flat">
            <div className="tiny">Target Peserta</div>
            <div className="metric-val">{SESI_DETAIL.peserta_target}</div>
          </div>
          <div className="card card-flat">
            <div className="tiny">Hadir</div>
            <div className="metric-val text-safe">{SESI_DETAIL.peserta_hadir}</div>
          </div>
          <div className="card card-flat">
            <div className="tiny">Kehadiran</div>
            <div className="metric-val">{persentaseKehadiran}%</div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="tabs mt-12" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
        {[
          { key: "detail", label: "Detail", icon: "info" },
          { key: "peserta", label: "Peserta", icon: "users" },
          { key: "materi", label: "Materi", icon: "file-text" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as any)}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              padding: "8px 12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderBottom: tab === t.key ? "3px solid var(--primary)" : "none",
              color: tab === t.key ? "var(--primary)" : "var(--muted-foreground)",
              fontSize: 14,
              fontWeight: tab === t.key ? 600 : 400,
            }}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Detail */}
      {tab === "detail" && (
        <div className="card mt-12">
          <div className="app-section-title mb-12">
            <h2>Informasi Sesi</h2>
          </div>

          <dl className="dl">
            <div>
              <dt>Topik</dt>
              <dd>{SESI_DETAIL.topik}</dd>
            </div>
            <div>
              <dt>Tanggal & Waktu</dt>
              <dd>
                {tanggal(SESI_DETAIL.tanggal, "long")} • {jam(SESI_DETAIL.jam_mulai)} - {jam(SESI_DETAIL.jam_selesai)}
              </dd>
            </div>
            <div>
              <dt>Lokasi</dt>
              <dd>
                <div>{SESI_DETAIL.lokasi}</div>
                <div className="text-xs mt-4">{SESI_DETAIL.alamat}</div>
              </dd>
            </div>
            <div>
              <dt>Pembimbing</dt>
              <dd>{SESI_DETAIL.pembimbing}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone={SESI_DETAIL.status === "selesai" ? "safe" : "warning"}>
                  {SESI_DETAIL.status === "selesai" ? "Selesai" : "Akan Datang"}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Tab: Peserta */}
      {tab === "peserta" && (
        <div className="card mt-12">
          <div className="app-section-title mb-12">
            <h2>Kehadiran Peserta</h2>
          </div>

          <div style={{ marginBottom: 12 }} className="text-sm">
            <strong>{SESI_DETAIL.peserta_hadir}</strong> dari <strong>{SESI_DETAIL.peserta_target}</strong> peserta hadir (
            <strong>{persentaseKehadiran}%</strong>)
          </div>

          <div style={{ display: "grid", gap: 0 }}>
            {PESERTA_HADIR.map((p, idx) => (
              <div
                key={p.id}
                className="li"
                style={{
                  borderBottom: idx < PESERTA_HADIR.length - 1 ? "1px solid var(--border)" : "none",
                  background: p.jam_hadir ? "transparent" : "var(--danger-050)",
                }}
              >
                <span
                  className="li-ico"
                  style={{
                    background: p.jam_hadir ? "var(--success-bg)" : "var(--danger-bg)",
                    color: p.jam_hadir ? "var(--success)" : "var(--danger)",
                  }}
                >
                  <Icon name={p.jam_hadir ? "check-circle" : "x-circle"} size={18} />
                </span>
                <div className="li-main">
                  <strong>{p.nama}</strong>
                  <span className="tiny">{p.catatan}</span>
                </div>
                {p.jam_hadir && <div className="text-xs fw-600">Jam {p.jam_hadir}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Materi */}
      {tab === "materi" && (
        <div className="card mt-12">
          <div className="app-section-title mb-12">
            <h2>Materi Pokok</h2>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {SESI_DETAIL.materi_pokok.map((m, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  background: "var(--muted-050)",
                  borderRadius: 8,
                  borderLeft: "3px solid var(--primary)",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 24, color: "var(--primary)" }}>
                  <strong>{idx + 1}.</strong>
                </div>
                <div className="text-sm">{m}</div>
              </div>
            ))}
          </div>

          <Button type="button" variant="ghost" style={{ marginTop: 16 }} icon="download">
            Download Materi (PDF)
          </Button>
        </div>
      )}

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Data sesi demo — nanti dari server real-time.
      </p>
    </AppShell>
  );
}

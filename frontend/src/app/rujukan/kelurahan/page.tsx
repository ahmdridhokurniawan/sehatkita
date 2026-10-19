"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { dummyRujukan } from "@/lib/dummy";
import { tanggal, angka } from "@/lib/format";

const LABEL_STATUS_RUJUKAN: Record<string, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  tertangani: "Tertangani",
  ditolak: "Ditolak",
  belum_ditindaklanjuti: "Belum Tindak Lanjut",
};

const STATUS_TONE: Record<string, "safe" | "warning" | "danger"> = {
  baru: "danger",
  dihubungi: "warning",
  tertangani: "safe",
  ditolak: "danger",
  belum_ditindaklanjuti: "warning",
};

export default function RujakanKelurahanPage() {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const rujukan = filterStatus ? dummyRujukan.filter((r) => r.status === filterStatus) : dummyRujukan;

  return (
    <AppShell greet="Rujukan Kelurahan">
      {/* Filter status */}
      <section>
        <div className="app-section-title">
          <h2>Status Rujukan</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          {[
            { key: "baru" as const, label: "Baru", tone: "danger" as const },
            { key: "dihubungi" as const, label: "Dihubungi", tone: "warning" as const },
            { key: "tertangani" as const, label: "Tertangani", tone: "safe" as const },
          ].map((s) => (
            <div
              key={s.key}
              className="card card-flat li-hover"
              style={{
                cursor: "pointer",
                border: filterStatus === s.key ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: filterStatus === s.key ? "var(--primary-050)" : "transparent",
              }}
              onClick={() => setFilterStatus(filterStatus === s.key ? null : s.key)}
            >
              <div className="row-between">
                <span className="tiny fw-600">{s.label}</span>
                <Badge tone={s.tone}>{dummyRujukan.filter((r) => r.status === s.key).length}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Daftar rujukan */}
      <section>
        <div className="app-section-title">
          <h2>Daftar Rujukan {filterStatus ? `(${LABEL_STATUS_RUJUKAN[filterStatus]})` : ""}</h2>
          <button className="text-sm" onClick={() => setFilterStatus(null)} style={{ textDecoration: filterStatus ? "underline" : "none", cursor: "pointer", background: "none", border: "none", color: "var(--primary)" }}>
            {filterStatus ? "Bersihkan filter" : ""}
          </button>
        </div>

        <div className="card mt-12">
          {rujukan.length ? (
            rujukan.map((r) => (
              <Link href={`/rujukan/${r.id}`} key={r.id} className="li li-hover" style={{ textDecoration: "none", color: "inherit" }}>
                <span
                  className="li-ico"
                  style={{
                    background: STATUS_TONE[r.status] === "danger" ? "var(--danger-bg)" : STATUS_TONE[r.status] === "warning" ? "var(--warning-bg)" : "var(--success-bg)",
                    color: STATUS_TONE[r.status] === "danger" ? "var(--danger)" : STATUS_TONE[r.status] === "warning" ? "var(--warning)" : "var(--success)",
                  }}
                >
                  <Icon name="send" size={18} />
                </span>
                <div className="li-main">
                  <strong>{r.faskes.nama}</strong>
                  <span className="tiny">{r.alasan}</span>
                  <span className="tiny">
                    Dibuat: {tanggal(r.created_at, "short")}
                    {r.ditangani_oleh ? ` • Ditangani: ${r.ditangani_oleh.name}` : " • Belum ditangani"}
                  </span>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{LABEL_STATUS_RUJUKAN[r.status]}</Badge>
              </Link>
            ))
          ) : (
            <div className="text-center text-muted py-16">
              <Icon name="inbox" size={24} />
              <p className="tiny mt-8">Tidak ada rujukan dengan status ini</p>
            </div>
          )}
        </div>
      </section>

      {/* Statistik rujukan */}
      <section>
        <div className="app-section-title">
          <h2>Analisis Rujukan</h2>
        </div>
        <div className="card mt-12">
          <div className="li">
            <div className="li-main">
              <strong>Total Rujukan</strong>
              <span className="tiny">Semua rujukan di kelurahan</span>
            </div>
            <strong>{angka(dummyRujukan.length)}</strong>
          </div>
          <div className="li">
            <div className="li-main">
              <strong>Rerata Waktu Penanganan</strong>
              <span className="tiny">Dari dibuat hingga selesai</span>
            </div>
            <strong>3.2 hari</strong>
          </div>
          <div className="li">
            <div className="li-main">
              <strong>Persentase Tertangani</strong>
              <span className="tiny">Rujukan yang sudah ditindaklanjuti</span>
            </div>
            <strong>67%</strong>
          </div>
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Rujukan dimonitor untuk memastikan masyarakat mendapat penanganan tepat.
      </p>
    </AppShell>
  );
}

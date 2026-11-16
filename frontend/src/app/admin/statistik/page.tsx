"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import TombolKembaliAdmin from "@/components/admin/TombolKembaliAdmin";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Donut from "@/components/charts/Donut";
import { Loading, ErrorState } from "@/components/ui/Empty";
import { admin as adminApi, ApiError } from "@/lib/api";
import { angka } from "@/lib/format";
import { useMinLoading } from "@/hooks/useMinLoading";
import type { AdminStatistik } from "@/types";

type AdminStatistikEkstra = AdminStatistik & {
  new_catatan_7d?: number;
  total_audit_logs_7d?: number;
};

export default function AdminStatistikPage() {
  const [stats, setStats] = useState<AdminStatistikEkstra | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string>("");

  async function muat() {
    setLoading(true);
    try {
      const res = await adminApi.statistik();
      setStats(res);
      setError("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal muat statistik";
      setError(msg);
      console.error("Fetch statistik:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch statistik on mount
  useEffect(() => {
    let aktif = true;
    adminApi
      .statistik()
      .then((res) => {
        if (!aktif) return;
        setStats(res);
        setError("");
      })
      .catch((err) => {
        if (!aktif) return;
        const msg = err instanceof ApiError ? err.message : "Gagal muat statistik";
        setError(msg);
        console.error("Fetch statistik:", err);
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  const kpiItems = stats
    ? [
        {
          id: "users",
          label: "Total Pengguna",
          value: angka(stats.total_users || 0),
          subtitle: `${angka(stats.users_by_role?.user || 0)} warga · ${angka(stats.users_by_role?.kader || 0)} kader`,
        },
        {
          id: "catatan",
          label: "Catatan Kesehatan",
          value: angka(stats.total_catatan || 0),
          subtitle: stats.avg_imt ? `Rata-rata IMT ${stats.avg_imt.toFixed(1)}` : "Seluruh catatan masuk",
        },
        {
          id: "rujukan",
          label: "Total Rujukan",
          value: angka(stats.total_rujukan || 0),
          subtitle: `${angka(stats.rujukan_by_status?.baru || 0)} baru · ${angka(stats.rujukan_by_status?.selesai || 0)} selesai`,
        },
        {
          id: "program",
          label: "Tantangan Aktif",
          value: angka(stats.total_program || 0),
          subtitle: `${angka(stats.total_program_participants || 0)} peserta terdaftar`,
        },
      ]
    : [];

  const segmenPengguna = stats
    ? [
        { label: "Warga", value: stats.users_by_role?.user || 0, color: "var(--primary)" },
        { label: "Kader", value: stats.users_by_role?.kader || 0, color: "var(--info, #0284c7)" },
        { label: "Admin Kelurahan", value: stats.users_by_role?.admin_kelurahan || 0, color: "var(--warning)" },
      ].filter((s) => s.value > 0)
    : [];

  const segmenRujukan = stats
    ? [
        { label: "Baru", value: stats.rujukan_by_status?.baru || 0, color: "var(--danger)" },
        { label: "Diproses", value: stats.rujukan_by_status?.dihubungi || 0, color: "var(--warning)" },
        { label: "Selesai", value: stats.rujukan_by_status?.selesai || 0, color: "var(--safe)" },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <AppShell noFab roles={["super_admin"]}>
      <TombolKembaliAdmin />
      <div className="row-between wrap gap-12 mb-16">
        <div>
          <h1 className="h3">Statistik Sistem</h1>
          <p className="tiny">Ringkasan metrik dan komposisi data platform SehatKita secara real-time.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={muat} disabled={loading}>
          <Icon name="refresh" size={15} /> Muat Ulang
        </button>
      </div>

      {tampilLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : stats ? (
        <>
          <div className="kpi-strip-flat mb-16">
            {kpiItems.map((item) => (
              <div key={item.id} className="kpi-strip-item">
                <span className="kpi-strip-label">{item.label}</span>
                <strong className="kpi-strip-val">{item.value}</strong>
                <span className="kpi-strip-sub">{item.subtitle}</span>
              </div>
            ))}
          </div>

          {/* 1 Panel Terpadu: 2 Grafik Donut + 2 Strip Sejajar + Strip Aktivitas 7 Hari */}
          <section className="card sa-board">
            <div className="sa-board-cols is-even">
              <div className="sa-col">
                <div className="sa-panel-head">
                  <div>
                    <h2 className="sa-panel-title">Komposisi Peran Pengguna</h2>
                    <p className="sa-panel-sub">Proporsi akun aktif berdasarkan peran sistem</p>
                  </div>
                  <Badge tone="primary">{angka(stats.total_users || 0)} akun</Badge>
                </div>
                {segmenPengguna.length ? (
                  <Donut
                    segments={segmenPengguna}
                    centerLabel="Pengguna"
                    centerValue={angka(stats.total_users || 0)}
                  />
                ) : (
                  <p className="tiny center py-16">Belum ada data pengguna.</p>
                )}
              </div>

              <div className="sa-col sa-col-split">
                <div className="sa-panel-head">
                  <div>
                    <h2 className="sa-panel-title">Distribusi Status Rujukan</h2>
                    <p className="sa-panel-sub">Proporsi rujukan masuk, diproses, dan selesai</p>
                  </div>
                  <Badge tone="warning">{angka(stats.total_rujukan || 0)} kasus</Badge>
                </div>
                {segmenRujukan.length ? (
                  <Donut
                    segments={segmenRujukan}
                    centerLabel="Rujukan"
                    centerValue={angka(stats.total_rujukan || 0)}
                  />
                ) : (
                  <p className="tiny center py-16">Belum ada data rujukan.</p>
                )}
              </div>
            </div>

            <div className="sa-board-cols is-even board-band">
              <div className="sa-col">
                <div className="sa-panel-head">
                  <div>
                    <h3 className="sa-panel-title">Rata-Rata Indikator Klinis</h3>
                    <p className="sa-panel-sub">Akumulasi catatan tervalidasi</p>
                  </div>
                  <Badge tone="safe">Klinis</Badge>
                </div>
                <div className="stat-strip">
                  <div className="stat-cell" style={{ borderLeftColor: "var(--safe)" }}>
                    <span className="stat-cell-label">Rata-rata IMT</span>
                    <strong className="stat-cell-val">{stats.avg_imt ? stats.avg_imt.toFixed(1) : "—"}</strong>
                    <span className="stat-cell-sub">kg/m²</span>
                  </div>
                  <div className="stat-cell" style={{ borderLeftColor: "var(--primary)" }}>
                    <span className="stat-cell-label">Sistol</span>
                    <strong className="stat-cell-val">{stats.avg_sistol ? stats.avg_sistol.toFixed(0) : "—"}</strong>
                    <span className="stat-cell-sub">mmHg</span>
                  </div>
                  <div className="stat-cell" style={{ borderLeftColor: "var(--info)" }}>
                    <span className="stat-cell-label">Diastol</span>
                    <strong className="stat-cell-val">{stats.avg_diastol ? stats.avg_diastol.toFixed(0) : "—"}</strong>
                    <span className="stat-cell-sub">mmHg</span>
                  </div>
                </div>
              </div>

              <div className="sa-col sa-col-split">
                <div className="sa-panel-head">
                  <div>
                    <h3 className="sa-panel-title">Ringkasan Tantangan</h3>
                    <p className="sa-panel-sub">Partisipasi warga dan status pelaksanaan</p>
                  </div>
                  <Badge tone="info">{angka(stats.total_program || 0)} tantangan</Badge>
                </div>
                <div className="stat-strip">
                  <div className="stat-cell" style={{ borderLeftColor: "var(--info)" }}>
                    <span className="stat-cell-label">Peserta</span>
                    <strong className="stat-cell-val">{angka(stats.total_program_participants || 0)}</strong>
                    <span className="stat-cell-sub">terdaftar</span>
                  </div>
                  <div className="stat-cell" style={{ borderLeftColor: "var(--primary)" }}>
                    <span className="stat-cell-label">Berjalan</span>
                    <strong className="stat-cell-val">{angka(stats.program_by_status?.berjalan || 0)}</strong>
                    <span className="stat-cell-sub">tantangan aktif</span>
                  </div>
                  <div className="stat-cell" style={{ borderLeftColor: "var(--safe)" }}>
                    <span className="stat-cell-label">Selesai</span>
                    <strong className="stat-cell-val">{angka(stats.program_by_status?.selesai || 0)}</strong>
                    <span className="stat-cell-sub">tantangan tuntas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sa-col board-band">
              <div className="sa-panel-head">
                <div>
                  <h3 className="sa-panel-title">Aktivitas 7 Hari Terakhir</h3>
                  <p className="sa-panel-sub">Pergerakan akun, pencatatan, rujukan, dan log sistem</p>
                </div>
                <Badge tone="default">7 hari terakhir</Badge>
              </div>
              <div className="stat-strip is-4">
                <div className="stat-cell" style={{ borderLeftColor: "var(--primary)" }}>
                  <span className="stat-cell-label">Pengguna Baru</span>
                  <strong className="stat-cell-val">{angka(stats.new_users_7d || 0)}</strong>
                  <span className="stat-cell-sub">akun terdaftar</span>
                </div>
                <div className="stat-cell" style={{ borderLeftColor: "var(--safe)" }}>
                  <span className="stat-cell-label">Catatan Kesehatan</span>
                  <strong className="stat-cell-val">+{angka(stats.new_catatan_7d || 0)}</strong>
                  <span className="stat-cell-sub">input warga/kader</span>
                </div>
                <div className="stat-cell" style={{ borderLeftColor: "var(--danger)" }}>
                  <span className="stat-cell-label">Rujukan Baru</span>
                  <strong className="stat-cell-val">{angka(stats.new_rujukan_7d || 0)}</strong>
                  <span className="stat-cell-sub">kasus masuk</span>
                </div>
                <div className="stat-cell" style={{ borderLeftColor: "var(--info)" }}>
                  <span className="stat-cell-label">Aktivitas Audit</span>
                  <strong className="stat-cell-val">{angka(stats.total_audit_logs_7d || 0)}</strong>
                  <span className="stat-cell-sub">log tercatat</span>
                </div>
              </div>
            </div>
          </section>

          <div
            className="tiny mt-16 mb-16"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}
          >
            <Icon name="info" size={14} className="shrink-0" />
            <span>Angka dihitung ulang setiap halaman statistik dibuka atau dimuat ulang.</span>
          </div>
        </>
      ) : (
        <div className="card">
          <p className="tiny center">Tidak ada data statistik.</p>
        </div>
      )}
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { admin as adminApi, ApiError } from "@/lib/api";

export default function AdminStatistikPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch statistik on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
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
    })();
  }, []);

  return (
    <AppShell noFab roles={["super_admin"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Statistik Sistem</h1>
          <p className="tiny">Dashboard statistik keseluruhan platform.</p>
        </div>
      </div>

      {error && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="row gap-10 items-center">
            <span className="text-danger">
              <Icon name="alert-circle" size={18} />
            </span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="tiny center">Memuat…</p>
        </div>
      ) : stats ? (
        <>
          {/* Users Stats */}
          <div className="card mb-12">
            <div className="app-section-title mb-12">
              <h2>Pengguna</h2>
            </div>

            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="metric">
                <span className="metric-val">{stats.total_users || 0}</span>
                <span className="tiny">Total Pengguna</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.users_by_role?.user || 0}</span>
                <span className="tiny">User</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.users_by_role?.kader || 0}</span>
                <span className="tiny">Kader</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.users_by_role?.admin_kelurahan || 0}</span>
                <span className="tiny">Admin Kelurahan</span>
              </div>
            </div>
          </div>

          {/* Rujukan Stats */}
          <div className="card mb-12">
            <div className="app-section-title mb-12">
              <h2>Rujukan</h2>
            </div>

            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="metric">
                <span className="metric-val">{stats.total_rujukan || 0}</span>
                <span className="tiny">Total</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.rujukan_by_status?.baru || 0}</span>
                <span className="tiny">Baru</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.rujukan_by_status?.dihubungi || 0}</span>
                <span className="tiny">Dihubungi</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.rujukan_by_status?.tertangani || 0}</span>
                <span className="tiny">Tertangani</span>
              </div>
            </div>
          </div>

          {/* Program Stats */}
          <div className="card mb-12">
            <div className="app-section-title mb-12">
              <h2>Program</h2>
            </div>

            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="metric">
                <span className="metric-val">{stats.total_program || 0}</span>
                <span className="tiny">Program</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.total_program_participants || 0}</span>
                <span className="tiny">Peserta</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.program_by_status?.berjalan || 0}</span>
                <span className="tiny">Berjalan</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.program_by_status?.selesai || 0}</span>
                <span className="tiny">Selesai</span>
              </div>
            </div>
          </div>

          {/* Health Stats */}
          <div className="card mb-12">
            <div className="app-section-title mb-12">
              <h2>Catatan Kesehatan</h2>
            </div>

            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="metric">
                <span className="metric-val">{stats.total_catatan || 0}</span>
                <span className="tiny">Catatan</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.avg_imt?.toFixed(1) || "—"}</span>
                <span className="tiny">Rata-rata BMI</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.avg_sistol?.toFixed(0) || "—"}</span>
                <span className="tiny">Sistol (mmHg)</span>
              </div>
              <div className="metric">
                <span className="metric-val">{stats.avg_diastol?.toFixed(0) || "—"}</span>
                <span className="tiny">Diastol (mmHg)</span>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="card">
            <div className="app-section-title mb-12">
              <h2>Aktivitas 7 Hari</h2>
            </div>

            <dl className="dl">
              <div>
                <dt>Pengguna Baru</dt>
                <dd>
                  <strong>{stats.new_users_7d || 0}</strong>
                </dd>
              </div>
              <div>
                <dt>Rujukan Baru</dt>
                <dd>
                  <strong>{stats.new_rujukan_7d || 0}</strong>
                </dd>
              </div>
              <div>
                <dt>Catatan Kesehatan</dt>
                <dd>
                  <strong>{stats.new_catatan_7d || 0}</strong>
                </dd>
              </div>
              <div>
                <dt>Aktivitas Log</dt>
                <dd>
                  <strong>{stats.total_audit_logs_7d || 0}</strong>
                </dd>
              </div>
            </dl>
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Angka dihitung ulang setiap halaman dibuka.
          </p>
        </>
      ) : (
        <div className="card">
          <p className="tiny center">Tidak ada data statistik.</p>
        </div>
      )}
    </AppShell>
  );
}

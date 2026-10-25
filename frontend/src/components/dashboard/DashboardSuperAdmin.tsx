"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { admin as adminApi, ApiError } from "@/lib/api";
import { relatif } from "@/lib/format";
import type { User, AdminStatistik, LogAudit } from "@/types";

export default function DashboardSuperAdmin({ user }: { user: User }) {
  const [stats, setStats] = useState<AdminStatistik | null>(null);
  const [log, setLog] = useState<LogAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;

    (async () => {
      try {
        setLoading(true);
        // §15 — hanya super_admin yang boleh akses kedua endpoint ini.
        const [s, l] = await Promise.all([adminApi.statistik(), adminApi.logAudit.list({})]);
        if (batal) return;
        setStats(s);
        setLog(l);
        setError(null);
      } catch (err) {
        if (batal) return;
        setError((err as ApiError).message || "Gagal memuat statistik sistem");
      } finally {
        if (!batal) setLoading(false);
      }
    })();

    return () => {
      batal = true;
    };
  }, []);

  return (
    <AppShell greet="Halo Super Admin">
      {/* Ringkasan sistem — angka dari GET /admin/statistik */}
      <section>
        <div className="app-section-title">
          <h2>Statistik Sistem</h2>
          <Link href="/admin/statistik">Detail</Link>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="metric">
            <span className="metric-name">
              <Icon name="map-pin" size={14} /> Wilayah
            </span>
            <span className="metric-val">{loading ? "—" : stats?.total_wilayah ?? 0}</span>
            <div className="tiny mt-4">Kecamatan + kelurahan</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="home" size={14} /> Faskes
            </span>
            <span className="metric-val">{loading ? "—" : stats?.total_faskes ?? 0}</span>
            <div className="tiny mt-4">Terdaftar</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="users" size={14} /> Pengguna
            </span>
            <span className="metric-val">{loading ? "—" : stats?.total_users ?? 0}</span>
            <div className="tiny mt-4">Baru 7 hari: {stats?.new_users_7d ?? 0}</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="clipboard" size={14} /> Pencatatan
            </span>
            <span className="metric-val">{loading ? "—" : stats?.total_catatan ?? 0}</span>
            <div className="tiny mt-4">Baru 7 hari: {stats?.new_catatan_7d ?? 0}</div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="alert alert-danger mt-16">
          <Icon name="alert-circle" />
          <div>{error}</div>
        </div>
      ) : null}

      {/* Master data — halaman /admin/* */}
      <section>
        <div className="app-section-title">
          <h2>Master Data</h2>
        </div>
        <div className="card mt-12">
          <Link href="/admin/pengguna" className="li">
            <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
              <Icon name="users" size={18} />
            </span>
            <div className="li-main">
              <strong>Manajemen Pengguna</strong>
              <span className="tiny">Kelola akun, role, dan penugasan kader</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
          <Link href="/admin/faskes" className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="home" size={18} />
            </span>
            <div className="li-main">
              <strong>Manajemen Faskes</strong>
              <span className="tiny">Puskesmas, klinik, rumah sakit</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
          <Link href="/admin/indikator" className="li">
            <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <Icon name="sliders" size={18} />
            </span>
            <div className="li-main">
              <strong>Indikator &amp; Ambang Kategori</strong>
              <span className="tiny">Atur indikator, interval skrining, dan ambang risiko</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
          <Link href="/admin/log-audit" className="li">
            <span className="li-ico" style={{ background: "var(--muted-bg)", color: "var(--muted)" }}>
              <Icon name="shield" size={18} />
            </span>
            <div className="li-main">
              <strong>Log Audit</strong>
              <span className="tiny">Jejak akses data individu oleh super admin</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Aktivitas terbaru — GET /admin/log-audit */}
      <section>
        <div className="app-section-title">
          <h2>Aktivitas Terbaru</h2>
          <Link href="/admin/log-audit">Lihat semua</Link>
        </div>
        <div className="card mt-12">
          {loading ? (
            <EmptyState title="Memuat..." desc="Mengambil log audit dari server." />
          ) : log.length ? (
            log.slice(0, 5).map((l) => (
              <div className="li" key={l.id}>
                <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
                  <Icon name="activity" size={18} />
                </span>
                <div className="li-main">
                  <strong className="text-sm">{l.aksi}</strong>
                  <span className="tiny">
                    {l.pengguna?.name || "Sistem"} · {l.model}
                    {l.model_id ? ` #${l.model_id}` : ""}
                  </span>
                </div>
                <div className="li-side">
                  <span className="tiny">{relatif(l.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Belum ada aktivitas tercatat" desc="Log audit akan muncul saat super admin mengakses data individu." />
          )}
        </div>
      </section>

      <section>
        <div className="app-section-title">
          <h2>Status Layanan</h2>
        </div>
        <div className="card mt-12">
          <div className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="check-circle" size={18} />
            </span>
            <div className="li-main">
              <strong>API Backend</strong>
              <span className="tiny">{error ? "Gagal terhubung" : "Merender data nyata"}</span>
            </div>
            <Badge tone={error ? "danger" : "safe"}>{error ? "Gangguan" : "Aktif"}</Badge>
          </div>
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="lock" size={13} /> Akses terbatas: dashboard ini hanya untuk Super Admin. Semua aktivitas dicatat.
      </p>
    </AppShell>
  );
}

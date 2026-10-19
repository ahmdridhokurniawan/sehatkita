"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import type { User } from "@/types";

export default function DashboardSuperAdmin({ user }: { user: User }) {
  const wilayah = user.wilayah?.nama || "Sistem";

  return (
    <AppShell greet={`Halo Super Admin`}>
      {/* Ringkasan Sistem */}
      <section>
        <div className="app-section-title">
          <h2>Statistik Sistem</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="metric">
            <span className="metric-name">
              <Icon name="map-pin" size={14} /> Kecamatan
            </span>
            <span className="metric-val">1</span>
            <div className="tiny mt-4">Landasan Ulin</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="layers" size={14} /> Kelurahan
            </span>
            <span className="metric-val">7</span>
            <div className="tiny mt-4">Terdaftar</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="home" size={14} /> Faskes
            </span>
            <span className="metric-val">12</span>
            <div className="tiny mt-4">Puskesmas + Klinik</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="users" size={14} /> Pengguna
            </span>
            <span className="metric-val">187</span>
            <div className="tiny mt-4">Aktif</div>
          </div>
        </div>
      </section>

      {/* Pengaturan Sistem */}
      <section>
        <div className="app-section-title">
          <h2>Pengaturan Sistem</h2>
        </div>
        <div className="card mt-12">
          <Link href="/pengaturan/wilayah" className="li">
            <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
              <Icon name="map-pin" size={18} />
            </span>
            <div className="li-main">
              <strong>Manajemen Wilayah</strong>
              <span className="tiny">Kelola kecamatan dan kelurahan</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
          <Link href="/pengaturan/faskes" className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="home" size={18} />
            </span>
            <div className="li-main">
              <strong>Manajemen Faskes</strong>
              <span className="tiny">Kelola puskesmas dan klinik</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
          <Link href="/pengaturan/pengguna" className="li">
            <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Icon name="users" size={18} />
            </span>
            <div className="li-main">
              <strong>Manajemen Pengguna</strong>
              <span className="tiny">Kelola akun dan role pengguna</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
          <Link href="/pengaturan/indikator" className="li">
            <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <Icon name="trending-up" size={18} />
            </span>
            <div className="li-main">
              <strong>Manajemen Indikator</strong>
              <span className="tiny">Kelola indikator kesehatan</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
          <Link href="/pengaturan/ambang" className="li">
            <span className="li-ico" style={{ background: "var(--muted-bg)", color: "var(--muted)" }}>
              <Icon name="sliders" size={18} />
            </span>
            <div className="li-main">
              <strong>Manajemen Ambang</strong>
              <span className="tiny">Atur nilai ambang risiko</span>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Status Sistem */}
      <section>
        <div className="app-section-title">
          <h2>Status Sistem</h2>
        </div>
        <div className="card mt-12">
          <div className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="check-circle" size={18} />
            </span>
            <div className="li-main">
              <strong>API Backend</strong>
              <span className="tiny">Koneksi normal</span>
            </div>
            <Badge tone="safe">Aktif</Badge>
          </div>
          <div className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="check-circle" size={18} />
            </span>
            <div className="li-main">
              <strong>Database</strong>
              <span className="tiny">Sinkronisasi normal</span>
            </div>
            <Badge tone="safe">Aktif</Badge>
          </div>
          <div className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="check-circle" size={18} />
            </span>
            <div className="li-main">
              <strong>Cache</strong>
              <span className="tiny">Performa optimal</span>
            </div>
            <Badge tone="safe">Aktif</Badge>
          </div>
        </div>
      </section>

      {/* Audit Log */}
      <section>
        <div className="app-section-title">
          <h2>Aktivitas Terbaru</h2>
          <Link href="/audit">Lihat semua</Link>
        </div>
        <div className="card mt-12">
          <div className="li">
            <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
              <Icon name="user-plus" size={18} />
            </span>
            <div className="li-main">
              <strong>Pengguna baru terdaftar</strong>
              <span className="tiny">Kader Sungai Besar</span>
            </div>
            <span className="tiny">2 jam lalu</span>
          </div>
          <div className="li">
            <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Icon name="edit-3" size={18} />
            </span>
            <div className="li-main">
              <strong>Ambang IMT diubah</strong>
              <span className="tiny">Oleh Super Admin</span>
            </div>
            <span className="tiny">4 jam lalu</span>
          </div>
          <div className="li">
            <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="download-cloud" size={18} />
            </span>
            <div className="li-main">
              <strong>Data ekspor</strong>
              <span className="tiny">Laporan tahunan</span>
            </div>
            <span className="tiny">1 hari lalu</span>
          </div>
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="lock" size={13} /> Akses terbatas: dashboard ini hanya untuk Super Admin. Semua aktivitas dicatat.
      </p>
    </AppShell>
  );
}

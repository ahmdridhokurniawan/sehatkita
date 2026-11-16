"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import GrafikRingkas from "@/components/admin/GrafikRingkas";

const ADMIN_MENU: {
  href: string;
  icon: string;
  label: string;
  desc: string;
  tag: string;
}[] = [
  {
    href: "/admin/pengguna",
    icon: "users",
    label: "Kelola Pengguna",
    desc: "Kelola akun warga, kader posbindu, dan admin kelurahan.",
    tag: "Master",
  },
  {
    href: "/admin/faskes",
    icon: "hospital",
    label: "Kelola Faskes",
    desc: "Atur daftar fasilitas kesehatan, alamat, dan titik peta rujukan.",
    tag: "Master",
  },
  {
    href: "/admin/indikator",
    icon: "activity",
    label: "Indikator & Ambang",
    desc: "Atur parameter cek kesehatan dan batas normal maupun berisiko.",
    tag: "Klinis",
  },
  {
    href: "/admin/statistik",
    icon: "line-chart",
    label: "Statistik Sistem",
    desc: "Ringkasan gabungan lintas kelurahan se-kota tanpa nama pribadi.",
    tag: "Analitik",
  },
  {
    href: "/admin/pengaduan",
    icon: "alert-circle",
    label: "Pengaduan Warga",
    desc: "Tinjau dan beri tanggapan atas keluhan layanan warga.",
    tag: "Layanan",
  },
  {
    href: "/admin/verifikasi",
    icon: "check-circle",
    label: "Verifikasi Catatan",
    desc: "Setujui atau tolak catatan di luar ambang batas yang perlu cek ulang.",
    tag: "Moderasi",
  },
  {
    href: "/peringkat",
    icon: "trophy",
    label: "Peringkat Kelurahan",
    desc: "Pantau klasemen poin aktivitas dan keaktifan warga per wilayah.",
    tag: "Tantangan",
  },
  {
    href: "/admin/log-audit",
    icon: "file-text",
    label: "Log Audit",
    desc: "Riwayat akses data individu dan perubahan penting oleh admin.",
    tag: "Keamanan",
  },
];

export default function AdminPage() {
  return (
    <AppShell noFab roles={["super_admin"]}>
      <div className="gv-head">
        <div>
          <h1 className="gv-head-title">Panel Admin</h1>
          <p className="gv-head-sub">
            Kelola pengguna, faskes, ambang klinis, verifikasi catatan, dan audit aktivitas kota.
          </p>
        </div>

        <div className="gv-head-actions">
          <Badge tone="primary">Super Admin · {ADMIN_MENU.length} Modul</Badge>
        </div>
      </div>

      <GrafikRingkas />

      <section aria-labelledby="judul-menu-admin">
        <div className="row-between wrap gap-8 mb-12">
          <div>
            <h2 id="judul-menu-admin" className="sa-panel-title">Menu Administrasi</h2>
            <p className="sa-panel-sub">Pilih modul pengelolaan master data, layanan, dan pemantauan sistem</p>
          </div>
          <Badge tone="default">{ADMIN_MENU.length} modul</Badge>
        </div>

        <div className="adm-menu-grid">
          {ADMIN_MENU.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              className="adm-menu-card"
              style={{ animationDelay: `${idx * 35}ms` }}
            >
              <div className="gv-kpi-top">
                <span className="gv-kpi-ico">
                  <Icon name={item.icon} size={17} />
                </span>
                <Badge tone="default">{item.tag}</Badge>
              </div>
              <div>
                <h3 className="adm-menu-title">{item.label}</h3>
                <p className="adm-menu-desc">{item.desc}</p>
              </div>
              <span className="adm-menu-foot">
                Buka modul <Icon name="chevron-right" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="gv-quick-bar">
        <span className="tiny">
          <Icon name="shield" size={13} /> Hanya Super Admin yang dapat mengubah master data dan konfigurasi sistem.
        </span>
        <Link href="/dashboard" className="gv-quick-pill">
          <Icon name="home" size={13} /> Kembali ke Beranda
        </Link>
      </div>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
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
      </div>

      <GrafikRingkas />

      <section aria-labelledby="judul-menu-admin">
        <div className="mb-12">
          <h2 id="judul-menu-admin" className="sa-panel-title">Menu Administrasi</h2>
          <p className="sa-panel-sub">Pilih modul pengelolaan master data, layanan, dan pemantauan sistem</p>
        </div>

        <div className="card adm-dir-panel">
          {ADMIN_MENU.map((item) => (
            <Link key={item.href} href={item.href} className="adm-dir-item">
              <span className="adm-dir-ico">
                <Icon name={item.icon} size={17} />
              </span>
              <div className="adm-dir-body">
                <strong>{item.label}</strong>
                <p>{item.desc}</p>
              </div>
              <Icon name="chevron-right" size={16} className="adm-dir-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8">
        Hanya Super Admin yang dapat mengubah master data dan konfigurasi sistem.{" "}
        <Link href="/dashboard" className="text-primary">
          Kembali ke Beranda
        </Link>
      </p>
    </AppShell>
  );
}

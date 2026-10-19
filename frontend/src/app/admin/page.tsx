"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";

const ADMIN_MENU = [
  {
    href: "/admin/pengguna",
    icon: "users",
    label: "Pengguna",
    desc: "Kelola akun kader & admin kelurahan",
  },
  {
    href: "/admin/faskes",
    icon: "hospital",
    label: "Fasilitas Kesehatan",
    desc: "Daftar & kelola faskes rujukan",
  },
  {
    href: "/admin/indikator",
    icon: "activity",
    label: "Indikator Kesehatan",
    desc: "Atur indikator & ambang batas kategori",
  },
  {
    href: "/admin/log-audit",
    icon: "file-text",
    label: "Log Audit",
    desc: "Riwayat aktivitas sistem",
  },
];

export default function AdminPage() {
  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Admin Dashboard</h1>
          <p className="tiny">Master data & system management (super_admin only).</p>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 0 }}>
        {ADMIN_MENU.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className="li"
            style={{
              borderBottom: idx < ADMIN_MENU.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span className="li-ico">
              <Icon name={item.icon} size={18} />
            </span>
            <div className="li-main">
              <strong className="text-sm">{item.label}</strong>
              <span className="tiny">{item.desc}</span>
            </div>
            <span className="li-side">
              <Icon name="chevron-right" size={18} />
            </span>
          </Link>
        ))}
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="shield" size={13} /> Super admin access required.
      </p>
    </AppShell>
  );
}

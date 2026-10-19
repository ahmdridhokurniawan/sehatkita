"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";

const SETELAN_MENU = [
  {
    href: "/setelan/notifikasi",
    icon: "bell",
    label: "Notifikasi",
    desc: "Atur preferensi notifikasi & email",
  },
  {
    href: "/setelan/keamanan",
    icon: "lock",
    label: "Keamanan",
    desc: "Ubah password & atur sesi login",
  },
  {
    href: "/setelan/privasi",
    icon: "shield",
    label: "Privasi",
    desc: "Kelola data pribadi & sharing",
  },
];

export default function SetelanPage() {
  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Pengaturan</h1>
          <p className="tiny">Kelola akun, notifikasi, & keamanan.</p>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 0 }}>
        {SETELAN_MENU.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className="li"
            style={{
              borderBottom: idx < SETELAN_MENU.length - 1 ? "1px solid var(--border)" : "none",
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

      <div className="card mt-16">
        <div className="app-section-title mb-12">
          <h2>Tentang</h2>
        </div>

        <dl className="dl">
          <div>
            <dt>Aplikasi</dt>
            <dd>sehatkita</dd>
          </div>
          <div>
            <dt>Versi</dt>
            <dd>1.0.0 (Beta)</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>2026-10-19</dd>
          </div>
        </dl>

        <div className="mt-12">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              // Logout simulation
              localStorage.removeItem("user_email");
              window.location.href = "/login";
            }}
          >
            <Icon name="log-out" size={15} /> Logout
          </button>
        </div>
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Pengaturan pengguna & keamanan disimpan di server.
      </p>
    </AppShell>
  );
}

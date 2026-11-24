"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { keluarDanKeLogin } from "@/hooks/useUser";

const SETELAN_MENU = [
  {
    href: "/profil",
    icon: "user",
    label: "Profil",
    desc: "Data diri, tinggi badan, dan riwayat keluarga",
  },
  {
    href: "/setelan/privasi",
    icon: "shield",
    label: "Privasi",
    desc: "Visibilitas di peringkat & persetujuan data",
  },
];

export default function SetelanPage() {
  const router = useRouter();
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [keluar, setKeluar] = useState(false);

  async function handleLogout() {
    setKeluar(true);
    setKonfirmasiKeluar(false);
    await keluarDanKeLogin(() => router.push("/login"));
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Pengaturan</h1>
          <p className="tiny">Kelola data diri dan persetujuan privasi.</p>
        </div>
      </div>

      <div className="card">
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

        <div className="divider" />

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
            className="btn btn-sm btn-danger"
            onClick={() => setKonfirmasiKeluar(true)}
          >
            <Icon name="log-out" size={15} /> Keluar
          </button>
        </div>
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Pengaturan pengguna & keamanan disimpan di server.
      </p>

      <Modal
        open={konfirmasiKeluar}
        onClose={() => setKonfirmasiKeluar(false)}
        className="modal-logout"
        size="sm"
        title={
          <span className="logout-modal-heading">
            <span className="logout-modal-icon"><Icon name="log-out" size={21} /></span>
            <span className="logout-modal-title">Keluar</span>
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setKonfirmasiKeluar(false)}
              disabled={keluar}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleLogout}
              disabled={keluar}
              aria-busy={keluar}
            >
              <Icon name="log-out" size={16} />
              {keluar ? "Keluar…" : "Ya, keluar"}
            </button>
          </>
        }
      >
        <div className="logout-modal-copy">
          <p>Apakah kamu yakin ingin keluar dari akun ini?</p>
          <p className="logout-modal-note">
            <Icon name="lock" size={14} /> Kamu perlu masuk lagi untuk mengakses akun.
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}

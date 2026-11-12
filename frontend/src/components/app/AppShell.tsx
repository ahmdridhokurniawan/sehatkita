"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Modal from "@/components/ui/Modal";
import { useUser, clearUserCache } from "@/hooks/useUser";
import { auth as authApi, clearToken } from "@/lib/api";
import { inisial } from "@/lib/format";

type NavItem = { href: string; icon: string; label: string };

const NAV_UTAMA: NavItem[] = [
  { href: "/dashboard", icon: "home", label: "Beranda" },
  { href: "/rekam-medis", icon: "clipboard", label: "Rekam Medis" },
  { href: "/target-kesehatan", icon: "target", label: "Target Kesehatan" },
  { href: "/program", icon: "award", label: "Tantangan" },
  { href: "/peringkat", icon: "trending-up", label: "Peringkat" },
  { href: "/insight", icon: "zap", label: "History" },
  { href: "/insight/panduan", icon: "file-text", label: "Panduan" },
  { href: "/pengaduan", icon: "alert-circle", label: "Pengaduan" },
];

const NAV_DATA: NavItem[] = [
  { href: "/laporan", icon: "bar-chart", label: "Laporan" },
  { href: "/posbindu", icon: "activity", label: "Posbindu" },
  { href: "/rujukan", icon: "send", label: "Rujukan" },
];

const NAV_AKUN: NavItem[] = [{ href: "/profil", icon: "user", label: "Profil" }];

const NAV_ADMIN: NavItem[] = [{ href: "/admin", icon: "shield", label: "Admin" }];

type Props = {
  children: React.ReactNode;
  /** Sapaan di topbar, mis. "Halo" */
  greet?: string;
  /** Sembunyikan tombol FAB */
  noFab?: boolean;
  /** Aksi tombol FAB */
  onFab?: () => void;
  /** Batasi halaman ke role tertentu; role lain diarahkan ke /unauthorized */
  roles?: string[];
};

/**
 * Shell aplikasi — sidebar (desktop), drawer + bottom nav (mobile).
 * Navigasi dikelompokkan supaya tombol tidak menumpuk.
 */
export default function AppShell({ children, noFab, onFab, roles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [keluar, setKeluar] = useState(false);
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [ciut, setCiut] = useState(false);

  async function handleLogout() {
    setKeluar(true);
    try {
      await authApi.logout();
    } catch {
      // token mungkin sudah mati — tetap bersihkan lokal
    } finally {
      clearToken();
      clearUserCache();
      router.replace("/login");
    }
  }
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Tutup drawer setiap pindah halaman
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  const roleTidakCocok = Boolean(roles && user && !roles.includes(user.role));

  useEffect(() => {
    if (roleTidakCocok) router.replace("/unauthorized");
  }, [roleTidakCocok, router]);

  const nama = user?.name || "Pengguna";
  const wilayah = user?.wilayah?.nama || "";
  const role = user?.role || "";

  // Susun menu sesuai peran
  const grup: { judul: string; items: NavItem[] }[] = [];
  if (role === "super_admin") {
    grup.push({ judul: "Menu", items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[2], NAV_UTAMA[3], NAV_UTAMA[4], NAV_UTAMA[5]] });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[0], NAV_DATA[1], NAV_DATA[2]] });
    grup.push({ judul: "Administrasi", items: NAV_ADMIN });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else if (role === "admin_kelurahan") {
    // Admin kelurahan tidak boleh lihat rekam medis individual (privasi, backend 403).
    // Hanya dashboard + konten agregat.
    grup.push({ judul: "Menu", items: [NAV_UTAMA[0], NAV_UTAMA[2], NAV_UTAMA[3], NAV_UTAMA[4], NAV_UTAMA[5]] });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[0], NAV_DATA[1], NAV_DATA[2]] });
    grup.push({ judul: "Layanan", items: [{ href: "/admin/pengaduan", icon: "alert-circle", label: "Pengaduan" }] });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else if (role === "kader") {
    grup.push({ judul: "Menu", items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[2], NAV_UTAMA[3]] });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[1], NAV_DATA[2]] });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else {
    grup.push({ judul: "Menu", items: NAV_UTAMA });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  }

  // Nav bawah hanya 4 item paling penting (mobile)
  const navBawah = grup[0].items.slice(0, 3).concat(grup[grup.length - 1].items[0]);

  const aktif = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && href !== "/insight" && pathname.startsWith(href + "/"));

  if (loading || !user || roleTidakCocok) {
    return (
      <main className="center" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p className="tiny">Memuat…</p>
      </main>
    );
  }

  return (
    <div className={`dash app-dash ${ciut ? "collapsed" : ""} ${drawer ? "drawer-open" : ""}`}>
      {/* ============ SIDEBAR ============ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLockup variant="sm" />
          <div className="txt">
            SehatKita<small>Monitoring PTM</small>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-sm btn-ghost sidebar-collapse-btn"
            aria-label={ciut ? "Perluas sidebar" : "Ciutkan sidebar"}
            title={ciut ? "Perluas sidebar" : "Ciutkan sidebar"}
            onClick={() => setCiut((v) => !v)}
          >
            <Icon name="panel-left" size={17} />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-sm btn-ghost sidebar-close-btn"
            aria-label="Tutup menu"
            onClick={() => setDrawer(false)}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {grup.map((g, gi) => (
            <div className={`nav-group${g.items.length === 1 && gi > 0 ? " nav-group-tight" : ""}`} key={g.judul}>
              {g.items.length > 1 ? <div className="nav-group-title">{g.judul}</div> : null}
              {g.items.map((n) => (
                <Link key={n.href} href={n.href} className={`snav ${aktif(n.href) ? "active" : ""}`}>
                  <Icon name={n.icon} size={19} />
                  <span>{n.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Link href="/profil" className="user-chip">
            <span className="avatar">{inisial(nama)}</span>
            <div className="who">
              <strong>{nama}</strong>
              <span>{wilayah || role}</span>
            </div>
            {role !== "user" ? (
              <span className="sidebar-role-pill">{role.replace("_", " ")}</span>
            ) : null}
          </Link>
          <div className="sidebar-foot-acts mt-8">
            <button
              type="button"
              className="btn btn-sm btn-outline sidebar-logout-btn"
              onClick={() => setKonfirmasiKeluar(true)}
              disabled={keluar}
              title="Keluar"
            >
              <Icon name="log-out" size={16} /> <span>{keluar ? "Keluar…" : "Keluar"}</span>
            </button>
            <ThemeToggle className="sidebar-theme-btn" />
          </div>
        </div>
      </aside>
      <div className="dash-scrim" onClick={() => setDrawer(false)} />

      {/* ============ KONTEN ============ */}
      <div className="dash-main">
        <div className="viora-rain" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>

        <main className="app-body" id="appBody">
          {children}
        </main>
      </div>

      {/* FAB hanya muncul kalau memang ada aksinya. Dulu halaman tanpa
          `onFab` tetap menampilkan tombol "+" yang mati saat diklik, dan di
          layar kecil tombol itu menutupi sudut kartu. */}
      {!noFab && onFab ? (
        <button className="fab" aria-label="Catat kesehatan" onClick={onFab} type="button">
          <Icon name="plus" size={26} />
        </button>
      ) : null}

      <nav className="bottom-nav">
        {navBawah.map((n) => (
          <Link key={n.href} href={n.href} className={aktif(n.href) ? "active" : ""}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={drawer ? "active" : ""}
          onClick={() => setDrawer(true)}
          aria-label="Buka menu sidebar"
        >
          <Icon name="list" size={22} />
          <span>Menu</span>
        </button>
      </nav>

      <Modal
        open={konfirmasiKeluar}
        onClose={() => setKonfirmasiKeluar(false)}
        title="Keluar"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setKonfirmasiKeluar(false)}
            >
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={handleLogout} disabled={keluar}>
              {keluar ? "Keluar…" : "Ya, keluar"}
            </button>
          </>
        }
      >
        <p className="tiny">Apakah kamu yakin ingin keluar dari akun ini?</p>
      </Modal>
    </div>
  );
}

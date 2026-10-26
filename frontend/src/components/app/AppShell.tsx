"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useUser, clearUserCache } from "@/hooks/useUser";
import { auth as authApi, clearToken } from "@/lib/api";
import { inisial } from "@/lib/format";

type NavItem = { href: string; icon: string; label: string };

const NAV_UTAMA: NavItem[] = [
  { href: "/dashboard", icon: "home", label: "Beranda" },
  { href: "/rekam-medis", icon: "clipboard", label: "Rekam Medis" },
  { href: "/program", icon: "award", label: "Tantangan" },
  { href: "/peringkat", icon: "trending-up", label: "Peringkat" },
  { href: "/insight", icon: "zap", label: "Insight" },
];

const NAV_DATA: NavItem[] = [
  { href: "/laporan", icon: "bar-chart", label: "Laporan" },
  { href: "/posbindu", icon: "activity", label: "Posbindu" },
  { href: "/rujukan", icon: "send", label: "Rujukan" },
];

const NAV_AKUN: NavItem[] = [
  { href: "/profil", icon: "user", label: "Profil" },
  { href: "/setelan", icon: "settings", label: "Pengaturan" },
];

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
export default function AppShell({ children, greet, noFab, onFab, roles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [keluar, setKeluar] = useState(false);
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
    grup.push({ judul: "Menu", items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[2], NAV_UTAMA[4]] });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[0], NAV_DATA[1], NAV_DATA[2]] });
    grup.push({ judul: "Administrasi", items: NAV_ADMIN });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else if (role === "admin_kelurahan") {
    grup.push({ judul: "Menu", items: [NAV_UTAMA[0], NAV_UTAMA[1]] });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[0], NAV_DATA[1], NAV_DATA[2]] });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else if (role === "kader") {
    grup.push({ judul: "Menu", items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[2]] });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[1], NAV_DATA[2]] });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else {
    grup.push({ judul: "Menu", items: NAV_UTAMA });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  }

  // Nav bawah hanya 4 item paling penting (mobile)
  const navBawah = grup[0].items.slice(0, 3).concat(grup[grup.length - 1].items[0]);

  const aktif = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const judulHalaman =
    grup.flatMap((g) => g.items).find((i) => aktif(i.href))?.label || "SehatKita";

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
          <span className="brand-mark">
            <Icon name="heart-pulse" size={18} />
          </span>
          <div className="txt">
            SehatKita<small>Monitoring PTM</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {grup.map((g) => (
            <div className="nav-group" key={g.judul}>
              <div className="nav-group-title">{g.judul}</div>
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
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-outline w-full mt-8"
            onClick={handleLogout}
            disabled={keluar}
          >
            <Icon name="log-out" size={16} /> <span>{keluar ? "Keluar…" : "Keluar"}</span>
          </button>
        </div>
      </aside>
      <div className="dash-scrim" onClick={() => setDrawer(false)} />

      {/* ============ KONTEN ============ */}
      <div className="dash-main">
        <header className="app-top">
          <button
            type="button"
            className="btn btn-icon btn-sm btn-ghost sidebar-toggle"
            aria-label="Buka menu"
            onClick={() => setDrawer(true)}
          >
            <Icon name="list" size={20} />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-sm btn-ghost collapse-toggle"
            aria-label="Ciutkan sidebar"
            title="Ciutkan sidebar"
            onClick={() => setCiut((v) => !v)}
          >
            <Icon name="panel-left" size={18} />
          </button>

          <span className="avatar d-only-none">{inisial(nama)}</span>
          <div className="who">
            <strong>
              {greet ? `${greet}, ` : ""}
              {nama.split(" ")[0]}
            </strong>
            <span>
              <Icon name="map-pin" size={12} /> {wilayah || "—"}
            </span>
          </div>

          <div className="acts">
            <span className="crumb-halaman">{judulHalaman}</span>
            <span className={`badge badge-primary role-badge role-${role}`}>{role.replace("_", " ")}</span>
            <ThemeToggle />
            <button
              type="button"
              className="btn btn-icon btn-sm btn-ghost top-logout"
              aria-label="Keluar"
              title="Keluar"
              onClick={handleLogout}
              disabled={keluar}
            >
              <Icon name="log-out" size={17} />
            </button>
          </div>
        </header>

        <main className="app-body" id="appBody">
          {children}
        </main>
      </div>

      {!noFab ? (
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
      </nav>
    </div>
  );
}

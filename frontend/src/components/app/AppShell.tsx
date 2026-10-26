"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useUser, clearUserCache } from "@/hooks/useUser";
import { auth as authApi, clearToken } from "@/lib/api";
import { inisial } from "@/lib/format";

const NAV = [
  { href: "/dashboard", icon: "home", label: "Beranda" },
  { href: "/rekam-medis", icon: "clipboard", label: "Rekam Medis" },
  { href: "/program", icon: "award", label: "Tantangan" },
  { href: "/profil", icon: "user", label: "Profil" },
];

const NAV_POSBINDU = { href: "/posbindu", icon: "activity", label: "Posbindu" };
const NAV_LAPORAN = { href: "/laporan", icon: "bar-chart", label: "Laporan" };
const NAV_ADMIN = { href: "/admin", icon: "shield", label: "Admin" };
const ROLE_POSBINDU = ["kader", "admin_kelurahan", "super_admin"];

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
 * Shell aplikasi masyarakat (mobile-first) — topbar + bottom nav + FAB.
 * Diporting dari prototype `app.js` (App.mount).
 */
export default function AppShell({ children, greet, noFab, onFab, roles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [keluar, setKeluar] = useState(false);

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

  const roleTidakCocok = Boolean(roles && user && !roles.includes(user.role));

  useEffect(() => {
    if (roleTidakCocok) router.replace("/unauthorized");
  }, [roleTidakCocok, router]);

  const nama = user?.name || "Pengguna";
  const wilayah = user?.wilayah?.nama || "";
  const role = user?.role || "";
  const nav = role === "super_admin"
    ? [NAV[0], NAV[1], NAV_LAPORAN, NAV_POSBINDU, NAV_ADMIN]
    : role === "admin_kelurahan"
      ? [NAV[0], NAV[1], NAV_LAPORAN, NAV_POSBINDU]
      : ROLE_POSBINDU.includes(role)
        ? [NAV[0], NAV[1], NAV_POSBINDU, NAV[3]]
        : NAV;

  if (loading || !user || roleTidakCocok) {
    return (
      <main className="center" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p className="tiny">Memuat…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-top">
        <span className="avatar">{inisial(nama)}</span>
        <div className="who">
          <strong>
            {greet ? `${greet}, ` : ""}
            {nama.split(" ")[0]}
          </strong>
          <span>
            <Icon name="map-pin" size={12} /> {wilayah}
          </span>
        </div>
        <div className="acts">
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-icon btn-sm btn-ghost"
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

      {!noFab ? (
        <button className="fab" aria-label="Catat kesehatan" onClick={onFab} type="button">
          <Icon name="plus" size={26} />
        </button>
      ) : null}

      <nav className="bottom-nav">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={pathname === n.href ? "active" : ""}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

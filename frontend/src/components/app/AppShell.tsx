"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Modal from "@/components/ui/Modal";
import { GlassyDashboardSkeleton } from "@/components/dashboard/GlassyWidgets";
import { useUser, clearUserCache } from "@/hooks/useUser";
import { auth as authApi, clearToken } from "@/lib/api";
import { inisial } from "@/lib/format";
import type { User } from "@/types";

type NavItem = { href: string; icon: string; label: string; short?: string; desc: string };

type SidebarPreview = {
  id: string;
  label: string;
  desc: string;
  icon: string;
  aktif?: boolean;
  path: string;
  x: number;
  y: number;
};

type ShellMeta = {
  active: boolean;
  noFab: boolean;
  hasFab: boolean;
  rolesKey: string;
};

const DEFAULT_SHELL_META: ShellMeta = {
  active: false,
  noFab: false,
  hasFab: false,
  rolesKey: "",
};

const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/rekam-medis",
  "/target-kesehatan",
  "/program",
  "/edukasi",
  "/peringkat",
  "/insight",
  "/pengaduan",
  "/laporan",
  "/posbindu",
  "/rujukan",
  "/profil",
  "/setelan",
  "/admin",
  "/unauthorized",
];

function apakahRuteApp(pathname: string): boolean {
  if (!pathname) return false;
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/* ------------------------------------------------------------
 * Store eksternal frame shell (tanpa setState di dalam effect):
 * Halaman di dalam AppFrameProvider mendaftarkan opsi FAB & guard peran
 * sehingga sidebar + topbar tetap terpisah section dan tidak ikut reload.
 * ------------------------------------------------------------ */
let shellMetaState: ShellMeta = DEFAULT_SHELL_META;
let shellOwnerId: string | null = null;
let shellFabHandler: (() => void) | undefined;
const shellListeners = new Set<() => void>();

function beritahuShell(): void {
  shellListeners.forEach((cb) => cb());
}

function langgananShellFrame(cb: () => void): () => void {
  shellListeners.add(cb);
  return () => {
    shellListeners.delete(cb);
  };
}

function bacaShellFrame(): ShellMeta {
  return shellMetaState;
}

function getServerShellFrame(): ShellMeta {
  return DEFAULT_SHELL_META;
}

function aturShellFrame(ownerId: string, next: ShellMeta, onFab?: () => void): void {
  shellOwnerId = ownerId;
  shellFabHandler = onFab;
  if (
    shellMetaState.active === next.active &&
    shellMetaState.noFab === next.noFab &&
    shellMetaState.hasFab === next.hasFab &&
    shellMetaState.rolesKey === next.rolesKey
  ) {
    return;
  }
  shellMetaState = next;
  beritahuShell();
}

function lepasShellFrame(ownerId: string): void {
  if (shellOwnerId !== ownerId) return;
  shellOwnerId = null;
  shellFabHandler = undefined;
  if (!shellMetaState.active) return;
  shellMetaState = DEFAULT_SHELL_META;
  beritahuShell();
}

const AppFrameContext = createContext(false);

const SIDEBAR_KEY = "sehatkita_sidebar_collapsed";
const SIDEBAR_EVENT = "sehatkita-sidebar-toggle";
const SIDEBAR_SCROLL_KEY = "sehatkita_sidebar_scroll";
const SASIRANGAN_CYCLE_MS = 26000;
let sidebarScrollMem = 0;
let sasiranganEpoch = 0;
let previewTimerId: number | null = null;

function bacaScrollSidebar(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch {
    // abaikan jika sessionStorage tidak tersedia
  }
  return sidebarScrollMem;
}

function simpanScrollSidebar(top: number): void {
  const aman = Math.max(0, Math.round(top));
  sidebarScrollMem = aman;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(aman));
  } catch {
    // abaikan jika sessionStorage tidak tersedia
  }
}

function bacaSidebarCiut(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "1";
}

function simpanSidebarCiut(next: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

function langgananSidebar(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(SIDEBAR_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

const NAV_UTAMA: NavItem[] = [
  { href: "/dashboard", icon: "home", label: "Beranda", desc: "Ringkasan kondisi PTM, skor kesehatan & statistik utama" },
  { href: "/rekam-medis", icon: "clipboard", label: "Rekam Medis", short: "Rekam", desc: "Riwayat pengukuran tensi, gula darah, IMT & grafik tren" },
  { href: "/target-kesehatan", icon: "target", label: "Target Kesehatan", short: "Target", desc: "Atur target kesehatan harian & pantau capaian Anda" },
  { href: "/kalkulator?app=1", icon: "calculator", label: "Kalkulator", desc: "Hitung IMT, estimasi risiko PTM & cek status instan" },
  { href: "/program", icon: "award", label: "Tantangan", desc: "Program tantangan hidup sehat untuk mengumpulkan poin" },
  { href: "/edukasi", icon: "book-open", label: "Edukasi", desc: "Materi edukasi PTM terpisah dengan progres belajar pribadi" },
  { href: "/peringkat", icon: "trophy", label: "Peringkat", desc: "Papan peringkat kuartalan & simbol achievement keaktifan" },
  { href: "/insight", icon: "zap", label: "Peringatan Dini", short: "Peringatan", desc: "Peringatan dini kondisi risiko & saran tindak lanjut personal" },
  { href: "/insight/panduan", icon: "file-text", label: "Panduan", desc: "Panduan ambang batas indikator PTM & edukasi kesehatan" },
  { href: "/pengaduan", icon: "alert-circle", label: "Pengaduan", desc: "Kirim laporan kendala, saran atau pengaduan layanan" },
];

const NAV_DATA: NavItem[] = [
  { href: "/laporan", icon: "bar-chart", label: "Laporan", desc: "Rekapitulasi cakupan skrining & laporan data PTM wilayah" },
  { href: "/posbindu", icon: "activity", label: "Posbindu", desc: "Jadwal kegiatan Posbindu & pencatatan pemeriksaan warga" },
  { href: "/rujukan", icon: "send", label: "Rujukan", desc: "Kelola tindak lanjut & rujukan kasus berisiko tinggi" },
];

const NAV_AKUN: NavItem[] = [
  { href: "/profil", icon: "user", label: "Profil", desc: "Kelola data diri, riwayat keluarga & pengaturan akun" },
];

const NAV_ADMIN: NavItem[] = [
  { href: "/admin", icon: "shield", label: "Admin", desc: "Panel administrasi pengguna, wilayah & ambang indikator" },
];

type FrameProps = {
  children: React.ReactNode;
  user: User | null;
  loading: boolean;
  noFab?: boolean;
  onFab?: () => void;
  roles?: string[];
};

function AppFrameView({ children, user, loading, noFab, onFab, roles }: FrameProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [keluar, setKeluar] = useState(false);
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const [cariMenu, setCariMenu] = useState("");
  const [cariFokus, setCariFokus] = useState(false);
  const [pendingHref, setPendingHref] = useState<{ from: string; to: string } | null>(null);
  const [preview, setPreview] = useState<SidebarPreview | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const appBodyRef = useRef<HTMLElement | null>(null);
  const sidebarNavRef = useRef<HTMLElement | null>(null);

  const aturSidebarNavRef = useCallback((el: HTMLElement | null) => {
    sidebarNavRef.current = el;
    if (el) {
      const tersimpan = bacaScrollSidebar();
      if (tersimpan > 0) el.scrollTop = tersimpan;
    }
  }, []);

  const drawer = drawerPath === pathname;
  const targetPending = pendingHref && pendingHref.from === pathname ? pendingHref.to : null;
  const ciut = useSyncExternalStore(langgananSidebar, bacaSidebarCiut, () => false);
  const tampilPreview = ciut && preview && preview.path === pathname ? preview : null;

  const tutupPreview = useCallback(() => {
    if (previewTimerId !== null) {
      window.clearTimeout(previewTimerId);
      previewTimerId = null;
    }
    setPreview(null);
  }, []);

  const jadwalPreview = useCallback(
    (el: HTMLElement, item: { id: string; label: string; desc: string; icon: string; aktif?: boolean }) => {
      if (!ciut || typeof window === "undefined" || window.innerWidth <= 980) return;
      if (previewTimerId !== null) {
        window.clearTimeout(previewTimerId);
      }
      const rect = el.getBoundingClientRect();
      const x = Math.round(rect.right + 12);
      const y = Math.round(Math.max(54, Math.min(window.innerHeight - 54, rect.top + rect.height / 2)));
      const jedaMs = preview ? 95 : 320;
      previewTimerId = window.setTimeout(() => {
        setPreview({
          ...item,
          path: pathname,
          x,
          y,
        });
        previewTimerId = null;
      }, jedaMs);
    },
    [ciut, pathname, preview],
  );

  useEffect(() => {
    return () => {
      if (previewTimerId !== null) {
        window.clearTimeout(previewTimerId);
        previewTimerId = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    if (!sasiranganEpoch) sasiranganEpoch = Date.now();
    const offsetMs = (Date.now() - sasiranganEpoch) % SASIRANGAN_CYCLE_MS;
    el.style.setProperty("--sasirangan-delay", `-${offsetMs}ms`);
  }, []);

  async function handleLogout() {
    setKeluar(true);
    const logoutReq = authApi.logout();
    clearUserCache();
    try {
      await logoutReq;
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

  const roleTidakCocok = Boolean(roles && roles.length > 0 && user && !roles.includes(user.role));

  useEffect(() => {
    if (roleTidakCocok) router.replace("/unauthorized");
  }, [roleTidakCocok, router]);

  const nama = user?.name || (loading ? "" : "Pengguna");
  const wilayah = user?.wilayah?.nama || "";
  const role = user?.role || "";

  useEffect(() => {
    const nav = sidebarNavRef.current;
    if (!nav) return;
    const tersimpan = bacaScrollSidebar();
    if (tersimpan > 0) {
      nav.scrollTop = tersimpan;
      return;
    }
    const aktifEl = nav.querySelector<HTMLElement>(".snav.active");
    aktifEl?.scrollIntoView({ block: "nearest" });
  }, [pathname, role, loading, ciut]);

  // Susun menu secara eksplisit per role; jika role belum diketahui (SSR/cold boot),
  // tampilkan placeholder netral agar sidebar tidak berkedip ke menu role default.
  const grup: { judul: string; items: NavItem[] }[] = [];
  if (role === "super_admin") {
    grup.push({
      judul: "Pemantauan",
      items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[3]],
    });
    grup.push({
      judul: "Program",
      items: [NAV_UTAMA[4], NAV_UTAMA[6]],
    });
    grup.push({
      judul: "Edukasi",
      items: [NAV_UTAMA[5], NAV_UTAMA[8]],
    });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[0], NAV_DATA[1], NAV_DATA[2]] });
    grup.push({
      judul: "Administrasi",
      items: [
        ...NAV_ADMIN,
        {
          href: "/admin/pengaduan",
          icon: "alert-circle",
          label: "Pengaduan",
          desc: "Tinjau & tindak lanjuti laporan pengaduan warga",
        },
      ],
    });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else if (role === "admin_kelurahan") {
    grup.push({
      judul: "Pemantauan",
      items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[3]],
    });
    grup.push({
      judul: "Program",
      items: [NAV_UTAMA[4], NAV_UTAMA[6]],
    });
    grup.push({
      judul: "Edukasi",
      items: [NAV_UTAMA[5], NAV_UTAMA[8]],
    });
    grup.push({
      judul: "Data & Laporan",
      items: [
        NAV_DATA[0],
        NAV_DATA[1],
        {
          href: "/rujukan/kelurahan",
          icon: "send",
          label: "Rujukan",
          desc: "Pantau daftar rujukan PTM wilayah kelurahan (identitas warga disamarkan)",
        },
      ],
    });
    grup.push({
      judul: "Layanan",
      items: [
        {
          href: "/admin/verifikasi",
          icon: "check-circle",
          label: "Verifikasi Data",
          short: "Verifikasi",
          desc: "Setujui atau tolak catatan kesehatan anomali warga kelurahan",
        },
        {
          href: "/admin/pengaduan",
          icon: "alert-circle",
          label: "Pengaduan",
          desc: "Tinjau & tindak lanjuti pengaduan layanan warga",
        },
      ],
    });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else if (role === "kader") {
    grup.push({
      judul: "Pemantauan",
      items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[3]],
    });
    grup.push({
      judul: "Program",
      items: [NAV_UTAMA[4], NAV_UTAMA[6]],
    });
    grup.push({
      judul: "Edukasi",
      items: [NAV_UTAMA[5], NAV_UTAMA[8]],
    });
    grup.push({ judul: "Data & Laporan", items: [NAV_DATA[1], NAV_DATA[2]] });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  } else if (role === "user") {
    grup.push({
      judul: "Pemantauan",
      items: [NAV_UTAMA[0], NAV_UTAMA[1], NAV_UTAMA[2], NAV_UTAMA[3]],
    });
    grup.push({
      judul: "Program",
      items: [NAV_UTAMA[4], NAV_UTAMA[6]],
    });
    grup.push({
      judul: "Edukasi",
      items: [NAV_UTAMA[5], NAV_UTAMA[8]],
    });
    grup.push({
      judul: "Layanan",
      items: [NAV_UTAMA[7], NAV_UTAMA[9], NAV_DATA[2]],
    });
    grup.push({ judul: "Akun", items: NAV_AKUN });
  }

  const navBawah =
    grup.length >= 2
      ? grup[0].items.slice(0, 3).concat(grup[grup.length - 1].items[0])
      : [];
  const semuaMenu = grup.flatMap((g) => g.items);
  const hasilMenu = cariMenu.trim()
    ? semuaMenu.filter((m) =>
        m.label.toLowerCase().includes(cariMenu.trim().toLowerCase()),
      )
    : [];

  const ROLE_TEKS: Record<string, string> = {
    user: "Peserta Warga",
    kader: "Kader Posbindu",
    admin_kelurahan: "Admin Kelurahan",
    super_admin: "Super Admin Kota",
  };
  const subTopbar = role
    ? `${ROLE_TEKS[role] || "Pengguna"}${wilayah ? ` · ${wilayah}` : ""}`
    : "Memuat sesi…";

  const aktif = (href: string) => {
    const base = href.split("?")[0];
    if (pathname === base) return true;
    if (base === "/dashboard" || base === "/insight") return false;
    if (!pathname.startsWith(base + "/")) return false;
    return !semuaMenu.some((m) => {
      const b = m.href.split("?")[0];
      return b.length > base.length && (pathname === b || pathname.startsWith(b + "/"));
    });
  };

  const sedangMemuat = loading || !user || roleTidakCocok;

  useEffect(() => {
    if (sedangMemuat) return;
    const root = appBodyRef.current;
    if (!root || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const STORY_SEL = [
      ".app-story-stage > .row-between",
      ".app-story-stage > .page-head",
      ".app-story-stage > .card",
      ".app-story-stage > .endpoint-note",
      ".app-story-stage > div:not(.grid):not(.grid-2):not(.grid-3):not(.grid-4):not(.bento-sec):not(.modal-backdrop)",
      ".app-story-stage .bento-sec-head",
      ".app-story-stage .bento-kpi-grid > *",
      ".app-story-stage .bento-mid-grid > *",
      ".app-story-stage .bento-history-row",
      ".app-story-stage .grid > .card",
      ".app-story-stage .grid > .metric",
      ".app-story-stage .grid > .stat",
      ".app-story-stage .li",
    ].join(", ");

    const processed = new WeakSet<Element>();
    const pending = new Set<HTMLElement>();
    let rafId = 0;

    const io = new IntersectionObserver(
      (entries) => {
        let wave = 0;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.style.setProperty("--story-delay", `${Math.min(wave, 4) * 30}ms`);
            el.classList.remove("story-wait");
            el.classList.add("story-in");
            pending.delete(el);
            io.unobserve(el);
            wave += 1;
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -4% 0px" },
    );

    const scan = () => {
      const vh = window.innerHeight || 800;
      const batas = vh * 0.94;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(STORY_SEL));
      let waveVisible = 0;

      for (const el of nodes) {
        if (processed.has(el)) continue;
        if (
          el.closest(
            ".modal-backdrop, .toast, .loading-skel, .gv-skel-hero, [aria-busy='true']",
          )
        ) {
          continue;
        }
        if (el.parentElement?.closest(".story-item")) continue;
        processed.add(el);

        el.dataset.storyDir = "up";
        el.classList.add("story-item");

        const top = el.getBoundingClientRect().top;
        if (top <= batas) {
          el.style.setProperty("--story-delay", `${Math.min(waveVisible, 4) * 30}ms`);
          el.classList.add("story-in");
          waveVisible += 1;
        } else {
          el.classList.add("story-wait");
          pending.add(el);
          io.observe(el);
        }
      }
    };

    const scheduleScan = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(scan);
    };

    const onScroll = () => {
      if (pending.size === 0) return;
      const batas = (window.innerHeight || 800) * 0.94;
      let wave = 0;
      for (const el of Array.from(pending)) {
        if (el.getBoundingClientRect().top <= batas) {
          el.style.setProperty("--story-delay", `${Math.min(wave, 4) * 30}ms`);
          el.classList.remove("story-wait");
          el.classList.add("story-in");
          pending.delete(el);
          io.unobserve(el);
          wave += 1;
        }
      }
    };

    scan();
    const mo = new MutationObserver(scheduleScan);
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      mo.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname, sedangMemuat]);

  return (
    <div
      className={`dash app-dash ${ciut ? "collapsed" : ""} ${drawer ? "drawer-open" : ""}`}
      aria-busy={sedangMemuat || undefined}
    >
      <a href="#appBody" className="skip-link">
        Lewati ke konten utama
      </a>

      {/* ============ SIDEBAR (section terpisah dari konten) ============ */}
      <aside className="sidebar" ref={sidebarRef}>
        <div className="sidebar-brand">
          <BrandLockup variant="sm" />
          <div className="txt">
            SehatKita<small>Monitoring PTM</small>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-sm btn-ghost sidebar-collapse-btn"
            aria-label={ciut ? "Perluas sidebar" : "Ciutkan sidebar"}
            title={ciut ? undefined : "Ciutkan sidebar"}
            onClick={() => {
              tutupPreview();
              simpanSidebarCiut(!ciut);
            }}
            onMouseEnter={(e) =>
              jadwalPreview(e.currentTarget, {
                id: "__toggle__",
                label: "Perluas Sidebar",
                desc: "Tampilkan kembali nama lengkap seluruh menu navigasi",
                icon: "panel-left",
              })
            }
            onMouseLeave={tutupPreview}
            onFocus={(e) =>
              jadwalPreview(e.currentTarget, {
                id: "__toggle__",
                label: "Perluas Sidebar",
                desc: "Tampilkan kembali nama lengkap seluruh menu navigasi",
                icon: "panel-left",
              })
            }
            onBlur={tutupPreview}
          >
            <Icon name="panel-left" size={17} />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-sm btn-ghost sidebar-close-btn"
            aria-label="Tutup menu"
            onClick={() => setDrawerPath(null)}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav
          ref={aturSidebarNavRef}
          className="sidebar-nav"
          onScroll={(e) => {
            simpanScrollSidebar(e.currentTarget.scrollTop);
            tutupPreview();
          }}
        >
          {grup.length === 0 ? (
            <div className="snav-skel-list" aria-hidden="true">
              <div className="snav-skel-item" />
              <div className="snav-skel-item" />
              <div className="snav-skel-item short" />
              <div className="snav-skel-item" />
              <div className="snav-skel-item short" />
              <div className="snav-skel-item" />
              <div className="snav-skel-item short" />
            </div>
          ) : (
            grup.map((g, gi) => (
              <div
                className={`nav-group${g.items.length === 1 && gi > 0 ? " nav-group-tight" : ""}`}
                key={g.judul}
              >
                {g.items.length > 1 ? <div className="nav-group-title">{g.judul}</div> : null}
                {g.items.map((n) => {
                  const sedangAktif = targetPending ? targetPending === n.href : aktif(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`snav ${sedangAktif ? "active" : ""}`}
                      aria-label={ciut ? n.label : undefined}
                      onClick={() => {
                        if (sidebarNavRef.current) {
                          simpanScrollSidebar(sidebarNavRef.current.scrollTop);
                        }
                        if (n.href.split("?")[0] !== pathname) {
                          setPendingHref({ from: pathname, to: n.href });
                        }
                        tutupPreview();
                      }}
                      onMouseEnter={(e) =>
                        jadwalPreview(e.currentTarget, {
                          id: n.href,
                          label: n.label,
                          desc: n.desc,
                          icon: n.icon,
                          aktif: sedangAktif,
                        })
                      }
                      onMouseLeave={tutupPreview}
                      onFocus={(e) =>
                        jadwalPreview(e.currentTarget, {
                          id: n.href,
                          label: n.label,
                          desc: n.desc,
                          icon: n.icon,
                          aktif: sedangAktif,
                        })
                      }
                      onBlur={tutupPreview}
                    >
                      <span className="snav-ico" aria-hidden="true">
                        <Icon name={n.icon} size={17} />
                      </span>
                      <span className="snav-label">{n.label}</span>
                      <span className="snav-short">{n.short || n.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-foot-acts">
            <button
              type="button"
              className="btn btn-sm sidebar-logout-btn"
              onClick={() => {
                tutupPreview();
                setKonfirmasiKeluar(true);
              }}
              disabled={keluar}
              aria-label="Keluar"
              title={ciut ? undefined : "Keluar"}
              onMouseEnter={(e) =>
                jadwalPreview(e.currentTarget, {
                  id: "__logout__",
                  label: "Keluar",
                  desc: "Akhiri sesi akun Anda pada perangkat ini",
                  icon: "log-out",
                })
              }
              onMouseLeave={tutupPreview}
              onFocus={(e) =>
                jadwalPreview(e.currentTarget, {
                  id: "__logout__",
                  label: "Keluar",
                  desc: "Akhiri sesi akun Anda pada perangkat ini",
                  icon: "log-out",
                })
              }
              onBlur={tutupPreview}
            >
              <Icon name="log-out" size={16} /> <span>{keluar ? "Keluar…" : "Keluar"}</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="dash-scrim" onClick={() => setDrawerPath(null)} />

      {tampilPreview ? (
        <div
          key={tampilPreview.id}
          className={`snav-preview${tampilPreview.aktif ? " is-active" : ""}${tampilPreview.id === "__logout__" ? " is-danger" : ""}`}
          role="tooltip"
          style={{ top: tampilPreview.y, left: tampilPreview.x }}
        >
          <span className="snav-preview-arrow" aria-hidden="true" />
          <div className="snav-preview-ico" aria-hidden="true">
            <Icon name={tampilPreview.icon} size={18} />
          </div>
          <div className="snav-preview-body">
            <div className="snav-preview-head">
              <strong>{tampilPreview.label}</strong>
              {tampilPreview.aktif ? <span className="snav-preview-pill">Aktif</span> : null}
            </div>
            <p>{tampilPreview.desc}</p>
          </div>
        </div>
      ) : null}

      {/* ============ KONTEN (hanya section ini yang memuat / berganti) ============ */}
      <div className="dash-main">
        <header className="app-topbar no-print">
          <div className="app-topbar-left">
            <h1 className="app-topbar-title">{nama ? `Halo, ${nama}` : "Halo"}</h1>
            <span className="app-topbar-sub">
              <Icon name="map-pin" size={13} /> {subTopbar}
            </span>
          </div>

          <div className="app-topbar-tools">
            <div className="app-topbar-search">
              <span className="app-topbar-search-ico">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="app-topbar-search-input"
                placeholder="Cari menu cepat…"
                aria-label="Cari menu cepat"
                value={cariMenu}
                onFocus={() => setCariFokus(true)}
                onBlur={() => setTimeout(() => setCariFokus(false), 160)}
                onChange={(e) => setCariMenu(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hasilMenu.length > 0) {
                    setCariMenu("");
                    setCariFokus(false);
                    router.push(hasilMenu[0].href);
                  }
                }}
              />
              {cariFokus && cariMenu.trim() !== "" ? (
                <div className="app-topbar-dropdown" role="listbox">
                  {hasilMenu.length > 0 ? (
                    hasilMenu.slice(0, 6).map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        className="app-topbar-drop-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCariMenu("");
                          setCariFokus(false);
                          router.push(item.href);
                        }}
                      >
                        <Icon name={item.icon} size={15} />
                        <span>{item.label}</span>
                      </button>
                    ))
                  ) : (
                    <div className="tiny" style={{ padding: "8px 10px" }}>
                      Menu tidak ditemukan.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <Link
              href="/insight/panduan"
              className="app-topbar-pill"
              title="Panduan Kesehatan"
              aria-label="Panduan Kesehatan"
            >
              <Icon name="help-circle" size={18} />
            </Link>
            <ThemeToggle className="app-topbar-pill" />
            <Link href="/profil" className="app-topbar-avatar" title="Profil & Pengaturan">
              <span className="ava-dot">{inisial(nama || "P")}</span>
              <span className="ava-label">{(nama || "Profil").split(" ")[0]}</span>
            </Link>
          </div>
        </header>

        <main
          className={`app-body${targetPending ? " is-navigating" : ""}`}
          id="appBody"
          ref={appBodyRef}
        >
          {sedangMemuat ? (
            <GlassyDashboardSkeleton label="Memuat halaman…" />
          ) : (
            <div className="app-story-stage" style={{ display: "contents" }}>
              {children}
            </div>
          )}
        </main>
      </div>

      {!sedangMemuat && !noFab && onFab ? (
        <button className="fab" aria-label="Catat kesehatan" onClick={onFab} type="button">
          <Icon name="plus" size={26} />
        </button>
      ) : null}

      <nav className="bottom-nav">
        {navBawah.map((n) => {
          const bawahAktif = targetPending ? targetPending === n.href : aktif(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={bawahAktif ? "active" : ""}
              onClick={() => {
                if (n.href.split("?")[0] !== pathname) {
                  setPendingHref({ from: pathname, to: n.href });
                }
              }}
            >
              <Icon name={n.icon} size={22} />
              <span>{n.short || n.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={drawer ? "active" : ""}
          onClick={() => setDrawerPath(pathname)}
          aria-label="Buka menu sidebar"
        >
          <Icon name="list" size={22} />
          <span>Menu</span>
        </button>
      </nav>

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
    </div>
  );
}

/**
 * Provider root untuk mempertahankan sidebar & topbar tetap terpasang (persisten)
 * lintas perpindahan halaman maupun Suspense loading.tsx.
 */
export function AppFrameProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const frameMeta = useSyncExternalStore(
    langgananShellFrame,
    bacaShellFrame,
    getServerShellFrame,
  );
  const { user, loading } = useUser();

  const aktif = apakahRuteApp(pathname) || frameMeta.active;
  const roles = frameMeta.rolesKey ? frameMeta.rolesKey.split(",") : undefined;
  const onFab = useCallback(() => {
    shellFabHandler?.();
  }, []);

  return (
    <AppFrameContext.Provider value={true}>
      {aktif ? (
        <AppFrameView
          user={user}
          loading={loading}
          noFab={frameMeta.noFab}
          onFab={frameMeta.hasFab ? onFab : undefined}
          roles={roles}
        >
          {children}
        </AppFrameView>
      ) : (
        children
      )}
    </AppFrameContext.Provider>
  );
}

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
 * Shell aplikasi — bila berada di dalam AppFrameProvider, hanya mendaftarkan opsi
 * halaman ke frame persisten sehingga sidebar tidak pernah ikut ter-render ulang.
 */
export default function AppShell({ children, noFab, onFab, roles }: Props) {
  const hasProvider = useContext(AppFrameContext);
  const { user, loading } = useUser();
  const ownerId = useId();
  const rolesKey = roles ? roles.join(",") : "";
  const hasFab = Boolean(onFab);

  useLayoutEffect(() => {
    if (!hasProvider) return;
    aturShellFrame(
      ownerId,
      {
        active: true,
        noFab: Boolean(noFab),
        hasFab,
        rolesKey,
      },
      onFab,
    );
  }, [hasProvider, ownerId, noFab, hasFab, rolesKey, onFab]);

  useLayoutEffect(() => {
    if (!hasProvider) return;
    return () => {
      lepasShellFrame(ownerId);
    };
  }, [hasProvider, ownerId]);

  if (hasProvider) {
    return <>{children}</>;
  }

  return (
    <AppFrameView
      user={user}
      loading={loading}
      noFab={noFab}
      onFab={onFab}
      roles={roles}
    >
      {children}
    </AppFrameView>
  );
}

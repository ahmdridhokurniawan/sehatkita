"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { id: "beranda", label: "Beranda" },
  { id: "fitur", label: "Fitur" },
  { id: "cara-kerja", label: "Cara Kerja" },
  { id: "tentang", label: "Tentang" },
  { id: "faq", label: "FAQ" },
] as const;

type PublicHeaderProps = {
  isLanding?: boolean;
  activeNav?: string;
  onSelectNav?: (id: string) => void;
};

/** Header publik bersama untuk halaman beranda serta dokumen legal, bantuan, dan kontak. */
export default function PublicHeader({ isLanding = false, activeNav, onSelectNav }: PublicHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });

  const updatePill = useCallback(() => {
    const nav = navRef.current;
    if (!nav || !isLanding) {
      setPill((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }
    const activeEl = nav.querySelector<HTMLElement>("a.active");
    if (!activeEl || !activeEl.offsetWidth) {
      setPill((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }
    const next = { left: activeEl.offsetLeft, width: activeEl.offsetWidth, visible: true };
    setPill((p) => (p.left === next.left && p.width === next.width && p.visible === next.visible ? p : next));
  }, [isLanding]);

  useEffect(() => {
    const raf = requestAnimationFrame(updatePill);
    window.addEventListener("resize", updatePill, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePill);
    };
  }, [activeNav, navOpen, updatePill]);

  return (
    <header className="site-header">
      <div className="container">
        {isLanding ? (
          <a href="#beranda" className="brand">
            <BrandLockup variant="md" />
            <span>
              SehatKita<small>Kota Banjarbaru</small>
            </span>
          </a>
        ) : (
          <Link href="/" className="brand">
            <BrandLockup variant="md" />
            <span>
              SehatKita<small>Kota Banjarbaru</small>
            </span>
          </Link>
        )}

        <nav ref={navRef} className={`nav-main ${navOpen ? "open" : ""}`} id="navMain">
          {isLanding && (
            <span
              className="nav-pill"
              aria-hidden="true"
              style={{
                width: pill.width,
                transform: `translate3d(${pill.left}px, 0, 0)`,
                opacity: pill.visible ? 1 : 0,
              }}
            />
          )}
          {NAV_ITEMS.map((item) =>
            isLanding ? (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={activeNav === item.id ? "active" : ""}
                onClick={() => {
                  onSelectNav?.(item.id);
                  setNavOpen(false);
                }}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.id}
                href={`/#${item.id}`}
                onClick={() => setNavOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
          <Link href="/login" className="nav-auth" onClick={() => setNavOpen(false)}>
            Masuk
          </Link>
          <Link href="/register" className="nav-auth" onClick={() => setNavOpen(false)}>
            Daftar
          </Link>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <Link href="/login" className="btn btn-outline btn-login-card hide-mobile">
            Masuk
          </Link>
          <Link href="/register" className="btn btn-primary">
            Mulai Sekarang
          </Link>
          <button
            className="btn btn-ghost btn-icon nav-toggle"
            aria-label="Buka menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
            type="button"
          >
            <Icon name={navOpen ? "x" : "list"} />
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";

export type TocItem = {
  id: string;
  label: string;
};

type PublicDocLayoutProps = {
  eyebrow: string;
  title: string;
  lead: string;
  breadcrumbLabel: string;
  meta?: string[];
  tocTitle?: string;
  toc?: TocItem[];
  asideExtra?: ReactNode;
  children: ReactNode;
};

const DOC_TABS = [
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
  { href: "/batasan-medis", label: "Catatan Penting" },
  { href: "/kontak", label: "Kontak Resmi" },
  { href: "/bantuan", label: "Pusat Bantuan" },
] as const;

/** Shell editorial minimalis untuk halaman informasi publik, legal, bantuan, dan kontak. */
export default function PublicDocLayout({
  eyebrow,
  title,
  lead,
  breadcrumbLabel,
  meta,
  tocTitle = "Daftar Isi",
  toc,
  asideExtra,
  children,
}: PublicDocLayoutProps) {
  const pathname = usePathname();
  const hasToc = Boolean(toc && toc.length > 0);

  return (
    <div className="landing">
      <PublicHeader />

      <section className="legal-hero">
        <div className="container">
          <nav className="legal-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <Icon name="chevron-right" size={14} />
            <span aria-current="page">{breadcrumbLabel}</span>
          </nav>

          <div className="legal-hero-inner">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="h1 mt-12">{title}</h1>
            <p className="lead mt-12">{lead}</p>
            {meta && meta.length > 0 && (
              <p className="legal-meta-line">{meta.join(" · ")}</p>
            )}
          </div>

          <nav className="doc-tabs" aria-label="Navigasi halaman informasi">
            {DOC_TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`doc-tab ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <main className="doc-main">
        <div className="container">
          {hasToc ? (
            <div className="legal-layout">
              <aside className="legal-toc" aria-label={tocTitle}>
                <p className="doc-toc-title">{tocTitle}</p>
                <ol className="legal-toc-list">
                  {toc!.map((item, idx) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="legal-toc-link">
                        <span className="doc-toc-num">{String(idx + 1).padStart(2, "0")}</span>
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ol>
                {asideExtra ? <div className="doc-toc-extra">{asideExtra}</div> : null}
              </aside>

              <article className="doc-sheet">{children}</article>
            </div>
          ) : (
            <div className="doc-single">{children}</div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

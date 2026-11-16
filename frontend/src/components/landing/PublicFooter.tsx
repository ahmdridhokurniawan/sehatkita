"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/ui/BrandLogo";
import LegalInfoModal, { type LegalTopic } from "./LegalInfoModal";

type PublicFooterProps = {
  isLanding?: boolean;
};

const NAV_LINKS = [
  { id: "beranda", label: "Beranda" },
  { id: "fitur", label: "Fitur" },
  { id: "cara-kerja", label: "Cara Kerja" },
  { id: "tentang", label: "Tentang" },
  { id: "faq", label: "FAQ" },
] as const;

const LEGAL_FOOTER_ITEMS: { topic: LegalTopic; label: string }[] = [
  { topic: "privasi", label: "Kebijakan Privasi" },
  { topic: "syarat", label: "Syarat dan Ketentuan" },
  { topic: "medis", label: "Catatan Penting" },
  { topic: "kontak", label: "Kontak Resmi" },
];

/** Footer publik bersama; item Legal & Kontak membuka kartu pop-up ringkas tanpa pindah halaman. */
export default function PublicFooter({ isLanding = false }: PublicFooterProps) {
  const [legalTopic, setLegalTopic] = useState<LegalTopic | null>(null);

  return (
    <>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              {isLanding ? (
                <a href="#beranda" className="brand mb-12">
                  <BrandLockup variant="md" />
                  <span>SehatKita</span>
                </a>
              ) : (
                <Link href="/" className="brand mb-12">
                  <BrandLockup variant="md" />
                  <span>SehatKita</span>
                </Link>
              )}
              <p className="tiny" style={{ maxWidth: 320 }}>
                SehatKita membantu masyarakat memantau kesehatan, memahami perubahan indikator kesehatan, membangun
                kebiasaan sehat, dan mendukung program kesehatan berbasis wilayah.
              </p>
              <p className="tiny mt-12">Kota Banjarbaru, Kalimantan Selatan</p>
            </div>

            <div className="footer-col">
              <h4>Navigasi</h4>
              {NAV_LINKS.map((item) =>
                isLanding ? (
                  <a key={item.id} href={`#${item.id}`}>
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.id} href={`/#${item.id}`}>
                    {item.label}
                  </Link>
                ),
              )}
            </div>

            <div className="footer-col">
              <h4>Bantuan</h4>
              <Link href="/bantuan">Pusat Bantuan</Link>
              <Link href="/kalkulator">Kalkulator Kesehatan</Link>
              <Link href="/login">Masuk</Link>
              <Link href="/register">Daftar</Link>
            </div>

            <div className="footer-col">
              <h4>Legal &amp; Kontak</h4>
              {LEGAL_FOOTER_ITEMS.map((item) => (
                <button
                  key={item.topic}
                  type="button"
                  className="footer-link-btn"
                  onClick={() => setLegalTopic(item.topic)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 SehatKita. Hak cipta dilindungi.</span>
            <span className="tiny">
              SehatKita bukan alat diagnosis medis dan tidak menggantikan pemeriksaan tenaga kesehatan.
            </span>
          </div>
        </div>
      </footer>

      <LegalInfoModal
        topic={legalTopic}
        onChangeTopic={setLegalTopic}
        onClose={() => setLegalTopic(null)}
      />
    </>
  );
}

"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";

type Props = {
  /** Judul besar di panel kiri */
  judul: string;
  /** Paragraf pengantar */
  teks: string;
  /** Daftar fitur di panel kiri (ikon + teks) */
  fitur: [string, string][];
  /** Teks kecil di bawah panel kiri */
  catatan?: string;
};

/**
 * Panel kiri halaman auth — mengikuti .auth-aside pada design system
 * prototype (gradien teal, feature list, disclaimer).
 */
export default function AuthAside({ judul, teks, fitur, catatan }: Props) {
  return (
    <aside className="auth-aside">
      <Link href="/" className="brand" style={{ color: "#fff" }}>
        <span className="brand-mark" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>
          <Icon name="heart-pulse" size={20} />
        </span>
        <span>
          SehatKita
          <small style={{ color: "rgba(255,255,255,.7)" }}>Kota Banjarbaru</small>
        </span>
      </Link>
      <div>
        <h2>{judul}</h2>
        <p>{teks}</p>
        <div className="feature-list">
          {fitur.map(([ico, teks], i) => (
            <div key={i}>
              <Icon name={ico} size={18} /> {teks}
            </div>
          ))}
        </div>
      </div>
      <p className="tiny" style={{ color: "rgba(255,255,255,.7)" }}>
        {catatan ?? "SehatKita bukan alat diagnosis medis dan tidak menggantikan pemeriksaan tenaga kesehatan."}
      </p>
    </aside>
  );
}

import type { ReactNode } from "react";

/** Tone baru (design system prototype) */
type ToneBaru = "default" | "safe" | "warning" | "danger" | "info" | "primary";
/** Tone lama (agar halaman lama tetap jalan) */
type ToneLama = "netral" | "sukses" | "peringatan" | "bahaya";
type Tone = ToneBaru | ToneLama;

type Props = {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
};

const TONE_LAMA: Record<string, ToneBaru> = {
  netral: "default",
  sukses: "safe",
  peringatan: "warning",
  bahaya: "danger",
};

/** Badge / pill status — mengikuti .badge pada design system prototype. */
export default function Badge({ children, tone = "default", dot, className = "" }: Props) {
  const t = (TONE_LAMA[tone as string] ?? tone) as ToneBaru;
  const cls = ["badge", t !== "default" ? `badge-${t}` : "", className].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  );
}

/** Peta kategori kesehatan -> tone badge (dipakai tabel/insight). */
export function toneKategori(kategori?: string | null): ToneBaru {
  if (!kategori) return "default";
  const k = kategori.toLowerCase();
  if (/hipertensi berat|diabetes|obesitas|tinggi|berisiko/.test(k)) return "danger";
  if (/hipertensi|prediabetes|batas|gemuk|waspada|prehipertensi/.test(k)) return "warning";
  if (/normal|baik|kurus|aman/.test(k)) return "safe";
  return "default";
}

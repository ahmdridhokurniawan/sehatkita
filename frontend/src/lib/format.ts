/**
 * Formatter bersama — diporting dari prototype `assets/js/core.js` (Fmt).
 * Semua format mengikuti locale Indonesia.
 */

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const BULAN_S = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type GayaTanggal = "short" | "long" | "day" | undefined;

/** "2026-10-15" -> "15 Okt 2026" (default), "15 Oktober 2026" (long), "Kamis, 15 Oktober 2026" (day) */
export function tanggal(s?: string | null, style?: GayaTanggal): string {
  if (!s) return "—";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "—";
  if (style === "long") return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  if (style === "day") return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  if (style === "short") return `${d.getDate()} ${BULAN_S[d.getMonth()]}`;
  return `${d.getDate()} ${BULAN_S[d.getMonth()]} ${d.getFullYear()}`;
}

/** ISO datetime -> "14:30" */
export function jam(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Waktu relatif: "3 jam lalu" */
export function relatif(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return tanggal(s);
}

/** 12500 -> "12.500" */
export function angka(n?: number | string | null, dec = 0): string {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("id-ID", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/** 12.5 -> "12,5" */
export function desimal(n?: number | string | null, dec = 1): string {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("id-ID", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/** Hitung umur (tahun) dari tanggal lahir */
export function umur(tglLahir?: string | null): number | null {
  if (!tglLahir) return null;
  const b = new Date(tglLahir);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

/** "Budi Santoso" -> "BS" */
export function inisial(nama?: string | null): string {
  if (!nama) return "?";
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** "L" -> "Laki-laki" */
export function gender(g?: string | null): string {
  return g === "L" ? "Laki-laki" : g === "P" ? "Perempuan" : "—";
}

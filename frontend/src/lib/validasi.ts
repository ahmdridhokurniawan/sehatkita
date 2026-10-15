/**
 * Validator bersama — diporting dari prototype `assets/js/core.js` (Valid).
 * Dipakai untuk aturan yang diminta pembimbing: angka wajib angka,
 * tanggal lahir tidak boleh melewati hari ini, dll.
 */

export type HasilValidasi = { ok: boolean; msg?: string; value?: number };

/** Rentang wajar tiap field angka (min, max, label) */
export const RANGE: Record<string, [number, number, string]> = {
  bb_kg: [20, 300, "Berat badan"],
  sistol: [60, 260, "Sistol"],
  diastol: [30, 160, "Diastol"],
  gula_darah: [20, 700, "Gula darah"],
  kolesterol: [50, 600, "Kolesterol"],
  asam_urat: [1, 20, "Asam urat"],
  lingkar_perut: [40, 200, "Lingkar perut"],
  tidur_jam: [0, 24, "Jam tidur"],
};

export function validEmail(v?: string | null): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || "");
}

/** Angka: hanya digit/desimal, dalam rentang field jika terdaftar */
export function validAngka(field: string, v?: string | number | null): HasilValidasi {
  if (v === "" || v === null || v === undefined) return { ok: true };
  if (!/^-?\d+(\.\d+)?$/.test(String(v))) return { ok: false, msg: "Hanya boleh angka." };
  const n = Number(v);
  const r = RANGE[field];
  if (r && (n < r[0] || n > r[1])) {
    return { ok: false, msg: `${r[2]} harus antara ${r[0]}–${r[1]}.` };
  }
  return { ok: true, value: n };
}

/** Tanggal tidak boleh di masa depan (mis. tanggal lahir) */
export function validTglLampau(v?: string | null): HasilValidasi {
  if (!v) return { ok: true };
  const d = new Date(v + "T00:00:00");
  if (isNaN(d.getTime())) return { ok: false, msg: "Format tanggal tidak valid." };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d > today) return { ok: false, msg: "Tanggal tidak boleh di masa depan." };
  return { ok: true };
}

/** Tanggal pemeriksaan: wajib, tidak boleh di masa depan */
export function validTglPemeriksaan(v?: string | null): HasilValidasi {
  if (!v) return { ok: false, msg: "Wajib diisi." };
  const d = new Date(v.length === 10 ? v + "T00:00:00" : v);
  if (isNaN(d.getTime())) return { ok: false, msg: "Format tidak valid." };
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (d > endOfToday) return { ok: false, msg: "Waktu pemeriksaan tidak boleh di masa depan." };
  return { ok: true };
}

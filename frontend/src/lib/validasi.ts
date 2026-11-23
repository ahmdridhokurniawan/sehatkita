/**
 * Validator bersama — diporting dari prototype `assets/js/core.js` (Valid).
 * Dipakai untuk aturan yang diminta pembimbing: angka wajib angka,
 * tanggal lahir tidak boleh melewati hari ini, dll.
 */

export type HasilValidasi = { ok: boolean; msg?: string; value?: number; anomali?: boolean };

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

/** Batas mustahil sesuai validasi keras backend (CatatanKesehatanController). */
export const BATAS_MUSTAHIL: Record<string, [number, number, string]> = {
  bb_kg: [0.01, 500, "Berat badan"],
  sistol: [1, 400, "Sistol"],
  diastol: [1, 300, "Diastol"],
  gula_darah: [0.01, 1500, "Gula darah"],
  kolesterol: [1, 1500, "Kolesterol"],
  asam_urat: [0.01, 50, "Asam urat"],
  lingkar_perut: [0.01, 300, "Lingkar perut"],
  tidur_jam: [0, 24, "Jam tidur"],
};

/** Angka: hanya digit/desimal; jika izinkanAnomali=true hanya menolak angka mustahil agar anomali masuk antrean verifikasi admin. */
export function validAngka(
  field: string,
  v?: string | number | null,
  izinkanAnomali = false,
): HasilValidasi {
  if (v === "" || v === null || v === undefined) return { ok: true };
  if (!/^-?\d+(\.\d+)?$/.test(String(v))) return { ok: false, msg: "Hanya boleh angka." };
  const n = Number(v);
  const wajar = RANGE[field];
  const luarWajar = Boolean(wajar && (n < wajar[0] || n > wajar[1]));

  if (izinkanAnomali) {
    const keras = BATAS_MUSTAHIL[field];
    if (keras && (n < keras[0] || n > keras[1])) {
      return { ok: false, msg: `${keras[2]} maksimal ${keras[1]} dan harus lebih dari 0.` };
    }
    return { ok: true, value: n, anomali: luarWajar };
  }

  if (luarWajar && wajar) {
    if (field === "gula_darah" && n < wajar[0]) {
      return {
        ok: false,
        msg: `Gula darah harus ${wajar[0]}–${wajar[1]} mg/dL (contoh 95 atau 140). Jika alat memakai mmol/L, kalikan 18 lebih dulu.`,
      };
    }
    return { ok: false, msg: `${wajar[2]} harus antara ${wajar[0]}–${wajar[1]}.` };
  }
  return { ok: true, value: n };
}

/** Validasi gula darah sesuai jenis pemeriksaan (HbA1c dalam %, lainnya mg/dL) */
export function validGulaDarah(
  v?: string | number | null,
  jenis?: string | null,
  izinkanAnomali = false,
): HasilValidasi {
  if (v === "" || v === null || v === undefined) return { ok: true };
  if (!/^-?\d+(\.\d+)?$/.test(String(v))) return { ok: false, msg: "Hanya boleh angka." };
  const n = Number(v);
  if (jenis === "hba1c") {
    if (n <= 0 || n > 25) {
      return { ok: false, msg: "Nilai HbA1c harus antara 0,1–25 % (contoh 5.7 atau 6.5)." };
    }
    return { ok: true, value: n, anomali: n < 3 || n > 20 };
  }
  return validAngka("gula_darah", v, izinkanAnomali);
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

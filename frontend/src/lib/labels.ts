/**
 * Penerjemah kode → tulisan cantik untuk pengguna.
 * Kode asli (mis. "gemuk") tetap dipakai untuk logika & API;
 * file ini hanya untuk TAMPILAN.
 */
import type {
  KategoriImt,
  StatusKesehatan,
  Sumber,
  JenisGulaDarah,
  JenisKelamin,
  TingkatAktivitas,
  StatusRujukan,
  StatusProgram,
  StatusPeserta,
} from "@/lib/enums";


/** Tulisan untuk status kesehatan */
export const LABEL_STATUS_KESEHATAN: Record<StatusKesehatan, string> = {
  normal: "Normal",
  perlu_perhatian: "Perlu Perhatian",
  berisiko: "Berisiko",
};

/** Tulisan untuk kategori IMT */
export const LABEL_KATEGORI_IMT: Record<KategoriImt, string> = {
  kurus: "Kurus",
  normal: "Normal",
  gemuk: "Gemuk",
  obesitas: "Obesitas",
};

/** Tulisan untuk sumber pengukuran */
export const LABEL_SUMBER: Record<Sumber, string> = {
  mandiri: "Mandiri",
  kader: "Kader",
  puskesmas: "Puskesmas",
};

/** Tulisan untuk jenis pemeriksaan gula darah */
export const LABEL_JENIS_GULA_DARAH: Record<JenisGulaDarah, string> = {
  puasa: "Gula Darah Puasa",
  sewaktu: "Gula Darah Sewaktu",
  "2jam_pp": "2 Jam Setelah Makan",
  hba1c: "HbA1c (%)",
};

export function satuanGulaDarah(jenis?: string | null): string {
  return jenis === "hba1c" ? "%" : "mg/dL";
}

export function formatNilaiGulaDarah(nilai?: number | null, jenis?: string | null): string {
  if (nilai === null || nilai === undefined) return "—";
  return `${nilai} ${satuanGulaDarah(jenis)}`;
}

/** Tulisan untuk jenis kelamin */
export const LABEL_JENIS_KELAMIN: Record<JenisKelamin, string> = {
  L: "Laki-laki",
  P: "Perempuan",
};

/** Tulisan untuk tingkat aktivitas */
export const LABEL_TINGKAT_AKTIVITAS: Record<TingkatAktivitas, string> = {
  ringan: "Ringan",
  sedang: "Sedang",
  berat: "Berat",
};

/** Tulisan untuk kode indikator tren (§8.2) */
export const LABEL_INDIKATOR: Record<string, string> = {
  bb_kg: "Berat Badan",
  imt: "IMT",
  sistol: "Tekanan Sistol",
  diastol: "Tekanan Diastol",
  gula_darah: "Gula Darah",
  kolesterol: "Kolesterol",
  asam_urat: "Asam Urat",
  lingkar_perut: "Lingkar Perut",
};

/** Tulisan untuk status rujukan (§11) */
export const LABEL_STATUS_RUJUKAN: Record<StatusRujukan, string> = {
  baru: "Baru",
  dihubungi: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

/** Tulisan untuk status program (§12) */
export const LABEL_STATUS_PROGRAM: Record<StatusProgram, string> = {
  akan_datang: "Akan Datang",
  berjalan: "Berjalan",
  selesai: "Selesai",
};

/** Tulisan untuk status keikutsertaan peserta program (§12.4) */
export const LABEL_STATUS_PESERTA: Record<StatusPeserta, string> = {
  terdaftar: "Terdaftar",
  menunggu_verifikasi: "Menunggu Verifikasi",
  selesai: "Selesai",
  ditolak: "Perlu Perbaikan",
  berhenti: "Berhenti",
};

/** Tulisan untuk faktor riwayat keluarga (§1.5 — self-report) */
export const LABEL_FAKTOR: Record<string, string> = {
  hipertensi: "Hipertensi",
  diabetes: "Diabetes",
  obesitas: "Obesitas",
  jantung: "Jantung",
  stroke: "Stroke",
  kolesterol: "Kolesterol tinggi",
  asma: "Asma",
  kanker: "Kanker",
  ginjal: "Gangguan ginjal",
  tidak_ada: "Tidak ada",
};

/** Tulisan untuk kode insight (§8.3) — kode mentah jangan tampil ke pengguna */
export const LABEL_INSIGHT: Record<string, string> = {
  BELUM_CATAT: "Belum ada catatan",
  BB_NAIK_3KALI: "Berat badan naik 3 kali berturut-turut",
  TENSI_TINGGI_2KALI: "Tekanan darah tinggi berulang",
  STATUS_BERISIKO: "Status kesehatan berisiko",
  BELUM_SKRINING_GULA: "Belum skrining gula darah",
  BELUM_CATAT_5HARI: "Belum mencatat 5 hari terakhir",
};

/** Tulisan untuk jenis target kesehatan (§13.4) */
export const LABEL_JENIS_TARGET: Record<string, string> = {
  berat_badan: "Berat badan",
  tinggi_badan: "Tinggi badan",
  massa_otot: "Massa otot",
  lingkar_perut: "Lingkar perut",
  air_minum: "Air minum",
  aktivitas: "Aktivitas",
  lainnya: "Lainnya",
};

/** Satuan baku untuk setiap jenis target kesehatan (kosong jika "lainnya" agar bisa diketik bebas). */
export const SATUAN_JENIS_TARGET: Record<string, string> = {
  berat_badan: "kg",
  tinggi_badan: "cm",
  massa_otot: "kg",
  lingkar_perut: "cm",
  air_minum: "ml",
  aktivitas: "kali",
  lainnya: "",
};

const LABEL_JENIS_TAMBAHAN: Record<string, string> = {
  tekanan_darah: "Tekanan darah",
  gula_darah: "Gula darah",
  kolesterol: "Kolesterol",
  asam_urat: "Asam urat",
};

/** Terjemahkan kode jenis target menjadi label terbaca. */
export function labelJenisTarget(kode: string): string {
  return (
    LABEL_JENIS_TARGET[kode] ||
    LABEL_JENIS_TAMBAHAN[kode] ||
    kode.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** Label peran pengguna untuk ditampilkan pada UI profil & topbar. */
export const LABEL_ROLE: Record<string, string> = {
  user: "Peserta Warga",
  kader: "Kader Posbindu",
  admin_kelurahan: "Admin Kelurahan",
  super_admin: "Super Admin Kota",
};

const LABEL_KATEGORI_MAP: Record<string, string> = {
  kurus: "Kurus",
  normal: "Normal",
  gemuk: "Gemuk",
  obesitas: "Obesitas",
  perlu_perhatian: "Perlu Perhatian",
  prehipertensi: "Prehipertensi",
  tinggi: "Tinggi",
  krisis: "Krisis",
  prediabetes: "Prediabetes",
  diabetes: "Diabetes",
  berisiko: "Berisiko",
  hipertensi_derajat_1: "Hipertensi Derajat 1",
  hipertensi_derajat_2: "Hipertensi Derajat 2",
};

/** Terjemahkan kode kategori hasil hitung server (snake_case) menjadi label terbaca. */
export function labelKategoriIndikator(kode?: string | null): string {
  if (!kode) return "";
  const kunci = kode.toLowerCase();
  if (LABEL_KATEGORI_MAP[kunci]) return LABEL_KATEGORI_MAP[kunci];
  return kode
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

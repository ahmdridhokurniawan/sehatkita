/**
 * Penerjemah kode → tulisan cantik untuk pengguna.
 * Kode asli (mis. "gemuk") tetap dipakai untuk logika & API;
 * file ini hanya untuk TAMPILAN.
 */
import type {
  KategoriImt,
  StatusKesehatan,
  LevelInsight,
  Sumber,
  JenisGulaDarah,
  KonsumsiManis,
  JenisKelamin,
  TingkatAktivitas,
  StatusRujukan,
  JenisProgram,
  StatusProgram,
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

/** Tulisan untuk tingkat bahaya insight */
export const LABEL_LEVEL_INSIGHT: Record<LevelInsight, string> = {
  info: "Info",
  peringatan: "Peringatan",
  bahaya: "Bahaya",
};

/** Tulisan untuk sumber pengukuran */
export const LABEL_SUMBER: Record<Sumber, string> = {
  mandiri: "Mandiri",
  kader: "Kader",
  puskesmas: "Puskesmas",
};

/** Tulisan untuk jenis gula darah */
export const LABEL_JENIS_GULA_DARAH: Record<JenisGulaDarah, string> = {
  puasa: "Puasa",
  "2jam_pp": "2 Jam Setelah Makan",
};

/** Tulisan untuk kebiasaan konsumsi manis */
export const LABEL_KONSUMSI_MANIS: Record<KonsumsiManis, string> = {
  jarang: "Jarang",
  sering: "Sering",
  setiap_hari: "Setiap Hari",
};
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
  dihubungi: "Dihubungi",
  tertangani: "Tertangani",
  ditolak: "Ditolak",
};

/** Tulisan untuk jenis program (§12) */
export const LABEL_JENIS_PROGRAM: Record<JenisProgram, string> = {
  olahraga: "Olahraga",
  edukasi: "Edukasi",
  pemeriksaan: "Pemeriksaan",
  lainnya: "Lainnya",
};

/** Tulisan untuk status program (§12) */
export const LABEL_STATUS_PROGRAM: Record<StatusProgram, string> = {
  akan_datang: "Akan Datang",
  berjalan: "Berjalan",
  selesai: "Selesai",
};


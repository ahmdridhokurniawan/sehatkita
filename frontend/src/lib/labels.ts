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

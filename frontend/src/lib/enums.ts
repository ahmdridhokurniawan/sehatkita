/**
 * Enum dari kontrak-api.md §1.7
 * Nilai enum HARUS sama persis dengan backend — jangan diubah sembarangan.
 * Ditulis `as const` supaya TypeScript bisa mengecek salah tulis.
 */
// §1.7 — role
export const ROLE = {
  SUPER_ADMIN: "super_admin",
  ADMIN_KELURAHAN: "admin_kelurahan",
  KADER: "kader",
  USER: "user",
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];
// §1.7 — sumber (asal data pengukuran)
export const SUMBER = {
  MANDIRI: "mandiri",
  KADER: "kader",
  PUSKESMAS: "puskesmas",
} as const;
export type Sumber = (typeof SUMBER)[keyof typeof SUMBER];
// §1.7 — jenis_gula_darah
export const JENIS_GULA_DARAH = {
  PUASA: "puasa",
  DUA_JAM_PP: "2jam_pp",
} as const;
export type JenisGulaDarah = (typeof JENIS_GULA_DARAH)[keyof typeof JENIS_GULA_DARAH];
// §1.7 — jenis_kelamin
export const JENIS_KELAMIN = {
  L: "L",
  P: "P",
} as const;
export type JenisKelamin = (typeof JENIS_KELAMIN)[keyof typeof JENIS_KELAMIN];
// §1.7 — status_rujukan
export const STATUS_RUJUKAN = {
  BARU: "baru",
  DIHUBUNGI: "dihubungi",
  TERTANGANI: "tertangani",
  DITOLAK: "ditolak",
} as const;
export type StatusRujukan = (typeof STATUS_RUJUKAN)[keyof typeof STATUS_RUJUKAN];
// §1.7 — status_kesehatan
export const STATUS_KESEHATAN = {
  NORMAL: "normal",
  PERLU_PERHATIAN: "perlu_perhatian",
  BERISIKO: "berisiko",
} as const;
export type StatusKesehatan = (typeof STATUS_KESEHATAN)[keyof typeof STATUS_KESEHATAN];
// §1.7 — kategori_imt
export const KATEGORI_IMT = {
  KURUS: "kurus",
  NORMAL: "normal",
  GEMUK: "gemuk",
  OBESITAS: "obesitas",
} as const;
export type KategoriImt = (typeof KATEGORI_IMT)[keyof typeof KATEGORI_IMT];
// §1.7 — tingkat_aktivitas
export const TINGKAT_AKTIVITAS = {
  RINGAN: "ringan",
  SEDANG: "sedang",
  BERAT: "berat",
} as const;
export type TingkatAktivitas = (typeof TINGKAT_AKTIVITAS)[keyof typeof TINGKAT_AKTIVITAS];
// §1.7 — konsumsi_manis
export const KONSUMSI_MANIS = {
  JARANG: "jarang",
  SERING: "sering",
  SETIAP_HARI: "setiap_hari",
} as const;
export type KonsumsiManis = (typeof KONSUMSI_MANIS)[keyof typeof KONSUMSI_MANIS];
// §1.7 — jenis_program
export const JENIS_PROGRAM = {
  OLAHRAGA: "olahraga",
  EDUKASI: "edukasi",
  PEMERIKSAAN: "pemeriksaan",
  LAINNYA: "lainnya",
} as const;
export type JenisProgram = (typeof JENIS_PROGRAM)[keyof typeof JENIS_PROGRAM];
// §1.7 — status_program
export const STATUS_PROGRAM = {
  AKAN_DATANG: "akan_datang",
  BERJALAN: "berjalan",
  SELESAI: "selesai",
} as const;
export type StatusProgram = (typeof STATUS_PROGRAM)[keyof typeof STATUS_PROGRAM];
// §1.7 — status_peserta
export const STATUS_PESERTA = {
  TERDAFTAR: "terdaftar",
  SELESAI: "selesai",
  BERHENTI: "berhenti",
} as const;
export type StatusPeserta = (typeof STATUS_PESERTA)[keyof typeof STATUS_PESERTA];
// §1.7 — level_insight
export const LEVEL_INSIGHT = {
  INFO: "info",
  PERINGATAN: "peringatan",
  BAHAYA: "bahaya",
} as const;
export type LevelInsight = (typeof LEVEL_INSIGHT)[keyof typeof LEVEL_INSIGHT];
/**
 * Tipe data dari kontrak-api.md (v1.2)
 * Setiap tipe di sini mencerminkan bentuk JSON yang dikirim backend.
 * Kalau backend ubah bentuk field → ubah di sini juga (setelah kesepakatan).
 */
import type {
  Role,
  Sumber,
  JenisGulaDarah,
  JenisKelamin,
  StatusRujukan,
  StatusKesehatan,
  KategoriImt,
  TingkatAktivitas,
  KonsumsiManis,
  JenisProgram,
  StatusProgram,
  StatusPeserta,
  LevelInsight,
  TipeNotifikasi,
} from "@/lib/enums";
/* ============================================================
 * §1.2 / §1.3 / §1.4 — Envelope response dari backend
 * ============================================================ */
/** Response SUKSES (tanpa paginasi) */
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}
/** Response SUKSES + paginasi */
export interface ApiPaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
}
/** Meta paginasi */
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
}
/** Response GAGAL (422 dst) */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
/** Query dasar untuk daftar: paginasi + pencarian (§1.3, §23) */
export interface ListQuery {
  page?: number;
  per_page?: number;
  /** §23 — pencarian teks */
  search?: string;
  /** §23 — alias pencarian teks */
  q?: string;
}
/* ============================================================
 * §6 — Wilayah & Faskes
 * ============================================================ */
export interface Wilayah {
  id: number;
  nama: string;
  tipe: "kecamatan" | "kelurahan";
  kode: string;
  parent_id: number | null;
}
export interface Faskes {
  id: number;
  nama: string;
  jenis: string;
  alamat: string;
  telepon: string;
  wilayah_id: number;
}
/* ============================================================
 * §4 — Auth & Pengguna
 * ============================================================ */
export interface Profil {
  user_id: number;
  tgl_lahir: string; // "1998-04-11"
  usia: number;
  jenis_kelamin: JenisKelamin;
  tinggi_cm: number;
  tingkat_aktivitas: TingkatAktivitas;
  merokok: boolean;
  riwayat_keluarga: string[];
  updated_at: string;
}
/** Profil versi ringkas yang ikut di GET /auth/me */
export interface ProfilRingkas {
  tgl_lahir: string;
  usia: number;
  jenis_kelamin: JenisKelamin;
  tinggi_cm: number;
  tingkat_aktivitas: TingkatAktivitas;
  merokok: boolean;
  riwayat_keluarga: string[];
}
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  wilayah_id: number;
  wilayah?: { id: number; nama: string };
  consent_at: string | null;
  profil?: ProfilRingkas;
}
/** Response login/register: user + token */
export interface AuthData {
  user: User;
  token: string;
}
/* ============================================================
 * §5 — Profil & Persetujuan
 * ============================================================ */
export interface PersetujuanData {
  consent_at: string | null;
  versi_kebijakan: string;
}
/* ============================================================
 * §7 — Catatan Kesehatan (inti)
 * ============================================================ */
export interface CatatanKesehatan {
  id: number;
  user_id: number;
  dicatat_pada: string; // "2026-10-03"
  sumber: Sumber;
  // Input user
  bb_kg: number | null;
  sistol: number | null;
  diastol: number | null;
  gula_darah: number | null;
  jenis_gula_darah: JenisGulaDarah | null;
  kolesterol: number | null;
  asam_urat: number | null;
  lingkar_perut: number | null;
  tidur_jam: number | null;
  merokok: boolean | null;
  konsumsi_manis: KonsumsiManis | null;
  catatan: string | null;
  // Dihitung server (read-only, FE hanya menampilkan)
  tinggi_cm: number | null;
  imt: number | null;
  kategori_imt: KategoriImt | null;
  kategori_tensi: StatusKesehatan | null;
  kategori_gula_darah: StatusKesehatan | null;
  kategori_kolesterol: StatusKesehatan | null;
  kategori_asam_urat: StatusKesehatan | null;
  status_kesehatan: StatusKesehatan | null;
  perlu_verifikasi: boolean;
  // Relasi
  dicatat_oleh: { id: number; name: string } | null;
  created_at: string;
}
/** Payload untuk POST /catatan-kesehatan (hanya field yang boleh dikirim FE) */
export interface CatatanKesehatanInput {
  dicatat_pada: string;
  sumber: Sumber;
  bb_kg?: number;
  sistol?: number;
  diastol?: number;
  gula_darah?: number;
  jenis_gula_darah?: JenisGulaDarah;
  kolesterol?: number;
  asam_urat?: number;
  lingkar_perut?: number;
  tidur_jam?: number;
  merokok?: boolean;
  konsumsi_manis?: KonsumsiManis;
  catatan?: string;
  // Khusus sumber=kader
  user_id?: number;
  sesi_posbindu_id?: number;
}
/** Query GET /catatan-kesehatan (§7.3 + §23) */
export interface CatatanQuery extends ListQuery {
  indikator?: string;
  dari?: string;
  sampai?: string;
  user_id?: number;
}
/* ============================================================
 * §8 — Dashboard Pribadi, Rekam Medis (dulu Tren), Insight
 * ============================================================ */
export interface IndikatorTerkini {
  bb_kg: number | null;
  tinggi_cm: number | null;
  imt: number | null;
  kategori_imt: KategoriImt | null;
  sistol: number | null;
  diastol: number | null;
  kategori_tensi: StatusKesehatan | null;
  gula_darah: number | null;
  kolesterol: number | null;
  asam_urat: number | null;
  lingkar_perut: number | null;
  dicatat_pada: string;
  sumber: Sumber;
}
export interface PerbandinganPeriode {
  periode_ini: string;
  periode_lalu: string;
  bb_selisih_kg: number | null;
  imt_selisih: number | null;
  sistol_selisih: number | null;
}
export interface TargetRingkas {
  bb_target_kg: number | null;
  progress_persen: number | null;
}
export interface JadwalSkrining {
  indikator: string;
  jatuh_tempo: string;
  status: string;
}
/** §25/§31 — ringkasan gamifikasi yang ikut di dashboard pribadi */
export interface RewardRingkas {
  exp: number;
  level: number;
  level_nama: string;
  badge: string[];
  rank_kelurahan: number;
  total_peserta_kelurahan: number;
}
export interface DashboardPribadi {
  status_kesehatan: StatusKesehatan;
  skor_risiko: number;
  indikator_terkini: IndikatorTerkini;
  perbandingan: PerbandinganPeriode;
  target: TargetRingkas;
  jadwal_skrining_berikutnya: JadwalSkrining[];
  rujukan_aktif: Rujukan | null;
  /** §31 — notifikasi yang akan datang (insight, rujukan, reward) */
  next_notifications: Notifikasi[];
  /** §25 — ringkasan gamifikasi (opsional, muncul bila ada) */
  reward?: RewardRingkas;
}
export interface TrenTitik {
  tanggal: string;
  nilai: number;
}
export interface TrenSeries {
  indikator: string;
  satuan: string;
  titik: TrenTitik[];
}
/**
 * §8.2 — Series indikator.
 * §24 — endpoint `/tren` berganti nama menjadi `/rekam-medis`
 * (bentuk response sama; `RekamMedis` adalah alias resmi).
 */
export interface RekamMedis {
  periode: string;
  series: TrenSeries[];
}
/** @deprecated gunakan `RekamMedis` (§24) */
export type Tren = RekamMedis;
/** Query GET /rekam-medis (§8.2) */
export interface RekamMedisQuery {
  indikator: string;
  periode: "1m" | "3m" | "6m" | "1y";
  /** §23 — pencarian teks (opsional) */
  search?: string;
}
export interface Insight {
  kode: string;
  level: LevelInsight;
  teks: string;
  dibuat_pada: string;
}
/** Query GET /insight (§29 — filter level) */
export interface InsightQuery {
  level?: LevelInsight;
  /** §23 — pencarian teks (opsional) */
  search?: string;
}
/* ============================================================
 * §27 / §32 — Notifikasi
 * ============================================================ */
export interface Notifikasi {
  id: number;
  tipe: TipeNotifikasi;
  judul: string;
  pesan: string;
  dibaca: boolean;
  /** untuk tipe `insight` */
  level?: LevelInsight | null;
  /** id sumber terkait (rujukan/program/insight), bila ada */
  ref_id?: number | null;
  dibuat_pada: string;
}
export interface NotifikasiQuery extends ListQuery {
  tipe?: TipeNotifikasi;
  belum_dibaca?: boolean;
}
/* ============================================================
 * §9 — Dashboard Kelurahan (agregat anonim)
 * ============================================================ */
export interface DistribusiItem {
  kategori?: string;
  faktor?: string;
  kelompok?: string;
  jumlah: number;
}
export interface RekapRujukan {
  total: number;
  baru: number;
  dihubungi: number;
  tertangani: number;
  ditolak: number;
  belum_ditindaklanjuti: number;
}
export interface TrenKelurahan {
  periode: string;
  total_pencatatan: number;
}
export interface DashboardKelurahan {
  wilayah: { id: number; nama: string };
  periode: string;
  total_peserta: number;
  total_pengguna_aktif: number;
  total_pencatatan: number;
  distribusi_imt: DistribusiItem[];
  distribusi_risiko: DistribusiItem[];
  distribusi_kelompok_usia: DistribusiItem[];
  rujukan: RekapRujukan;
  kepatuhan_pencatatan_persen: number;
  tren: TrenKelurahan[];
}
export interface DashboardKelurahanQuery {
  periode?: "1m" | "3m" | "6m" | "1y";
  wilayah_id?: number;
  /** §23 — pencarian teks (opsional) */
  search?: string;
}
/* ============================================================
 * §10 — Posbindu
 * ============================================================ */
export interface SesiPosbindu {
  id: number;
  wilayah_id: number;
  tanggal: string;
  lokasi: string;
  kader: { id: number; name: string };
  catatan: string | null;
  jumlah_peserta: number;
  hadir: number;
}
export interface PesertaSesi {
  kunjungan_id: number;
  user_id: number;
  name: string;
  hadir: boolean;
  dicatat: boolean;
}
export interface SesiPosbinduDetail extends SesiPosbindu {
  peserta: PesertaSesi[];
}
export interface SesiPosbinduInput {
  wilayah_id: number;
  tanggal: string;
  lokasi: string;
  kader_id?: number;
  catatan?: string;
}
export interface KunjunganPosbindu {
  kunjungan_id: number;
  sesi_id: number;
  tanggal: string;
  lokasi: string;
  hadir: boolean;
  catatan_kesehatan_id: number | null;
}
export interface KunjunganQuery extends ListQuery {
  user_id?: number;
}
/* ============================================================
 * §11 — Rujukan
 * ============================================================ */
export interface Rujukan {
  id: number;
  user_id: number;
  faskes: { id: number; nama: string };
  alasan: string;
  status: StatusRujukan;
  dibuat_oleh: { id: number; name: string };
  ditangani_oleh: { id: number; name: string } | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
}
export interface RujukanInput {
  user_id: number;
  faskes_id: number;
  alasan: string;
}
export interface RujukanQuery extends ListQuery {
  status?: StatusRujukan;
  wilayah_id?: number;
  dari?: string;
  sampai?: string;
}
/* ============================================================
 * §12 / §25 / §30 — Program (Tantangan & Reward)
 * ============================================================ */
export interface Program {
  id: number;
  judul: string;
  jenis: JenisProgram;
  target_peserta: number;
  jumlah_peserta: number;
  mulai: string;
  selesai: string | null;
  status: StatusProgram | null;
  diikuti: boolean;
  /** Gamifikasi program (kolom `program.badge/exp/level/rank_kelurahan`) */
  badge: string | null;
  exp: number;
  level: number;
  label_level?: string;
  rank_kelurahan: string | null;
}
export interface ProgramQuery extends ListQuery {
  status?: StatusProgram;
  jenis?: JenisProgram;
  wilayah_id?: number;
}
export interface ProgramInput {
  wilayah_id: number;
  judul: string;
  jenis: JenisProgram;
  target_peserta?: number;
  mulai: string;
  selesai?: string;
  badge?: string;
  exp?: number;
  level?: number;
}
export interface PesertaProgramInput {
  status: StatusPeserta;
  /** Wajib bila yang mengubah kader/admin/super_admin */
  user_id?: number;
}
/* ============================================================
 * §13 — Target & Refleksi
 * ============================================================ */
export interface TargetInput {
  bb_target_kg?: number;
  target_aktivitas_per_minggu?: number;
  target_air_ml?: number;
}
export interface Target {
  bb_target_kg: number | null;
  target_aktivitas_per_minggu: number | null;
  target_air_ml: number | null;
}
export interface Refleksi {
  id: number;
  minggu: string;
  catatan: string;
  created_at: string;
}
/* ============================================================
 * §14 — Laporan
 * ============================================================ */
export interface LaporanPribadi {
  periode: string;
  user: { name: string; usia: number; jenis_kelamin: JenisKelamin };
  ringkasan: {
    status_kesehatan: StatusKesehatan;
    skor_risiko: number;
    total_pencatatan: number;
  };
  catatan: Partial<CatatanKesehatan>[];
  rujukan: { tanggal: string; faskes: string; status: StatusRujukan }[];
  disclaimer: string;
}
/** §14.2 — agregat kelurahan + disclaimer */
export interface LaporanKelurahan extends DashboardKelurahan {
  disclaimer: string;
}
/* ============================================================
 * §15 — Modul Admin (Master Data)
 * ============================================================ */
export interface Indikator {
  id: number;
  kode: string;
  nama: string;
  satuan: string;
  kelompok: string;
}
export interface AmbangKategori {
  id: number;
  indikator: { kode: string; nama: string; satuan: string };
  batas_min: number;
  batas_max: number;
  kategori: string;
  status: StatusKesehatan;
  skor: number;
}
export interface AdminPengguna {
  id: number;
  name: string;
  email: string;
  role: Role;
  wilayah_id: number;
  wilayah?: { id: number; nama: string };
  aktif?: boolean;
}
export interface AdminPenggunaInput {
  name: string;
  email: string;
  role: Role;
  wilayah_id: number;
  password?: string;
}
export interface LogAudit {
  id: number;
  user_id: number;
  aksi: string;
  model: string;
  model_id: number;
  ip: string;
  user_agent: string;
  created_at: string;
}
export interface AdminStatistik {
  total_pengguna: number;
  total_catatan: number;
  total_rujukan: number;
  total_program: number;
  total_wilayah: number;
  total_faskes: number;
}

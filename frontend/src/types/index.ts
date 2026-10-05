/**
 * Tipe data dari kontrak-api.md
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
  LevelInsight,
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
/* ============================================================
 * §8 — Dashboard Pribadi, Tren, Insight
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
export interface Target {
  bb_target_kg: number | null;
  progress_persen: number | null;
}
export interface JadwalSkrining {
  indikator: string;
  jatuh_tempo: string;
  status: string;
}
export interface DashboardPribadi {
  status_kesehatan: StatusKesehatan;
  skor_risiko: number;
  indikator_terkini: IndikatorTerkini;
  perbandingan: PerbandinganPeriode;
  target: Target;
  jadwal_skrining_berikutnya: JadwalSkrining[];
  rujukan_aktif: unknown | null;
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
export interface Tren {
  periode: string;
  series: TrenSeries[];
}
export interface Insight {
  kode: string;
  level: LevelInsight;
  teks: string;
  dibuat_pada: string;
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
export interface KunjunganPosbindu {
  kunjungan_id: number;
  sesi_id: number;
  tanggal: string;
  lokasi: string;
  hadir: boolean;
  catatan_kesehatan_id: number | null;
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
/* ============================================================
 * §12 — Program Kesehatan
 * ============================================================ */
export interface Program {
  id: number;
  judul: string;
  jenis: JenisProgram;
  target_peserta: number;
  jumlah_peserta: number;
  mulai: string;
  selesai: string;
  status: StatusProgram;
  diikuti: boolean;
}
/* ============================================================
 * §13 — Target & Refleksi
 * ============================================================ */
export interface TargetInput {
  bb_target_kg?: number;
  target_aktivitas_per_minggu?: number;
  target_air_ml?: number;
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
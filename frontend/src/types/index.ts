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
} from "@/lib/enums";
export type { JenisGulaDarah };
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
  lat?: number | null;
  lng?: number | null;
}
/* ============================================================
 * §4 — Auth & Pengguna
 * ============================================================ */
export interface Profil {
  user_id: number;
  /** null bila profil belum diisi (§5.1) */
  tgl_lahir: string | null;
  usia: number | null;
  jenis_kelamin: JenisKelamin | null;
  tinggi_cm: number | null;
  tingkat_aktivitas: TingkatAktivitas | null;
  merokok: boolean | null;
  riwayat_keluarga: string[];
  tampil_di_peringkat: boolean;
  profil_lengkap: boolean;
  updated_at: string | null;
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
  nik?: string | null;
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
  token_expires_at?: string | null;
  token_ttl_menit?: number;
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
  skor_risiko?: number | null;
  perlu_verifikasi: boolean;
  // Relasi
  dicatat_oleh: { id: number; name: string } | null;
  /** Objek warga pemilik catatan — hanya dikirim untuk petugas (§7.2) */
  pengguna?: {
    id: number;
    name: string;
    nik?: string | null;
    email?: string;
    wilayah_id?: number;
    wilayah?: { id: number; nama: string } | null;
    profil?: ProfilRingkas | null;
  } | null;
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
  jenis_gula_darah?: JenisGulaDarah | null;
  kategori_gula_darah?: StatusKesehatan | null;
  kolesterol: number | null;
  kategori_kolesterol?: StatusKesehatan | null;
  asam_urat: number | null;
  kategori_asam_urat?: StatusKesehatan | null;
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
/** Katalog simbol lencana keaktifan (achievement) */
export interface AchievementItem {
  kode: string;
  nama: string;
  deskripsi: string;
  ikon: string;
  tier: "perunggu" | "perak" | "emas";
  kategori: string;
  syarat: string;
  diraih: boolean;
  diraih_pada: string | null;
  sumber: "keaktifan" | "program";
}
export interface AchievementRingkasan {
  total: number;
  diraih: number;
  persen: number;
}
export interface AchievementResponse {
  ringkasan: AchievementRingkasan;
  daftar: AchievementItem[];
}
/** §8.1 — blok gamifikasi di dashboard pribadi */
export interface GamifikasiRingkas {
  exp_total: number;
  level_gamifikasi: number;
  badge: string[];
  rank_kelurahan: number | null;
  achievement?: AchievementResponse;
}
export interface DashboardPribadi {
  status_kesehatan: StatusKesehatan;
  skor_risiko: number;
  /** §8.1 — false bila profil belum lengkap (tinggi/tgl lahir/jk kosong) */
  profil_lengkap: boolean;
  indikator_terkini: IndikatorTerkini | null;
  perbandingan: PerbandinganPeriode;
  target: TargetRingkas | null;
  jadwal_skrining_berikutnya: JadwalSkrining[];
  rujukan_aktif: Rujukan | null;
  /** §8.1 — gamifikasi (exp, level, badge, rank_kelurahan) */
  gamifikasi?: GamifikasiRingkas;
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
  user_id?: number;
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
 * §9 — Dashboard Kelurahan (agregat anonim)
 * ============================================================ */
export interface DistribusiItem {
  kategori?: string;
  faktor?: string;
  kelompok?: string;
  jumlah: number;
}
export interface RekapRujukan {
  /** §9.1 — hanya status dengan jumlah ≥ 5; `total` TIDAK dikirim (suppression). */
  baru?: number;
  dihubungi?: number;
  selesai?: number;
  ditolak?: number;
}
export interface TrenKelurahan {
  periode: string;
  total_pencatatan: number;
}
export interface DashboardKelurahan {
  wilayah: { id: number | null; nama: string };
  periode: string;
  total_peserta: number;
  total_pengguna_aktif: number;
  total_pencatatan: number;
  distribusi_imt: DistribusiItem[];
  /** §9.1 — menggantikan nama lama `distribusi_risiko` (self-report). */
  distribusi_riwayat_keluarga: DistribusiItem[];
  distribusi_kelompok_usia: DistribusiItem[];
  rujukan: RekapRujukan;
  kepatuhan_pencatatan_persen: number;
  tren: TrenKelurahan[];
  /** §9.2 — ada sel < 5 yang disembunyikan backend. */
  ada_data_disembunyikan: boolean;
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
  kader: { id: number; name: string } | null;
  catatan: string | null;
  status?: "akan_datang" | "berlangsung" | "selesai" | string;
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
  /** §11.2 — admin_kelurahan menerima bentuk TEREDAKSI (field ini absen). */
  user_id?: number;
  user?: { id: number; name: string; nik?: string | null } | null;
  faskes: { id: number; nama: string };
  alasan?: string;
  status: StatusRujukan;
  otomatis?: boolean;
  indikator?: string | null;
  dibuat_oleh?: { id: number; name: string } | null;
  ditangani_oleh?: { id: number; name: string } | null;
  catatan?: string | null;
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
export interface SuratRujukan {
  id: number;
  nomor_surat: string;
  tanggal_rujukan: string;
  tanggal_cetak: string;
  status: StatusRujukan;
  otomatis: boolean;
  indikator?: string | null;
  alasan: string;
  catatan?: string | null;
  pasien: {
    id?: number | null;
    name?: string | null;
    nik?: string | null;
    jenis_kelamin?: "L" | "P" | null;
    tgl_lahir?: string | null;
    usia?: number | null;
    wilayah?: string | null;
  };
  faskes: {
    id?: number | null;
    nama?: string | null;
    jenis?: string | null;
    alamat?: string | null;
    telepon?: string | null;
  };
  dibuat_oleh?: { id: number; name: string; role: string } | null;
  ditangani_oleh?: { id: number; name: string; role: string } | null;
  disclaimer: string;
}
/* ============================================================
 * §12 / §25 / §30 — Program (Tantangan & Reward)
 * ============================================================ */
export interface PesertaSaya {
  id: number;
  status: StatusPeserta;
  progres_persen?: number;
  capaian_nilai?: number;
  catatan_progres?: string | null;
  progres_diperbarui_pada?: string | null;
  bukti_foto_url?: string | null;
  bukti_foto_urls?: string[];
  catatan_bukti?: string | null;
  dikirim_pada?: string | null;
  catatan_verifikasi?: string | null;
  diverifikasi_pada?: string | null;
  selesai_pada?: string | null;
}
export type ModeProgresProgram = "otomatis" | "manual" | "tanpa_progres";

export interface Program {
  id: number;
  wilayah_id?: number | null;
  judul: string;
  deskripsi?: string | null;
  kriteria_misi?: string | null;
  jenis: JenisProgram;
  kategori_aktivitas?: string | null;
  target_peserta: number;
  mode_progres?: ModeProgresProgram;
  target_nilai?: number | null;
  satuan_target?: string | null;
  jumlah_peserta: number;
  mulai: string;
  selesai: string | null;
  status: StatusProgram | null;
  diikuti: boolean;
  status_saya?: StatusPeserta | null;
  peserta_saya?: PesertaSaya | null;
  peserta?: PesertaProgram[];
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
  exclude_jenis?: string;
  wilayah_id?: number;
}
export interface ProgramInput {
  wilayah_id?: number | null;
  judul: string;
  deskripsi?: string | null;
  kriteria_misi?: string | null;
  jenis: JenisProgram;
  kategori_aktivitas?: string | null;
  target_peserta?: number;
  mode_progres?: ModeProgresProgram;
  target_nilai?: number | null;
  satuan_target?: string | null;
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
  catatan_verifikasi?: string;
}
/** §12.6 — peserta program (GET /program/{id}/peserta) */
export interface PesertaProgram {
  id?: number;
  user_id: number;
  name: string;
  email?: string;
  status: StatusPeserta;
  progres_persen?: number;
  catatan_progres?: string | null;
  progres_diperbarui_pada?: string | null;
  bukti_foto_url?: string | null;
  bukti_foto_urls?: string[];
  catatan_bukti?: string | null;
  dikirim_pada?: string | null;
  catatan_verifikasi?: string | null;
  diverifikasi_pada?: string | null;
  terdaftar_pada?: string;
  selesai_pada?: string | null;
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
/** §13.4 — target kesehatan dinamis (CRUD /target-kesehatan) */
export type JenisTarget =
  | "berat_badan"
  | "tinggi_badan"
  | "massa_otot"
  | "lingkar_perut"
  | "air_minum"
  | "aktivitas"
  | "lainnya";
export interface TargetKesehatan {
  id: number;
  judul: string;
  jenis_target: JenisTarget | string;
  nilai_awal: number | null;
  nilai_target: number;
  satuan: string;
  tenggat_waktu: string | null;
  catatan_motivasi: string | null;
  tercapai: boolean;
  tercapai_pada: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}
export interface TargetKesehatanInput {
  judul: string;
  jenis_target: JenisTarget | string;
  nilai_awal?: number | null;
  nilai_target: number;
  satuan: string;
  tenggat_waktu?: string | null;
  catatan_motivasi?: string | null;
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
  satuan: string | null;
  kelompok: string | null;
  interval_skrining_hari?: number | null;
}
export interface AmbangKategori {
  id: number;
  indikator_id?: number;
  indikator: { kode: string; nama: string; satuan: string } | null;
  jenis_gula_darah?: JenisGulaDarah | null;
  memicu_rujukan?: boolean;
  batas_min: number;
  batas_max: number | null;
  kategori: string;
  status: StatusKesehatan;
  skor: number;
}
/** Blok §23 — hasil pencarian warga oleh petugas (autocomplete nama / NIK) */
export interface WargaCari {
  id: number;
  name: string;
  nik: string | null;
  wilayah_id: number | null;
  wilayah: string | null;
}
export interface AdminPengguna {
  id: number;
  name: string;
  nik?: string | null;
  email: string;
  role: Role;
  wilayah_id: number | null;
  kader_id?: number | null;
  wilayah?: { id: number; nama: string };
  aktif?: boolean;
}
export interface AdminPenggunaInput {
  name: string;
  nik?: string | null;
  email: string;
  role: Role;
  wilayah_id: number | null;
  kader_id?: number | null;
  password?: string;
  aktif?: boolean;
  alasan_mutasi?: string;
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
  pengguna?: { id: number; name: string; email: string } | null;
}
/** §A3 — Pengaduan warga */
export type KategoriPengaduan =
  | "layanan_posbindu"
  | "faskes"
  | "rujukan"
  | "aplikasi"
  | "lainnya";
export type StatusPengaduan = "menunggu" | "diproses" | "selesai" | "ditolak";
export interface Pengaduan {
  id: number;
  user_id: number;
  wilayah_id: number;
  judul: string;
  isi: string;
  kategori: KategoriPengaduan | string;
  status: StatusPengaduan;
  tanggapan: string | null;
  created_at: string;
  updated_at: string;
  pengguna?: { id: number; name: string; email: string } | null;
  wilayah?: { id: number; nama: string } | null;
  penanggap?: { id: number; name: string; role: string } | null;
}
export interface PengaduanInput {
  judul: string;
  isi: string;
  kategori: KategoriPengaduan;
  wilayah_id?: number | null;
}
export interface PengaduanTanggapiInput {
  status: Exclude<StatusPengaduan, "menunggu">;
  tanggapan: string;
}
/** §U12 — Riwayat perpindahan wilayah pengguna */
export interface RiwayatWilayah {
  id: number;
  user_id: number;
  wilayah_asal_id: number | null;
  wilayah_tujuan_id: number | null;
  alasan: string | null;
  diubah_oleh: number | null;
  created_at: string;
  wilayahAsal?: { id: number; nama: string; tipe: string } | null;
  wilayahTujuan?: { id: number; nama: string; tipe: string } | null;
  pengubah?: { id: number; name: string; role: string } | null;
}
export interface AdminStatistik {
  total_users: number;
  users_by_role: Record<string, number>;
  total_rujukan: number;
  rujukan_by_status: Record<string, number>;
  total_program: number;
  total_program_participants: number;
  program_by_status: Record<string, number>;
  total_catatan: number;
  avg_imt: number | null;
  avg_sistol: number | null;
  avg_diastol: number | null;
  total_wilayah: number;
  total_faskes: number;
  new_users_7d: number;
  new_rujukan_7d: number;
  new_catatan_7d: number;
  total_audit_logs_7d: number;
}

/* ============================================================
 * §12.5 Peringkat gamifikasi kelurahan
 * ============================================================ */
export interface PeringkatBaris {
  rank: number;
  nama: string;
  jumlah_badge?: number;
  badges?: string[];
  exp_total: number;
  level_gamifikasi: number;
}

export interface PeriodePeringkat {
  kode: string;
  label: string;
  kuartal: number;
  tahun: number;
  mulai: string;
  selesai: string;
  reset_berikutnya: string;
  sisa_hari: number;
  siklus_bulan: number;
}

export interface RiwayatPeringkatItem {
  periode_kode: string;
  periode_label: string;
  mulai_periode: string;
  selesai_periode: string;
  wilayah: { id: number; nama: string } | null;
  exp_akhir: number;
  level_akhir: number;
  peringkat_akhir: number | null;
  total_peserta: number;
  diarsipkan_pada: string | null;
}

export interface Peringkat {
  wilayah: { id: number; nama: string };
  periode?: PeriodePeringkat;
  peserta_peringkat: number;
  daftar: PeringkatBaris[];
  saya: { rank: number | null; jumlah_badge?: number; badges?: string[]; exp_total: number } | null;
  riwayat_saya?: RiwayatPeringkatItem[];
}

export interface KepuasanMasyarakatItem {
  id: number;
  rating: number;
  aspek_pelayanan: string | null;
  komentar: string | null;
  pengguna: { id: number; name: string } | null;
  wilayah: { id: number; nama: string } | null;
  created_at: string | null;
}

export interface KepuasanRingkasan {
  total_responden: number;
  rata_rata_rating: number;
  indeks_kepuasan_persen: number;
  distribusi_bintang: Record<string, number>;
}

/* ============================================================
 * §12.9 — Edukasi Mandiri & Progres Belajar Pribadi
 * ============================================================ */
export type EdukasiKategori =
  | "hipertensi"
  | "diabetes"
  | "gizi_imt"
  | "aktivitas_fisik"
  | "gaya_hidup"
  | "rujukan"
  | "umum";

export interface ProgresEdukasi {
  progres_persen: number;
  sudah_dibaca: boolean;
  catatan_pribadi: string | null;
  selesai_pada: string | null;
  updated_at: string | null;
}

export interface EdukasiItem {
  id: number;
  wilayah_id: number | null;
  judul: string;
  ringkasan: string;
  konten: string;
  media_foto_url?: string | null;
  media_video_file_url?: string | null;
  media_video_url?: string | null;
  kategori: EdukasiKategori;
  estimasi_menit: number;
  urutan: number;
  aktif: boolean;
  pembuat: { id: number; name: string; role: Role } | null;
  progres_saya: ProgresEdukasi;
  created_at: string | null;
  updated_at: string | null;
}

export interface EdukasiInput {
  wilayah_id?: number | null;
  judul: string;
  ringkasan: string;
  konten: string;
  media_foto_url?: string | null;
  media_video_file_url?: string | null;
  media_video_url?: string | null;
  kategori: EdukasiKategori;
  estimasi_menit?: number;
  urutan?: number;
  aktif?: boolean;
}

export interface RingkasanProgresEdukasi {
  total_materi: number;
  selesai: number;
  berjalan: number;
  belum: number;
  persen_keseluruhan: number;
}

/* ============================================================
 * §8.3 tabel ambang_kategori — dipakai halaman Insight
 * untuk menjelaskan kapan aman / siaga / bahaya.
 * ============================================================ */
export interface AmbangBaris {
  kode: string;
  nama: string;
  satuan: string | null;
  kategori: string;
  /** normal | perlu_perhatian | berisiko */
  status: string;
  batas_min: number | null;
  batas_max: number | null;
  skor: number;
  memicu_rujukan: boolean;
  jenis_gula_darah: string | null;
}

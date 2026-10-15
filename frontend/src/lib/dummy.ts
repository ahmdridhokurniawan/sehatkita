/**
 * Data dummy sesuai kontrak-api.md §7.2, §8.1, §9.1
 * (checklist §18). Dipakai untuk ngoding UI sebelum backend siap.
 *
 * ⚠️ Ini data PALSU. Nanti saat integrasi, ganti dengan panggilan
 *    `api.ts` yang sebenarnya. Jangan sampai terbawa ke produksi.
 */
import type {
  CatatanKesehatan,
  DashboardKelurahan,
  DashboardPribadi,
  Insight,
  Program,
  Rujukan,
  SesiPosbindu,
  Tren,
  User,
  Wilayah,
} from "@/types";
/* ============================================================
 * §4 — User contoh (Budi Santoso, dari kontrak)
 * ============================================================ */
export const dummyUser: User = {
  id: 12,
  name: "Budi Santoso",
  email: "budi@mail.com",
  role: "user",
  wilayah_id: 3,
  wilayah: { id: 3, nama: "Kelurahan Sungai Besar" },
  consent_at: "2026-10-03T09:00:00+08:00",
  profil: {
    tgl_lahir: "1998-04-11",
    usia: 28,
    jenis_kelamin: "L",
    tinggi_cm: 170,
    tingkat_aktivitas: "sedang",
    merokok: false,
    riwayat_keluarga: ["hipertensi", "diabetes"],
  },
};
/* ============================================================
 * §6 — Wilayah (untuk dropdown register)
 * ============================================================ */
export const dummyWilayah: Wilayah[] = [
  { id: 1, nama: "Kecamatan Landasan Ulin", tipe: "kecamatan", kode: "6372", parent_id: null },
  { id: 2, nama: "Kecamatan Banjarbaru Utara", tipe: "kecamatan", kode: "6373", parent_id: null },
  { id: 3, nama: "Kelurahan Sungai Besar", tipe: "kelurahan", kode: "6372001", parent_id: 1 },
  { id: 4, nama: "Kelurahan Guntung Payung", tipe: "kelurahan", kode: "6372002", parent_id: 1 },
  { id: 5, nama: "Kelurahan Syamsudin Noor", tipe: "kelurahan", kode: "6372003", parent_id: 1 },
];
/* ============================================================
 * §7.2 — Catatan Kesehatan (contoh dari kontrak)
 * ============================================================ */
export const dummyCatatanKesehatan: CatatanKesehatan[] = [
  {
    id: 41,
    user_id: 12,
    dicatat_pada: "2026-10-03",
    sumber: "mandiri",
    bb_kg: 72.5,
    sistol: 138,
    diastol: 88,
    gula_darah: 110,
    jenis_gula_darah: "puasa",
    kolesterol: 200,
    asam_urat: 6.1,
    lingkar_perut: 92,
    tidur_jam: 6,
    merokok: true,
    konsumsi_manis: "sering",
    catatan: "Kurang tidur karena lembur",
    tinggi_cm: 170,
    imt: 25.09,
    kategori_imt: "gemuk",
    kategori_tensi: "perlu_perhatian",
    kategori_gula_darah: "normal",
    kategori_kolesterol: "perlu_perhatian",
    kategori_asam_urat: "normal",
    status_kesehatan: "perlu_perhatian",
    perlu_verifikasi: false,
    dicatat_oleh: { id: 5, name: "Kader A" },
    created_at: "2026-10-03T14:22:00+08:00",
  },
  {
    id: 40,
    user_id: 12,
    dicatat_pada: "2026-09-03",
    sumber: "mandiri",
    bb_kg: 73.7,
    sistol: 140,
    diastol: 90,
    gula_darah: null,
    jenis_gula_darah: null,
    kolesterol: null,
    asam_urat: null,
    lingkar_perut: 93,
    tidur_jam: 7,
    merokok: false,
    konsumsi_manis: "sering",
    catatan: null,
    tinggi_cm: 170,
    imt: 25.5,
    kategori_imt: "gemuk",
    kategori_tensi: "perlu_perhatian",
    kategori_gula_darah: null,
    kategori_kolesterol: null,
    kategori_asam_urat: null,
    status_kesehatan: "perlu_perhatian",
    perlu_verifikasi: false,
    dicatat_oleh: null,
    created_at: "2026-09-03T08:15:00+08:00",
  },
  {
    id: 39,
    user_id: 12,
    dicatat_pada: "2026-08-03",
    sumber: "kader",
    bb_kg: 75.4,
    sistol: 142,
    diastol: 91,
    gula_darah: 118,
    jenis_gula_darah: "puasa",
    kolesterol: 210,
    asam_urat: 6.4,
    lingkar_perut: 94,
    tidur_jam: 6,
    merokok: false,
    konsumsi_manis: "setiap_hari",
    catatan: "Diukur di Posbindu",
    tinggi_cm: 170,
    imt: 26.1,
    kategori_imt: "gemuk",
    kategori_tensi: "perlu_perhatian",
    kategori_gula_darah: "perlu_perhatian",
    kategori_kolesterol: "perlu_perhatian",
    kategori_asam_urat: "normal",
    status_kesehatan: "perlu_perhatian",
    perlu_verifikasi: false,
    dicatat_oleh: { id: 5, name: "Kader A" },
    created_at: "2026-08-03T09:30:00+08:00",
  },
];
/* ============================================================
 * §8.1 — Dashboard Pribadi (contoh dari kontrak)
 * ============================================================ */
export const dummyDashboardPribadi: DashboardPribadi = {
  status_kesehatan: "perlu_perhatian",
  skor_risiko: 42,
  indikator_terkini: {
    bb_kg: 72.5,
    tinggi_cm: 170,
    imt: 25.09,
    kategori_imt: "gemuk",
    sistol: 138,
    diastol: 88,
    kategori_tensi: "perlu_perhatian",
    gula_darah: 110,
    kolesterol: 200,
    asam_urat: 6.1,
    lingkar_perut: 92,
    dicatat_pada: "2026-10-03",
    sumber: "mandiri",
  },
  perbandingan: {
    periode_ini: "2026-10",
    periode_lalu: "2026-09",
    bb_selisih_kg: -1.2,
    imt_selisih: -0.42,
    sistol_selisih: -4,
  },
  target: { bb_target_kg: 68, progress_persen: 60 },
  jadwal_skrining_berikutnya: [
    { indikator: "gula_darah", jatuh_tempo: "2026-11-03", status: "akan_datang" },
  ],
  rujukan_aktif: null,
  next_notifications: [],
};
/* ============================================================
 * §8.2 — Tren (contoh dari kontrak)
 * ============================================================ */
export const dummyTren: Tren = {
  periode: "3m",
  series: [
    {
      indikator: "imt",
      satuan: "kg/m2",
      titik: [
        { tanggal: "2026-08-03", nilai: 26.1 },
        { tanggal: "2026-09-03", nilai: 25.5 },
        { tanggal: "2026-10-03", nilai: 25.09 },
      ],
    },
    {
      indikator: "bb_kg",
      satuan: "kg",
      titik: [
        { tanggal: "2026-08-03", nilai: 75.4 },
        { tanggal: "2026-09-03", nilai: 73.7 },
        { tanggal: "2026-10-03", nilai: 72.5 },
      ],
    },
  ],
};
/* ============================================================
 * §8.3 — Insight (contoh dari kontrak)
 * ============================================================ */
export const dummyInsight: Insight[] = [
  {
    kode: "BB_NAIK_3MINGGU",
    level: "peringatan",
    teks: "Berat badan mengalami peningkatan selama 3 minggu terakhir.",
    dibuat_pada: "2026-10-03T08:00:00+08:00",
  },
  {
    kode: "BELUM_SKRINING_GULA",
    level: "info",
    teks: "Anda belum melakukan skrining gula darah selama 7 bulan. Jadwalkan pemeriksaan.",
    dibuat_pada: "2026-10-03T08:00:00+08:00",
  },
  {
    kode: "TENSI_TINGGI_2X",
    level: "bahaya",
    teks: "Tekanan darah Anda berada di atas batas normal pada 2 pencatatan terakhir.",
    dibuat_pada: "2026-10-03T08:00:00+08:00",
  },
];
/* ============================================================
 * §9.1 — Dashboard Kelurahan (contoh dari kontrak)
 * ============================================================ */
export const dummyDashboardKelurahan: DashboardKelurahan = {
  wilayah: { id: 3, nama: "Kelurahan Sungai Besar" },
  periode: "3m",
  total_peserta: 214,
  total_pengguna_aktif: 178,
  total_pencatatan: 940,
  distribusi_imt: [
    { kategori: "kurus", jumlah: 12 },
    { kategori: "normal", jumlah: 120 },
    { kategori: "gemuk", jumlah: 62 },
    { kategori: "obesitas", jumlah: 20 },
  ],
  distribusi_risiko: [
    { faktor: "hipertensi", jumlah: 48 },
    { faktor: "diabetes", jumlah: 21 },
    { faktor: "obesitas", jumlah: 20 },
  ],
  distribusi_kelompok_usia: [
    { kelompok: "20-24", jumlah: 18 },
    { kelompok: "25-29", jumlah: 34 },
    { kelompok: "50-54", jumlah: 9 },
  ],
  rujukan: {
    total: 30,
    baru: 8,
    dihubungi: 10,
    tertangani: 10,
    ditolak: 2,
    belum_ditindaklanjuti: 8,
  },
  kepatuhan_pencatatan_persen: 71,
  tren: [
    { periode: "2026-08", total_pencatatan: 280 },
    { periode: "2026-09", total_pencatatan: 320 },
    { periode: "2026-10", total_pencatatan: 340 },
  ],
};
/* ============================================================
 * §10 — Sesi Posbindu
 * ============================================================ */
export const dummySesiPosbindu: SesiPosbindu[] = [
  {
    id: 7,
    wilayah_id: 3,
    tanggal: "2026-10-10",
    lokasi: "Balai Kelurahan Sungai Besar",
    kader: { id: 5, name: "Kader A" },
    catatan: "Pemeriksaan rutin bulanan",
    jumlah_peserta: 42,
    hadir: 30,
  },
  {
    id: 8,
    wilayah_id: 3,
    tanggal: "2026-11-10",
    lokasi: "Balai Kelurahan Sungai Besar",
    kader: { id: 5, name: "Kader A" },
    catatan: "Pemeriksaan rutin bulanan",
    jumlah_peserta: 40,
    hadir: 0,
  },
];
/* ============================================================
 * §11 — Rujukan
 * ============================================================ */
export const dummyRujukan: Rujukan[] = [
  {
    id: 15,
    user_id: 12,
    faskes: { id: 1, nama: "Puskesmas Landasan Ulin" },
    alasan: "Tekanan darah tinggi pada 2 pengukuran terakhir",
    status: "baru",
    dibuat_oleh: { id: 5, name: "Kader A" },
    ditangani_oleh: null,
    catatan: null,
    created_at: "2026-10-03T14:30:00+08:00",
    updated_at: "2026-10-03T14:30:00+08:00",
  },
  {
    id: 16,
    user_id: 13,
    faskes: { id: 2, nama: "Puskesmas Banjarbaru Utara" },
    alasan: "Gula darah puasa 156 mg/dL, perlu pemeriksaan lanjutan",
    status: "dihubungi",
    dibuat_oleh: { id: 5, name: "Kader A" },
    ditangani_oleh: { id: 6, name: "Kader B" },
    catatan: "Sudah dihubungi via telepon, jadwal kontrol Senin",
    created_at: "2026-09-28T09:15:00+08:00",
    updated_at: "2026-09-30T10:00:00+08:00",
  },
  {
    id: 17,
    user_id: 14,
    faskes: { id: 1, nama: "Puskesmas Landasan Ulin" },
    alasan: "IMT 32.4 (obesitas) dengan riwayat hipertensi",
    status: "tertangani",
    dibuat_oleh: { id: 5, name: "Kader A" },
    ditangani_oleh: { id: 7, name: "dr. Sari" },
    catatan: "Sudah ditangani, pasien mendapat edukasi gizi dan obat antihipertensi",
    created_at: "2026-09-15T08:00:00+08:00",
    updated_at: "2026-09-20T14:30:00+08:00",
  },
  {
    id: 18,
    user_id: 15,
    faskes: { id: 3, nama: "Klinik Sehat Bersama" },
    alasan: "Kolesterol total 265 mg/dL",
    status: "ditolak",
    dibuat_oleh: { id: 6, name: "Kader B" },
    ditangani_oleh: { id: 8, name: "Kader C" },
    catatan: "Pasien menolak dirujuk, memilih kontrol mandiri",
    created_at: "2026-09-10T11:20:00+08:00",
    updated_at: "2026-09-12T09:00:00+08:00",
  },
];
/* ============================================================
 * §12 — Program
 * ============================================================ */
export const dummyProgram: Program[] = [
  {
    id: 4,
    judul: "Program 21 Hari Hidup Sehat",
    jenis: "olahraga",
    target_peserta: 100,
    jumlah_peserta: 64,
    mulai: "2026-10-06",
    selesai: "2026-10-27",
    status: "berjalan",
    diikuti: true,
  },
  {
    id: 5,
    judul: "Edukasi Gizi Seimbang",
    jenis: "edukasi",
    target_peserta: 50,
    jumlah_peserta: 50,
    mulai: "2026-09-01",
    selesai: "2026-09-30",
    status: "selesai",
    diikuti: false,
  },
];
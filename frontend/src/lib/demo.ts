/**
 * Data DEMO untuk landing page — diporting dari prototype `mock.js`.
 * Dipakai untuk pratinjau produk di landing (grafik, insight, tantangan).
 * ⚠️ Bukan data asli — hanya untuk pratinjau.
 */

export type CatatanDemo = {
  id: number;
  hari_lalu: number;
  sumber: "mandiri" | "posbindu";
  bb_kg: number;
  sistol: number;
  diastol: number;
  gula_darah: number;
  jenis_gula_darah: string;
  kolesterol: number;
  asam_urat: number;
  lingkar_perut: number;
  tidur_jam: number;
  merokok: boolean;
};

/** Catatan demo — urut lama → baru (9 entri, porting dari mock.js) */
export const CATATAN_DEMO: CatatanDemo[] = [
  { id: 1, hari_lalu: 97, sumber: "mandiri", bb_kg: 91.0, sistol: 134, diastol: 85, gula_darah: 122, jenis_gula_darah: "puasa", kolesterol: 215, asam_urat: 7.0, lingkar_perut: 104, tidur_jam: 7, merokok: false },
  { id: 2, hari_lalu: 90, sumber: "mandiri", bb_kg: 90.1, sistol: 136, diastol: 86, gula_darah: 125, jenis_gula_darah: "puasa", kolesterol: 220, asam_urat: 7.2, lingkar_perut: 103, tidur_jam: 6.5, merokok: true },
  { id: 3, hari_lalu: 80, sumber: "posbindu", bb_kg: 89.2, sistol: 140, diastol: 90, gula_darah: 133, jenis_gula_darah: "puasa", kolesterol: 226, asam_urat: 7.4, lingkar_perut: 103, tidur_jam: 6.5, merokok: true },
  { id: 4, hari_lalu: 66, sumber: "mandiri", bb_kg: 88.6, sistol: 138, diastol: 88, gula_darah: 130, jenis_gula_darah: "puasa", kolesterol: 230, asam_urat: 7.5, lingkar_perut: 102, tidur_jam: 6, merokok: true },
  { id: 5, hari_lalu: 52, sumber: "mandiri", bb_kg: 88.0, sistol: 142, diastol: 89, gula_darah: 136, jenis_gula_darah: "puasa", kolesterol: 238, asam_urat: 7.7, lingkar_perut: 102, tidur_jam: 6, merokok: true },
  { id: 6, hari_lalu: 38, sumber: "posbindu", bb_kg: 87.5, sistol: 150, diastol: 95, gula_darah: 145, jenis_gula_darah: "puasa", kolesterol: 245, asam_urat: 8.3, lingkar_perut: 101, tidur_jam: 5.5, merokok: true },
  { id: 7, hari_lalu: 24, sumber: "mandiri", bb_kg: 86.8, sistol: 146, diastol: 91, gula_darah: 141, jenis_gula_darah: "2jam_pp", kolesterol: 240, asam_urat: 7.9, lingkar_perut: 100, tidur_jam: 6, merokok: true },
  { id: 8, hari_lalu: 17, sumber: "mandiri", bb_kg: 86.0, sistol: 144, diastol: 90, gula_darah: 128, jenis_gula_darah: "puasa", kolesterol: 231, asam_urat: 7.6, lingkar_perut: 100, tidur_jam: 6, merokok: true },
  { id: 9, hari_lalu: 9, sumber: "posbindu", bb_kg: 85.2, sistol: 152, diastol: 94, gula_darah: 138, jenis_gula_darah: "puasa", kolesterol: 235, asam_urat: 8.1, lingkar_perut: 99, tidur_jam: 5, merokok: true },
];

/** Distribusi kategori IMT (agregat demo, DASH_KELURAHAN) */
export const DISTRIBUSI_IMT_DEMO = [
  { kategori: "Kurus", jumlah: 62 },
  { kategori: "Normal", jumlah: 486 },
  { kategori: "Gemuk", jumlah: 312 },
  { kategori: "Obesitas", jumlah: 158 },
];

/** Tren pencatatan bulanan (agregat demo) */
export const TREN_DEMO = {
  label: ["Mei", "Jun", "Jul", "Agu", "Sep", "Okt"],
  pencatatan: [42, 55, 61, 74, 68, 86],
};

export type ProgramDemo = {
  id: number;
  nama: string;
  jenis: string;
  status: "berjalan" | "selesai" | "akan_datang";
  deskripsi: string;
  durasi: string;
  peserta: number;
  progress: number;
  reward?: { badge?: string; exp?: number };
};

/** Program / tantangan demo (porting dari mock.js) */
export const PROGRAM_DEMO: ProgramDemo[] = [
  { id: 1, nama: "Tantangan 7 Hari Aktif Bergerak", jenis: "olahraga", status: "berjalan", deskripsi: "Berjalan minimal 30 menit setiap hari selama 7 hari.", durasi: "7 hari", peserta: 128, progress: 62, reward: { badge: "Pejalan Aktif", exp: 50 } },
  { id: 2, nama: "Edukasi Pola Makan Seimbang", jenis: "edukasi", status: "berjalan", deskripsi: "Belajar mengatur porsi gizi seimbang bersama kader.", durasi: "2 sesi", peserta: 96, progress: 40, reward: { badge: "Gizi Bijak", exp: 40 } },
  { id: 3, nama: "Gerakan Kurangi Gula", jenis: "penyuluhan", status: "akan_datang", deskripsi: "Kurangi konsumsi gula harian bersama warga kelurahan.", durasi: "14 hari", peserta: 74, progress: 0, reward: { badge: "Bebas Gula", exp: 60 } },
];

/** Insight demo (porting dari landing.js paneInsight) */
export const INSIGHT_DEMO = [
  { t: "bahaya", j: "Tekanan darah tinggi berulang", p: "Tiga pengukuran terakhir menunjukkan sistol ≥ 140 mmHg. Segera periksakan diri ke fasilitas kesehatan.", i: "alert-triangle" },
  { t: "peringatan", j: "Berat badan naik 5 kg dalam 3 minggu", p: "Kenaikan berat badan melebihi 3 kg dalam 3 minggu terakhir.", i: "trending-up" },
  { t: "info", j: "Kualitas tidur kurang", p: "Rata-rata tidur 5–6 jam per hari, di bawah rekomendasi.", i: "clock" },
] as const;

/** FAQ landing (porting dari landing.js) */
export const FAQ_LANDING: [string, string][] = [
  ["Apa itu SehatKita?", "SehatKita adalah platform monitoring kesehatan Penyakit Tidak Menular (PTM) yang membantu masyarakat Kota Banjarbaru memantau kondisi kesehatan, memahami perubahan indikator, dan mengikuti program kesehatan wilayah."],
  ["Apakah SehatKita menggantikan dokter?", "Tidak. SehatKita bukan alat diagnosis medis. Semua insight bersifat informasi dan tidak menggantikan pemeriksaan atau nasihat tenaga kesehatan profesional."],
  ["Bagaimana cara mencatat kesehatan?", "Buka menu Rekam Medis lalu tekan tombol Catat Kesehatan. Isi waktu, sumber, dan hasil pengukuran yang Anda miliki. Hanya waktu dan sumber yang wajib diisi; pengukuran lain opsional."],
  ["Apakah profil wajib dilengkapi saat login?", "Tidak. Setelah masuk Anda langsung dapat menggunakan aplikasi. Lengkapi profil kapan pun Anda siap melalui halaman Lengkapi Profil."],
  ["Bagaimana insight kesehatan ditentukan?", "Insight dihitung oleh rule engine di backend berdasarkan data yang Anda catat dan ambang kategori yang berlaku. Frontend hanya menampilkan hasil dari backend."],
  ["Bagaimana proses rujukan?", "Saat hasil pemeriksaan memerlukan tindak lanjut, sistem dapat membuat rujukan ke fasilitas kesehatan. Anda dapat memantau statusnya (baru, dihubungi, tertangani, ditolak)."],
  ["Bagaimana tantangan dan reward bekerja?", "Anda dapat mengikuti tantangan kesehatan wilayah. Progres dan reward (badge, level) diberikan berdasarkan partisipasi nyata dan diverifikasi backend — bukan karena tombol diklik."],
  ["Siapa yang dapat melihat data kesehatan?", "Data kesehatan individual hanya dapat diakses oleh Anda sendiri dan petugas berwenang sesuai izin. Admin kelurahan hanya melihat data agregat wilayah, bukan catatan pribadi."],
  ["Bagaimana memperbaiki catatan yang salah?", "Catatan kesehatan bersifat append-only dan tidak dapat diedit. Anda dapat menghapus catatan yang salah (dengan konfirmasi) lalu membuat catatan baru yang benar."],
];

/** Akun demo (prototipe) — untuk mengisi cepat form login. */
export type AkunDemo = { email: string; password: string; role: string; name: string };
export const AKUN_DEMO: AkunDemo[] = [
  { email: "budi@demo.sehatkita.id", password: "sehat123", role: "user", name: "Budi Santoso" },
  { email: "kader@demo.sehatkita.id", password: "sehat123", role: "kader", name: "Siti Aminah" },
  { email: "admin@demo.sehatkita.id", password: "sehat123", role: "admin_kelurahan", name: "Ahmad Fauzi" },
  { email: "puskesmas@demo.sehatkita.id", password: "sehat123", role: "puskesmas", name: "dr. Rina Marlina" },
  { email: "super@demo.sehatkita.id", password: "sehat123", role: "super_admin", name: "Super Admin" },
];

export const LABEL_ROLE_DEMO: Record<string, string> = {
  user: "Masyarakat",
  kader: "Kader Posbindu",
  admin_kelurahan: "Admin Kelurahan",
  puskesmas: "Puskesmas",
  super_admin: "Super Admin",
};

/** Wilayah demo untuk dropdown register (dikelompokkan per kecamatan). */
export type WilayahDemo = { id: number; kecamatan: string; kelurahan: string };
export const WILAYAH_DEMO: WilayahDemo[] = [
  { id: 1, kecamatan: "Landasan Ulin", kelurahan: "Sungai Besar" },
  { id: 2, kecamatan: "Landasan Ulin", kelurahan: "Guntung Payung" },
  { id: 3, kecamatan: "Landasan Ulin", kelurahan: "Syamsudin Noor" },
  { id: 4, kecamatan: "Banjarbaru Utara", kelurahan: "Loktabat Utara" },
  { id: 5, kecamatan: "Banjarbaru Utara", kelurahan: "Kemuning" },
  { id: 6, kecamatan: "Cempaka", kelurahan: "Cempaka" },
  { id: 7, kecamatan: "Liang Anggang", kelurahan: "Landasan Ulin Timur" },
];

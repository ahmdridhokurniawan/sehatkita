<?php

namespace Database\Seeders;

use App\Models\Edukasi;
use Illuminate\Database\Seeder;

class EdukasiSeeder extends Seeder
{
    public function run(): void
    {
        $materi = [
            [
                'judul' => 'Mengenal Hipertensi dan Cara Mengontrol Tekanan Darah',
                'kategori' => 'hipertensi',
                'estimasi_menit' => 5,
                'urutan' => 1,
                'ringkasan' => 'Pahami batas normal tekanan darah (< 130/85 mmHg), tanda bahaya krisis hipertensi, dan langkah harian membatasi natrium.',
                'konten' => "Tekanan darah tinggi sering disebut silent killer karena kerap tidak bergejala hingga muncul komplikasi jantung atau stroke.\n\n"
                    ."1. Ambang Skrining Kemenkes RI: Normal di bawah 130/85 mmHg, perlu perhatian pada 130–139/85–89 mmHg, dan kategori tinggi bila mencapai 140/90 mmHg atau lebih.\n"
                    ."2. Batasi konsumsi garam kurang dari 1 sendok teh (5 gram) per hari dan kurangi makanan kemasan tinggi natrium.\n"
                    ."3. Lakukan aktivitas fisik intensitas sedang seperti jalan cepat minimal 30 menit sebanyak 5 hari seminggu.\n"
                    ."4. Jangan menghentikan obat antihipertensi secara mandiri tanpa evaluasi dokter atau petugas Puskesmas.",
            ],
            [
                'judul' => 'Memahami Jenis Pemeriksaan Gula Darah: Puasa, Sewaktu, 2JPP & HbA1c',
                'kategori' => 'diabetes',
                'estimasi_menit' => 6,
                'urutan' => 2,
                'ringkasan' => 'Perbedaan nilai rujukan pemeriksaan gula darah puasa, gula darah sewaktu, 2 jam setelah makan, serta HbA1c dalam persen.',
                'konten' => "Setiap metode pemeriksaan gula darah memiliki fungsi dan batas rujukan yang berbeda:\n\n"
                    ."• Gula Darah Puasa (puasa ≥ 8 jam): Normal < 100 mg/dL, Waspada/Prediabetes 100–125 mg/dL, Tinggi ≥ 126 mg/dL.\n"
                    ."• Gula Darah Sewaktu (kapan saja tanpa puasa): Normal < 140 mg/dL, Waspada 140–199 mg/dL, Tinggi ≥ 200 mg/dL.\n"
                    ."• Gula Darah 2 Jam Setelah Makan (2JPP): Normal < 140 mg/dL, Waspada 140–199 mg/dL, Tinggi ≥ 200 mg/dL.\n"
                    ."• HbA1c (% rata-rata gula darah 2–3 bulan terakhir): Normal < 5,7%, Waspada/Prediabetes 5,7–6,4%, Tinggi ≥ 6,5%.\n\n"
                    ."Catat selalu jenis pemeriksaan yang sesuai agar sistem menilai risiko Anda dengan akurat.",
            ],
            [
                'judul' => 'Menjaga Berat Badan Ideal & Indeks Massa Tubuh (IMT)',
                'kategori' => 'gizi_imt',
                'estimasi_menit' => 4,
                'urutan' => 3,
                'ringkasan' => 'Panduan klasifikasi IMT dewasa Indonesia (Permenkes RI No. 41/2014) dan pola piring makan gizi seimbang.',
                'konten' => "Indeks Massa Tubuh (IMT) dihitung dari berat badan (kg) dibagi kuadrat tinggi badan (m²).\n\n"
                    ."Klasifikasi resmi Indonesia: Kurus (< 18,5), Normal (18,5–25,0), Gemuk (> 25,0–27,0), dan Obesitas (> 27,0).\n\n"
                    ."Terapkan prinsip Isi Piringku: setengah piring berisi sayur dan buah beragam warna, seperempat karbohidrat kompleks, dan seperempat lauk berprotein rendah lemak jenuh.",
            ],
            [
                'judul' => 'Aktivitas Fisik Rutin 150 Menit per Minggu untuk Cegah PTM',
                'kategori' => 'aktivitas_fisik',
                'estimasi_menit' => 4,
                'urutan' => 4,
                'ringkasan' => 'Panduan latihan kardio aman di zona 60%–85% detak jantung maksimal dan peregangan harian.',
                'konten' => "Olahraga teratur meningkatkan sensitivitas insulin, memperkuat otot jantung, dan membantu menurunkan berat badan berlebih.\n\n"
                    ."• Target mingguan dewasa: 150 menit aktivitas aerobik sedang (misalnya 30 menit × 5 hari jalan cepat, bersepeda santai, atau senam).\n"
                    ."• Pantau zona detak jantung latihan melalui Kalkulator Kesehatan agar olahraga tetap aman dan tidak membebani jantung.\n"
                    ."• Kurangi duduk terlalu lama dengan berdiri atau meregangkan badan tiap 60 menit.",
            ],
            [
                'judul' => 'Mengendalikan Gula Tambahan, Rokok, dan Kolesterol Darah',
                'kategori' => 'gaya_hidup',
                'estimasi_menit' => 5,
                'urutan' => 5,
                'ringkasan' => 'Langkah praktis membatasi gula harian maksimal 50 gram, menghindari asap rokok, dan menjaga kolesterol total < 200 mg/dL.',
                'konten' => "Kebiasaan harian berperan besar terhadap lonjakan kadar kolesterol, asam urat, serta risiko penyakit jantung.\n\n"
                    ."1. Batasi gula tambahan maksimal 4 sendok makan (50 g) per hari, hindari minuman bersoda dan teh/kopi kemasan manis.\n"
                    ."2. Berhenti merokok dan hindari paparan asap rokok di rumah karena merusak dinding pembuluh darah secara cepat.\n"
                    ."3. Utamakan metode masak rebus, kukus, atau panggang daripada gorengan berulang.",
            ],
            [
                'judul' => 'Alur Skrining Posbindu dan Tindak Lanjut Surat Rujukan',
                'kategori' => 'rujukan',
                'estimasi_menit' => 4,
                'urutan' => 6,
                'ringkasan' => 'Kapan warga perlu dirujuk ke Puskesmas/FKTP dan bagaimana menggunakan Surat Pengantar Rujukan SehatKita.',
                'konten' => "Posbindu PTM bertujuan mendeteksi faktor risiko lebih dini sebelum berkembang menjadi komplikasi berat.\n\n"
                    ."• Lakukan pemeriksaan rutin minimal sebulan sekali bersama kader Posbindu atau catat secara mandiri.\n"
                    ."• Bila hasil tekanan darah mencapai kategori krisis (≥ 180/110 mmHg) atau ditemukan risiko tinggi oleh kader, sistem menerbitkan rujukan ke Puskesmas/FKTP terdekat.\n"
                    ."• Unduh/cetak Surat Pengantar Rujukan resmi dari menu Rujukan dan bawa saat memeriksakan diri ke tenaga kesehatan.",
            ],
        ];

        foreach ($materi as $item) {
            Edukasi::updateOrCreate(
                ['judul' => $item['judul']],
                [
                    'wilayah_id' => null,
                    'ringkasan' => $item['ringkasan'],
                    'konten' => $item['konten'],
                    'kategori' => $item['kategori'],
                    'estimasi_menit' => $item['estimasi_menit'],
                    'urutan' => $item['urutan'],
                    'aktif' => true,
                ]
            );
        }
    }
}

import type { Metadata } from "next";
import Link from "next/link";
import PublicDocLayout, { type TocItem } from "@/components/landing/PublicDocLayout";

export const metadata: Metadata = {
  title: "Catatan Penting — SehatKita",
  description:
    "Penjelasan sederhana mengenai catatan penting di SehatKita: alat bantu pantau kesehatan pribadi, bukan pengganti dokter.",
};

const TOC: TocItem[] = [
  { id: "bukan-diagnosis", label: "Bukan Pengganti Dokter" },
  { id: "arti-status", label: "Arti Warna Status Kesehatan" },
  { id: "kondisi-darurat", label: "Kapan Harus Segera ke IGD" },
  { id: "sumber-angka", label: "Akurasi Catatan & Obat" },
];

export default function BatasanMedisPage() {
  return (
    <PublicDocLayout
      eyebrow="Informasi Penting"
      title="Catatan Penting Penggunaan"
      lead="SehatKita membantu Anda mencatat dan memahami perkembangan kesehatan sehari-hari, namun tidak menggantikan pemeriksaan dokter."
      breadcrumbLabel="Catatan Penting"
      meta={["Panduan Pengguna", "Bukan Layanan Gawat Darurat"]}
      toc={TOC}
    >
      <div className="doc-note tone-warn">
        <strong>Singkatnya:</strong> Hasil hitungan di SehatKita adalah informasi pemantauan awal, bukan diagnosis dokter atau resep pengobatan.
      </div>

      <section id="bukan-diagnosis" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">01</span>
          <h2>Alat Pantau, Bukan Pengganti Dokter</h2>
        </div>
        <p>
          Semua fitur di SehatKita — termasuk kalkulator kesehatan, grafik perkembangan, dan ringkasan kondisi — dibuat
          untuk membantu Anda mengenal kondisi tubuh lebih awal.
        </p>
        <p>
          Sistem komputer hanya membaca angka yang Anda masukkan, sehingga tidak bisa memeriksa keluhan fisik secara langsung
          seperti dokter atau perawat di Puskesmas maupun rumah sakit.
        </p>
      </section>

      <section id="arti-status" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">02</span>
          <h2>Arti Warna Status Kesehatan</h2>
        </div>
        <p>Penanda warna dipakai agar Anda cepat melihat apakah angka pemeriksaan perlu diperhatikan atau tidak:</p>
        <div className="status-guide">
          <div className="status-guide-item">
            <div className="status-dot is-safe">Terjaga / Normal</div>
            <p className="tiny">Angka pemeriksaan Anda berada dalam rentang yang umum dianggap sehat.</p>
          </div>
          <div className="status-guide-item">
            <div className="status-dot is-warn">Perlu Perhatian</div>
            <p className="tiny">Mulai mendekati batas atas/bawah. Sebaiknya jaga pola makan dan cek ulang berkala.</p>
          </div>
          <div className="status-guide-item">
            <div className="status-dot is-danger">Perlu Periksa Medis</div>
            <p className="tiny">Angka tergolong tinggi atau berisiko. Segera konsultasikan ke Puskesmas atau dokter terdekat.</p>
          </div>
        </div>
      </section>

      <section id="kondisi-darurat" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">03</span>
          <h2>Kapan Harus Segera ke Dokter atau IGD</h2>
        </div>
        <p>
          Jangan menunggu balasan pesan atau jadwal Posbindu berikutnya jika Anda atau keluarga mengalami tanda berikut:
        </p>
        <ul className="legal-list">
          <li>Nyeri dada berat, sesak napas mendadak, atau keringat dingin.</li>
          <li>Pusing hebat berputar, lemas mendadak pada satu sisi tubuh, atau bicara tiba-tiba pelo.</li>
          <li>Penurunan kesadaran, pingsan, atau kejang.</li>
          <li>Hasil tekanan darah atau gula darah sangat tinggi disertai keluhan fisik yang terasa mengganggu.</li>
        </ul>
      </section>

      <section id="sumber-angka" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">04</span>
          <h2>Akurasi Alat Ukur &amp; Obat Rutin</h2>
        </div>
        <ul className="legal-list">
          <li>
            <strong>Gunakan alat ukur yang terawat:</strong> Angka tensi, berat badan, atau gula darah bergantung pada alat
            dan cara pengukuran Anda. Jika hasil terasa janggal, ukur ulang setelah istirahat atau periksa di fasilitas kesehatan.
          </li>
          <li>
            <strong>Jangan menghentikan obat sendiri:</strong> Jika Anda sedang mengonsumsi obat rutin dari dokter, tetap ikuti
            anjuran dokter meski hasil catatan harian mulai membaik.
          </li>
          <li>
            <strong>Butuh bantuan lebih lanjut?</strong> Lihat daftar fasilitas dan kontak resmi kami di{" "}
            <Link href="/kontak" className="text-primary fw-600">Kontak Resmi</Link> atau baca{" "}
            <Link href="/bantuan" className="text-primary fw-600">Pusat Bantuan</Link>.
          </li>
        </ul>
      </section>
    </PublicDocLayout>
  );
}

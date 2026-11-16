import type { Metadata } from "next";
import Link from "next/link";
import PublicDocLayout, { type TocItem } from "@/components/landing/PublicDocLayout";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — SehatKita",
  description:
    "Penjelasan sederhana tentang data apa saja yang disimpan SehatKita, siapa yang bisa melihatnya, dan cara Anda mengatur privasi akun.",
};

const TOC: TocItem[] = [
  { id: "data-tersimpan", label: "Data yang Kami Simpan" },
  { id: "tujuan-penggunaan", label: "Kegunaan Data Anda" },
  { id: "siapa-yang-melihat", label: "Siapa yang Bisa Melihat" },
  { id: "keamanan", label: "Cara Kami Menjaga Keamanan" },
  { id: "kendali-anda", label: "Kendali Penuh di Tangan Anda" },
  { id: "pertanyaan", label: "Pertanyaan Tentang Privasi" },
];

export default function KebijakanPrivasiPage() {
  return (
    <PublicDocLayout
      eyebrow="Privasi & Data"
      title="Kebijakan Privasi SehatKita"
      lead="Kami merangkum aturan penggunaan data pribadi dan kesehatan Anda dengan bahasa yang jelas dan mudah dipahami."
      breadcrumbLabel="Kebijakan Privasi"
      meta={["Diperbarui 2026", "Berlaku untuk Warga, Kader & Pengelola"]}
      toc={TOC}
    >
      <div className="doc-note">
        <strong>Singkatnya:</strong> Data kesehatan Anda hanya dipakai untuk membantu pemantauan kondisi tubuh, kegiatan Posbindu, dan rujukan layanan kesehatan — tidak dijual atau dibagikan ke pihak luar untuk iklan.
      </div>

      <section id="data-tersimpan" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">01</span>
          <h2>Data Apa Saja yang Kami Simpan?</h2>
        </div>
        <ul className="legal-list">
          <li>
            <strong>Data akun:</strong> Nama lengkap, alamat email, kata sandi yang diacak aman, serta kecamatan dan kelurahan tempat tinggal Anda di Kota Banjarbaru.
          </li>
          <li>
            <strong>Profil kesehatan dasar:</strong> Tanggal lahir, jenis kelamin, tinggi badan, serta riwayat penyakit pribadi atau keluarga bila Anda mengisinya.
          </li>
          <li>
            <strong>Catatan pemeriksaan:</strong> Tanggal periksa dan angka kesehatan yang Anda atau kader catat, seperti berat badan, lingkar perut, tekanan darah, gula darah (sewaktu, puasa, atau 2 jam setelah makan), dan kolesterol.
          </li>
          <li>
            <strong>Aktivitas layanan:</strong> Kehadiran sesi Posbindu, foto kegiatan tantangan hidup sehat yang Anda kirim, catatan rujukan ke Puskesmas, serta laporan kendala yang Anda kirim.
          </li>
        </ul>
      </section>

      <section id="tujuan-penggunaan" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">02</span>
          <h2>Untuk Apa Data Ini Digunakan?</h2>
        </div>
        <ul className="legal-list">
          <li>Menyimpan riwayat kesehatan Anda agar mudah dibaca kembali kapan saja.</li>
          <li>Menghitung status kesehatan sederhana, seperti Indeks Massa Tubuh (IMT) dan kategori tekanan darah atau gula darah.</li>
          <li>Membantu kader Posbindu dan Puskesmas mendampingi warga serta menindaklanjuti rujukan jika ada hasil yang berisiko.</li>
          <li>Menyusun laporan gambaran kesehatan warga per kelurahan atau kota bagi pengelola layanan kesehatan daerah.</li>
        </ul>
      </section>

      <section id="siapa-yang-melihat" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">03</span>
          <h2>Siapa Saja yang Bisa Melihat Data Anda?</h2>
        </div>
        <ul className="legal-list">
          <li>
            <strong>Anda sendiri:</strong> Melihat seluruh profil, catatan kesehatan, hasil analisis, dan riwayat rujukan milik pribadi.
          </li>
          <li>
            <strong>Kader Posbindu &amp; Puskesmas di wilayah Anda:</strong> Hanya dapat melihat data warga di kelurahannya saat membantu pemeriksaan atau menindaklanjuti rujukan.
          </li>
          <li>
            <strong>Pengelola wilayah (Kelurahan / Kota):</strong> Hanya melihat jumlah dan persentase kesehatan warga secara keseluruhan tanpa nama pribadi. Laporan wilayah baru ditampilkan jika ada minimal 5 peserta agar identitas warga tetap terjaga.
          </li>
        </ul>
      </section>

      <section id="keamanan" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">04</span>
          <h2>Bagaimana Kami Menjaga Keamanan Data?</h2>
        </div>
        <ul className="legal-list">
          <li>Kata sandi akun selalu diacak oleh sistem sehingga tidak ada petugas yang bisa melihat kata sandi asli Anda.</li>
          <li>Setiap catatan pemeriksaan yang sudah disimpan akan dikunci agar riwayat tidak berubah tanpa jejak. Jika ada salah ketik, Anda bisa menghapus catatan lama tersebut dan membuat catatan baru.</li>
          <li>Setiap bagian di dalam aplikasi dibatasi sesuai peran masing-masing pengguna.</li>
        </ul>
      </section>

      <section id="kendali-anda" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">05</span>
          <h2>Kendali Penuh di Tangan Anda</h2>
        </div>
        <p>Setelah masuk ke akun SehatKita, Anda dapat mengelola data sendiri kapan saja:</p>
        <ul className="legal-list">
          <li>Memperbarui profil kesehatan atau mengganti kata sandi secara berkala.</li>
          <li>Menghapus catatan kesehatan yang salah ketik melalui menu Rekam Medis.</li>
          <li>
            Menarik persetujuan penggunaan data melalui menu Setelan Privasi. Jika ditarik, pencatatan baru akan berhenti dan data Anda dikeluarkan dari hitungan laporan maupun peringkat wilayah, sementara Anda tetap bisa melihat atau menghapus catatan lama.
          </li>
        </ul>
      </section>

      <section id="pertanyaan" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">06</span>
          <h2>Punya Pertanyaan Tentang Privasi?</h2>
        </div>
        <p>
          Jika ada data yang keliru, akun yang perlu dibantu, atau pertanyaan seputar privasi, silakan lihat halaman{" "}
          <Link href="/kontak" className="text-primary fw-600">Kontak Resmi</Link> atau cari jawabannya di{" "}
          <Link href="/bantuan" className="text-primary fw-600">Pusat Bantuan</Link>.
        </p>
      </section>
    </PublicDocLayout>
  );
}

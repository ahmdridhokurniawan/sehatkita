import type { Metadata } from "next";
import Link from "next/link";
import PublicDocLayout, { type TocItem } from "@/components/landing/PublicDocLayout";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan — SehatKita",
  description:
    "Aturan penggunaan layanan SehatKita Kota Banjarbaru yang ringkas dan mudah dipahami.",
};

const TOC: TocItem[] = [
  { id: "ketentuan-umum", label: "Tentang Penggunaan Layanan" },
  { id: "akun-warga", label: "Aturan Akun & Pendaftaran" },
  { id: "batas-medis", label: "Catatan Penting Penggunaan" },
  { id: "kegiatan-posbindu", label: "Tantangan & Posbindu" },
  { id: "larangan", label: "Hal yang Tidak Diperbolehkan" },
  { id: "pembatasan-akun", label: "Pembatasan & Pembaruan" },
];

export default function SyaratKetentuanPage() {
  return (
    <PublicDocLayout
      eyebrow="Aturan Penggunaan"
      title="Syarat dan Ketentuan SehatKita"
      lead="Aturan dasar penggunaan aplikasi SehatKita agar layanan tetap aman, tertib, dan bermanfaat bagi seluruh warga Kota Banjarbaru."
      breadcrumbLabel="Syarat dan Ketentuan"
      meta={["Diperbarui 2026", "Penggunaan Pribadi & Pendampingan"]}
      toc={TOC}
    >
      <div className="doc-note">
        Dengan membuat akun atau memakai fitur SehatKita, Anda setuju untuk mengisi data dengan jujur, menjaga keamanan akun, dan memahami bahwa aplikasi ini bukan pengganti dokter.
      </div>

      <section id="ketentuan-umum" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">01</span>
          <h2>Tentang Penggunaan Layanan</h2>
        </div>
        <p>
          SehatKita adalah platform pemantauan kesehatan warga untuk mendampingi kegiatan Posbindu di Kota Banjarbaru.
          Semua fitur gratis digunakan sesuai peran akun masing-masing (warga, kader Posbindu, atau pengelola wilayah).
        </p>
      </section>

      <section id="akun-warga" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">02</span>
          <h2>Aturan Akun &amp; Pendaftaran</h2>
        </div>
        <ul className="legal-list">
          <li>Gunakan nama dan alamat email yang benar serta pilih kelurahan tempat tinggal Anda saat ini.</li>
          <li>Jaga kerahasiaan kata sandi dan jangan meminjamkan akun kepada orang lain agar catatan kesehatan tidak tertukar.</li>
          <li>
            Jika salah memilih kelurahan saat mendaftar, Anda dapat menghubungi kader Posbindu setempat atau tim kami lewat{" "}
            <Link href="/kontak" className="text-primary fw-600">Kontak Resmi</Link> untuk membantu penyesuaian.
          </li>
        </ul>
      </section>

      <section id="batas-medis" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">03</span>
          <h2>Catatan Penting Penggunaan</h2>
        </div>
        <p>
          Informasi, angka kalkulator, dan warna status di SehatKita hanya berfungsi sebagai gambaran awal untuk membantu pemantauan rutin. Layanan ini bukan alat diagnosis medis dan tidak menggantikan pemeriksaan dokter secara langsung.
        </p>
        <p>
          Baca panduan selengkapnya di halaman{" "}
          <Link href="/batasan-medis" className="text-primary fw-600">Catatan Penting Penggunaan</Link>.
        </p>
      </section>

      <section id="kegiatan-posbindu" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">04</span>
          <h2>Tantangan Sehat &amp; Kegiatan Posbindu</h2>
        </div>
        <ul className="legal-list">
          <li>Poin aktivitas dan lencana diberikan sebagai penyemangat hidup sehat dan tidak bisa diuangkan.</li>
          <li>Foto bukti kegiatan tantangan harus asli milik Anda sendiri dan sesuai misi yang diikuti, karena akan diperiksa oleh kader.</li>
          <li>Data keamanan dan hak privasi Anda selama memakai layanan diatur di{" "}
            <Link href="/kebijakan-privasi" className="text-primary fw-600">Kebijakan Privasi</Link>.
          </li>
        </ul>
      </section>

      <section id="larangan" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">05</span>
          <h2>Hal yang Tidak Diperbolehkan</h2>
        </div>
        <ul className="legal-list">
          <li>Mengisi data palsu, mengunggah foto yang tidak pantas, atau memakai identitas orang lain tanpa izin.</li>
          <li>Mencoba membuka akun pengguna lain, mengakali poin tantangan, atau mengganggu jalannya sistem.</li>
          <li>Memakai data kesehatan warga di luar kepentingan pendampingan Posbindu dan layanan kesehatan resmi.</li>
        </ul>
      </section>

      <section id="pembatasan-akun" className="doc-section">
        <div className="doc-sec-head">
          <span className="doc-sec-num">06</span>
          <h2>Pembatasan Akun &amp; Pembaruan Aturan</h2>
        </div>
        <p>
          Pengelola sistem berhak menonaktifkan akun yang terbukti melanggar aturan atau menyalahgunakan data warga. Jika suatu saat aturan ini diperbarui, informasi pembaruan akan ditampilkan langsung di halaman ini.
        </p>
      </section>
    </PublicDocLayout>
  );
}

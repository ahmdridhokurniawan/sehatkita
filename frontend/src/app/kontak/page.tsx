import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import PublicDocLayout from "@/components/landing/PublicDocLayout";

export const metadata: Metadata = {
  title: "Kontak Resmi — SehatKita",
  description:
    "Saluran bantuan dan kontak resmi pengelola SehatKita Kota Banjarbaru untuk warga, kader Posbindu, dan mitra layanan kesehatan.",
};

export default function KontakPage() {
  return (
    <PublicDocLayout
      eyebrow="Kontak Resmi"
      title="Hubungi Tim SehatKita"
      lead="Butuh bantuan akun, perbaikan data kelurahan, atau informasi kegiatan Posbindu? Hubungi kami lewat saluran berikut."
      breadcrumbLabel="Kontak Resmi"
      meta={["Kota Banjarbaru", "Senin–Jumat, 08.00–16.00 WITA"]}
    >
      <div className="contact-grid">
        <section className="doc-sheet" aria-label="Jalur kontak resmi">
          <h2 className="h3 mb-16">Saluran Layanan</h2>

          <div className="contact-row">
            <span className="contact-ico">
              <Icon name="mail" size={18} />
            </span>
            <div>
              <strong className="text-sm">Email Dukungan Pengguna</strong>
              <p className="tiny mt-4">
                Kirim pertanyaan seputar akun, salah pilih kelurahan, atau pertanyaan privasi ke{" "}
                <a href="mailto:halo@sehatkita.id" className="text-primary fw-600">
                  halo@sehatkita.id
                </a>
                . Tim akan membalas maksimal dalam 1–2 hari kerja.
              </p>
            </div>
          </div>

          <div className="contact-row">
            <span className="contact-ico">
              <Icon name="map-pin" size={18} />
            </span>
            <div>
              <strong className="text-sm">Kader Posbindu &amp; Puskesmas Setempat</strong>
              <p className="tiny mt-4">
                Untuk jadwal pemeriksaan rutin, cek tensi atau gula darah langsung, maupun tindak lanjut rujukan, silakan
                datang ke Posbindu atau Puskesmas sesuai kelurahan Anda di Kota Banjarbaru.
              </p>
            </div>
          </div>

          <div className="contact-row">
            <span className="contact-ico">
              <Icon name="message-circle" size={18} />
            </span>
            <div>
              <strong className="text-sm">Menu Pengaduan di Dalam Akun</strong>
              <p className="tiny mt-4">
                Jika Anda sudah memiliki akun SehatKita, masuk ke akun lalu buka menu <strong>Pengaduan</strong> agar laporan
                kendala langsung tercatat dan bisa dipantau statusnya.
              </p>
              <div className="row gap-8 wrap mt-12">
                <Link href="/login" className="btn btn-primary btn-sm">
                  Masuk untuk Kirim Aduan
                </Link>
                <Link href="/bantuan" className="btn btn-outline btn-sm">
                  Lihat Pusat Bantuan
                </Link>
              </div>
            </div>
          </div>
        </section>

        <aside className="doc-sheet" aria-label="Catatan penting dan tautan cepat">
          <h2 className="h3 mb-12">Perlu Diperhatikan</h2>

          <div className="doc-note tone-danger mb-20">
            <strong>Bukan Layanan Gawat Darurat:</strong> Jika Anda atau keluarga mengalami nyeri dada, sesak napas berat,
            atau pingsan, segera bawa ke IGD atau Puskesmas terdekat — jangan menunggu balasan email.
          </div>

          <p className="tiny">
            Sebelum mengirim pesan, Anda bisa memeriksa ringkasan jawaban singkat di halaman berikut:
          </p>

          <nav className="contact-links" aria-label="Tautan informasi terkait">
            <Link href="/bantuan" className="contact-link-item">
              <span>Tanya Jawab &amp; Panduan Penggunaan</span>
              <Icon name="arrow-right" size={15} />
            </Link>
            <Link href="/batasan-medis" className="contact-link-item">
              <span>Catatan Penting Penggunaan</span>
              <Icon name="arrow-right" size={15} />
            </Link>
            <Link href="/kebijakan-privasi" className="contact-link-item">
              <span>Kebijakan Privasi &amp; Keamanan Data</span>
              <Icon name="arrow-right" size={15} />
            </Link>
            <Link href="/syarat-ketentuan" className="contact-link-item">
              <span>Syarat dan Ketentuan</span>
              <Icon name="arrow-right" size={15} />
            </Link>
          </nav>
        </aside>
      </div>
    </PublicDocLayout>
  );
}

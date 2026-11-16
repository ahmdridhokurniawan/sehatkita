"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import PublicDocLayout from "@/components/landing/PublicDocLayout";
import FaqItem from "@/components/landing/FaqItem";

type Topik = "semua" | "akun" | "medis" | "program" | "privasi";

type PanduanItem = {
  topik: Exclude<Topik, "semua">;
  q: string;
  a: string;
};

const TOPIK_LABEL: { id: Topik; label: string }[] = [
  { id: "semua", label: "Semua Topik" },
  { id: "akun", label: "Akun & Daftar" },
  { id: "medis", label: "Catatan & Rujukan" },
  { id: "program", label: "Posbindu & Tantangan" },
  { id: "privasi", label: "Privasi Data" },
];

const PANDUAN_LIST: PanduanItem[] = [
  {
    topik: "akun",
    q: "Bagaimana cara mendaftar akun warga baru?",
    a: "Buka halaman Daftar, isi nama lengkap dan email aktif, pilih Kecamatan dan Kelurahan tempat tinggal Anda di Banjarbaru, lalu buat kata sandi minimal 8 karakter dengan campuran huruf besar, angka, dan simbol.",
  },
  {
    topik: "akun",
    q: "Apakah data profil harus langsung diisi penuh setelah masuk?",
    a: "Tidak harus. Setelah masuk, Anda tetap bisa langsung melihat beranda. Tinggi badan, tanggal lahir, dan riwayat kesehatan bisa dilengkapi belakangan lewat menu Profil.",
  },
  {
    topik: "akun",
    q: "Bagaimana jika saya salah memilih kelurahan saat mendaftar?",
    a: "Pengubahan wilayah kelurahan dibantu oleh pengelola agar data Posbindu tetap rapi. Hubungi kader Posbindu kelurahan Anda atau kirim email ke halo@sehatkita.id.",
  },
  {
    topik: "medis",
    q: "Apa saja yang perlu diisi saat mencatat hasil pemeriksaan?",
    a: "Buka menu Rekam Medis lalu klik Catat Kesehatan. Pilih tanggal dan tempat pemeriksaan (mandiri atau Posbindu). Setelah itu, cukup isi angka yang Anda punya saja—seperti berat badan, tensi, gula darah (sewaktu, puasa, atau 2 jam setelah makan), atau kolesterol.",
  },
  {
    topik: "medis",
    q: "Bagaimana kalau saya salah mengetik angka pemeriksaan?",
    a: "Catatan yang sudah tersimpan dikunci agar riwayat tidak berubah-ubah. Jika ada salah ketik, cukup hapus catatan yang keliru tersebut lalu buat catatan baru dengan angka yang benar.",
  },
  {
    topik: "medis",
    q: "Apakah hasil analisis SehatKita bisa menggantikan pemeriksaan dokter?",
    a: "Tidak. Angka dan warna status hanya membantu Anda melihat gambaran awal kondisi tubuh. Untuk pemeriksaan pasti atau keluhan mendadak, tetap periksa ke Puskesmas, dokter, atau IGD terdekat.",
  },
  {
    topik: "medis",
    q: "Bagaimana cara kerja rujukan ke Puskesmas?",
    a: "Jika catatan menunjukkan hasil yang perlu pemeriksaan lanjut, sistem atau kader dapat membuat rujukan ke Puskesmas terdekat. Anda bisa memantau statusnya langsung di akun, mulai dari dibuat, dihubungi petugas, hingga selesai ditangani.",
  },
  {
    topik: "program",
    q: "Bagaimana cara ikut sesi Posbindu dan tantangan sehat?",
    a: "Masuk ke menu Program Posbindu untuk melihat jadwal pemeriksaan kelurahan, atau pilih aktivitas di halaman Tantangan. Untuk tantangan yang butuh bukti, unggah foto kegiatan asli Anda agar bisa diperiksa kader dan mendapatkan poin serta lencana.",
  },
  {
    topik: "privasi",
    q: "Siapa saja yang bisa melihat catatan kesehatan saya?",
    a: "Catatan pribadi hanya bisa dibuka oleh Anda sendiri serta kader atau petugas kesehatan berwenang di wilayah kelurahan Anda. Pengelola daerah hanya melihat hitungan jumlah dan persentase keseluruhan warga, dan baru muncul bila ada minimal 5 peserta agar identitas warga tetap aman.",
  },
  {
    topik: "privasi",
    q: "Bagaimana jika saya ingin berhenti membagikan data?",
    a: "Buka menu Setelan Privasi setelah masuk akun untuk menarik persetujuan. Pencatatan baru akan dihentikan dan data Anda dikeluarkan dari laporan maupun peringkat wilayah, sedangkan catatan lama tetap bisa Anda baca atau hapus sendiri.",
  },
];

export default function BantuanPage() {
  const [topik, setTopik] = useState<Topik>("semua");
  const [cari, setCari] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return PANDUAN_LIST.filter((item) => {
      if (topik !== "semua" && item.topik !== topik) return false;
      if (!q) return true;
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
    });
  }, [topik, cari]);

  return (
    <PublicDocLayout
      eyebrow="Pusat Bantuan"
      title="Panduan & Tanya Jawab"
      lead="Temukan jawaban singkat seputar cara daftar, pencatatan kesehatan, jadwal Posbindu, rujukan, hingga pengaturan privasi akun Anda."
      breadcrumbLabel="Pusat Bantuan"
      meta={["Kota Banjarbaru", "Panduan Warga & Kader"]}
    >
      <div className="help-quick">
          <Link href="/register" className="help-quick-link">
            <div>
              <div className="help-quick-title">
                <Icon name="user-plus" size={18} />
                <span>Daftar Akun Baru</span>
              </div>
              <p className="help-quick-desc mt-6">
                Siapkan email aktif lalu pilih kecamatan dan kelurahan tempat tinggal Anda.
              </p>
            </div>
            <span className="help-quick-cta">
              Buka pendaftaran <Icon name="arrow-right" size={14} />
            </span>
          </Link>

          <Link href="/kalkulator" className="help-quick-link">
            <div>
              <div className="help-quick-title">
                <Icon name="calculator" size={18} />
                <span>Coba Kalkulator</span>
              </div>
              <p className="help-quick-desc mt-6">
                Hitung indeks massa tubuh, kebutuhan kalori, air minum, dan tekanan darah tanpa login.
              </p>
            </div>
            <span className="help-quick-cta">
              Buka kalkulator <Icon name="arrow-right" size={14} />
            </span>
          </Link>

          <Link href="/batasan-medis" className="help-quick-link">
            <div>
              <div className="help-quick-title">
                <Icon name="heart-pulse" size={18} />
                <span>Catatan Penting</span>
              </div>
              <p className="help-quick-desc mt-6">
                Pahami arti warna status kesehatan dan kapan sebaiknya segera memeriksakan diri ke dokter.
              </p>
            </div>
            <span className="help-quick-cta">
              Baca panduan <Icon name="arrow-right" size={14} />
            </span>
          </Link>
        </div>

        <section className="doc-sheet">
          <div className="help-toolbar">
            <div className="row-between wrap gap-12">
              <div>
                <h2 className="h3">Daftar Pertanyaan Umum</h2>
                <p className="tiny mt-4">
                  Menampilkan {hasil.length} dari {PANDUAN_LIST.length} panduan.
                </p>
              </div>
              <Link href="/kontak" className="btn btn-outline btn-sm">
                <Icon name="mail" size={15} /> Hubungi Tim
              </Link>
            </div>

            <div className="input-icon">
              <Icon name="search" size={18} />
              <input
                type="search"
                className="input"
                aria-label="Cari topik bantuan"
                placeholder="Cari kata kunci (mis. daftar, salah ketik, rujukan, privasi)…"
                value={cari}
                onChange={(e) => {
                  setCari(e.target.value);
                  setOpenIdx(0);
                }}
              />
            </div>

            <div className="help-pills" role="tablist" aria-label="Filter topik bantuan">
              {TOPIK_LABEL.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={topik === t.id}
                  className={`help-pill ${topik === t.id ? "active" : ""}`}
                  onClick={() => {
                    setTopik(t.id);
                    setOpenIdx(0);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {hasil.length > 0 ? (
            <div>
              {hasil.map((item, idx) => (
                <FaqItem
                  key={item.q}
                  q={item.q}
                  a={item.a}
                  open={openIdx === idx}
                  onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-ico">
                <Icon name="search" />
              </div>
              <h4>Topik tidak ditemukan</h4>
              <p>Coba kata kunci lain atau pilih kategori &ldquo;Semua Topik&rdquo; di atas.</p>
            </div>
          )}
        </section>
    </PublicDocLayout>
  );
}

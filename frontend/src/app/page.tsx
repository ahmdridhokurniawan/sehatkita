"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import PreviewPanel, { TAB_LABELS, type TabPreview } from "@/components/landing/PreviewPanel";
import Modal from "@/components/ui/Modal";
import { FAQ_LANDING } from "@/lib/demo";

/* ---------------- Legal modal ---------------- */
const LEGAL: Record<string, React.ReactNode> = {
  privasi: (
    <>
      <h3 className="h4">Kebijakan Privasi</h3>
      <p className="tiny mt-12">
        Data kesehatan bersifat sensitif. SehatKita menyimpan data sesuai persetujuan pengguna, membatasi akses
        berdasarkan peran dan wilayah, serta memisahkan data individual dari data agregat. Anda dapat membatalkan
        persetujuan penggunaan data melalui pengaturan akun.
      </p>
      <p className="tiny mt-8">Dokumen lengkap akan disediakan oleh pengelola sistem.</p>
    </>
  ),
  syarat: (
    <>
      <h3 className="h4">Syarat dan Ketentuan</h3>
      <p className="tiny mt-12">
        SehatKita bukan alat diagnosis medis dan tidak menggantikan pemeriksaan tenaga kesehatan. Pengguna
        bertanggung jawab atas kebenaran data yang dicatat. Penyalahgunaan akun dapat mengakibatkan penangguhan.
      </p>
    </>
  ),
  kontak: (
    <>
      <h3 className="h4">Kontak Resmi</h3>
      <p className="tiny mt-12">
        Email: halo@sehatkita.id
        <br />
        Dinas Kesehatan Kota Banjarbaru
        <br />
        Kalimantan Selatan
      </p>
      <p className="tiny mt-8">Placeholder kontak — akan diperbarui oleh pengelola.</p>
    </>
  ),
};

/* ---------------- FAQ item ---------------- */
function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className={`acc ${open ? "open" : ""}`}>
      <button className="acc-q" aria-expanded={open} onClick={onToggle} type="button">
        {q} <Icon name="chevron-down" />
      </button>
      <div className="acc-a">
        <div className="acc-a-inner">{a}</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [tabHero, setTabHero] = useState<TabPreview>("rekam");
  const [tabBig, setTabBig] = useState<TabPreview>("rekam");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [navOpen, setNavOpen] = useState(false);
  const [legal, setLegal] = useState<string | null>(null);

  return (
    <div className="landing">
      {/* ============ HEADER ============ */}
      <header className="site-header">
        <div className="container">
          <a href="#beranda" className="brand">
            <span className="brand-mark">
              <Icon name="heart-pulse" size={20} />
            </span>
            <span>
              SehatKita<small>Kota Banjarbaru</small>
            </span>
          </a>
          <nav className={`nav-main ${navOpen ? "open" : ""}`} id="navMain">
            <a href="#beranda" className="active">Beranda</a>
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#tentang">Tentang</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost hide-mobile">Masuk</Link>
            <Link href="/register" className="btn btn-primary">Mulai Sekarang</Link>
            <button
              className="btn btn-ghost btn-icon nav-toggle"
              aria-label="Buka menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
              type="button"
            >
              <Icon name="list" />
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero" id="beranda">
        <div className="container">
          <div className="hero-grid">
            <div>
              <span className="eyebrow">Platform Monitoring PTM</span>
              <h1 className="display mt-12">
                Kenali Kondisi Tubuhmu.
                <br />
                Cegah Risiko Sejak Dini.
              </h1>
              <p className="lead">
                Pantau riwayat kesehatan, pahami perubahan kondisi tubuh, dan bangun kebiasaan hidup lebih sehat
                bersama SehatKita.
              </p>
              <div className="hero-cta">
                <Link href="/register" className="btn btn-primary btn-lg">
                  Mulai Sekarang <Icon name="arrow-right" size={18} />
                </Link>
                <a href="#fitur" className="btn btn-outline btn-lg">Jelajahi Fitur</a>
              </div>
              <div className="hero-trust">
                <div><Icon name="shield-check" size={17} /> Data kesehatan terlindungi</div>
                <div><Icon name="map-pin" size={17} /> Terhubung kelurahan Anda</div>
                <div><Icon name="users" size={17} /> Didampingi kader Posbindu</div>
              </div>
            </div>

            <div className="preview-shell" aria-label="Pratinjau antarmuka SehatKita">
              <div className="preview-bar">
                <span className="d"></span>
                <span className="d"></span>
                <span className="d"></span>
                <span className="url">sehatkita.id/dashboard</span>
              </div>
              <div className="preview-body" suppressHydrationWarning>
                <div className="preview-tabs">
                  {TAB_LABELS.map(([id, label]) => (
                    <button key={id} className={tabHero === id ? "active" : ""} onClick={() => setTabHero(id)} type="button">
                      {label}
                    </button>
                  ))}
                </div>
                <div>
                  <PreviewPanel tab={tabHero} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FITUR ============ */}
      <section className="section" id="fitur">
        <div className="container">
          <div className="sec-head center">
            <span className="eyebrow">Fitur</span>
            <h2 className="h1">Semua yang Anda butuhkan untuk memantau kesehatan</h2>
            <p className="lead">
              Fitur dirancang agar masyarakat umum mudah mencatat, memahami, dan menindaklanjuti kondisi kesehatan.
            </p>
          </div>
          <div className="grid grid-3">
            <div className="feat">
              <span className="feat-ico"><Icon name="file-text" /></span>
              <h3>Rekam Medis</h3>
              <p>Simpan riwayat berat badan, tekanan darah, gula darah, kolesterol, dan lainnya dalam satu tempat.</p>
              <span className="feat-link">Lihat riwayat <Icon name="arrow-right" size={15} /></span>
            </div>
            <div className="feat">
              <span className="feat-ico"><Icon name="sparkles" /></span>
              <h3>Insight Kesehatan</h3>
              <p>Analisis otomatis dari data yang Anda catat, dengan penjelasan sederhana dan rekomendasi tindak lanjut.</p>
            </div>
            <div className="feat">
              <span className="feat-ico"><Icon name="send" /></span>
              <h3>Rujukan &amp; Notifikasi</h3>
              <p>Terhubung ke fasilitas kesehatan dan dapatkan pemberitahuan saat tindak lanjut diperlukan.</p>
            </div>
            <div className="feat">
              <span className="feat-ico"><Icon name="target" /></span>
              <h3>Target Kesehatan</h3>
              <p>Tetapkan target berat badan, aktivitas, dan asupan air, lalu pantau perkembangannya.</p>
            </div>
            <div className="feat feat-wide feat-accent">
              <span className="feat-ico"><Icon name="award" /></span>
 <h3>Tantangan &amp; Reward</h3>
              <p>Ikuti tantangan kesehatan bersama warga, kumpulkan badge, dan naik level sesuai partisipasi nyata.</p>
              <span className="feat-link">Jelajahi tantangan <Icon name="arrow-right" size={15} /></span>
            </div>
            <div className="feat">
              <span className="feat-ico"><Icon name="building" /></span>
              <h3>Program Kesehatan Kelurahan</h3>
              <p>Ikuti kegiatan Posbindu, penyuluhan, dan pemeriksaan kesehatan di wilayah Anda.</p>
            </div>
            <div className="feat">
              <span className="feat-ico"><Icon name="bar-chart" /></span>
              <h3>Dashboard Pemantauan Wilayah</h3>
              <p>Admin kelurahan memantau kondisi agregat masyarakat tanpa membuka data pribadi individu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CARA KERJA ============ */}
      <section className="section" id="cara-kerja" style={{ background: "var(--surface-2)" }}>
        <div className="container">
          <div className="sec-head center">
            <span className="eyebrow">Cara Kerja</span>
            <h2 className="h1">Mulai dalam beberapa langkah sederhana</h2>
          </div>
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div className="steps">
              <div className="step"><span className="step-num">1</span><div><h4>Daftar &amp; setujui kebijakan</h4><p>Masyarakat mendaftar dan menyetujui kebijakan penggunaan data.</p></div></div>
              <div className="step"><span className="step-num">2</span><div><h4>Masuk ke dashboard</h4><p>Pengguna masuk dan langsung dapat menggunakan aplikasi.</p></div></div>
              <div className="step"><span className="step-num">3</span><div><h4>Lengkapi profil</h4><p>Lengkapi data profil kapan pun Anda siap.</p></div></div>
              <div className="step"><span className="step-num">4</span><div><h4>Catat hasil pemeriksaan</h4><p>Catat hasil pemeriksaan mandiri atau dari Posbindu.</p></div></div>
            </div>
            <div className="steps">
              <div className="step"><span className="step-num">5</span><div><h4>Lihat hasil analisis</h4><p>Sistem menampilkan hasil analisis dari backend secara sederhana.</p></div></div>
              <div className="step"><span className="step-num">6</span><div><h4>Ikuti program &amp; tantangan</h4><p>Bergabung dengan program kesehatan dan tantangan wilayah.</p></div></div>
              <div className="step"><span className="step-num">7</span><div><h4>Petugas menindaklanjuti</h4><p>Kader, admin kelurahan, dan fasilitas kesehatan melihat informasi sesuai kewenangannya.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PREVIEW INTERAKTIF (BESAR) ============ */}
      <section className="section">
        <div className="container">
          <div className="sec-head center">
            <span className="eyebrow">Pratinjau Produk</span>
            <h2 className="h1">Antarmuka yang benar-benar berfungsi</h2>
            <p className="lead">Pilih tab untuk melihat tampilan masing-masing bagian SehatKita.</p>
          </div>
          <div className="card card-pad-lg">
            <div className="tabs">
              {TAB_LABELS.map(([id, label]) => (
                <button key={id} className={`tab ${tabBig === id ? "active" : ""}`} onClick={() => setTabBig(id)} type="button">
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-20">
              <PreviewPanel tab={tabBig} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ TENTANG ============ */}
      <section className="section" id="tentang" style={{ background: "var(--surface-2)" }}>
        <div className="container">
          <div className="grid grid-2" style={{ gap: 44, alignItems: "center" }}>
            <div>
              <span className="eyebrow">Tentang</span>
              <h2 className="h1 mt-12">Mendukung pemantauan PTM di Kota Banjarbaru</h2>
              <p className="lead mt-16">
                SehatKita adalah platform monitoring kesehatan Penyakit Tidak Menular (PTM) yang menghubungkan
                masyarakat, kader Posbindu, kelurahan, dan fasilitas kesehatan. Platform ini membantu deteksi dini
                faktor risiko, mendorong kebiasaan sehat, dan menyediakan data agregat wilayah untuk pengambilan
                keputusan program kesehatan.
              </p>
              <div className="grid grid-2 mt-24" style={{ gap: 14 }}>
                <div className="card card-flat">
                  <span className="feat-ico mb-12"><Icon name="map-pin" /></span>
                  <h4 className="h4">Berbasis Wilayah</h4>
                  <p className="tiny mt-4">Terhubung kelurahan di Kota Banjarbaru.</p>
                </div>
                <div className="card card-flat">
                  <span className="feat-ico mb-12"><Icon name="lock" /></span>
                  <h4 className="h4">Privasi Terjaga</h4>
                  <p className="tiny mt-4">Data individual tidak dibagikan ke role agregat.</p>
                </div>
              </div>
            </div>
            <div className="card card-pad-lg card-raised">
              <div className="alert alert-warning mb-16">
                <Icon name="alert-triangle" />
                <div>
                  <strong>SehatKita bukan alat diagnosis medis.</strong> Hasil analisis bersifat informasi dan tidak
                  menggantikan pemeriksaan tenaga kesehatan.
                </div>
              </div>
              <h4 className="h4 mb-12">Nilai utama</h4>
              <ul className="stack" style={{ ["--gap" as string]: "12px" }}>
                <li className="row items-start gap-10">
                  <span className="text-primary"><Icon name="check-circle" size={19} /></span>
                  <span className="text-sm">Membantu masyarakat memahami perubahan indikator kesehatan dari waktu ke waktu.</span>
                </li>
                <li className="row items-start gap-10">
                  <span className="text-primary"><Icon name="check-circle" size={19} /></span>
                  <span className="text-sm">Mendorong kebiasaan hidup sehat melalui target, program, dan tantangan.</span>
                </li>
                <li className="row items-start gap-10">
                  <span className="text-primary"><Icon name="check-circle" size={19} /></span>
                  <span className="text-sm">Mendukung petugas kesehatan dengan data agregat yang akurat dan aman.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="section" id="faq">
        <div className="container container-narrow">
          <div className="sec-head center">
            <span className="eyebrow">FAQ</span>
            <h2 className="h1">Pertanyaan yang sering diajukan</h2>
          </div>
          <div>
            {FAQ_LANDING.map(([q, a], i) => (
              <FaqItem key={i} q={q} a={a} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? null : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA BAND ============ */}
      <section className="section-sm">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 className="h2">Siap memantau kesehatan Anda?</h2>
              <p>Bergabung bersama masyarakat Kota Banjarbaru untuk membangun kebiasaan hidup lebih sehat.</p>
            </div>
            <div className="row gap-12 wrap">
              <Link href="/register" className="btn btn-lg">
                Mulai Sekarang <Icon name="arrow-right" size={18} />
              </Link>
              <Link href="/login" className="btn btn-outline btn-lg">Masuk</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <a href="#beranda" className="brand mb-12">
                <span className="brand-mark">
                  <Icon name="heart-pulse" size={20} />
                </span>
                <span>SehatKita</span>
              </a>
              <p className="tiny" style={{ maxWidth: 300 }}>
                SehatKita membantu masyarakat memantau kesehatan, memahami perubahan indikator kesehatan, membangun
                kebiasaan sehat, dan mendukung program kesehatan berbasis wilayah.
              </p>
              <p className="tiny mt-12">Kota Banjarbaru, Kalimantan Selatan</p>
            </div>
            <div className="footer-col">
              <h4>Navigasi</h4>
              <a href="#beranda">Beranda</a>
              <a href="#fitur">Fitur</a>
              <a href="#cara-kerja">Cara Kerja</a>
              <a href="#tentang">Tentang</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-col">
              <h4>Bantuan</h4>
              <a href="#faq">Pusat Bantuan</a>
              <Link href="/login">Masuk</Link>
              <Link href="/register">Daftar</Link>
            </div>
            <div className="footer-col">
              <h4>Legal &amp; Kontak</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("privasi"); }}>Kebijakan Privasi</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("syarat"); }}>Syarat dan Ketentuan</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("kontak"); }}>Kontak Resmi</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("kontak"); }}>Email: halo@sehatkita.id</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 SehatKita. Hak cipta dilindungi.</span>
            <span className="tiny">
              SehatKita bukan alat diagnosis medis dan tidak menggantikan pemeriksaan tenaga kesehatan.
            </span>
          </div>
        </div>
      </footer>

      {/* Legal modal */}
      {legal ? (
        <Modal open={true} onClose={() => setLegal(null)} title="">
          {LEGAL[legal]}
          <div className="modal-foot mt-20">
            <button className="btn btn-primary" onClick={() => setLegal(null)} type="button">Tutup</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

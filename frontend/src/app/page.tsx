"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";
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
      <ol className="tiny mt-12" style={{ paddingLeft: 18, display: "grid", gap: 8 }}>
        <li>
          <strong>Sifat Informasi (Bukan Diagnosis Medis):</strong> SehatKita berfungsi sebagai alat bantu pemantauan,
          edukasi, dan pencatatan kesehatan berbasis masyarakat. Hasil perhitungan maupun kategori indikator bukan
          merupakan diagnosis medis resmi dan tidak menggantikan pemeriksaan dokter atau tenaga kesehatan.
        </li>
        <li>
          <strong>Kelayakan &amp; Keamanan Akun:</strong> Pengguna wajib memberikan identitas wilayah yang sesuai serta
          menjaga kerahasiaan kredensial akun (kata sandi minimal 8 karakter yang memuat huruf kapital, angka, dan
          simbol). Aktivitas mencurigakan atau penyalahgunaan akses dapat berakibat pembatasan akun.
        </li>
        <li>
          <strong>Kebenaran Data &amp; Persetujuan:</strong> Pengguna bertanggung jawab atas keakuratan data kesehatan
          yang dicatat secara mandiri maupun melalui kader Posbindu. Penggunaan data tunduk pada persetujuan
          pengguna yang dapat diatur kapan saja di halaman profil.
        </li>
        <li>
          <strong>Tantangan &amp; Verifikasi Dokumentasi:</strong> Peserta yang mengikuti tantangan kesehatan dan mengunggah
          foto dokumentasi penyelesaian misi wajib memastikan foto berasal dari aktivitas nyata yang relevan.
          Kader atau admin berhak meninjau, menyetujui, atau menolak bukti yang tidak sesuai sebelum poin EXP diberikan.
        </li>
        <li>
          <strong>Keamanan Data Medis &amp; Privasi k-Anonymity:</strong> Rekam kesehatan dan riwayat pemeriksaan
          terenkripsi serta dibatasi per peran dan wilayah kelurahan. Publikasi papan peringkat maupun laporan agregat
          Posbindu menerapkan ambang anonimitas (minimal 5 peserta per kelompok wilayah) sehingga identitas individu
          tetap terlindungi.
        </li>
        <li>
          <strong>Integrasi Sesi Posbindu:</strong> Pencatatan yang dilakukan oleh kader pada sesi Posbindu resmi di
          Kota Banjarbaru terhubung ke riwayat akun warga terkait setelah melalui validasi wilayah dan persetujuan.
        </li>
        <li>
          <strong>Batasan Tanggung Jawab:</strong> Pengelola terus berupaya menjaga keandalan layanan, namun kondisi
          gawat darurat medis harus segera ditangani di fasilitas layanan kesehatan terdekat tanpa menunggu hasil dari
          aplikasi.
        </li>
      </ol>
    </>
  ),
  bantuan: (
    <>
      <h3 className="h4">Pusat Bantuan SehatKita</h3>
      <p className="tiny mt-10">
        Panduan cepat apabila Anda mengalami kendala saat mendaftar, mencatat pemeriksaan, atau mengikuti tantangan:
      </p>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <div className="card card-flat" style={{ padding: 12 }}>
          <strong className="text-sm">1. Pendaftaran &amp; Password</strong>
          <p className="tiny mt-4">
            Gunakan filter Kecamatan atau pencarian nama Kelurahan di halaman Daftar Sekarang. Pastikan password
            mengandung huruf kapital, angka, dan simbol.
          </p>
        </div>
        <div className="card card-flat" style={{ padding: 12 }}>
          <strong className="text-sm">2. Catatan Kesehatan &amp; Rujukan</strong>
          <p className="tiny mt-4">
            Anda dapat mencatat tekanan darah, berat badan, dan gula darah (Puasa / 2 Jam PP) untuk hari ini. Jika ada
            indikator berisiko, sistem menyarankan rujukan ke Puskesmas terdekat.
          </p>
        </div>
        <div className="card card-flat" style={{ padding: 12 }}>
          <strong className="text-sm">3. Dukungan Kader &amp; Kontak Resmi</strong>
          <p className="tiny mt-4">
            Untuk pembaruan data NIK/kelurahan atau kendala teknis, hubungi Kader Posbindu kelurahan Anda atau{" "}
            <a href="mailto:halo@sehatkita.id" className="text-primary fw-600">halo@sehatkita.id</a> (Dinas Kesehatan
            Kota Banjarbaru).
          </p>
        </div>
      </div>
    </>
  ),
  kontak: (
    <>
      <h3 className="h4">Kontak Resmi</h3>
      <p className="tiny mt-12">
        Email: <a href="mailto:halo@sehatkita.id" className="text-primary fw-600">halo@sehatkita.id</a>
        <br />
        Dinas Kesehatan Kota Banjarbaru
        <br />
        Kalimantan Selatan
      </p>
      <p className="tiny mt-8">Hubungi email resmi di atas untuk pertanyaan layanan, kerja sama wilayah, maupun bantuan akun.</p>
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
        <div className="acc-a-inner">
          <div className="acc-a-pad">{a}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Reveal saat masuk viewport ----------------
   Satu IntersectionObserver untuk semua elemen [data-reveal].
   Kelas `in` dipasang saat elemen masuk layar dan dicabut saat
   keluar, jadi animasinya berulang tiap kali di-scroll.
   Elemen tetap "in" kalau masih terlihat, jadi tidak berkedip. */
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (kurangiGerak || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    // rootMargin 0 supaya elemen yang masih terlihat sebagian TIDAK dicabut
    // (kalau dicabut, konten di tepi layar sempat transparan = terlihat seperti bug).
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
          } else {
            // Hanya dicabut kalau benar-benar 0 px terlihat.
            e.target.classList.remove("in");
          }
        }
      },
      { threshold: [0, 0.15] },
    );
    els.forEach((el) => io.observe(el));

    /* Elemen yang sudah terlewati (di atas layar) dipaksa tampil.
       Tanpa ini, scroll cepat / lompat anchor bisa meninggalkan konten
       transparan selamanya karena observer tidak pernah melihatnya. */
    let raf = 0;
    const sapu = () => {
      raf = 0;
      for (const el of els) {
        if (el.classList.contains("in")) continue;
        if (el.getBoundingClientRect().bottom < 0) el.classList.add("in");
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sapu);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Hero diputar ulang: `hero-run` dipasang saat hero terlihat,
    // dicabut saat hero benar-benar hilang dari layar.
    const hero = document.querySelector<HTMLElement>(".hero");
    if (hero) {
      const ioHero = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          if (e.isIntersecting) hero.classList.add("hero-run");
          else hero.classList.remove("hero-run");
        },
        { threshold: 0 },
      );
      ioHero.observe(hero);
      return () => {
        io.disconnect();
        ioHero.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (raf) cancelAnimationFrame(raf);
      };
    }

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

export default function LandingPage() {
  const [tabHero, setTabHero] = useState<TabPreview>("rekam");
  const [tabBig, setTabBig] = useState<TabPreview>("rekam");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [navOpen, setNavOpen] = useState(false);
  const [legal, setLegal] = useState<"privasi" | "syarat" | "bantuan" | "kontak" | null>(null);
  const [navAktif, setNavAktif] = useState("beranda");
  useEffect(() => {
    const ids = ["beranda", "fitur", "cara-kerja", "tentang", "faq"];
    const obs = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) setNavAktif(e.target.id);
        }),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  useReveal();

  return (
    <div className="landing">
      {/* ============ HEADER ============ */}
      <header className="site-header">
        <div className="container">
          <a href="#beranda" className="brand">
            <BrandLockup variant="md" />
            <span>
              SehatKita<small>Kota Banjarbaru</small>
            </span>
          </a>
          <nav className={`nav-main ${navOpen ? "open" : ""}`} id="navMain">
            <a href="#beranda" className={navAktif === "beranda" ? "active" : ""} onClick={() => setNavAktif("beranda")}>Beranda</a>
            <a href="#fitur" className={navAktif === "fitur" ? "active" : ""} onClick={() => setNavAktif("fitur")}>Fitur</a>
            <a href="#cara-kerja" className={navAktif === "cara-kerja" ? "active" : ""} onClick={() => setNavAktif("cara-kerja")}>Cara Kerja</a>
            <a href="#tentang" className={navAktif === "tentang" ? "active" : ""} onClick={() => setNavAktif("tentang")}>Tentang</a>
            <a href="#faq" className={navAktif === "faq" ? "active" : ""} onClick={() => setNavAktif("faq")}>FAQ</a>
            <Link href="/login" className="nav-auth">Masuk</Link>
            <Link href="/register" className="nav-auth">Daftar</Link>
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
            <div className="hero-copy">
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
                <div className="pane-anim" key={tabHero}>
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
          <div className="sec-head center" data-reveal>
            <span className="eyebrow">Fitur</span>
            <h2 className="h1">Semua yang Anda butuhkan untuk memantau kesehatan</h2>
            <p className="lead">
              Fitur dirancang agar masyarakat umum mudah mencatat, memahami, dan menindaklanjuti kondisi kesehatan.
            </p>
          </div>
          <div className="grid grid-4">
            <div className="feat" data-reveal>
              <span className="feat-ico"><Icon name="file-text" /></span>
              <h3>Rekam Medis</h3>
              <p>Simpan riwayat berat badan, tensi, gula darah (puasa/2JPP), dan kolesterol dalam satu tempat.</p>
              <Link href="/rekam-medis" className="feat-link">
                Lihat riwayat <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <div className="feat" data-reveal>
              <span className="feat-ico tone-safe"><Icon name="calculator" /></span>
              <h3>Kalkulator Kesehatan</h3>
              <p>Hitung IMT, berat badan ideal, kebutuhan kalori harian, dan asupan air minum dengan cepat.</p>
              <Link href="/kalkulator" className="feat-link">
                Coba kalkulator <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <div className="feat" data-reveal>
              <span className="feat-ico tone-warning"><Icon name="sparkles" /></span>
              <h3>Insight Kesehatan</h3>
              <p>Analisis otomatis dari data Anda disertai rekomendasi praktis dan pencegahan dini.</p>
              <Link href="/insight" className="feat-link">
                Pelajari insight <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <div className="feat" data-reveal>
              <span className="feat-ico tone-orange"><Icon name="send" /></span>
              <h3>Rujukan &amp; Notifikasi</h3>
              <p>Terhubung ke Puskesmas terdekat dan dapatkan pengingat saat tindak lanjut dibutuhkan.</p>
              <Link href="/rujukan" className="feat-link">
                Info rujukan <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <div className="feat" data-reveal>
              <span className="feat-ico tone-safe"><Icon name="target" /></span>
              <h3>Target Kesehatan</h3>
              <p>Tetapkan target berat badan, aktivitas mingguan, dan cairan tubuh lalu pantau progresnya.</p>
              <Link href="/target-kesehatan" className="feat-link">
                Atur target <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <div className="feat feat-accent" data-reveal>
              <span className="feat-ico"><Icon name="trophy" /></span>
              <h3>Tantangan &amp; Reward</h3>
              <p>Selesaikan misi sehat, unggah foto dokumentasi, raih verifikasi kader, kumpulkan EXP &amp; badge.</p>
              <Link href="/program" className="feat-link" style={{ color: "#fff" }}>
                Jelajahi tantangan <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <div className="feat" data-reveal>
              <span className="feat-ico tone-warning"><Icon name="building" /></span>
              <h3>Program Posbindu</h3>
              <p>Ikuti jadwal skrining kelurahan, penyuluhan, dan pemeriksaan kesehatan rutin di wilayah Anda.</p>
              <Link href="/posbindu" className="feat-link">
                Lihat jadwal <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <div className="feat" data-reveal>
              <span className="feat-ico tone-info"><Icon name="bar-chart" /></span>
              <h3>Pemantauan Wilayah</h3>
              <p>Admin kelurahan memantau kondisi agregat dan tren kesehatan warga secara anonim.</p>
              <Link href="/peringkat" className="feat-link">
                Lihat peringkat <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CARA KERJA ============ */}
      <section className="section" id="cara-kerja" style={{ background: "var(--surface-2)" }}>
        <div className="container">
          <div className="sec-head center" data-reveal>
            <span className="eyebrow">Cara Kerja</span>
            <h2 className="h1">Mulai dalam beberapa langkah sederhana</h2>
          </div>
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div className="steps" data-reveal>
              <div className="step"><span className="step-num">1</span><div><h4>Daftar &amp; setujui kebijakan</h4><p>Masyarakat mendaftar dan menyetujui kebijakan penggunaan data.</p></div></div>
              <div className="step"><span className="step-num">2</span><div><h4>Masuk ke dashboard</h4><p>Pengguna masuk dan langsung dapat menggunakan aplikasi.</p></div></div>
              <div className="step"><span className="step-num">3</span><div><h4>Lengkapi profil</h4><p>Lengkapi data profil kapan pun Anda siap.</p></div></div>
              <div className="step"><span className="step-num">4</span><div><h4>Catat hasil pemeriksaan</h4><p>Catat hasil pemeriksaan mandiri atau dari Posbindu.</p></div></div>
            </div>
            <div className="steps" data-reveal>
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
          <div className="sec-head center" data-reveal>
            <span className="eyebrow">Pratinjau Produk</span>
            <h2 className="h1">Antarmuka yang benar-benar berfungsi</h2>
            <p className="lead">Pilih tab untuk melihat tampilan masing-masing bagian SehatKita.</p>
          </div>
          <div className="card card-pad-lg" data-reveal>
            <div className="tabs">
              {TAB_LABELS.map(([id, label]) => (
                <button key={id} className={`tab ${tabBig === id ? "active" : ""}`} onClick={() => setTabBig(id)} type="button">
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-20 pane-anim" key={tabBig}>
              <PreviewPanel tab={tabBig} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ TENTANG ============ */}
      <section className="section" id="tentang" style={{ background: "var(--surface-2)" }}>
        <div className="container">
          <div className="grid grid-2" style={{ gap: 44, alignItems: "center" }}>
            <div data-reveal>
              <span className="eyebrow">Tentang</span>
              <h2 className="h1 mt-12">Mendukung pemantauan PTM di Kota Banjarbaru</h2>
              <p className="lead mt-16">
                SehatKita adalah platform monitoring kesehatan Penyakit Tidak Menular (PTM) yang menghubungkan
                masyarakat, kader Posbindu, kelurahan, dan fasilitas kesehatan. Platform ini membantu deteksi dini
                faktor risiko, mendorong kebiasaan sehat, dan menyediakan data agregat wilayah untuk pengambilan
                keputusan program kesehatan.
              </p>
              <div className="grid grid-2 mt-24" style={{ gap: 14 }}>
                <div className="card card-flat" data-reveal>
                  <span className="feat-ico mb-12"><Icon name="map-pin" /></span>
                  <h4 className="h4">Berbasis Wilayah</h4>
                  <p className="tiny mt-4">Terhubung kelurahan di Kota Banjarbaru.</p>
                </div>
                <div className="card card-flat" data-reveal>
                  <span className="feat-ico mb-12"><Icon name="lock" /></span>
                  <h4 className="h4">Privasi Terjaga</h4>
                  <p className="tiny mt-4">Data individual tidak dibagikan ke role agregat.</p>
                </div>
              </div>
            </div>
            <div className="card card-pad-lg card-raised" data-reveal>
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
          <div className="sec-head center" data-reveal>
            <span className="eyebrow">FAQ</span>
            <h2 className="h1">Pertanyaan yang sering diajukan</h2>
          </div>
          <div data-reveal>
            {FAQ_LANDING.map(([q, a], i) => (
              <FaqItem key={i} q={q} a={a} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? null : i)} />
            ))}
          </div>
          <div className="card mt-20" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }} data-reveal>
            <div>
              <strong className="text-sm">Masih butuh bantuan atau panduan langkah?</strong>
              <p className="tiny mt-4">Buka Pusat Bantuan SehatKita untuk panduan akun, pencatatan, dan kontak resmi.</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setLegal("bantuan")}>
              <Icon name="help-circle" size={16} /> Pusat Bantuan
            </button>
          </div>
        </div>
      </section>

      {/* ============ CTA BAND ============ */}
      <section className="section-sm">
        <div className="container">
          <div className="cta-band" data-reveal>
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
                <BrandLockup variant="md" />
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
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("bantuan"); }}>Pusat Bantuan</a>
              <Link href="/kalkulator">Kalkulator Kesehatan</Link>
              <Link href="/login">Masuk</Link>
              <Link href="/register">Daftar</Link>
            </div>
            <div className="footer-col">
              <h4>Legal &amp; Kontak</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("privasi"); }}>Kebijakan Privasi</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("syarat"); }}>Syarat dan Ketentuan</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setLegal("kontak"); }}>Kontak Resmi</a>
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

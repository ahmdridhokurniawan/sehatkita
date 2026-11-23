"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Line from "@/components/charts/Line";
import PreviewPanel, { TAB_LABELS, type TabPreview } from "@/components/landing/PreviewPanel";
import PublicHeader from "@/components/landing/PublicHeader";
import PublicFooter from "@/components/landing/PublicFooter";
import LegalInfoModal, { type LegalTopic } from "@/components/landing/LegalInfoModal";
import FaqItem from "@/components/landing/FaqItem";
import CursorField, { handleGridSpotlightLeave, handleGridSpotlightMove } from "@/components/ui/CursorField";
import { CATATAN_DEMO, FAQ_LANDING } from "@/lib/demo";

const HERO_TREND_LABELS = ["3 Bln Lalu", "", "", "", "Pertengahan", "", "", "", "Terkini"];

/* ---------------- Reveal & Scroll Choreography ----------------
   Menggabungkan reveal masuk viewport (arah bervariasi, reset hanya jika sudah keluar di bawah layar)
   serta progres scroll & efek parallax/scrub halus berbasis --scroll-pct, --hero-p, dan --vis. */
function useReveal() {
  useEffect(() => {
    const landing = document.querySelector<HTMLElement>(".landing");
    const hero = document.querySelector<HTMLElement>(".hero");
    hero?.classList.add("hero-run");

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const scrubEls = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-fx]"));

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (kurangiGerak) {
      els.forEach((el) => el.classList.add("in"));
      scrubEls.forEach((el) => el.style.setProperty("--vis", "1"));
      return;
    }

    const updateOnScroll = () => {
      const vh = window.innerHeight || 800;
      const sy = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

      if (landing) {
        landing.style.setProperty("--scroll-pct", Math.min(1, Math.max(0, sy / maxScroll)).toFixed(4));
        landing.style.setProperty("--hero-p", Math.min(1, Math.max(0, sy / Math.max(320, vh * 0.72))).toFixed(4));
      }

      const batasMasuk = vh * 0.82;
      const batasReset = vh * 1.12;
      for (const el of els) {
        const top = el.getBoundingClientRect().top;
        if (top <= batasMasuk) {
          el.classList.add("in");
        } else if (top > batasReset) {
          el.classList.remove("in");
        }
      }

      for (const el of scrubEls) {
        const r = el.getBoundingClientRect();
        const vis = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.78)));
        el.style.setProperty("--vis", vis.toFixed(3));
      }
    };

    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                if (e.isIntersecting) {
                  e.target.classList.add("in");
                } else if (e.boundingClientRect.top > window.innerHeight * 1.12) {
                  e.target.classList.remove("in");
                }
              }
            },
            { threshold: 0.06, rootMargin: "0px 0px -16% 0px" },
          )
        : null;

    updateOnScroll();
    for (const el of els) {
      io?.observe(el);
    }

    let raf = 0;
    const onScroll = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          updateOnScroll();
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

export default function LandingPage() {
  const [tabPreview, setTabPreview] = useState<TabPreview>("rekam");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [navAktif, setNavAktif] = useState("beranda");
  const [legalTopic, setLegalTopic] = useState<LegalTopic | null>(null);
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
      {/* ============ AMBIENT AURORA BACKGROUND ============ */}
      <div className="landing-aurora-bg" aria-hidden="true">
        <div className="landing-aurora-orb aurora-1" />
        <div className="landing-aurora-orb aurora-2" />
      </div>

      <div className="scroll-progress" aria-hidden="true" />
      {/* ============ HEADER ============ */}
      <PublicHeader isLanding activeNav={navAktif} onSelectNav={setNavAktif} />

      {/* ============ HERO ============ */}
      <section className="hero hero-interactive" id="beranda">
        <CursorField variant="hero" />
        <span className="hero-cursor-aura" aria-hidden="true" />
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow eyebrow-live">
                <span className="eyebrow-dot" aria-hidden="true" />
                Platform Monitoring PTM
              </span>
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

            <div className="hero-preview-stage">
              <div className="hero-bento" aria-label="Ringkasan layanan SehatKita">
                <div className="card hero-bento-main">
                  <div className="row-between gap-12 mb-12">
                    <div>
                      <span className="hero-bento-kicker">Pantauan 90 Hari</span>
                      <strong className="hero-bento-title">Progres Berat Badan Warga</strong>
                    </div>
                    <span className="badge badge-safe">
                      <Icon name="trending-down" size={13} /> -5,8 kg
                    </span>
                  </div>
                  <div className="chart">
                    <Line
                      labels={HERO_TREND_LABELS}
                      series={[{ name: "Berat Badan", data: CATATAN_DEMO.map((c) => c.bb_kg) }]}
                      unit="kg"
                      height={162}
                    />
                  </div>
                  <div className="hero-bento-stats">
                    <div className="hero-bento-stat">
                      <span>Awal</span>
                      <strong>91,0 kg</strong>
                    </div>
                    <div className="hero-bento-stat">
                      <span>Terkini</span>
                      <strong>85,2 kg</strong>
                    </div>
                    <div className="hero-bento-stat">
                      <span>Sumber</span>
                      <strong>Mandiri &amp; Posbindu</strong>
                    </div>
                  </div>
                </div>

                <div className="hero-bento-row">
                  <div className="card hero-bento-mini">
                    <div className="row-between gap-8 mb-10">
                      <span className="hero-bento-ico">
                        <Icon name="calendar-check" size={16} />
                      </span>
                      <span className="badge badge-primary">Posbindu Aktif</span>
                    </div>
                    <h4>Terhubung ke Kelurahan</h4>
                    <p className="tiny mt-4">
                      Agenda pemeriksaan rutin &amp; pendampingan kader langsung di lingkungan Anda.
                    </p>
                    <span className="hero-bento-meta">Kota Banjarbaru · Gratis warga</span>
                  </div>

                  <a href="#pratinjau" className="card hero-bento-mini hero-bento-link">
                    <div className="row-between gap-8 mb-10">
                      <span className="hero-bento-ico is-accent">
                        <Icon name="sparkles" size={16} />
                      </span>
                      <span className="badge badge-info">3 Tampilan</span>
                    </div>
                    <h4>Analisis &amp; Misi Harian</h4>
                    <p className="tiny mt-4">
                      Rangkuman perubahan kondisi tubuh &amp; misi kebiasaan sehat bersama kader.
                    </p>
                    <span className="hero-bento-cta">
                      Lihat pratinjau penuh <Icon name="arrow-down" size={14} />
                    </span>
                  </a>
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
            <h2 className="h1">Fitur untuk memantau kesehatan Anda</h2>
            <p className="lead">
              Coba kalkulator kesehatan secara langsung tanpa perlu masuk akun, atau kenali layanan SehatKita untuk mencatat dan menjaga kondisi tubuh setiap hari.
            </p>
          </div>
          <div
            className="grid grid-4"
            onPointerMove={(e) => handleGridSpotlightMove(e)}
            onPointerLeave={(e) => handleGridSpotlightLeave(e)}
          >
            <Link href="/kalkulator" className="feat feat-accent feat-clickable" data-reveal="zoom">
              <span className="feat-ico"><Icon name="calculator" /></span>
              <h3>Kalkulator Kesehatan</h3>
              <p>Hitung IMT, berat badan ideal, kebutuhan kalori harian, asupan air minum, detak jantung, serta cek tensi dan gula darah secara instan.</p>
              <span className="feat-link" style={{ color: "#fff" }}>
                Hitung sekarang <Icon name="arrow-right" size={15} />
              </span>
            </Link>
            <div className="feat" data-reveal="zoom">
              <span className="feat-ico"><Icon name="file-text" /></span>
              <h3>Rekam Medis</h3>
              <p>Catat dan simpan riwayat berat badan, tekanan darah, gula darah (puasa maupun setelah makan), serta kolesterol agar mudah dipantau.</p>
            </div>
            <div className="feat" data-reveal="zoom">
              <span className="feat-ico tone-warning"><Icon name="sparkles" /></span>
              <h3>Analisis Kesehatan</h3>
              <p>Membaca perubahan data kesehatan Anda secara otomatis disertai saran langkah pencegahan dini dalam bahasa yang mudah dipahami.</p>
            </div>
            <div className="feat" data-reveal="zoom">
              <span className="feat-ico tone-orange"><Icon name="send" /></span>
              <h3>Rujukan &amp; Notifikasi</h3>
              <p>Membantu menghubungkan kondisi yang perlu perhatian medis ke Puskesmas terdekat serta mengirim pengingat saat pemeriksaan lanjutan dibutuhkan.</p>
            </div>
            <div className="feat" data-reveal="zoom">
              <span className="feat-ico tone-safe"><Icon name="target" /></span>
              <h3>Target Kesehatan</h3>
              <p>Tetapkan sasaran berat badan, target olahraga mingguan, dan kebutuhan minum harian, lalu pantau perkembangannya secara berkala.</p>
            </div>
            <div className="feat" data-reveal="zoom">
              <span className="feat-ico"><Icon name="trophy" /></span>
              <h3>Tantangan &amp; Hadiah</h3>
              <p>Ikuti misi kebiasaan sehat harian, kirim bukti aktivitas untuk diverifikasi kader, lalu kumpulkan poin dan lencana pencapaian.</p>
            </div>
            <div className="feat" data-reveal="zoom">
              <span className="feat-ico tone-warning"><Icon name="building" /></span>
              <h3>Program Posbindu</h3>
              <p>Pantau jadwal pemeriksaan kesehatan rutin, penyuluhan, dan kegiatan Posbindu kelurahan di lingkungan tempat tinggal Anda.</p>
            </div>
            <div className="feat" data-reveal="zoom">
              <span className="feat-ico tone-info"><Icon name="bar-chart" /></span>
              <h3>Pemantauan Wilayah</h3>
              <p>Menampilkan ringkasan tren kesehatan warga per kelurahan secara menyeluruh untuk mendukung program wilayah tanpa membuka data pribadi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CARA KERJA ============ */}
      <section className="section section-alt" id="cara-kerja">
        <div className="container">
          <div className="sec-head center" data-reveal>
            <span className="eyebrow">Cara Kerja</span>
            <h2 className="h1">Mulai dalam beberapa langkah sederhana</h2>
          </div>
          <div className="grid grid-2 cara-kerja-grid">
            <div className="steps" data-reveal="left">
              <div className="step"><span className="step-num">1</span><div><h4>Daftar &amp; setujui kebijakan</h4><p>Masyarakat mendaftar dan menyetujui kebijakan penggunaan data.</p></div></div>
              <div className="step"><span className="step-num">2</span><div><h4>Masuk ke dashboard</h4><p>Pengguna masuk dan langsung dapat menggunakan aplikasi.</p></div></div>
              <div className="step"><span className="step-num">3</span><div><h4>Lengkapi profil</h4><p>Lengkapi data profil kapan pun Anda siap.</p></div></div>
              <div className="step"><span className="step-num">4</span><div><h4>Catat hasil pemeriksaan</h4><p>Catat hasil pemeriksaan mandiri atau dari Posbindu.</p></div></div>
            </div>
            <div className="flex flex-col justify-between gap-20" data-reveal="right">
              <div className="steps">
                <div className="step"><span className="step-num">5</span><div><h4>Lihat hasil analisis</h4><p>Sistem menampilkan hasil analisis dan rangkuman kondisi tubuh secara sederhana.</p></div></div>
                <div className="step"><span className="step-num">6</span><div><h4>Ikuti program &amp; tantangan</h4><p>Bergabung dengan program kesehatan dan tantangan wilayah.</p></div></div>
                <div className="step"><span className="step-num">7</span><div><h4>Petugas menindaklanjuti</h4><p>Kader, admin kelurahan, dan fasilitas kesehatan melihat informasi sesuai kewenangannya.</p></div></div>
              </div>
              <div className="step-cta">
                <div>
                  <strong className="text-sm">Siap mencoba langkah pertama?</strong>
                  <p className="tiny mt-4">Pendaftaran warga gratis dan langsung terhubung ke kelurahan Anda.</p>
                </div>
                <div className="row gap-8 wrap">
                  <Link href="/register" className="btn btn-primary btn-sm">
                    Daftar Gratis <Icon name="arrow-right" size={14} />
                  </Link>
                  <Link href="/bantuan" className="btn btn-outline btn-sm">
                    Panduan
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PREVIEW INTERAKTIF (BESAR) ============ */}
      <section className="section" id="pratinjau">
        <div className="container">
          <div className="sec-head center" data-reveal>
            <span className="eyebrow">Pratinjau Produk</span>
            <h2 className="h1">Antarmuka yang benar-benar berfungsi</h2>
            <p className="lead">Pilih tab untuk melihat tampilan masing-masing bagian SehatKita.</p>
          </div>
          <div className="scroll-scrub" data-scroll-fx>
            <div className="card card-pad-lg preview-big" data-reveal="zoom">
              <div className="tabs">
                {TAB_LABELS.map(([id, label]) => (
                  <button key={id} className={`tab ${tabPreview === id ? "active" : ""}`} onClick={() => setTabPreview(id)} type="button">
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-20 pane-anim pane-anim-lg" key={tabPreview}>
                <PreviewPanel tab={tabPreview} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TENTANG ============ */}
      <section className="section section-alt" id="tentang">
        <div className="container">
          <div className="tentang-grid">
            <div className="tentang-left" data-reveal="left">
              <div>
                <span className="eyebrow">Tentang</span>
                <h2 className="h1 mt-12">Mendukung pemantauan PTM di Kota Banjarbaru</h2>
                <p className="lead mt-16">
                  SehatKita adalah platform pemantauan kesehatan yang menghubungkan masyarakat, kader Posbindu,
                  kelurahan, dan Puskesmas di Kota Banjarbaru. Platform ini membantu deteksi dini risiko penyakit,
                  mendorong kebiasaan hidup sehat, dan menyediakan ringkasan kondisi warga secara menyeluruh guna
                  mendukung program kesehatan daerah.
                </p>
              </div>
              <div className="grid grid-2" style={{ gap: 14 }}>
                <div className="card card-flat" data-reveal>
                  <span className="feat-ico mb-12"><Icon name="map-pin" /></span>
                  <h4 className="h4">Berbasis Wilayah</h4>
                  <p className="tiny mt-4">Terhubung langsung ke kelurahan di Kota Banjarbaru dan jadwal Posbindu.</p>
                </div>
                <div className="card card-flat" data-reveal>
                  <span className="feat-ico mb-12"><Icon name="lock" /></span>
                  <h4 className="h4">Privasi Terjaga</h4>
                  <p className="tiny mt-4">Catatan kesehatan pribadi Anda tersimpan terpisah dan tidak pernah dibuka pada laporan wilayah.</p>
                </div>
              </div>
            </div>

            <div className="card card-pad-lg card-raised tentang-panel" data-reveal="right">
              <div>
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
                    <span className="text-sm">Mendukung kader Posbindu dan Puskesmas dengan ringkasan kondisi warga yang akurat dan aman.</span>
                  </li>
                </ul>
              </div>

              <div className="tentang-role-box">
                <div className="row-between mb-12">
                  <h4 className="h4">Tata Kelola &amp; Hak Akses</h4>
                  <button
                    type="button"
                    className="feat-link"
                    style={{ marginTop: 0, paddingTop: 0, background: "transparent", border: "none", cursor: "pointer" }}
                    onClick={() => setLegalTopic("privasi")}
                  >
                    Kebijakan Privasi <Icon name="arrow-right" size={14} />
                  </button>
                </div>
                <div className="tentang-role-grid">
                  <div className="tentang-role-item">
                    <strong>Warga &amp; Kader Posbindu</strong>
                    <span className="tiny">Pencatatan riwayat, pendampingan sesi, serta verifikasi misi sehat.</span>
                  </div>
                  <div className="tentang-role-item">
                    <strong>Admin Kelurahan &amp; Faskes</strong>
                    <span className="tiny">Ringkasan statistik wilayah tanpa nama pribadi untuk membantu program Posbindu dan tindak lanjut rujukan.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="section" id="faq">
        <div className="container">
          <div className="faq-layout">
            <div className="faq-aside" data-reveal="left">
              <div className="sec-head">
                <span className="eyebrow">FAQ</span>
                <h2 className="h1">Pertanyaan yang sering diajukan</h2>
                <p className="lead">
                  Ringkasan pertanyaan umum seputar akun, pencatatan indikator kesehatan, rujukan, dan privasi data.
                </p>
              </div>
              <div className="card">
                <strong className="text-sm">Masih butuh bantuan atau panduan langkah?</strong>
                <p className="tiny mt-6">
                  Baca panduan lengkap per topik di Pusat Bantuan atau hubungi tim pengelola resmi Kota Banjarbaru.
                </p>
                <div className="row gap-8 wrap mt-12">
                  <Link href="/bantuan" className="btn btn-primary btn-sm">
                    <Icon name="help-circle" size={15} /> Pusat Bantuan
                  </Link>
                  <Link href="/kontak" className="btn btn-outline btn-sm">
                    Kontak Resmi
                  </Link>
                </div>
              </div>
            </div>

            <div data-reveal="right">
              {FAQ_LANDING.map(([q, a], i) => (
                <FaqItem key={i} q={q} a={a} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? null : i)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA BAND ============ */}
      <section className="section-sm">
        <div className="container">
          <div className="scroll-scrub" data-scroll-fx>
            <div className="cta-band cta-interactive" data-reveal="zoom">
              <CursorField variant="aside" />
              <span className="auth-cursor-aura" aria-hidden="true" />
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
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <PublicFooter isLanding />

      <LegalInfoModal
        topic={legalTopic}
        onChangeTopic={setLegalTopic}
        onClose={() => setLegalTopic(null)}
      />
    </div>
  );
}

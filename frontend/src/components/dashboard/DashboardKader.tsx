"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Bar from "@/components/charts/Bar";
import GrafikTrenRekamMedis from "@/components/charts/GrafikTrenRekamMedis";
import { FormKepuasanMasyarakat } from "@/components/dashboard/KepuasanMasyarakatWidget";
import {
  GlassyAgendaDate,
  GlassyDashboardSkeleton,
  GlassyKpiGrid,
  GlassyProgressRing,
  type GlassyKpiItem,
} from "@/components/dashboard/GlassyWidgets";
import { tanggal, angka, todayLocalISO } from "@/lib/format";
import { useMinLoading } from "@/hooks/useMinLoading";
import { posbindu, rujukan, ApiError } from "@/lib/api";
import type { User, SesiPosbindu, Rujukan } from "@/types";

type TabPanel = "rujukan" | "posbindu" | "grafik";

const LABEL_STATUS_RUJUKAN: Record<string, string> = {
  baru: "Baru",
  dihubungi: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const TONE_STATUS_RUJUKAN: Record<string, "warning" | "primary" | "safe" | "danger"> = {
  baru: "warning",
  dihubungi: "primary",
  selesai: "safe",
  ditolak: "danger",
};

function bulanSekarang(iso: string) {
  return iso?.slice(0, 7) === todayLocalISO().slice(0, 7);
}

export default function DashboardKader({ user: _user }: { user: User }) {
  void _user;
  const [sesi, setSesi] = useState<SesiPosbindu[]>([]);
  const [daftarRujukan, setDaftarRujukan] = useState<Rujukan[]>([]);
  const [tabPanel, setTabPanel] = useState<TabPanel>("rujukan");
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;

    async function muat() {
      try {
        setLoading(true);
        const [s, r] = await Promise.all([
          posbindu.sesiList({}),
          rujukan.list({}),
        ]);
        if (batal) return;
        setSesi(s);
        setDaftarRujukan(r);
        setError(null);
      } catch (err) {
        if (batal) return;
        setError((err as ApiError).message || "Gagal memuat beranda kader");
      } finally {
        if (!batal) setLoading(false);
      }
    }

    muat();
    return () => {
      batal = true;
    };
  }, []);

  if (tampilLoading) {
    return (
      <AppShell greet="Halo Kader">
        <GlassyDashboardSkeleton label="Memuat beranda kader…" />
      </AppShell>
    );
  }

  const hariIni = todayLocalISO();
  const sesiBulanIni = sesi.filter((s) => bulanSekarang(s.tanggal));
  const hadirBulanIni = sesiBulanIni.reduce((n, s) => n + (s.hadir || 0), 0);
  const pesertaBulanIni = sesiBulanIni.reduce((n, s) => n + (s.jumlah_peserta || 0), 0);
  const sesiAkanDatangList = sesi.filter((s) => s.tanggal >= hariIni);
  const sesiBerikutnya = sesiAkanDatangList[0] ?? sesi[0] ?? null;

  const totalHadir = sesi.reduce((n, s) => n + (s.hadir || 0), 0);
  const totalPeserta = sesi.reduce((n, s) => n + (s.jumlah_peserta || 0), 0);
  const rasioHadir = totalPeserta > 0 ? Math.round((totalHadir / totalPeserta) * 100) : 0;

  const rujukanTerbuka = daftarRujukan.filter((r) => r.status === "baru" || r.status === "dihubungi");
  const rujukanSelesai = daftarRujukan.filter((r) => r.status === "selesai");
  const sesiGrafik = sesi.slice(0, 7).reverse();

  const kpiItems: GlassyKpiItem[] = [
    {
      id: "kehadiran",
      title: "Rasio Kehadiran",
      subtitle: `${angka(totalHadir)} dari ${angka(totalPeserta)} warga`,
      value: `${rasioHadir}%`,
      icon: "users",
      pillText: rasioHadir >= 70 ? "Target tercapai" : "Perlu dorongan",
      pillTone: rasioHadir >= 70 ? "safe" : "warning",
      href: "/posbindu",
    },
    {
      id: "sesi-bulan",
      title: "Sesi Bulan Ini",
      subtitle: `${angka(hadirBulanIni)} hadir · ${angka(pesertaBulanIni)} terdaftar`,
      value: angka(sesiBulanIni.length),
      icon: "calendar",
      pillText: `${angka(sesi.length)} total sesi`,
      pillTone: "info",
      href: "/posbindu",
    },
    {
      id: "rujukan",
      title: "Rujukan Terbuka",
      subtitle: `${angka(rujukanSelesai.length)} selesai ditindak`,
      value: angka(rujukanTerbuka.length),
      icon: "send",
      pillText: rujukanTerbuka.length > 0 ? "Perlu tindak lanjut" : "Semua selesai",
      pillTone: rujukanTerbuka.length > 0 ? "danger" : "safe",
      href: "/rujukan",
    },
    {
      id: "mendatang",
      title: "Sesi Mendatang",
      subtitle: sesiBerikutnya ? `Berikutnya ${tanggal(sesiBerikutnya.tanggal, "short")}` : "Belum terjadwal",
      value: angka(sesiAkanDatangList.length),
      icon: "calendar-check",
      pillText: sesiAkanDatangList.length > 0 ? "Terjadwal" : "Buat jadwal",
      pillTone: "info",
      href: "/posbindu",
    },
  ];

  const heroWarn = rujukanTerbuka.length > 0 && sesiAkanDatangList.length === 0;

  return (
    <AppShell greet="Halo Kader">
      {error ? (
        <div className="alert alert-danger">
          <Icon name="alert-circle" size={18} />
          <div>{error}</div>
        </div>
      ) : null}

      {/* HEADER RINGKAS */}
      <div className="gv-head">
        <div>
          <h1 className="gv-head-title">Ringkasan Kader Posbindu</h1>
          <p className="gv-head-sub">
            {angka(sesi.length)} total sesi tercatat · {angka(rujukanTerbuka.length)} rujukan perlu tindak lanjut
          </p>
        </div>

        <div className="gv-head-actions">
          <Link href="/rujukan" className="btn btn-sm btn-outline">
            <Icon name="send" size={14} /> Daftar Rujukan
          </Link>
          <Link href="/posbindu" className="btn btn-sm btn-primary">
            <Icon name="calendar-check" size={14} /> Kelola Posbindu
          </Link>
        </div>
      </div>

      {/* PANEL UTAMA TERPADU */}
      <section className="gv-surface">
        <div className="gv-top-grid">
          <div className={`gv-hero${heroWarn ? " is-warning" : ""}`}>
            <div className="gv-hero-main">
              <Badge tone={rujukanTerbuka.length > 0 ? "warning" : "safe"}>
                {rujukanTerbuka.length > 0
                  ? `${angka(rujukanTerbuka.length)} rujukan perlu tindak lanjut`
                  : "Semua rujukan binaan aman"}
              </Badge>

              <div>
                <h2 className="gv-hero-title">
                  {sesiBerikutnya
                    ? `Sesi berikutnya: ${tanggal(sesiBerikutnya.tanggal, "short")}`
                    : "Belum ada jadwal Posbindu terbaru"}
                </h2>
                <p className="gv-hero-desc">
                  {sesiBerikutnya?.lokasi
                    ? `Lokasi di ${sesiBerikutnya.lokasi} · ${angka(hadirBulanIni)} dari ${angka(pesertaBulanIni)} warga hadir bulan ini.`
                    : "Pantau kehadiran warga di setiap sesi Posbindu dan tindak lanjuti rujukan aktif secara berkala."}
                </p>
              </div>

              <div className="gv-hero-metrics">
                <div className="gv-hero-metric">
                  <strong>{angka(sesi.length)}</strong>
                  <span>Total Sesi</span>
                </div>
                <div className="gv-hero-metric">
                  <strong>{angka(hadirBulanIni)}</strong>
                  <span>Hadir Bulan Ini</span>
                </div>
                <div className="gv-hero-metric">
                  <strong>{angka(rujukanSelesai.length)}</strong>
                  <span>Rujukan Selesai</span>
                </div>
              </div>
            </div>

            <GlassyProgressRing
              percent={rasioHadir}
              centerLabel="kehadiran"
              caption={`${angka(totalHadir)}/${angka(totalPeserta)} warga`}
              ariaLabel={`Rasio Kehadiran Posbindu ${rasioHadir}%`}
            />
          </div>

          <div className="gv-agenda">
          <div className="gv-agenda-head">
            <GlassyAgendaDate />
            <Badge tone={rujukanTerbuka.length > 0 ? "warning" : "safe"}>
              {rujukanTerbuka.length > 0 ? `${angka(rujukanTerbuka.length)} terbuka` : "Aman"}
            </Badge>
          </div>

          <div className="gv-tab-strip" role="tablist" aria-label="Panel ringkas kader">
            {(
              [
                ["rujukan", "Rujukan"],
                ["posbindu", "Posbindu"],
                ["grafik", "Grafik Hadir"],
              ] as const
            ).map(([kunci, label]) => (
              <button
                key={kunci}
                type="button"
                role="tab"
                aria-selected={tabPanel === kunci}
                className={`gv-tab-btn${tabPanel === kunci ? " is-active" : ""}`}
                onClick={() => setTabPanel(kunci)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="gv-agenda-body">
            {tabPanel === "rujukan" ? (
              rujukanTerbuka.length === 0 ? (
                <div className="sa-feed">
                  <Link href="/rujukan" className="sa-row">
                    <span className="sa-feed-ico" style={{ background: "var(--safe-bg)", color: "var(--safe)" }}>
                      <Icon name="check-circle" size={16} />
                    </span>
                    <div className="sa-feed-main">
                      <strong>Tidak ada rujukan terbuka</strong>
                      <span>Semua rujukan warga binaan sudah ditindaklanjuti</span>
                    </div>
                    <Icon name="chevron-right" size={16} />
                  </Link>
                </div>
              ) : (
                <div className="sa-feed">
                  {rujukanTerbuka.slice(0, 4).map((r) => {
                    const tone = TONE_STATUS_RUJUKAN[r.status] || "warning";
                    return (
                      <Link key={r.id} href="/rujukan" className="sa-feed-item">
                        <span
                          className="sa-feed-ico"
                          style={{
                            background: tone === "warning" ? "var(--warning-bg)" : "var(--primary-050)",
                            color: tone === "warning" ? "var(--warning)" : "var(--primary)",
                          }}
                        >
                          <Icon name="alert-triangle" size={15} />
                        </span>
                        <div className="sa-feed-main">
                          <strong>{r.user?.name || "Warga Binaan"}</strong>
                          <span>
                            {r.faskes?.nama || "Fasilitas Kesehatan"} · {r.alasan || "Perlu tindak lanjut"}
                          </span>
                        </div>
                        <Badge tone={tone}>{LABEL_STATUS_RUJUKAN[r.status] || r.status}</Badge>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : tabPanel === "posbindu" ? (
              sesi.length === 0 ? (
                <p className="tiny center py-16">Belum ada sesi Posbindu yang ditugaskan.</p>
              ) : (
                <div className="sa-feed">
                  {sesi.slice(0, 4).map((s) => (
                    <Link key={s.id} href="/posbindu" className="sa-row">
                      <span className="sa-feed-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                        <Icon name="calendar-check" size={15} />
                      </span>
                      <div className="sa-feed-main">
                        <strong>{s.lokasi || "Lokasi Posbindu"}</strong>
                        <span>
                          {tanggal(s.tanggal, "day")} · {angka(s.hadir)} hadir dari {angka(s.jumlah_peserta)} peserta
                        </span>
                      </div>
                      <Badge tone={s.hadir > 0 ? "safe" : "info"}>
                        {angka(s.hadir)}/{angka(s.jumlah_peserta)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )
            ) : sesiGrafik.length > 0 ? (
              <Bar
                labels={sesiGrafik.map((s) => tanggal(s.tanggal, "short"))}
                values={sesiGrafik.map((s) => s.hadir || 0)}
                unit="peserta"
                height={170}
              />
            ) : (
              <p className="tiny center py-16">Belum ada riwayat kehadiran untuk ditampilkan.</p>
            )}
          </div>

          <div className="gv-agenda-foot">
            <span className="row gap-6 items-center">
              <Icon name="map-pin" size={14} className="text-primary" />
              <span>
                {sesiBerikutnya
                  ? `${tanggal(sesiBerikutnya.tanggal, "short")} · ${sesiBerikutnya.lokasi}`
                  : "Belum ada lokasi sesi"}
              </span>
            </span>
            <Link href={tabPanel === "rujukan" ? "/rujukan" : "/posbindu"} className="bento-sec-action">
              Lihat semua <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          </div>
        </div>

        {/* STRIP KPI TERPADU */}
        <GlassyKpiGrid items={kpiItems} />
      </section>

      <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
        <Link href="/rekam-medis" className="btn btn-sm btn-outline">
          <Icon name="clipboard" size={14} /> Rekam Medis Warga
        </Link>
        <Link href="/posbindu" className="btn btn-sm btn-outline">
          <Icon name="calendar-check" size={14} /> Posbindu
        </Link>
        <Link href="/program" className="btn btn-sm btn-outline">
          <Icon name="trophy" size={14} /> Verifikasi Tantangan
        </Link>
        <Link href="/edukasi" className="btn btn-sm btn-outline">
          <Icon name="book-open" size={14} /> Edukasi
        </Link>
      </div>

      <div className="mt-16" style={{ display: "grid", gap: 16 }}>
        <GrafikTrenRekamMedis user={_user} />
        <FormKepuasanMasyarakat />
      </div>
    </AppShell>
  );
}

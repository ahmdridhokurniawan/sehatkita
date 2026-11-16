"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Bar from "@/components/charts/Bar";
import Line from "@/components/charts/Line";
import { ErrorState } from "@/components/ui/Empty";
import {
  GlassyAgendaDate,
  GlassyDashboardSkeleton,
  GlassyKpiGrid,
  GlassyProgressRing,
  buildSparklinePath,
  type GlassyKpiItem,
} from "@/components/dashboard/GlassyWidgets";
import { dashboard as dashboardApi, posbindu as posbinduApi, rujukan as rujukanApi, ApiError } from "@/lib/api";
import { LABEL_KATEGORI_IMT } from "@/lib/labels";
import { tanggal, angka } from "@/lib/format";
import { useMinLoading } from "@/hooks/useMinLoading";
import type { DashboardKelurahan, Rujukan, SesiPosbindu, User } from "@/types";
import type { KategoriImt } from "@/lib/enums";

/* Dashboard admin kelurahan — angka dari API (kontrak §9.1, §10.6, §11.2).
   Privasi (sel < 5 disembunyikan) dijalankan backend; FE tidak menampilkan PII warga. */

type TabPanel = "grafik" | "rujukan" | "posbindu";

const TONE_RUJUKAN: Record<string, "safe" | "warning" | "danger"> = {
  baru: "danger",
  dihubungi: "warning",
  selesai: "safe",
  ditolak: "danger",
  belum_ditindaklanjuti: "warning",
};

const NAMA_STATUS: Record<string, string> = {
  baru: "Baru",
  dihubungi: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
  belum_ditindaklanjuti: "Belum ditindaklanjuti",
};

const LABEL_PERIODE: Record<string, string> = {
  "1m": "1 bulan terakhir",
  "3m": "3 bulan terakhir",
  "6m": "6 bulan terakhir",
  "1y": "12 bulan terakhir",
};

function labelImt(kategori?: string): string {
  return LABEL_KATEGORI_IMT[kategori as KategoriImt] ?? kategori ?? "—";
}

export default function DashboardAdminKelurahan({ user }: { user: User }) {
  const wilayah = user.wilayah?.nama || "Kelurahan";
  const [d, setD] = useState<DashboardKelurahan | null>(null);
  const [sesiTerbaru, setSesiTerbaru] = useState<SesiPosbindu[]>([]);
  const [rujukan, setRujukan] = useState<Rujukan[]>([]);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");
  const [tabPanel, setTabPanel] = useState<TabPanel>("grafik");
  const [modeGrafik, setModeGrafik] = useState<"tren" | "imt">("tren");

  const muat = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, ruj, sesi] = await Promise.all([
        dashboardApi.kelurahan(),
        rujukanApi.list().catch(() => [] as Rujukan[]),
        posbinduApi.sesiList().catch(() => [] as SesiPosbindu[]),
      ]);
      setD(dash);
      setRujukan(ruj);
      setSesiTerbaru(sesi.slice(0, 5));
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat beranda wilayah");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    Promise.all([
      dashboardApi.kelurahan(),
      rujukanApi.list().catch(() => [] as Rujukan[]),
      posbinduApi.sesiList().catch(() => [] as SesiPosbindu[]),
    ])
      .then(([dash, ruj, sesi]) => {
        if (!aktif) return;
        setD(dash);
        setRujukan(ruj);
        setSesiTerbaru(sesi.slice(0, 5));
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat beranda wilayah");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  if (tampilLoading) {
    return (
      <AppShell greet={`Halo Admin ${wilayah}`}>
        <GlassyDashboardSkeleton label="Memuat beranda wilayah…" />
      </AppShell>
    );
  }

  if (error || !d) {
    return (
      <AppShell greet={`Halo Admin ${wilayah}`}>
        <ErrorState message={error || "Data tidak tersedia"} onRetry={muat} />
      </AppShell>
    );
  }

  const totalRujukan =
    (d.rujukan.baru ?? 0) +
    (d.rujukan.dihubungi ?? 0) +
    (d.rujukan.selesai ?? 0) +
    (d.rujukan.ditolak ?? 0);
  const rasioAktif = d.total_peserta > 0 ? Math.min(100, Math.round((d.total_pengguna_aktif / d.total_peserta) * 100)) : 0;
  const totalFaktorKeluarga = d.distribusi_riwayat_keluarga.reduce((n, item) => n + (item.jumlah || 0), 0);
  const sesiTerakhir = sesiTerbaru[0] ?? null;
  const periodeLabel = LABEL_PERIODE[d.periode] ?? d.periode;
  const rujukanBaru = d.rujukan.baru ?? 0;

  const sparkTren = buildSparklinePath(
    d.tren.map((x) => x.total_pencatatan),
    "M2 18 C 14 14, 24 18, 36 10 C 46 5, 54 9, 64 3",
  );
  const sparkSesi = buildSparklinePath(
    [...sesiTerbaru].reverse().map((s) => s.hadir || 0),
    "M2 19 C 12 16, 22 10, 34 12 C 44 14, 54 8, 64 5",
  );

  const kpiItems: GlassyKpiItem[] = [
    {
      id: "kepatuhan",
      title: "Kepatuhan Rutin",
      subtitle: `${angka(d.total_pengguna_aktif)} dari ${angka(d.total_peserta)} warga`,
      value: `${d.kepatuhan_pencatatan_persen}%`,
      icon: "shield-check",
      pillText:
        d.kepatuhan_pencatatan_persen >= 70
          ? "Baik"
          : d.kepatuhan_pencatatan_persen >= 40
            ? "Perlu dorongan"
            : "Rendah",
      pillTone: d.kepatuhan_pencatatan_persen >= 70 ? "safe" : d.kepatuhan_pencatatan_persen >= 40 ? "warning" : "danger",
      sparkPath: "M2 19 C 14 17, 22 12, 34 13 C 46 14, 54 7, 64 5",
      href: "/laporan",
    },
    {
      id: "pencatatan",
      title: "Catatan Kesehatan",
      subtitle: periodeLabel,
      value: angka(d.total_pencatatan),
      icon: "activity",
      pillText: `${rasioAktif}% warga aktif`,
      pillTone: "info",
      sparkPath: sparkTren,
      sparkColor: "var(--primary)",
      href: "/laporan",
    },
    {
      id: "rujukan",
      title: "Total Rujukan",
      subtitle: "Kelompok < 5 disamarkan",
      value: angka(totalRujukan),
      icon: "send",
      pillText: rujukanBaru > 0 ? `${angka(rujukanBaru)} baru` : "Terkendali",
      pillTone: rujukanBaru > 0 ? "danger" : "safe",
      accent: rujukanBaru > 0 ? "danger" : "primary",
      sparkPath: "M2 16 C 14 18, 22 8, 34 11 C 46 14, 54 6, 64 7",
      href: "/rujukan/kelurahan",
    },
    {
      id: "sesi",
      title: "Sesi Posbindu",
      subtitle: sesiTerakhir ? `Terbaru ${tanggal(sesiTerakhir.tanggal, "short")}` : "Belum ada sesi",
      value: angka(sesiTerbaru.length),
      icon: "calendar-check",
      pillText: sesiTerbaru.length > 0 ? "Berjalan" : "Kosong",
      pillTone: "warning",
      sparkPath: sparkSesi,
      href: "/posbindu",
    },
  ];

  const heroWarn = d.kepatuhan_pencatatan_persen < 40;

  return (
    <AppShell greet={`Halo Admin ${wilayah}`}>
      {/* HEADER RINGKAS */}
      <div className="gv-head">
        <div>
          <h1 className="gv-head-title">Ringkasan Wilayah · {wilayah}</h1>
          <p className="gv-head-sub">
            {angka(d.total_peserta)} peserta terdaftar · {angka(d.total_pengguna_aktif)} warga aktif · {periodeLabel}
          </p>
        </div>

        <div className="gv-head-actions">
          <Link href="/rujukan/kelurahan" className="btn btn-sm btn-outline" style={{ borderRadius: 999 }}>
            <Icon name="send" size={14} /> Rujukan Wilayah
          </Link>
          <Link href="/laporan" className="btn btn-sm btn-primary" style={{ borderRadius: 999 }}>
            <Icon name="bar-chart" size={14} /> Laporan Wilayah
          </Link>
        </div>
      </div>

      {/* BARIS 1 — HERO KEPATUHAN + PANEL TREN & RUJUKAN ANONIM GLASSY V24 */}
      <div className="gv-top-grid">
        <section className={`gv-hero${heroWarn ? " is-warning" : ""}`}>
          <div className="gv-hero-main">
            <span className="gv-hero-badge">
              <i className={`gv-hero-dot${rujukanBaru > 0 || heroWarn ? " is-warn" : ""}`} />
              <span>
                {rujukanBaru > 0
                  ? `${angka(rujukanBaru)} rujukan baru perlu pantauan`
                  : "Pemantauan wilayah berjalan baik"}
              </span>
            </span>

            <div>
              <h2 className="gv-hero-title">
                Kepatuhan pencatatan {d.kepatuhan_pencatatan_persen}%
              </h2>
              <p className="gv-hero-desc">
                {angka(d.total_pencatatan)} catatan kesehatan warga {wilayah} terkumpul dalam {periodeLabel}. Data
                perorangan tetap disamarkan untuk menjaga privasi.
              </p>
            </div>

            <div className="gv-hero-metrics">
              <div className="gv-hero-metric">
                <strong>{angka(d.total_peserta)}</strong>
                <span>Peserta Terdaftar</span>
              </div>
              <div className="gv-hero-metric">
                <strong>{angka(d.total_pengguna_aktif)}</strong>
                <span>Warga Aktif ({rasioAktif}%)</span>
              </div>
              <div className="gv-hero-metric">
                <strong>{angka(totalFaktorKeluarga)}</strong>
                <span>Riwayat Keluarga</span>
              </div>
            </div>

            <div className="gv-hero-actions">
              <Link href="/laporan" className="gv-btn-solid">
                Laporan Wilayah <Icon name="chevron-right" size={14} />
              </Link>
              <Link href="/rujukan/kelurahan" className="gv-btn-glass">
                <Icon name="send" size={14} /> Rujukan Anonim
              </Link>
            </div>
          </div>

          <GlassyProgressRing
            percent={d.kepatuhan_pencatatan_persen}
            centerLabel="kepatuhan"
            caption={`${angka(d.total_pengguna_aktif)}/${angka(d.total_peserta)} warga aktif`}
            ariaLabel={`Kepatuhan pencatatan wilayah ${d.kepatuhan_pencatatan_persen}%`}
          />
        </section>

        <section className="gv-agenda">
          <div className="gv-agenda-head">
            <GlassyAgendaDate />
            <Badge tone={rujukanBaru > 0 ? "warning" : "safe"}>
              {rujukanBaru > 0 ? `${angka(rujukanBaru)} rujukan baru` : "Terkendali"}
            </Badge>
          </div>

          <div className="gv-tab-strip" role="tablist" aria-label="Panel ringkas kelurahan">
            {(
              [
                ["grafik", "Tren & IMT"],
                ["rujukan", "Rujukan"],
                ["posbindu", "Posbindu"],
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
            {tabPanel === "grafik" ? (
              <>
                <div className="chip-row">
                  <button
                    type="button"
                    className={`chip${modeGrafik === "tren" ? " is-active" : ""}`}
                    onClick={() => setModeGrafik("tren")}
                  >
                    Tren Catatan
                  </button>
                  <button
                    type="button"
                    className={`chip${modeGrafik === "imt" ? " is-active" : ""}`}
                    onClick={() => setModeGrafik("imt")}
                  >
                    Kategori IMT
                  </button>
                </div>
                {modeGrafik === "tren" ? (
                  d.tren.length ? (
                    <Line
                      labels={d.tren.map((x) => x.periode)}
                      series={[{ name: "Catatan", data: d.tren.map((x) => x.total_pencatatan) }]}
                      unit="catatan"
                      height={158}
                    />
                  ) : (
                    <p className="tiny center py-16">Belum ada catatan pada periode ini.</p>
                  )
                ) : d.distribusi_imt.length ? (
                  <Bar
                    labels={d.distribusi_imt.map((x) => labelImt(x.kategori))}
                    values={d.distribusi_imt.map((x) => x.jumlah)}
                    height={158}
                  />
                ) : (
                  <p className="tiny center py-16">Belum ada data IMT pada periode ini.</p>
                )}
              </>
            ) : tabPanel === "rujukan" ? (
              rujukan.length === 0 ? (
                <div className="sa-feed">
                  <Link href="/rujukan/kelurahan" className="sa-row">
                    <span className="sa-feed-ico" style={{ background: "var(--safe-bg)", color: "var(--safe)" }}>
                      <Icon name="check-circle" size={16} />
                    </span>
                    <div className="sa-feed-main">
                      <strong>Belum ada rujukan</strong>
                      <span>Daftar rujukan anonim kelurahan akan tampil di sini</span>
                    </div>
                    <Icon name="chevron-right" size={16} />
                  </Link>
                </div>
              ) : (
                <div className="sa-feed">
                  {rujukan.slice(0, 4).map((r) => {
                    const tone = TONE_RUJUKAN[r.status] || "warning";
                    return (
                      <Link key={r.id} href="/rujukan/kelurahan" className="sa-feed-item">
                        <span
                          className="sa-feed-ico"
                          style={{
                            background: tone === "safe" ? "var(--safe-bg)" : "var(--danger-bg)",
                            color: tone === "safe" ? "var(--safe)" : "var(--danger)",
                          }}
                        >
                          <Icon name="send" size={15} />
                        </span>
                        <div className="sa-feed-main">
                          <strong>{r.faskes?.nama ?? "Fasilitas Kesehatan"}</strong>
                          <span>
                            {r.alasan
                              ? `${r.alasan.substring(0, 46)}${r.alasan.length > 46 ? "…" : ""}`
                              : r.otomatis
                                ? "Rujukan otomatis sistem"
                                : "Rujukan manual"}
                          </span>
                        </div>
                        <Badge tone={tone}>{NAMA_STATUS[r.status] || r.status}</Badge>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : sesiTerbaru.length === 0 ? (
              <p className="tiny center py-16">Belum ada sesi Posbindu tercatat.</p>
            ) : (
              <div className="sa-feed">
                {sesiTerbaru.slice(0, 4).map((s) => (
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
            )}
          </div>

          <div className="gv-agenda-foot">
            <span className="row gap-6 items-center">
              <Icon name="shield" size={14} className="text-safe" />
              <span>Privasi Warga Terjaga (kelompok &lt; 5 disamarkan)</span>
            </span>
            <Link
              href={
                tabPanel === "rujukan"
                  ? "/rujukan/kelurahan"
                  : tabPanel === "posbindu"
                    ? "/posbindu"
                    : "/laporan"
              }
              className="bento-sec-action"
            >
              Lihat semua <Icon name="chevron-right" size={14} />
            </Link>
          </div>
        </section>
      </div>

      {/* BARIS 2 — 4 KPI GLASS CARDS + SPARKLINE SVG */}
      <GlassyKpiGrid items={kpiItems} />

      {/* STRIP PINTASAN TATA KELOLA KELURAHAN (1 BARIS DATAR) */}
      <div className="gv-quick-bar">
        <div className="gv-quick-links">
          <Link href="/laporan" className="gv-quick-pill">
            <Icon name="bar-chart" size={13} /> Laporan Wilayah
          </Link>
          <Link href="/rujukan/kelurahan" className="gv-quick-pill">
            <Icon name="send" size={13} /> Rujukan Kelurahan ({angka(totalRujukan)})
          </Link>
          <Link href="/posbindu" className="gv-quick-pill">
            <Icon name="calendar-check" size={13} /> Jadwal Posbindu ({angka(sesiTerbaru.length)})
          </Link>
          <Link href="/peringkat" className="gv-quick-pill">
            <Icon name="trophy" size={13} /> Peringkat Kelurahan
          </Link>
        </div>
        <span className="tiny">
          <Icon name="shield" size={12} /> Data agregat wilayah aman &amp; bebas identitas pribadi warga
        </span>
      </div>
    </AppShell>
  );
}

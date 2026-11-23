"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import GrafikTrenRekamMedis from "@/components/charts/GrafikTrenRekamMedis";
import { RekapKepuasanMasyarakat } from "@/components/dashboard/KepuasanMasyarakatWidget";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import {
  GlassyAgendaDate,
  GlassyDashboardSkeleton,
  GlassyKpiGrid,
  GlassyProgressRing,
  type GlassyKpiItem,
} from "@/components/dashboard/GlassyWidgets";
import { admin as adminApi, pengaduanApi, ApiError } from "@/lib/api";
import { angka, relatif } from "@/lib/format";
import { useMinLoading } from "@/hooks/useMinLoading";
import { LABEL_ROLE, LABEL_STATUS_RUJUKAN, LABEL_STATUS_PROGRAM } from "@/lib/labels";
import type { User, AdminStatistik, LogAudit, Pengaduan, StatusPengaduan } from "@/types";

type TabPanel = "audit" | "tinjauan" | "distribusi";
type ModeDistribusi = "role" | "rujukan" | "program";

const LABEL_PENGADUAN: Record<StatusPengaduan, string> = {
  menunggu: "Menunggu",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const TONE_PENGADUAN: Record<StatusPengaduan, "warning" | "info" | "safe" | "danger"> = {
  menunggu: "warning",
  diproses: "info",
  selesai: "safe",
  ditolak: "danger",
};

const PALET_DIST = ["var(--c-1)", "var(--c-2)", "var(--c-3)", "var(--c-4)", "var(--c-5)", "var(--c-6)"];

const LABEL_AKSI_AUDIT: Record<string, string> = {
  baca_data_individu: "Baca Data Individu",
  ubah_data_individu: "Ubah Data Individu",
  verifikasi_setujui_catatan: "Setujui Catatan",
  verifikasi_tolak_catatan: "Tolak Catatan",
  ubah_status_rujukan: "Ubah Status Rujukan",
};

function formatAksiAudit(aksi: string): string {
  if (LABEL_AKSI_AUDIT[aksi]) return LABEL_AKSI_AUDIT[aksi];
  return aksi
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatNamaModel(model: string): string {
  const pendek = model.split("\\").pop() || model;
  return pendek.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export default function DashboardSuperAdmin({ user: _user }: { user: User }) {
  void _user;
  const [stats, setStats] = useState<AdminStatistik | null>(null);
  const [log, setLog] = useState<LogAudit[]>([]);
  const [pengaduan, setPengaduan] = useState<Pengaduan[]>([]);
  const [perluVerifikasi, setPerluVerifikasi] = useState(0);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string | null>(null);
  const [tabPanel, setTabPanel] = useState<TabPanel>("audit");
  const [modeGrafik, setModeGrafik] = useState<ModeDistribusi>("role");

  useEffect(() => {
    let batal = false;

    (async () => {
      try {
        setLoading(true);
        // §15 — endpoint khusus super_admin & daftar pengaduan lintas kelurahan.
        const [s, l, verif, aduan] = await Promise.all([
          adminApi.statistik(),
          adminApi.logAudit.list({ per_page: 5 }),
          adminApi.verifikasi.list({ per_page: 4 }).catch(() => ({ data: [], meta: null })),
          pengaduanApi.list().catch(() => [] as Pengaduan[]),
        ]);
        if (batal) return;
        setStats(s);
        setLog(l);
        setPerluVerifikasi(verif.meta?.total ?? verif.data.length);
        setPengaduan(aduan);
        setError(null);
      } catch (err) {
        if (batal) return;
        setError((err as ApiError).message || "Gagal memuat statistik sistem");
      } finally {
        if (!batal) setLoading(false);
      }
    })();

    return () => {
      batal = true;
    };
  }, []);

  if (tampilLoading) {
    return (
      <AppShell greet="Halo Super Admin">
        <GlassyDashboardSkeleton label="Memuat dashboard sistem…" />
      </AppShell>
    );
  }

  const totalCatatan = stats?.total_catatan ?? 0;
  const rasioTerverifikasi =
    totalCatatan > 0
      ? Math.max(0, Math.min(100, Math.round(((totalCatatan - perluVerifikasi) / totalCatatan) * 100)))
      : 100;
  const statusIntegritas: { label: string; warn: boolean } =
    perluVerifikasi > 0
      ? { label: `Waspada · ${angka(perluVerifikasi)} perlu cek`, warn: true }
      : { label: "Semua catatan tervalidasi", warn: false };

  const mapDistribusi = (sumber: Record<string, number> | undefined, kamus: Record<string, string>) =>
    Object.entries(sumber ?? {}).map(([k, total]) => ({ label: kamus[k] ?? k, value: total }));

  const panelDistribusi: Record<
    ModeDistribusi,
    { unit: string; emptyText: string; items: { label: string; value: number }[] }
  > = {
    role: {
      unit: "akun",
      emptyText: "Belum ada data peran pengguna.",
      items: mapDistribusi(stats?.users_by_role, LABEL_ROLE),
    },
    rujukan: {
      unit: "rujukan",
      emptyText: "Belum ada data status rujukan.",
      items: mapDistribusi(stats?.rujukan_by_status, LABEL_STATUS_RUJUKAN as Record<string, string>),
    },
    program: {
      unit: "tantangan",
      emptyText: "Belum ada data status tantangan.",
      items: mapDistribusi(stats?.program_by_status, LABEL_STATUS_PROGRAM as Record<string, string>),
    },
  };
  const distribusi = panelDistribusi[modeGrafik];
  const totalDistribusi = distribusi.items.reduce((acc, item) => acc + item.value, 0) || 1;

  const aduanMenunggu = pengaduan.filter((p) => p.status === "menunggu").length;
  const aduanTerbaru = pengaduan.slice(0, 3);
  const totalTinjauan = aduanMenunggu + perluVerifikasi;

  const kpiItems: GlassyKpiItem[] = [
    {
      id: "pengguna",
      title: "Total Pengguna",
      subtitle: `${angka(stats?.total_wilayah ?? 0)} wilayah binaan`,
      value: angka(stats?.total_users ?? 0),
      icon: "users",
      pillText: `+${angka(stats?.new_users_7d ?? 0)} baru`,
      pillTone: "safe",
      href: "/admin/pengguna",
    },
    {
      id: "catatan",
      title: "Catatan Kesehatan",
      subtitle: `${rasioTerverifikasi}% tervalidasi`,
      value: angka(totalCatatan),
      icon: "clipboard",
      pillText: `+${angka(stats?.new_catatan_7d ?? 0)} (7 hari)`,
      pillTone: "safe",
      href: "/admin/statistik",
    },
    {
      id: "rujukan",
      title: "Total Rujukan",
      subtitle: "Seluruh kelurahan",
      value: angka(stats?.total_rujukan ?? 0),
      icon: "send",
      pillText: `+${angka(stats?.new_rujukan_7d ?? 0)} baru`,
      pillTone: "danger",
      href: "/admin/statistik",
    },
    {
      id: "audit",
      title: "Log Audit Sistem",
      subtitle: "Jejak akses terkawal",
      value: angka(stats?.total_audit_logs_7d ?? 0),
      icon: "shield-check",
      pillText: aduanMenunggu > 0 ? `${angka(aduanMenunggu)} aduan` : "7 hari terakhir",
      pillTone: aduanMenunggu > 0 ? "warning" : "info",
      href: "/admin/log-audit",
    },
  ];

  return (
    <AppShell greet="Halo Super Admin">
      {error ? (
        <div className="alert alert-danger">
          <Icon name="alert-circle" size={18} />
          <div>{error}</div>
        </div>
      ) : null}

      {/* HEADER RINGKAS */}
      <div className="gv-head">
        <div>
          <h1 className="gv-head-title">Ringkasan Sistem</h1>
          <p className="gv-head-sub">
            {angka(stats?.total_wilayah ?? 0)} wilayah · {angka(stats?.total_faskes ?? 0)} faskes aktif ·{" "}
            {angka(stats?.total_audit_logs_7d ?? 0)} aktivitas audit 7 hari terakhir
          </p>
        </div>

        <div className="gv-head-actions">
          <Link href="/admin/log-audit" className="btn btn-sm btn-outline">
            <Icon name="activity" size={14} /> Log Audit
          </Link>
          <Link href="/admin/pengguna" className="btn btn-sm btn-primary">
            <Icon name="users" size={14} /> Kelola Pengguna
          </Link>
        </div>
      </div>

      {/* PANEL UTAMA TERPADU */}
      <section className="gv-surface">
        <div className="gv-top-grid">
          <div className={`gv-hero${perluVerifikasi > 0 ? " is-warning" : ""}`}>
            <div className="gv-hero-main">
              <Badge tone={perluVerifikasi > 0 ? "warning" : "safe"}>
                {statusIntegritas.label}
              </Badge>

              <div>
                <h2 className="gv-hero-title">
                  {perluVerifikasi > 0
                    ? `${angka(perluVerifikasi)} catatan perlu verifikasi`
                    : "Platform berjalan stabil & tervalidasi"}
                </h2>
                <p className="gv-hero-desc">
                  {angka(totalCatatan)} catatan kesehatan tercatat bersama{" "}
                  {angka(stats?.total_program_participants ?? 0)} peserta tantangan di seluruh wilayah.
                </p>
              </div>

              <div className="gv-hero-metrics">
                <div className="gv-hero-metric">
                  <strong>{stats?.avg_imt != null ? angka(stats.avg_imt, 1) : "—"}</strong>
                  <span>Rata-rata IMT (kg/m²)</span>
                </div>
                <div className="gv-hero-metric">
                  <strong>
                    {stats?.avg_sistol != null && stats?.avg_diastol != null
                      ? `${angka(stats.avg_sistol, 0)}/${angka(stats.avg_diastol, 0)}`
                      : "—"}
                  </strong>
                  <span>Rata-rata Tensi (mmHg)</span>
                </div>
                <div className="gv-hero-metric">
                  <strong>{angka(stats?.total_program ?? 0)}</strong>
                  <span>Tantangan Aktif</span>
                </div>
              </div>

              <div className="gv-hero-actions">
                <Link href="/admin/statistik" className="btn btn-sm btn-outline">
                  Statistik Lengkap <Icon name="chevron-right" size={14} />
                </Link>
                <Link href="/admin/verifikasi" className="btn btn-sm btn-outline">
                  <Icon name="shield-check" size={14} /> Verifikasi Catatan
                </Link>
              </div>
            </div>

            <GlassyProgressRing
              percent={rasioTerverifikasi}
              centerLabel="tervalidasi"
              caption={`${angka(stats?.total_wilayah ?? 0)} wilayah · ${angka(stats?.total_faskes ?? 0)} faskes`}
              ariaLabel={`Catatan tervalidasi ${rasioTerverifikasi}%`}
            />
          </div>

          <div className="gv-agenda">
          <div className="gv-agenda-head">
            <GlassyAgendaDate />
            <Badge tone={totalTinjauan > 0 ? "warning" : "safe"}>
              {totalTinjauan > 0 ? `${angka(totalTinjauan)} perlu tinjau` : "Semua aman"}
            </Badge>
          </div>

          <div className="gv-tab-strip" role="tablist" aria-label="Panel ringkas sistem">
            {(
              [
                ["audit", "Log Audit"],
                ["tinjauan", "Tinjauan"],
                ["distribusi", "Distribusi"],
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
            {tabPanel === "audit" ? (
              log.length === 0 ? (
                <p className="tiny center py-16">Belum ada aktivitas audit tercatat.</p>
              ) : (
                <div className="sa-feed">
                  {log.slice(0, 4).map((l) => (
                    <Link key={l.id} href="/admin/log-audit" className="sa-feed-item">
                      <span className="sa-feed-ico">
                        <Icon name="activity" size={15} />
                      </span>
                      <div className="sa-feed-main">
                        <strong>{formatAksiAudit(l.aksi)}</strong>
                        <span>
                          {l.pengguna?.name || "Sistem"} · {formatNamaModel(l.model)}
                        </span>
                      </div>
                      <span className="sa-feed-time">{relatif(l.created_at)}</span>
                    </Link>
                  ))}
                </div>
              )
            ) : tabPanel === "tinjauan" ? (
              <div className="sa-feed">
                <Link href="/admin/verifikasi" className="sa-row">
                  <span
                    className="sa-feed-ico"
                    style={{
                      background: perluVerifikasi > 0 ? "var(--warning-bg)" : "var(--safe-bg)",
                      color: perluVerifikasi > 0 ? "var(--warning)" : "var(--safe)",
                    }}
                  >
                    <Icon name="shield-check" size={15} />
                  </span>
                  <div className="sa-feed-main">
                    <strong>Verifikasi Catatan</strong>
                    <span>Pemeriksaan di luar ambang batas Kemenkes RI</span>
                  </div>
                  <Badge tone={perluVerifikasi > 0 ? "warning" : "safe"}>
                    {perluVerifikasi > 0 ? `${angka(perluVerifikasi)} cek` : "Aman"}
                  </Badge>
                </Link>

                {aduanTerbaru.length === 0 ? (
                  <Link href="/admin/pengaduan" className="sa-row">
                    <span className="sa-feed-ico" style={{ background: "var(--safe-bg)", color: "var(--safe)" }}>
                      <Icon name="check-circle" size={15} />
                    </span>
                    <div className="sa-feed-main">
                      <strong>Tidak ada pengaduan tertunda</strong>
                      <span>Semua laporan warga sudah ditinjau</span>
                    </div>
                    <Icon name="chevron-right" size={15} />
                  </Link>
                ) : (
                  aduanTerbaru.map((p) => (
                    <Link key={p.id} href="/admin/pengaduan" className="sa-row">
                      <span className="sa-feed-ico" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
                        <Icon name="alert-circle" size={15} />
                      </span>
                      <div className="sa-feed-main">
                        <strong>{p.judul}</strong>
                        <span>
                          {p.pengguna?.name || "Warga"} · {relatif(p.created_at)}
                        </span>
                      </div>
                      <Badge tone={TONE_PENGADUAN[p.status]}>{LABEL_PENGADUAN[p.status]}</Badge>
                    </Link>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="chip-row">
                  {(
                    [
                      ["role", "Peran"],
                      ["rujukan", "Rujukan"],
                      ["program", "Tantangan"],
                    ] as const
                  ).map(([kunci, label]) => (
                    <button
                      key={kunci}
                      type="button"
                      className={`chip${modeGrafik === kunci ? " is-active" : ""}`}
                      onClick={() => setModeGrafik(kunci)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {distribusi.items.length === 0 ? (
                  <p className="tiny center py-16">{distribusi.emptyText}</p>
                ) : (
                  <div className="sa-dist-list">
                    {distribusi.items.slice(0, 4).map((item, idx) => {
                      const persen = Math.round((item.value / totalDistribusi) * 100);
                      const warna = PALET_DIST[idx % PALET_DIST.length];
                      return (
                        <div key={item.label} className="sa-dist-row">
                          <div className="sa-dist-top">
                            <span className="sa-dist-label">
                              <i className="sa-dist-dot" style={{ background: warna }} />
                              {item.label}
                            </span>
                            <span className="sa-dist-val">
                              {angka(item.value)} {distribusi.unit} · <em>{persen}%</em>
                            </span>
                          </div>
                          <div className="sa-dist-track" aria-hidden="true">
                            <div
                              className="sa-dist-fill"
                              style={{
                                width: `${persen}%`,
                                minWidth: item.value > 0 ? 6 : 0,
                                background: warna,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="gv-agenda-foot">
            <span className="row gap-6 items-center">
              <Icon name="check-circle" size={14} className={error ? "text-danger" : "text-safe"} />
              <span>Status Sistem: {error ? "Gangguan" : "Normal"}</span>
            </span>
            <Link
              href={
                tabPanel === "audit"
                  ? "/admin/log-audit"
                  : tabPanel === "tinjauan"
                    ? "/admin/pengaduan"
                    : "/admin/statistik"
              }
              className="bento-sec-action"
            >
              Lihat semua <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          </div>
        </div>

        {/* STRIP KPI TERPADU */}
        <GlassyKpiGrid items={kpiItems} />
      </section>

      <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
        <Link href="/laporan" className="btn btn-sm btn-outline">
          <Icon name="file-text" size={14} /> Laporan &amp; Ekspor Excel
        </Link>
        <Link href="/edukasi" className="btn btn-sm btn-outline">
          <Icon name="book-open" size={14} /> Kelola Edukasi
        </Link>
        <Link href="/admin/verifikasi" className="btn btn-sm btn-outline">
          <Icon name="check-circle" size={14} /> Verifikasi Catatan
        </Link>
        <Link href="/rujukan" className="btn btn-sm btn-outline">
          <Icon name="send" size={14} /> Rujukan
        </Link>
      </div>

      <div className="mt-16" style={{ display: "grid", gap: 16 }}>
        <GrafikTrenRekamMedis user={_user} />
        <RekapKepuasanMasyarakat />
      </div>
    </AppShell>
  );
}

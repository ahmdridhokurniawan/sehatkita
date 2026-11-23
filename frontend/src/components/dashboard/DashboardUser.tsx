"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Bar from "@/components/charts/Bar";
import GrafikTrenRekamMedis from "@/components/charts/GrafikTrenRekamMedis";
import CatatModal from "@/components/catatan/CatatModal";
import { FormKepuasanMasyarakat } from "@/components/dashboard/KepuasanMasyarakatWidget";
import {
  GlassyAgendaDate,
  GlassyDashboardSkeleton,
  GlassyKpiGrid,
  GlassyProgressRing,
  type GlassyKpiItem,
  type GlassyPillTone,
} from "@/components/dashboard/GlassyWidgets";
import {
  dashboard,
  rekamMedis,
  insight as insightApi,
  targetKesehatan as targetApi,
  telegram as telegramApi,
  type TelegramStatus,
  ApiError,
} from "@/lib/api";
import { tanggal, relatif, angka, statusTenggatTarget } from "@/lib/format";
import { useMinLoading } from "@/hooks/useMinLoading";
import {
  LABEL_INDIKATOR,
  LABEL_INSIGHT,
  LABEL_JENIS_GULA_DARAH,
  LABEL_STATUS_RUJUKAN,
  labelKategoriIndikator,
  satuanGulaDarah,
} from "@/lib/labels";
import type { User, DashboardPribadi, RekamMedis, Insight, TargetKesehatan } from "@/types";

type TabPanel = "jadwal" | "peringatan" | "tren";

type FeedItem = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: "primary" | "safe" | "warning" | "danger" | "info";
  icon: string;
  href: string;
};

const LABEL_STATUS: Record<string, string> = {
  normal: "Kondisi Baik",
  perlu_perhatian: "Perlu Perhatian",
  berisiko: "Berisiko",
};

function toneKategori(kategori = ""): GlassyPillTone {
  if (/krisis|berat|diabetes|obesitas|tinggi|berisiko|derajat 2/i.test(kategori)) return "danger";
  if (/hipertensi|prediabetes|batas|gemuk|prehipertensi|derajat 1/i.test(kategori)) return "warning";
  return "safe";
}

function hitungPersenKondisi(status: string, skor: number): number {
  if (status === "normal" && skor <= 0) return 96;
  if (status === "perlu_perhatian") return Math.max(45, 86 - skor * 10);
  if (status === "berisiko") return Math.max(22, 68 - skor * 10);
  return Math.max(30, 92 - skor * 10);
}

const TONE_ICO_STYLE: Record<FeedItem["tone"], { bg: string; color: string }> = {
  primary: { bg: "var(--primary-050)", color: "var(--primary)" },
  safe: { bg: "var(--safe-bg)", color: "var(--safe)" },
  warning: { bg: "var(--warning-bg)", color: "var(--warning)" },
  danger: { bg: "var(--danger-bg)", color: "var(--danger)" },
  info: { bg: "var(--info-bg)", color: "var(--info)" },
};

export default function DashboardUser({ user }: { user: User }) {
  const [catatTerbuka, setCatatTerbuka] = useState(false);
  const [data, setData] = useState<DashboardPribadi | null>(null);
  const [trenData, setTrenData] = useState<RekamMedis | null>(null);
  const [insightList, setInsightList] = useState<Insight[]>([]);
  const [targetList, setTargetList] = useState<TargetKesehatan[]>([]);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [tabPanel, setTabPanel] = useState<TabPanel>("jadwal");
  const [seriPilih, setSeriPilih] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let aktif = true;
    async function fetchDashboard() {
      try {
        setLoading(true);
        const [res, trenRes, insRes, tgtRes, tgRes] = await Promise.all([
          dashboard.pribadi(),
          rekamMedis.get({ indikator: "bb_kg,sistol,gula_darah", periode: "3m" }).catch(() => null),
          insightApi.list().catch(() => [] as Insight[]),
          targetApi.list().catch(() => [] as TargetKesehatan[]),
          telegramApi.status().catch(() => null),
        ]);
        if (!aktif) return;
        setData(res);
        setTrenData(trenRes);
        setInsightList(Array.isArray(insRes) ? insRes : []);
        setTargetList(Array.isArray(tgtRes) ? tgtRes : []);
        setTelegramStatus(tgRes);
        setError(null);
      } catch (err: unknown) {
        if (!aktif) return;
        const apiErr = err instanceof ApiError ? err : null;
        setError(apiErr?.message || "Gagal memuat beranda");
      } finally {
        if (aktif) setLoading(false);
      }
    }
    fetchDashboard();
    return () => {
      aktif = false;
    };
  }, [reload]);

  const seriTersedia = useMemo(
    () => (trenData?.series || []).filter((s) => s.titik && s.titik.length > 0),
    [trenData],
  );

  const seriAktif = useMemo(() => {
    if (!seriTersedia.length) return null;
    if (seriPilih) {
      const found = seriTersedia.find((s) => s.indikator === seriPilih);
      if (found) return found;
    }
    return seriTersedia[0];
  }, [seriTersedia, seriPilih]);

  if (tampilLoading) {
    return (
      <AppShell greet="Halo" noFab>
        <GlassyDashboardSkeleton label="Memuat beranda warga…" />
      </AppShell>
    );
  }

  if (!data || error) {
    return (
      <AppShell greet="Halo" noFab>
        <div className="card mt-16">
          <div className="alert alert-danger">
            <Icon name="alert-circle" />
            <div>{error || "Gagal memuat beranda"}</div>
          </div>
          <p className="tiny mt-12">Silakan muat ulang halaman atau coba lagi nanti.</p>
        </div>
      </AppShell>
    );
  }

  const {
    status_kesehatan,
    skor_risiko,
    indikator_terkini,
    perbandingan,
    jadwal_skrining_berikutnya,
    rujukan_aktif,
    gamifikasi,
  } = data;

  const persenSehat = hitungPersenKondisi(status_kesehatan, skor_risiko);
  const heroToneClass =
    status_kesehatan === "berisiko"
      ? " is-danger"
      : status_kesehatan === "perlu_perhatian"
        ? " is-warning"
        : "";
  const pillKondisiTone: GlassyPillTone =
    status_kesehatan === "berisiko"
      ? "danger"
      : status_kesehatan === "perlu_perhatian"
        ? "warning"
        : "safe";

  const kpiItems: GlassyKpiItem[] = [
    {
      id: "kondisi",
      title: "Skor Risiko",
      subtitle: "Skor risiko PTM terkini",
      value: skor_risiko,
      unit: "/ 100",
      icon: "shield-check",
      pillText: LABEL_STATUS[status_kesehatan] || "Kondisi Baik",
      pillTone: pillKondisiTone,
      href: "/insight",
    },
    {
      id: "imt",
      title: "Indeks Massa Tubuh",
      subtitle: indikator_terkini?.bb_kg != null ? `Berat ${indikator_terkini.bb_kg} kg` : "Lengkapi tinggi & berat",
      value: indikator_terkini?.imt ?? "—",
      unit: indikator_terkini?.imt != null ? "kg/m²" : undefined,
      icon: "activity",
      pillText: indikator_terkini?.kategori_imt
        ? labelKategoriIndikator(indikator_terkini.kategori_imt)
        : "Belum dihitung",
      pillTone: indikator_terkini?.kategori_imt ? toneKategori(indikator_terkini.kategori_imt) : "info",
      href: "/rekam-medis",
    },
    {
      id: "tensi",
      title: "Tekanan Darah",
      subtitle: "Pemeriksaan terakhir",
      value:
        indikator_terkini?.sistol != null && indikator_terkini?.diastol != null
          ? `${indikator_terkini.sistol}/${indikator_terkini.diastol}`
          : "—",
      unit: indikator_terkini?.sistol != null ? "mmHg" : undefined,
      icon: "heart-pulse",
      pillText: indikator_terkini?.kategori_tensi
        ? labelKategoriIndikator(indikator_terkini.kategori_tensi)
        : "Belum diukur",
      pillTone: indikator_terkini?.kategori_tensi ? toneKategori(indikator_terkini.kategori_tensi) : "info",
      href: "/rekam-medis",
    },
    {
      id: "gula",
      title: "Gula Darah",
      subtitle: indikator_terkini?.jenis_gula_darah
        ? LABEL_JENIS_GULA_DARAH[indikator_terkini.jenis_gula_darah] || "Pemeriksaan terakhir"
        : "Pemeriksaan terakhir",
      value: indikator_terkini?.gula_darah ?? "—",
      unit: indikator_terkini?.gula_darah != null
        ? satuanGulaDarah(indikator_terkini.jenis_gula_darah)
        : undefined,
      icon: "droplet",
      pillText: indikator_terkini?.kategori_gula_darah
        ? labelKategoriIndikator(indikator_terkini.kategori_gula_darah)
        : "Belum diukur",
      pillTone: indikator_terkini?.kategori_gula_darah
        ? toneKategori(indikator_terkini.kategori_gula_darah)
        : "warning",
      href: "/rekam-medis",
    },
  ];

  const riwayatItems: FeedItem[] = [];
  if (rujukan_aktif) {
    riwayatItems.push({
      id: `ruj-${rujukan_aktif.id}`,
      title: `Rujukan: ${rujukan_aktif.faskes?.nama || "Fasilitas Kesehatan"}`,
      subtitle: `${rujukan_aktif.alasan || "Menunggu tindak lanjut petugas"} · ${tanggal(rujukan_aktif.created_at, "short")}`,
      badge: LABEL_STATUS_RUJUKAN[rujukan_aktif.status] || rujukan_aktif.status,
      tone: rujukan_aktif.status === "baru" ? "warning" : "primary",
      icon: "send",
      href: "/rujukan",
    });
  }
  for (const j of jadwal_skrining_berikutnya || []) {
    const terlambat = j.status === "terlambat";
    const tgl = j.jatuh_tempo ? tanggal(j.jatuh_tempo, "short") : "Sesuai anjuran";
    riwayatItems.push({
      id: `jad-${j.indikator}`,
      title: `Skrining ${LABEL_INDIKATOR[j.indikator] || j.indikator}`,
      subtitle: `${terlambat ? "Melewati jadwal anjuran" : "Jadwal berkala"} · ${tgl}`,
      badge: terlambat ? "Segera" : "Terjadwal",
      tone: terlambat ? "warning" : "safe",
      icon: "calendar-check",
      href: "/rekam-medis",
    });
  }

  const notifikasiItems: FeedItem[] = [];
  for (const t of targetList) {
    if (t.tercapai) continue;
    const tenggat = statusTenggatTarget(t.tenggat_waktu, t.tercapai);
    if (tenggat.status !== "lewat" && tenggat.status !== "hari_ini") continue;
    notifikasiItems.push({
      id: `notif-tgt-${t.id}`,
      title: `Target: ${t.judul}`,
      subtitle:
        tenggat.status === "lewat"
          ? "Melewati tenggat · perbarui progres target"
          : "Jatuh tempo hari ini",
      badge: tenggat.label,
      tone: tenggat.status === "lewat" ? "danger" : "warning",
      icon: "target",
      href: "/target-kesehatan",
    });
  }

  const urutanLevel: Record<string, number> = { bahaya: 0, peringatan: 1, info: 2 };
  const insightUrut = [...insightList].sort(
    (a, b) => (urutanLevel[a.level] ?? 9) - (urutanLevel[b.level] ?? 9),
  );
  for (let i = 0; i < Math.min(insightUrut.length, 3); i += 1) {
    const ins = insightUrut[i];
    const tone: FeedItem["tone"] =
      ins.level === "bahaya" ? "danger" : ins.level === "peringatan" ? "warning" : "primary";
    notifikasiItems.push({
      id: `notif-ins-${ins.kode}-${i}`,
      title: LABEL_INSIGHT[ins.kode] || "Peringatan Dini",
      subtitle: ins.teks,
      badge: ins.level === "bahaya" ? "Bahaya" : ins.level === "peringatan" ? "Peringatan" : "Info",
      tone,
      icon: tone === "danger" ? "alert-triangle" : tone === "warning" ? "alert-circle" : "bell",
      href: "/insight",
    });
  }

  const titikTerbaru = seriAktif ? seriAktif.titik.slice(-6) : [];
  const targetAktif = targetList.filter((t) => !t.tercapai).length;
  const subSelisihBb =
    perbandingan?.bb_selisih_kg != null
      ? `${perbandingan.bb_selisih_kg <= 0 ? "Turun" : "Naik"} ${Math.abs(perbandingan.bb_selisih_kg)} kg`
      : "Belum ada pembanding";
  const ringCaption =
    gamifikasi?.rank_kelurahan != null
      ? `Peringkat #${gamifikasi.rank_kelurahan} kelurahan`
      : `${angka(gamifikasi?.exp_total ?? 0)} poin aktivitas`;

  return (
    <AppShell greet="Halo" noFab>
      {!user.profil ? (
        <div className="alert alert-warning row-between wrap gap-12">
          <div className="row gap-10 items-center">
            <Icon name="alert-circle" size={18} />
            <span>Lengkapi tanggal lahir, tinggi badan, dan aktivitas untuk menghitung IMT &amp; risiko.</span>
          </div>
          <Link href="/profil" className="btn btn-sm btn-primary">
            Isi Profil
          </Link>
        </div>
      ) : null}

      {/* HEADER RINGKAS */}
      <div className="gv-head">
        <div>
          <h1 className="gv-head-title">Ringkasan Kesehatan</h1>
          <p className="gv-head-sub">
            {indikator_terkini?.dicatat_pada
              ? `Pembaruan terakhir ${relatif(indikator_terkini.dicatat_pada)}`
              : "Belum ada catatan pemeriksaan"}
          </p>
        </div>

        <div className="gv-head-actions">
          <Link href="/rekam-medis" className="btn btn-sm btn-outline">
            <Icon name="clipboard" size={14} /> Rekam Medis
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setCatatTerbuka(true)}
          >
            <Icon name="plus" size={15} /> Catat Kesehatan
          </button>
        </div>
      </div>

      {/* PANEL UTAMA TERPADU */}
      <section className="gv-surface">
        <div className="gv-top-grid">
          <div className={`gv-hero${heroToneClass}`}>
            <div className="gv-hero-main">
              <Badge tone={pillKondisiTone}>
                {LABEL_STATUS[status_kesehatan] || "Kondisi Baik"}
              </Badge>

              <div>
                <h2 className="gv-hero-title">
                  {rujukan_aktif
                    ? `Ada rujukan aktif ke ${rujukan_aktif.faskes?.nama || "Fasilitas Kesehatan"}`
                    : status_kesehatan === "normal"
                      ? "Kondisi kesehatan terpantau baik"
                      : "Perlu pemantauan pemeriksaan berkala"}
                </h2>
                <p className="gv-hero-desc">
                  {indikator_terkini?.dicatat_pada
                    ? `Catatan terakhir diperbarui ${relatif(indikator_terkini.dicatat_pada)} · ${angka(notifikasiItems.length)} peringatan aktif dan ${angka(targetAktif)} target berjalan.`
                    : "Mulai catat berat badan, tekanan darah, dan gula darah agar kondisi kesehatan Anda terpantau rutin."}
                </p>
              </div>

              <div className="gv-hero-metrics">
                <div className="gv-hero-metric">
                  <strong>
                    {indikator_terkini?.bb_kg != null ? `${indikator_terkini.bb_kg} kg` : "—"}
                  </strong>
                  <span>Berat Badan ({subSelisihBb})</span>
                </div>
                <div className="gv-hero-metric">
                  <strong>Level {gamifikasi?.level_gamifikasi ?? 1}</strong>
                  <span>
                    {angka(gamifikasi?.exp_total ?? 0)} EXP ·{" "}
                    {gamifikasi?.achievement?.ringkasan.diraih ?? gamifikasi?.badge.length ?? 0}/
                    {gamifikasi?.achievement?.ringkasan.total ?? 8} lencana
                  </span>
                </div>
                <div className="gv-hero-metric">
                  <strong>
                    {rujukan_aktif ? LABEL_STATUS_RUJUKAN[rujukan_aktif.status] || rujukan_aktif.status : "Aman"}
                  </strong>
                  <span>Status Rujukan</span>
                </div>
              </div>

              <div className="gv-hero-actions">
                <Link href="/peringkat" className="btn btn-sm btn-outline">
                  <Icon name="trophy" size={14} /> Achievement
                </Link>
                <Link href="/edukasi" className="btn btn-sm btn-outline">
                  <Icon name="book-open" size={14} /> Edukasi
                </Link>
              </div>
            </div>

            <GlassyProgressRing
              percent={persenSehat}
              centerLabel="skor sehat"
              caption={ringCaption}
              ariaLabel={`Status Kesehatan ${persenSehat}%`}
            />
          </div>

          <div className="gv-agenda">
          <div className="gv-agenda-head">
            <GlassyAgendaDate />
            <Badge tone={notifikasiItems.length > 0 ? "warning" : "safe"}>
              {notifikasiItems.length > 0 ? `${angka(notifikasiItems.length)} peringatan` : "Semua aman"}
            </Badge>
          </div>

          <div className="gv-tab-strip" role="tablist" aria-label="Panel ringkas warga">
            {(
              [
                ["jadwal", "Jadwal"],
                ["peringatan", "Peringatan"],
                ["tren", "Tren 3 Bulan"],
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
            {tabPanel === "jadwal" ? (
              riwayatItems.length === 0 ? (
                <div className="sa-feed">
                  <Link href="/rekam-medis" className="sa-row">
                    <span className="sa-feed-ico" style={{ background: "var(--safe-bg)", color: "var(--safe)" }}>
                      <Icon name="check-circle" size={16} />
                    </span>
                    <div className="sa-feed-main">
                      <strong>Semua jadwal terpantau aman</strong>
                      <span>Belum ada skrining mendesak maupun rujukan aktif</span>
                    </div>
                    <Icon name="chevron-right" size={16} />
                  </Link>
                </div>
              ) : (
                <div className="sa-feed">
                  {riwayatItems.slice(0, 4).map((item) => {
                    const st = TONE_ICO_STYLE[item.tone];
                    return (
                      <Link key={item.id} href={item.href} className="sa-feed-item">
                        <span className="sa-feed-ico" style={{ background: st.bg, color: st.color }}>
                          <Icon name={item.icon} size={15} />
                        </span>
                        <div className="sa-feed-main">
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                        </div>
                        <Badge tone={item.tone}>{item.badge}</Badge>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : tabPanel === "peringatan" ? (
              notifikasiItems.length === 0 ? (
                <div className="sa-feed">
                  <Link href="/target-kesehatan" className="sa-row">
                    <span className="sa-feed-ico" style={{ background: "var(--safe-bg)", color: "var(--safe)" }}>
                      <Icon name="check-circle" size={16} />
                    </span>
                    <div className="sa-feed-main">
                      <strong>Tidak ada peringatan aktif</strong>
                      <span>Semua target kesehatan &amp; analisis risiko dalam batas aman</span>
                    </div>
                    <Icon name="chevron-right" size={16} />
                  </Link>
                </div>
              ) : (
                <div className="sa-feed">
                  {notifikasiItems.slice(0, 4).map((item) => {
                    const st = TONE_ICO_STYLE[item.tone];
                    return (
                      <Link key={item.id} href={item.href} className="sa-row">
                        <span className="sa-feed-ico" style={{ background: st.bg, color: st.color }}>
                          <Icon name={item.icon} size={15} />
                        </span>
                        <div className="sa-feed-main">
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                        </div>
                        <Badge tone={item.tone}>{item.badge}</Badge>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : (
              <>
                {seriTersedia.length > 1 ? (
                  <div className="chip-row">
                    {seriTersedia.slice(0, 3).map((s) => (
                      <button
                        key={s.indikator}
                        type="button"
                        className={`chip${seriAktif?.indikator === s.indikator ? " is-active" : ""}`}
                        onClick={() => setSeriPilih(s.indikator)}
                      >
                        {LABEL_INDIKATOR[s.indikator] || s.indikator}
                      </button>
                    ))}
                  </div>
                ) : null}
                {titikTerbaru.length > 0 && seriAktif ? (
                  <Bar
                    labels={titikTerbaru.map((t) => tanggal(t.tanggal, "short"))}
                    values={titikTerbaru.map((t) => t.nilai)}
                    unit={seriAktif.satuan}
                    height={158}
                  />
                ) : (
                  <p className="tiny center py-16">Belum ada riwayat pemeriksaan dalam 3 bulan terakhir.</p>
                )}
              </>
            )}
          </div>

          <div className="gv-agenda-foot">
            <span className="row gap-6 items-center">
              <Icon
                name="send"
                size={14}
                className={telegramStatus?.terhubung ? "text-safe" : "text-warning"}
              />
              <span>Pengingat Telegram: {telegramStatus?.terhubung ? "Terhubung" : "Belum terhubung"}</span>
            </span>
            <Link
              href={tabPanel === "peringatan" ? "/insight" : "/rekam-medis"}
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
        <Link href="/program" className="btn btn-sm btn-outline">
          <Icon name="trophy" size={14} /> Tantangan
        </Link>
        <Link href="/edukasi" className="btn btn-sm btn-outline">
          <Icon name="book-open" size={14} /> Edukasi
        </Link>
        <Link href="/target-kesehatan" className="btn btn-sm btn-outline">
          <Icon name="target" size={14} /> Target Saya
        </Link>
        <Link href="/peringkat" className="btn btn-sm btn-outline">
          <Icon name="award" size={14} /> Peringkat &amp; Badge
        </Link>
      </div>

      <div className="mt-16" style={{ display: "grid", gap: 16 }}>
        <GrafikTrenRekamMedis user={user} />
        <FormKepuasanMasyarakat />
      </div>

      <CatatModal
        open={catatTerbuka}
        onClose={() => setCatatTerbuka(false)}
        onSaved={() => setReload((v) => v + 1)}
      />
    </AppShell>
  );
}

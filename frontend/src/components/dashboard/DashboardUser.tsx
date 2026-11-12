"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import CatatModal from "@/components/catatan/CatatModal";
import TargetBaru from "@/components/dashboard/TargetBaru";
import KalkulatorBMI from "@/components/dashboard/KalkulatorBMI";
import KalenderJadwal from "@/components/dashboard/KalenderJadwal";
import { EmptyState } from "@/components/ui/Empty";
import LottieLoading from "@/components/ui/LottieLoading";
import { dashboard, ApiError } from "@/lib/api";
import { tanggal, relatif, angka } from "@/lib/format";
import { LABEL_STATUS_RUJUKAN } from "@/lib/labels";
import type { User, DashboardPribadi } from "@/types";

const HERO_CLS: Record<string, string> = { normal: "baik", perlu_perhatian: "waspada", berisiko: "bahaya" };
const LABEL_STATUS: Record<string, string> = {
  normal: "Kondisi Baik",
  perlu_perhatian: "Perlu Perhatian",
  berisiko: "Berisiko",
};

function toneKategori(kategori = ""): "safe" | "warning" | "danger" {
  if (/krisis|berat|diabetes|obesitas|tinggi|berisiko|hipertensi derajat 2/i.test(kategori)) return "danger";
  if (/hipertensi|prediabetes|batas|gemuk|prehipertensi|derajat 1/i.test(kategori)) return "warning";
  return "safe";
}

export default function DashboardUser({ user }: { user: User }) {
  const [catatTerbuka, setCatatTerbuka] = useState(false);
  const [data, setData] = useState<DashboardPribadi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await dashboard.pribadi();
        setData(res);
        setError(null);
      } catch (err: unknown) {
        const apiErr = err instanceof ApiError ? err : null;
        console.error("Dashboard fetch error:", err);
        setError(apiErr?.message || "Gagal memuat dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [reload]);

  if (loading) {
    return (
      <AppShell greet="Halo" onFab={() => {}}>
        <LottieLoading label="Memuat dashboard…" />
      </AppShell>
    );
  }

  if (!data || error) {
    return (
      <AppShell greet="Halo" onFab={() => {}}>
        <div className="card mt-16">
          <div className="alert alert-danger">
            <Icon name="alert-circle" />
            <div>{error || "Gagal memuat dashboard"}</div>
          </div>
          <p className="tiny mt-12">Silakan refresh halaman atau coba lagi nanti.</p>
        </div>
      </AppShell>
    );
  }

  const { status_kesehatan, skor_risiko, indikator_terkini, perbandingan, jadwal_skrining_berikutnya, rujukan_aktif } = data;

  return (
    <AppShell greet="Halo" onFab={() => setCatatTerbuka(true)}>
      {/* Ajakan melengkapi data diri (fitur terpisah di menu Profil) */}
      {!user.profil ? (
        <div className="card mt-16">
          <div className="row-between" style={{ gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong className="text-sm">Lengkapi data diri</strong>
              <p className="tiny mt-4">
                Tanggal lahir, tinggi, dan aktivitas dipakai untuk menghitung IMT dan skor risiko.
              </p>
            </div>
            <Link href="/profil" className="btn btn-primary btn-sm">
              Isi sekarang
            </Link>
          </div>
        </div>
      ) : null}
      {/* Status kesehatan */}
      <section className={`health-hero ${HERO_CLS[status_kesehatan] || "baik"}`}>
        <span className="pill">
          <Icon name="heart-pulse" size={14} /> Status kesehatan Anda
        </span>
        <div className="row-between items-end mt-8">
          <div>
            <h2>{LABEL_STATUS[status_kesehatan] || "Kondisi"}</h2>
            {indikator_terkini?.dicatat_pada && (
              <div className="sub mt-4">Diperbarui {relatif(indikator_terkini.dicatat_pada)}</div>
            )}
          </div>
          <div className="center">
            <div className="score">{skor_risiko}</div>
            <div className="sub">skor risiko</div>
          </div>
        </div>
        {perbandingan && perbandingan.bb_selisih_kg !== null && (
          <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
            <span className="badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "none" }}>
              <Icon name={perbandingan.bb_selisih_kg <= 0 ? "trending-down" : "trending-up"} size={13} /> BB{" "}
              {perbandingan.bb_selisih_kg <= 0 ? "turun" : "naik"} {Math.abs(perbandingan.bb_selisih_kg)} kg
            </span>
          </div>
        )}
      </section>

      {/* Tombol Aksi Utama */}
      <div className="grid grid-2" style={{ gap: 10 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCatatTerbuka(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px" }}
        >
          <Icon name="plus" size={18} />
          <span>Catat Kesehatan</span>
        </button>
        <Link
          href="/target-kesehatan"
          className="btn btn-outline"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px" }}
        >
          <Icon name="target" size={18} />
          <span>Kelola Target</span>
        </Link>
      </div>

      {/* Indikator terkini */}
      <section>
        <div className="app-section-title">
          <h2>Indikator Terkini</h2>
          <Link href="/rekam-medis">Lihat semua →</Link>
        </div>
        {indikator_terkini ? (
          <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
            {[
              { label: "IMT", val: indikator_terkini.imt ?? "—", unit: "kg/m²", kat: indikator_terkini.kategori_imt },
              { label: "Berat badan", val: indikator_terkini.bb_kg ?? "—", unit: "kg", kat: "" },
              {
                label: "Tekanan darah",
                val:
                  indikator_terkini.sistol != null && indikator_terkini.diastol != null
                    ? `${indikator_terkini.sistol}/${indikator_terkini.diastol}`
                    : "—",
                unit: "mmHg",
                kat: indikator_terkini.kategori_tensi,
              },
              { label: "Gula darah", val: indikator_terkini.gula_darah ?? "—", unit: "mg/dL", kat: "" },
            ].map((ind) => (
              <div className="metric" key={ind.label}>
                <span className="metric-name">
                  <Icon name="activity" size={14} /> {ind.label}
                </span>
                <span className="metric-val">
                  {ind.val} <small>{ind.unit}</small>
                </span>
                <div className="metric-foot">
                  {ind.kat ? (
                    <div className="row-between" style={{ gap: 6 }}>
                      <Badge tone={toneKategori(ind.kat)}>{ind.kat}</Badge>
                      {indikator_terkini.dicatat_pada && (
                        <span>{tanggal(indikator_terkini.dicatat_pada, "short")}</span>
                      )}
                    </div>
                  ) : indikator_terkini.dicatat_pada ? (
                    <span>Diperbarui {relatif(indikator_terkini.dicatat_pada)}</span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card mt-12 center" style={{ padding: "28px 20px" }}>
            <span
              className="stat-ico"
              style={{
                margin: "0 auto 12px",
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--primary-050)",
                color: "var(--primary)",
              }}
            >
              <Icon name="activity" size={22} />
            </span>
            <strong className="text-sm" style={{ display: "block", fontSize: "1rem" }}>
              Belum ada data pemeriksaan
            </strong>
            <p className="tiny" style={{ maxWidth: 360, margin: "6px auto 16px" }}>
              Catat berat badan, tekanan darah, atau gula darah Anda untuk melihat ringkasan indikator dan tren kesehatan.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCatatTerbuka(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="plus" size={15} /> Catat Pemeriksaan Pertama
            </button>
          </div>
        )}
      </section>

      {/* Target — dinamis (U9) */}
      <section>
        <div className="app-section-title">
          <h2>Target Kesehatan</h2>
          <Link href="/target-kesehatan">Lihat Semua →</Link>
        </div>
        <TargetBaru />
      </section>

      {/* Jadwal skrining — ringkas: hanya yang terdekat */}
      {jadwal_skrining_berikutnya && jadwal_skrining_berikutnya.length > 0 && (
        <section>
          <div className="app-section-title">
            <h2>Jadwal Skrining</h2>
          </div>
          <KalenderJadwal jadwal={jadwal_skrining_berikutnya} />
        </section>
      )}

      {/* Kalkulator IMT */}
      <section>
        <KalkulatorBMI />
      </section>

      {/* Rujukan Aktif */}
      <section>
        <div className="app-section-title">
          <h2>Rujukan</h2>
          <Link href="/rujukan">Riwayat Rujukan</Link>
        </div>
        {rujukan_aktif ? (
          <div className="card mt-12">
            <div className="li">
              <span className="li-ico">
                <Icon name="send" size={18} />
              </span>
              <div className="li-main">
                <strong className="text-sm">{rujukan_aktif.faskes?.nama || "Fasilitas Kesehatan"}</strong>
                <span className="tiny">{rujukan_aktif.alasan || "Menunggu tindak lanjut"}</span>
              </div>
              <div className="li-side">
                <Badge tone={rujukan_aktif.status === "baru" ? "warning" : "primary"}>
                  {LABEL_STATUS_RUJUKAN[rujukan_aktif.status] || rujukan_aktif.status}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="card card-flat mt-12"
            style={{
              padding: "14px 16px",
              background: "var(--surface-2)",
              border: "1px dashed var(--border-strong)",
            }}
          >
            <div className="row gap-12 items-center">
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--surface)",
                  color: "var(--safe)",
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                }}
              >
                <Icon name="shield-check" size={18} />
              </span>
              <div className="flex-1">
                <strong className="text-sm" style={{ display: "block" }}>
                  Tidak ada rujukan aktif
                </strong>
                <p className="tiny" style={{ marginTop: 2 }}>
                  Kondisi kesehatan Anda terpantau aman tanpa kebutuhan rujukan ke faskes saat ini.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Catatan Disclaimer Medis */}
      <div className="privacy-note mt-20 mb-16">
        <Icon name="shield" size={18} />
        <div>
          <b>Peringatan Medis:</b> SehatKita bukan alat diagnosis mandiri dan tidak menggantikan pemeriksaan langsung oleh tenaga kesehatan profesional.
        </div>
      </div>

      <CatatModal
        open={catatTerbuka}
        onClose={() => setCatatTerbuka(false)}
        onSaved={() => setReload((v) => v + 1)}
      />
    </AppShell>
  );
}

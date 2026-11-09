"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import CatatModal from "@/components/catatan/CatatModal";
import TargetModal from "@/components/dashboard/TargetModal";
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
  const [targetTerbuka, setTargetTerbuka] = useState(false);
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
      } catch (err: any) {
        const apiErr = err as ApiError;
        console.error("Dashboard fetch error:", apiErr);
        setError(apiErr.message || "Gagal memuat dashboard");
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

  const { status_kesehatan, skor_risiko, indikator_terkini, perbandingan, target, jadwal_skrining_berikutnya, rujukan_aktif } = data;

  const progress = target?.progress_persen || 0;
  const bbNow = indikator_terkini?.bb_kg || 0;
  const bbTarget = target?.bb_target_kg || 0;

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

      {/* Indikator terkini */}
      {indikator_terkini && (
        <section>
          <div className="app-section-title">
            <h2>Indikator Terkini</h2>
            <Link href="/rekam-medis">Lihat semua</Link>
          </div>
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
        </section>
      )}

      {/* Target */}
      {target && (
        <section>
          <div className="app-section-title">
            <h2>Target Kesehatan</h2>
            <button type="button" className="link-btn" onClick={() => setTargetTerbuka(true)}>
              Target
            </button>
          </div>
          <div className="card mt-12">
            {progress >= 100 ? (
              <div className="alert alert-success mb-8">
                <Icon name="award" />{" "}
                <div>
                  <strong>Target tercapai! 🎉</strong>
                  <div className="tiny mt-4">Keren! Berat badanmu sudah mencapai target. Pertahankan pola sehatmu.</div>
                </div>
              </div>
            ) : null}
            <div className="row-between mb-8">
              <span className="text-sm fw-600">Berat badan</span>
              <span className="tiny">
                {bbTarget > 0 ? (
                  <>
                    <b className="text-primary">{bbNow || "—"}</b> / {bbTarget} kg
                  </>
                ) : (
                  "Belum ada target"
                )}
              </span>
            </div>
            <div className="progress">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>
      )}

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
        <div className="app-section-title">
          <h2>Kalkulator IMT</h2>
        </div>
        <KalkulatorBMI />
      </section>

      {/* Rujukan aktif (§8.1 — satu objek atau null) */}
      {rujukan_aktif ? (
        <section>
          <div className="app-section-title">
            <h2>Rujukan Aktif</h2>
            <Link href="/rujukan">Semua</Link>
          </div>
          <div className="card mt-12">
            <div className="li">
              <span className="li-ico">
                <Icon name="send" size={18} />
              </span>
              <div className="li-main">
                <strong className="text-sm">{rujukan_aktif.faskes?.nama || "Faskes"}</strong>
                <span className="tiny">{rujukan_aktif.alasan || "Menunggu tindak lanjut"}</span>
              </div>
              <div className="li-side">
                <Badge tone={rujukan_aktif.status === "baru" ? "warning" : "primary"}>
                  {LABEL_STATUS_RUJUKAN[rujukan_aktif.status] || rujukan_aktif.status}
                </Badge>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <p className="tiny mt-4 mb-16">
          <Icon name="shield-check" size={13} /> Tidak ada rujukan aktif saat ini.
        </p>
      )}

      <p className="tiny center mt-8 mb-16">
        <Icon name="shield" size={13} /> SehatKita bukan alat diagnosis medis dan tidak menggantikan pemeriksaan tenaga
        kesehatan.
      </p>

      <CatatModal
        open={catatTerbuka}
        onClose={() => setCatatTerbuka(false)}
        onSaved={() => setReload((v) => v + 1)}
      />

      <TargetModal
        open={targetTerbuka}
        onClose={() => setTargetTerbuka(false)}
        awal={data?.target}
        onSaved={() => setReload((v) => v + 1)}
      />
    </AppShell>
  );
}

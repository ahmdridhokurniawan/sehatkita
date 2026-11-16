"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { admin as adminApi, ApiError } from "@/lib/api";
import { angka } from "@/lib/format";
import { useMinLoading } from "@/hooks/useMinLoading";
import type { AdminStatistik } from "@/types";

const BAR_GROUPS: {
  label: string;
  key: keyof Pick<
    AdminStatistik,
    "total_users" | "total_program" | "total_program_participants" | "total_rujukan" | "total_catatan"
  >;
  color: string;
}[] = [
  { label: "Pengguna", key: "total_users", color: "var(--primary)" },
  { label: "Tantangan", key: "total_program", color: "var(--accent)" },
  { label: "Peserta", key: "total_program_participants", color: "var(--safe)" },
  { label: "Rujukan", key: "total_rujukan", color: "var(--warning)" },
  { label: "Catatan", key: "total_catatan", color: "var(--danger)" },
];

const EKSPOR_ITEMS: { key: "catatan" | "posbindu" | "rujukan"; label: string; icon: string }[] = [
  { key: "catatan", label: "Ekspor Catatan Kesehatan", icon: "clipboard" },
  { key: "posbindu", label: "Ekspor Jadwal Posbindu", icon: "calendar-check" },
  { key: "rujukan", label: "Ekspor Data Rujukan", icon: "send" },
];

export default function GrafikRingkas({ plain = false }: { plain?: boolean }) {
  void plain;
  const [stats, setStats] = useState<AdminStatistik | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string>("");
  const [mengunduh, setMengunduh] = useState("");
  const [kesalahan, setKesalahan] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.statistik();
        setStats(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Gagal memuat statistik sistem");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ekspor = async (tipe: "catatan" | "posbindu" | "rujukan") => {
    setMengunduh(tipe);
    setKesalahan("");
    try {
      const blob = await adminApi.ekspor(tipe);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tipe}-sehatkita-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setKesalahan(err instanceof ApiError ? err.message : "Gagal mengunduh berkas CSV");
    } finally {
      setMengunduh("");
    }
  };

  const max = Math.max(1, ...BAR_GROUPS.map((b) => Number(stats?.[b.key] ?? 0)));

  return (
    <div className="adm-top-grid">
      {/* KARTU KIRI — GRAFIK BATANG PROPORSIONAL + RATA-RATA KLINIS */}
      <section className="gv-agenda">
        <div className="gv-agenda-head">
          <div>
            <h2 className="sa-panel-title">Grafik Ringkas Platform</h2>
            <p className="sa-panel-sub">Perbandingan jumlah data aktif lintas modul</p>
          </div>
          <Link href="/admin/statistik" className="bento-sec-action">
            Statistik lengkap <Icon name="chevron-right" size={14} />
          </Link>
        </div>

        {tampilLoading ? (
          <>
            <div className="adm-bar-chart" aria-busy="true" aria-label="Memuat grafik statistik">
              {[72, 26, 44, 58, 86].map((h, i) => (
                <div key={i} className="adm-bar-col">
                  <div className="skeleton" style={{ width: 28, height: 14, borderRadius: 6 }} />
                  <div className="adm-bar-track">
                    <div className="skeleton" style={{ width: "100%", height: `${h}%`, borderRadius: 9 }} />
                  </div>
                  <div className="skeleton" style={{ width: 52, height: 11, borderRadius: 6 }} />
                </div>
              ))}
            </div>
            <div className="adm-mini-stats">
              {[0, 1, 2].map((i) => (
                <div key={i} className="adm-mini-item" style={{ gap: 6 }}>
                  <div className="skeleton" style={{ width: "60%", height: 10 }} />
                  <div className="skeleton" style={{ width: "80%", height: 15 }} />
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <p className="tiny text-danger py-16">{error}</p>
        ) : stats ? (
          <>
            <div className="adm-bar-chart">
              {BAR_GROUPS.map((b) => {
                const v = Number(stats?.[b.key] ?? 0);
                const pct = v > 0 ? Math.max(10, Math.round((v / max) * 100)) : 4;
                return (
                  <div key={b.key} className="adm-bar-col" title={`${b.label}: ${angka(v)}`}>
                    <span className="adm-bar-num">{angka(v)}</span>
                    <div className="adm-bar-track">
                      <div
                        className="adm-bar-fill"
                        style={{ height: `${pct}%`, background: b.color }}
                      />
                    </div>
                    <span className="adm-bar-lbl">{b.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="adm-mini-stats">
              <div className="adm-mini-item">
                <span>Rata-rata IMT</span>
                <strong>{stats.avg_imt != null ? `${angka(stats.avg_imt, 1)} kg/m²` : "—"}</strong>
              </div>
              <div className="adm-mini-item">
                <span>Rata-rata Tensi</span>
                <strong>
                  {stats.avg_sistol != null && stats.avg_diastol != null
                    ? `${angka(stats.avg_sistol, 0)}/${angka(stats.avg_diastol, 0)} mmHg`
                    : "—"}
                </strong>
              </div>
              <div className="adm-mini-item">
                <span>Cakupan Kota</span>
                <strong>
                  {angka(stats.total_wilayah)} wilayah · {angka(stats.total_faskes)} faskes
                </strong>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {/* KARTU KANAN — AKTIVITAS 7 HARI + EKSPOR CSV */}
      <section className="gv-agenda">
        <div className="gv-agenda-head">
          <div>
            <h2 className="sa-panel-title">Aktivitas 7 Hari &amp; Ekspor</h2>
            <p className="sa-panel-sub">Pertumbuhan mingguan &amp; unduh data CSV</p>
          </div>
          <Badge tone="info">7 hari terakhir</Badge>
        </div>

        {!tampilLoading && stats ? (
          <div className="adm-7d-grid">
            <div className="adm-mini-item">
              <span>Pengguna Baru</span>
              <strong>+{angka(stats.new_users_7d)} akun</strong>
            </div>
            <div className="adm-mini-item">
              <span>Catatan Baru</span>
              <strong>+{angka(stats.new_catatan_7d)} catatan</strong>
            </div>
            <div className="adm-mini-item">
              <span>Rujukan Baru</span>
              <strong>+{angka(stats.new_rujukan_7d)} kasus</strong>
            </div>
            <div className="adm-mini-item">
              <span>Log Audit</span>
              <strong>{angka(stats.total_audit_logs_7d)} aktivitas</strong>
            </div>
          </div>
        ) : (
          <div className="adm-7d-grid" aria-busy="true" aria-label="Memuat ringkasan mingguan">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="adm-mini-item" style={{ gap: 6 }}>
                <div className="skeleton" style={{ width: "58%", height: 10 }} />
                <div className="skeleton" style={{ width: "74%", height: 15 }} />
              </div>
            ))}
          </div>
        )}

        <div className="adm-export-list">
          {EKSPOR_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="adm-export-btn"
              onClick={() => ekspor(item.key)}
              disabled={!!mengunduh}
            >
              <span className="row gap-8 items-center">
                <Icon name={item.icon} size={15} className="text-primary" />
                <span>{item.label}</span>
              </span>
              <span className="row gap-4 items-center tiny">
                <Icon name="download" size={14} />
                <span>{mengunduh === item.key ? "Mengunduh…" : "CSV"}</span>
              </span>
            </button>
          ))}
          {kesalahan ? <p className="tiny text-danger">{kesalahan}</p> : null}
        </div>
      </section>
    </div>
  );
}

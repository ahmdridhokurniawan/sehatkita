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
    <section className="card sa-board">
      <div className="sa-board-cols">
        {/* KOLOM KIRI — GRAFIK BATANG PROPORSIONAL + RATA-RATA KLINIS */}
        <div className="sa-col">
          <div className="sa-panel-head">
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
              <div className="stat-strip mt-16">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="stat-cell" style={{ gap: 6 }}>
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

              <div className="stat-strip mt-16">
                <div className="stat-cell">
                  <span className="stat-cell-label">Rata-rata IMT</span>
                  <strong className="stat-cell-val">
                    {stats.avg_imt != null ? angka(stats.avg_imt, 1) : "—"}
                  </strong>
                  <span className="stat-cell-sub">kg/m²</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-cell-label">Rata-rata Tensi</span>
                  <strong className="stat-cell-val">
                    {stats.avg_sistol != null && stats.avg_diastol != null
                      ? `${angka(stats.avg_sistol, 0)}/${angka(stats.avg_diastol, 0)}`
                      : "—"}
                  </strong>
                  <span className="stat-cell-sub">mmHg</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-cell-label">Cakupan Kota</span>
                  <strong className="stat-cell-val">{angka(stats.total_wilayah)}</strong>
                  <span className="stat-cell-sub">{angka(stats.total_faskes)} faskes aktif</span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* KOLOM KANAN — AKTIVITAS 7 HARI + EKSPOR CSV */}
        <div className="sa-col sa-col-split">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Aktivitas 7 Hari &amp; Ekspor</h2>
              <p className="sa-panel-sub">Pertumbuhan mingguan &amp; unduh data CSV</p>
            </div>
            <Badge tone="info">7 hari terakhir</Badge>
          </div>

          {!tampilLoading && stats ? (
            <div className="stat-strip is-2">
              <div className="stat-cell">
                <span className="stat-cell-label">Pengguna Baru</span>
                <strong className="stat-cell-val">+{angka(stats.new_users_7d)}</strong>
                <span className="stat-cell-sub">akun terdaftar</span>
              </div>
              <div className="stat-cell">
                <span className="stat-cell-label">Catatan Baru</span>
                <strong className="stat-cell-val">+{angka(stats.new_catatan_7d)}</strong>
                <span className="stat-cell-sub">rekam medis</span>
              </div>
              <div className="stat-cell">
                <span className="stat-cell-label">Rujukan Baru</span>
                <strong className="stat-cell-val">+{angka(stats.new_rujukan_7d)}</strong>
                <span className="stat-cell-sub">kasus baru</span>
              </div>
              <div className="stat-cell">
                <span className="stat-cell-label">Log Audit</span>
                <strong className="stat-cell-val">{angka(stats.total_audit_logs_7d)}</strong>
                <span className="stat-cell-sub">aktivitas</span>
              </div>
            </div>
          ) : (
            <div className="stat-strip is-2" aria-busy="true" aria-label="Memuat ringkasan mingguan">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="stat-cell" style={{ gap: 6 }}>
                  <div className="skeleton" style={{ width: "58%", height: 10 }} />
                  <div className="skeleton" style={{ width: "74%", height: 15 }} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-16" style={{ borderTop: "1px solid var(--border)" }}>
            {EKSPOR_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className="adm-export-row"
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
            {kesalahan ? <p className="tiny text-danger mt-8">{kesalahan}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

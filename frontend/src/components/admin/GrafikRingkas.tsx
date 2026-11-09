"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import { admin as adminApi, ApiError } from "@/lib/api";

const BAR_GROUPS = [
  { label: "Pengguna", key: "total_users", color: "var(--primary)" },
  { label: "Program", key: "total_program", color: "var(--accent)" },
  { label: "Peserta", key: "total_program_participants", color: "var(--safe)" },
  { label: "Rujukan", key: "total_rujukan", color: "var(--warning)" },
  { label: "Catatan", key: "total_catatan", color: "var(--danger)" },
];

export default function GrafikRingkas() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.statistik();
        setStats(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Gagal muat statistik");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ekspor = () => {
    if (!stats) return;
    const rows = [
      ["Metrik", "Nilai"],
      ["Total Pengguna", String(stats.total_users ?? 0)],
      ["Kader", String(stats.users_by_role?.kader ?? 0)],
      ["Admin Kelurahan", String(stats.users_by_role?.admin_kelurahan ?? 0)],
      ["Total Program", String(stats.total_program ?? 0)],
      ["Peserta Program", String(stats.total_program_participants ?? 0)],
      ["Total Rujukan", String(stats.total_rujukan ?? 0)],
      ["Total Catatan", String(stats.total_catatan ?? 0)],
      ["Rata-rata BMI", String(stats.avg_imt ?? 0)],
      ["Rata-rata Sistol", String(stats.avg_sistol ?? 0)],
      ["Rata-rata Diastol", String(stats.avg_diastol ?? 0)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statistik-sehatkita-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const max = Math.max(1, ...BAR_GROUPS.map((b) => Number(stats?.[b.key] ?? 0)));

  return (
    <div className="card mb-16">
      <div className="row-between app-section-title">
        <div>
          <h2>Grafik Ringkas</h2>
          <p className="tiny">Ringkasan data platform.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={ekspor}
          disabled={loading || !stats}
        >
          <Icon name="download" size={15} /> Ekspor CSV
        </button>
      </div>

      {loading ? (
        <p className="tiny center">Memuat grafik…</p>
      ) : error ? (
        <p className="tiny text-danger">{error}</p>
      ) : stats ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 140, paddingTop: 12 }}>
          {BAR_GROUPS.map((b) => {
            const v = Number(stats?.[b.key] ?? 0);
            const h = Math.max(6, Math.round((v / max) * 100));
            return (
              <div key={b.key} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: ".85rem", fontWeight: 700 }}>{v}</div>
                <div
                  title={`${b.label}: ${v}`}
                  style={{
                    height: h,
                    background: b.color,
                    borderRadius: "8px 8px 0 0",
                    margin: "4px auto 0",
                    width: "100%",
                    transition: "height .3s",
                  }}
                />
                <div className="tiny" style={{ marginTop: 6 }}>
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

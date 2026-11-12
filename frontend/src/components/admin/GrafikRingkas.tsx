"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { admin as adminApi, ApiError } from "@/lib/api";
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
  { label: "Program", key: "total_program", color: "var(--accent)" },
  { label: "Peserta", key: "total_program_participants", color: "var(--safe)" },
  { label: "Rujukan", key: "total_rujukan", color: "var(--warning)" },
  { label: "Catatan", key: "total_catatan", color: "var(--danger)" },
];

export default function GrafikRingkas() {
  const [stats, setStats] = useState<AdminStatistik | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [mengunduh, setMengunduh] = useState("");
  const [kesalahan, setKesalahan] = useState<string>("");

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
      setKesalahan(err instanceof ApiError ? err.message : "Gagal mengunduh data");
    } finally {
      setMengunduh("");
    }
  };

  const max = Math.max(1, ...BAR_GROUPS.map((b) => Number(stats?.[b.key] ?? 0)));

  return (
    <div className="card mb-16">
      <div className="row-between app-section-title">
        <div>
          <h2>Grafik Ringkas</h2>
          <p className="tiny">Ringkasan data platform.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="row gap-6">
            {(
              [
                ["catatan", "Catatan"],
                ["posbindu", "Posbindu"],
                ["rujukan", "Rujukan"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => ekspor(key)}
                disabled={!!mengunduh}
              >
                <Icon name="download" size={15} /> {mengunduh === key ? "…" : label}
              </button>
            ))}
          </div>
          {kesalahan ? <p className="tiny text-danger mt-4">{kesalahan}</p> : null}
        </div>
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

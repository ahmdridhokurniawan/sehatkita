"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Segmented from "@/components/ui/Segmented";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { insight as insightApi, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import { LABEL_INSIGHT } from "@/lib/labels";
import type { Insight } from "@/types";
import type { LevelInsight } from "@/lib/enums";

/* ------------------------------------------------------------------
   Insight Kesehatan — §8.3 GET /insight.
   Saran rule-engine backend, filter tingkat: bahaya/peringatan/info.
   ------------------------------------------------------------------ */

const TINGKAT = [
  { value: "semua", label: "Semua" },
  { value: "bahaya", label: "Bahaya" },
  { value: "peringatan", label: "Peringatan" },
  { value: "info", label: "Info" },
];

const TONE: Record<string, { cls: string; ico: string; label: string }> = {
  bahaya: { cls: "danger", ico: "alert-triangle", label: "Bahaya" },
  peringatan: { cls: "warning", ico: "alert-circle", label: "Peringatan" },
  info: { cls: "primary", ico: "info", label: "Info" },
};

const URUTAN = ["bahaya", "peringatan", "info"];

export default function InsightPage() {
  const [filter, setFilter] = useState("semua");
  const [semua, setSemua] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await insightApi.list(
        filter === "semua" ? undefined : { level: filter as LevelInsight },
      );
      setSemua(res ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat insight");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  const daftar = useMemo(
    () => [...semua].sort((a, b) => URUTAN.indexOf(a.level) - URUTAN.indexOf(b.level)),
    [semua],
  );

  const hitung = (t: string) => semua.filter((i) => i.level === t).length;

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Insight Kesehatan</h1>
          <p className="tiny">Saran otomatis berdasarkan catatan terakhirmu.</p>
        </div>
      </div>

      <div className="grid grid-3 mb-12" style={{ gap: 10 }}>
        {URUTAN.map((t) => (
          <div className="metric" key={t} style={{ alignItems: "center" }}>
            <span className={`text-${TONE[t].cls}`}>
              <Icon name={TONE[t].ico} size={20} />
            </span>
            <span className="metric-val">{hitung(t)}</span>
            <span className="tiny">{TONE[t].label}</span>
          </div>
        ))}
      </div>

      <Segmented items={TINGKAT} value={filter} onChange={setFilter} />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : (
        <div className="mt-12" style={{ display: "grid", gap: 12 }}>
          {daftar.length === 0 ? (
            <div className="card card-flat">
              <EmptyState title="Tidak ada insight" desc="Tidak ada insight pada tingkat ini." />
            </div>
          ) : (
            daftar.map((i) => {
              const tone = TONE[i.level] ?? TONE.info;
              return (
                <div
                  className="card card-flat"
                  key={i.kode}
                  style={{ borderLeft: `4px solid var(--${tone.cls})` }}
                >
                  <div className="row items-start gap-10">
                    <span className={`text-${tone.cls}`}>
                      <Icon name={tone.ico} size={20} />
                    </span>
                    <div className="flex-1">
                      <div className="row-between">
                        <strong className="text-sm">{LABEL_INSIGHT[i.kode] || i.kode}</strong>
                        <span className={`badge badge-${tone.cls}`}>{tone.label}</span>
                      </div>
                      <p className="tiny mt-4">{i.teks}</p>
                      <p className="tiny mt-4">{tanggal(i.dibuat_pada, "short")}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <p className="tiny center mt-16 mb-16">
        <Icon name="shield" size={13} /> Insight berbasis aturan (bukan ML) dan bukan diagnosis medis.
      </p>
    </AppShell>
  );
}

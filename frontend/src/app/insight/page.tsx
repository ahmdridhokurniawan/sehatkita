"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { INSIGHT_DEMO } from "@/lib/demo";

/* ------------------------------------------------------------------
   Insight Kesehatan — halaman masyarakat.
   Menampilkan saran otomatis (rule engine backend) dengan filter
   tingkat: bahaya / peringatan / info.
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

  const daftar = useMemo(() => {
    const terurut = [...INSIGHT_DEMO].sort((a, b) => URUTAN.indexOf(a.t) - URUTAN.indexOf(b.t));
    return filter === "semua" ? terurut : terurut.filter((i) => i.t === filter);
  }, [filter]);

  const hitung = (t: string) => INSIGHT_DEMO.filter((i) => i.t === t).length;

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Insight Kesehatan</h1>
          <p className="tiny">Saran otomatis berdasarkan catatan terakhirmu.</p>
        </div>
      </div>

      {/* Ringkasan jumlah per tingkat */}
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

      <div className="mt-12" style={{ display: "grid", gap: 12 }}>
        {daftar.length === 0 ? (
          <div className="card card-flat">
            <EmptyState title="Tidak ada insight" desc="Tidak ada insight pada tingkat ini." />
          </div>
        ) : (
          daftar.map((i, idx) => (
            <div
              className="card card-flat"
              key={idx}
              style={{ borderLeft: `4px solid var(--${TONE[i.t].cls})` }}
            >
              <div className="row items-start gap-10">
                <span className={`text-${TONE[i.t].cls}`}>
                  <Icon name={i.i} size={20} />
                </span>
                <div className="flex-1">
                  <div className="row-between">
                    <strong className="text-sm">{i.j}</strong>
                    <span className={`badge badge-${TONE[i.t].cls}`}>{TONE[i.t].label}</span>
                  </div>
                  <p className="tiny mt-4">{i.p}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="shield" size={13} /> Insight berbasis aturan (bukan ML) dan bukan diagnosis medis.
      </p>
    </AppShell>
  );
}

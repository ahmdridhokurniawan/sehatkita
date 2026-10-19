"use client";

import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ANALITIK_DATA = {
  beratBadan: [
    { bulan: "Jun", berat: 65 },
    { bulan: "Jul", berat: 64.5 },
    { bulan: "Agu", berat: 64 },
    { bulan: "Sep", berat: 63.5 },
    { bulan: "Okt", berat: 63 },
  ],
  tekananDarah: [
    { bulan: "Jun", sistolik: 120, diastolik: 80 },
    { bulan: "Jul", sistolik: 118, diastolik: 78 },
    { bulan: "Agu", sistolik: 120, diastolik: 80 },
    { bulan: "Sep", sistolik: 115, diastolik: 75 },
    { bulan: "Okt", sistolik: 112, diastolik: 72 },
  ],
  aktivitas: [
    { minggu: "Minggu 1", langkah: 5200, kalori: 180 },
    { minggu: "Minggu 2", langkah: 6800, kalori: 240 },
    { minggu: "Minggu 3", langkah: 4500, kalori: 160 },
    { minggu: "Minggu 4", langkah: 7200, kalori: 260 },
  ],
};

const INSIGHT_SUMMARY = [
  {
    icon: "trending-down",
    label: "Berat Badan",
    nilai: "-2 kg",
    target: "63 kg",
    status: "on-track",
    desc: "Dalam 4 bulan terakhir",
  },
  {
    icon: "heart",
    label: "Tekanan Darah",
    nilai: "112/72",
    target: "<120/80",
    status: "normal",
    desc: "Pengukuran terakhir",
  },
  {
    icon: "activity",
    label: "Aktivitas",
    nilai: "6K langkah",
    target: "8K langkah/hari",
    status: "on-track",
    desc: "Rerata minggu ini",
  },
];

export default function AnalitikPage() {
  const [metrik, setMetrik] = useState<"berat" | "tekanan" | "aktivitas">("berat");

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Analitik Kesehatan</h1>
          <p className="tiny">Tren kesehatan pribadi & progress menuju target.</p>
        </div>
      </div>

      {/* Insight Summary */}
      <div className="grid grid-3 mb-16" style={{ gap: 12 }}>
        {INSIGHT_SUMMARY.map((insight) => (
          <div className="card card-flat" key={insight.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div className="tiny">{insight.label}</div>
                <div className="metric-val" style={{ marginTop: 8 }}>
                  {insight.nilai}
                </div>
              </div>
              <span style={{ color: "var(--primary)" }}>
                <Icon name={insight.icon} size={20} />
              </span>
            </div>
            <div className="tiny mt-12">
              <span>Target: {insight.target}</span>
              <br />
              <span className="text-muted">{insight.desc}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Badge tone={insight.status === "normal" ? "safe" : "warning"}>
                {insight.status === "normal" ? "Normal" : "On Track"}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Grafik Trend */}
      <div className="card mb-16">
        <div className="app-section-title mb-12">
          <h2>Tren Kesehatan</h2>
        </div>

        <Segmented
          items={[
            { value: "berat", label: "Berat Badan" },
            { value: "tekanan", label: "Tekanan Darah" },
            { value: "aktivitas", label: "Aktivitas" },
          ]}
          value={metrik}
          onChange={setMetrik as any}
        />

        <div style={{ width: "100%", height: 300, marginTop: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            {metrik === "berat" && (
              <LineChart data={ANALITIK_DATA.beratBadan}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bulan" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" domain={[60, 70]} />
                <Tooltip formatter={(value) => `${value} kg`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="berat" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)" }} />
              </LineChart>
            )}
            {metrik === "tekanan" && (
              <LineChart data={ANALITIK_DATA.tekananDarah}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bulan" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="sistolik" stroke="var(--danger)" strokeWidth={2} dot={{ fill: "var(--danger)" }} />
                <Line type="monotone" dataKey="diastolik" stroke="var(--warning)" strokeWidth={2} dot={{ fill: "var(--warning)" }} />
              </LineChart>
            )}
            {metrik === "aktivitas" && (
              <LineChart data={ANALITIK_DATA.aktivitas}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="minggu" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="langkah" stroke="var(--primary)" strokeWidth={2} name="Langkah" dot={{ fill: "var(--primary)" }} />
                <Line type="monotone" dataKey="kalori" stroke="var(--success)" strokeWidth={2} name="Kalori (×10)" dot={{ fill: "var(--success)" }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rekomendasi */}
      <div className="card">
        <div className="app-section-title mb-12">
          <h2>Rekomendasi</h2>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: 12, background: "var(--success-050)", borderRadius: 8, borderLeft: "3px solid var(--success)", display: "flex", gap: 10 }}>
            <span style={{ color: "var(--success)", minWidth: 20 }}>
              <Icon name="check-circle" size={20} />
            </span>
            <div>
              <strong className="text-sm">Target Berat Badan Tercapai</strong>
              <div className="tiny mt-4">Pertahankan pola makan & olahraga yang sudah terbukti efektif.</div>
            </div>
          </div>

          <div style={{ padding: 12, background: "var(--warning-050)", borderRadius: 8, borderLeft: "3px solid var(--warning)", display: "flex", gap: 10 }}>
            <span style={{ color: "var(--warning)", minWidth: 20 }}>
              <Icon name="alert-triangle" size={20} />
            </span>
            <div>
              <strong className="text-sm">Tingkatkan Aktivitas Fisik</strong>
              <div className="tiny mt-4">Target 8K langkah/hari masih belum konsisten. Coba naik/turun tangga atau jalan kaki lebih banyak.</div>
            </div>
          </div>

          <div style={{ padding: 12, background: "var(--primary-050)", borderRadius: 8, borderLeft: "3px solid var(--primary)", display: "flex", gap: 10 }}>
            <span style={{ color: "var(--primary)", minWidth: 20 }}>
              <Icon name="info" size={20} />
            </span>
            <div>
              <strong className="text-sm">Jadwal Pemeriksaan Rutin</strong>
              <div className="tiny mt-4">Pemeriksaan terakhir 3 minggu lalu. Rencanakan pemeriksaan berikutnya minggu depan.</div>
            </div>
          </div>
        </div>
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Data dari catatan kesehatan & perangkat yang tersambung.
      </p>
    </AppShell>
  );
}

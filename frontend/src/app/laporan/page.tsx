"use client";

import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Bar from "@/components/charts/Bar";
import Line from "@/components/charts/Line";
import { dummyDashboardKelurahan, dummySesiPosbindu } from "@/lib/dummy";
import { tanggal, angka } from "@/lib/format";

export default function LaporanKelurahanPage() {
  const d = dummyDashboardKelurahan;
  const [periode, setPeriode] = useState("3m");

  const PERIODE_LABEL: Record<string, string> = {
    "1m": "1 bulan",
    "3m": "3 bulan",
    "6m": "6 bulan",
    "12m": "12 bulan",
  };

  return (
    <AppShell greet="Laporan Kelurahan">
      {/* Filter & Export */}
      <section>
        <div className="app-section-title">
          <h2>Laporan Agregat</h2>
          <div className="row-end" style={{ gap: 8 }}>
            <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="input" style={{ maxWidth: 120 }}>
              <option value="1m">1 bulan</option>
              <option value="3m">3 bulan</option>
              <option value="6m">6 bulan</option>
              <option value="12m">12 bulan</option>
            </select>
            <Button size="sm">
              <Icon name="download" size={14} /> Export PDF
            </Button>
          </div>
        </div>
      </section>

      {/* Ringkasan metrik */}
      <section>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="card card-metric">
            <div className="tiny">Peserta Terdaftar</div>
            <div className="metric-val">{angka(d.total_peserta)}</div>
          </div>
          <div className="card card-metric">
            <div className="tiny">Pengguna Aktif</div>
            <div className="metric-val">{angka(d.total_pengguna_aktif)}</div>
          </div>
          <div className="card card-metric">
            <div className="tiny">Total Pencatatan</div>
            <div className="metric-val">{angka(d.total_pencatatan)}</div>
          </div>
          <div className="card card-metric">
            <div className="tiny">Kepatuhan</div>
            <div className="metric-val">{d.kepatuhan_pencatatan_persen}%</div>
          </div>
        </div>
      </section>

      {/* Grafik Distribusi IMT */}
      <section>
        <div className="app-section-title">
          <h2>Distribusi IMT</h2>
        </div>
        <div className="card mt-12">
          <Bar
            labels={d.distribusi_imt.map((x) => x.kategori ?? "")}
            values={d.distribusi_imt.map((x) => x.jumlah)}
            height={250}
          />
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          {d.distribusi_imt.map((item) => (
            <div className="card card-flat" key={item.kategori}>
              <div className="row-between">
                <span>{item.kategori}</span>
                <strong>{persen(item.jumlah, d.total_peserta)}%</strong>
              </div>
              <div className="progress mt-8" style={{ height: 4 }}>
                <div className="progress-bar" style={{ width: `${persen(item.jumlah, d.total_peserta)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grafik Distribusi Risiko */}
      <section>
        <div className="app-section-title">
          <h2>Distribusi Risiko</h2>
        </div>
        <div className="card mt-12">
          <Bar
            labels={d.distribusi_risiko.map((x) => x.faktor ?? "")}
            values={d.distribusi_risiko.map((x) => x.jumlah)}
            height={250}
            horizontal
          />
        </div>
      </section>

      {/* Grafik Tren Pencatatan */}
      <section>
        <div className="app-section-title">
          <h2>Tren Pencatatan ({PERIODE_LABEL[periode]})</h2>
        </div>
        <div className="card mt-12">
          <Line
            labels={d.tren.map((x) => x.periode)}
            series={[{ name: "Pencatatan", data: d.tren.map((x) => x.total_pencatatan) }]}
            unit="catatan"
            height={200}
          />
        </div>
      </section>

      {/* Distribusi Kelompok Usia */}
      <section>
        <div className="app-section-title">
          <h2>Distribusi Kelompok Usia</h2>
        </div>
        <div className="card mt-12">
          {d.distribusi_kelompok_usia.map((item) => (
            <div className="li" key={item.kelompok}>
              <div className="li-main">
                <strong>{item.kelompok} tahun</strong>
              </div>
              <div className="text-right">
                <strong>{angka(item.jumlah)}</strong>
                <span className="tiny block mt-4">{persen(item.jumlah, d.total_peserta)}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catatan */}
      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Data diperbarui secara real-time dari pencatatan kader di lapangan.
      </p>
    </AppShell>
  );
}

// Helper persen
function persen(nilai: number, total: number): number {
  return Math.round((nilai / total) * 100);
}

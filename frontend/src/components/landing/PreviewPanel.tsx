"use client";

import Icon from "@/components/ui/Icon";
import Line from "@/components/charts/Line";
import Bar from "@/components/charts/Bar";
import Donut from "@/components/charts/Donut";
import { angka, desimal, tanggal } from "@/lib/format";
import {
  CATATAN_DEMO,
  DISTRIBUSI_IMT_DEMO,
  INSIGHT_DEMO,
  PROGRAM_DEMO,
  TREN_DEMO,
} from "@/lib/demo";

export type TabPreview = "rekam" | "insight" | "tantangan" | "kelurahan";

/** Tanggal ISO (n hari lalu) — untuk label grafik demo. */
function hariLalu(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const LABELS = CATATAN_DEMO.map((c) => tanggal(hariLalu(c.hari_lalu), "short"));

function PaneRekam() {
  const terakhir = CATATAN_DEMO[CATATAN_DEMO.length - 1];
  return (
    <>
      <div className="grid grid-2" style={{ gap: 18, alignItems: "start" }}>
        <div>
          <div className="row-between mb-12">
            <strong className="text-sm">Perkembangan Berat Badan</strong>
            <span className="tiny">kg</span>
          </div>
          <div className="chart">
            <Line labels={LABELS} series={[{ name: "Berat Badan", data: CATATAN_DEMO.map((c) => c.bb_kg) }]} unit="kg" height={180} />
          </div>
        </div>
        <div>
          <div className="row-between mb-12">
            <strong className="text-sm">Tekanan Darah</strong>
            <span className="tiny">mmHg</span>
          </div>
          <div className="chart">
            <Line
              labels={LABELS}
              series={[
                { name: "Sistol", data: CATATAN_DEMO.map((c) => c.sistol) },
                { name: "Diastol", data: CATATAN_DEMO.map((c) => c.diastol) },
              ]}
              unit="mmHg"
              height={180}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-4 mt-20">
        <div className="metric">
          <span className="metric-name">Berat Badan</span>
          <span className="metric-val">
            {desimal(terakhir.bb_kg, 1)} <small>kg</small>
          </span>
          <span className="metric-foot">{tanggal(hariLalu(terakhir.hari_lalu))}</span>
        </div>
        <div className="metric">
          <span className="metric-name">IMT</span>
          <span className="metric-val">
            29,9 <small>kg/m²</small>
          </span>
          <span className="metric-foot">Gemuk</span>
        </div>
        <div className="metric">
          <span className="metric-name">Gula Darah</span>
          <span className="metric-val">
            {angka(terakhir.gula_darah)} <small>mg/dL</small>
          </span>
          <span className="metric-foot">Puasa</span>
        </div>
        <div className="metric">
          <span className="metric-name">Kolesterol</span>
          <span className="metric-val">
            {angka(terakhir.kolesterol)} <small>mg/dL</small>
          </span>
          <span className="metric-foot">Batas tinggi</span>
        </div>
      </div>
    </>
  );
}

function PaneInsight() {
  const cls: Record<string, string> = {
    bahaya: "alert-danger",
    peringatan: "alert-warning",
    info: "alert-info",
  };
  return (
    <>
      {INSIGHT_DEMO.map((it, i) => (
        <div className={`alert ${cls[it.t]} mb-12`} key={i}>
          <Icon name={it.i} />
          <div>
            <strong>{it.j}</strong>
            <div className="mt-4" style={{ fontSize: ".8125rem" }}>
              {it.p}
            </div>
          </div>
        </div>
      ))}
      <p className="tiny mt-12">Insight dihasilkan oleh rule engine backend, bukan diagnosis dokter.</p>
    </>
  );
}

function PaneTantangan() {
  const badgeCls: Record<string, string> = {
    berjalan: "badge-primary",
    selesai: "badge-safe",
    akan_datang: "badge-info",
  };
  const labelStatus: Record<string, string> = {
    berjalan: "Berjalan",
    selesai: "Selesai",
    akan_datang: "Akan datang",
  };
  return (
    <>
      {PROGRAM_DEMO.map((p) => (
        <div className="card card-flat mb-12" key={p.id}>
          <div className="row-between">
            <div>
              <strong className="text-sm">{p.nama}</strong>
              <div className="tiny mt-4">
                {p.durasi} · {p.peserta} peserta
              </div>
            </div>
            <span className={`badge ${badgeCls[p.status]}`}>{labelStatus[p.status]}</span>
          </div>
          <div className="progress sm mt-12">
            <i style={{ width: `${p.progress}%` }} />
          </div>
          <div className="row-between mt-8">
            <span className="tiny">Progres {p.progress}%</span>
            {p.reward?.badge ? (
              <span className="badge badge-primary">
                <Icon name="award" size={13} /> {p.reward.badge}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}

function PaneKelurahan() {
  const total = DISTRIBUSI_IMT_DEMO.reduce((a, b) => a + b.jumlah, 0);
  return (
    <>
      <div className="demo-banner">
        <Icon name="alert-triangle" />
        <span>Data agregat demo. Kelompok dengan jumlah &lt; 5 orang disembunyikan backend.</span>
      </div>
      <div className="grid grid-2" style={{ gap: 18, alignItems: "start" }}>
        <div>
          <div className="row-between mb-12">
            <strong className="text-sm">Distribusi Kategori IMT</strong>
          </div>
          <div className="chart">
            <Donut
              segments={DISTRIBUSI_IMT_DEMO.map((d) => ({ label: d.kategori, value: d.jumlah }))}
              centerValue={angka(total)}
              centerLabel="Total tercatat"
            />
          </div>
        </div>
        <div>
          <div className="row-between mb-12">
            <strong className="text-sm">Tren Pencatatan</strong>
          </div>
          <div className="chart">
            <Bar labels={TREN_DEMO.label} values={TREN_DEMO.pencatatan} unit="catatan" height={190} />
          </div>
        </div>
      </div>
    </>
  );
}

const PANES: Record<TabPreview, () => React.ReactElement> = {
  rekam: PaneRekam,
  insight: PaneInsight,
  tantangan: PaneTantangan,
  kelurahan: PaneKelurahan,
};

/** Isi pratinjau produk sesuai tab terpilih (dipakai di hero & preview besar). */
export default function PreviewPanel({ tab }: { tab: TabPreview }) {
  const Pane = PANES[tab];
  return <Pane />;
}

export const TAB_LABELS: [TabPreview, string][] = [
  ["rekam", "Rekam Medis"],
  ["insight", "Insight"],
  ["tantangan", "Tantangan"],
  ["kelurahan", "Dashboard Kelurahan"],
];

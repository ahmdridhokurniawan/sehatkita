"use client";

import { useEffect, useRef, useState } from "react";
import { angka } from "@/lib/format";

export type Seri = { name?: string; color?: string; data: (number | null)[]; dashed?: boolean };

type Props = {
  labels: string[];
  series: Seri[];
  unit?: string;
  yDecimals?: number;
  height?: number;
};

/** Baca nilai CSS var dari :root (agar grafik ikut tema terang/gelap). */
function varCss(nama: string, fallback = "#888"): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(nama).trim();
  return v || fallback;
}
const PALET = () => [1, 2, 3, 4, 5, 6].map((i) => varCss(`--c-${i}`));

/** Grafik garis/area SVG — diporting dari prototype `charts.js`. */
export default function Line({ labels, series, unit = "", yDecimals = 0, height = 260 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 640));
    ro.observe(el);
    setW(el.clientWidth || 640);
    return () => ro.disconnect();
  }, []);

  const pad = { t: 18, r: 16, b: 34, l: 46 };
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;

  const semua = series.flatMap((s) => s.data.filter((v): v is number => v != null));
  let min = semua.length ? Math.min(...semua) : 0;
  let max = semua.length ? Math.max(...semua) : 10;
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 10; }
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;
  const top = max;
  const bot = Math.max(0, Math.floor(min));

  const X = (i: number) => pad.l + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const Y = (v: number) => pad.t + ih - ((v - bot) / (top - bot)) * ih;

  const pal = PALET();
  const langkah = 4;
  const grid = [];
  for (let i = 0; i <= langkah; i++) {
    const v = bot + (top - bot) * (i / langkah);
    const y = Y(v);
    grid.push(
      <g key={`g${i}`}>
        <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke={varCss("--border")} strokeWidth={1}
          strokeDasharray={i === 0 ? undefined : "3 5"} />
        <text x={pad.l - 9} y={y + 4} textAnchor="end" fontSize={11} fill={varCss("--text-2")}>
          {angka(v, yDecimals)}
        </text>
      </g>,
    );
  }

  const skip = Math.ceil(labels.length / 7) || 1;
  const xLabel = labels.map((lb, i) =>
    i % skip !== 0 && i !== labels.length - 1 ? null : (
      <text key={`x${i}`} x={X(i)} y={height - 12} textAnchor="middle" fontSize={11} fill={varCss("--text-2")}>
        {lb}
      </text>
    ),
  );

  const defs: React.ReactNode[] = [];
  const area: React.ReactNode[] = [];
  const jalur: React.ReactNode[] = [];
  const titik: React.ReactNode[] = [];

  series.forEach((s, si) => {
    const warna = s.color || pal[si % pal.length];
    const pts = s.data
      .map((v, i) => (v == null ? null : ([X(i), Y(v)] as [number, number])))
      .filter((p): p is [number, number] => p != null);
    if (!pts.length) return;
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    if (series.length === 1) {
      const gid = `lg-${si}`;
      defs.push(
        <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={warna} stopOpacity={0.28} />
          <stop offset="100%" stopColor={warna} stopOpacity={0} />
        </linearGradient>,
      );
      area.push(
        <path key={`a${si}`} d={`${d} L ${pts[pts.length - 1][0].toFixed(1)} ${pad.t + ih} L ${pts[0][0].toFixed(1)} ${pad.t + ih} Z`}
          fill={`url(#${gid})`} />,
      );
    }
    jalur.push(
      <path key={`p${si}`} d={d} fill="none" stroke={warna} strokeWidth={2.4} strokeLinecap="round"
        strokeLinejoin="round" strokeDasharray={s.dashed ? "6 5" : undefined} />,
    );
    pts.forEach((p, i) => {
      titik.push(
        <circle key={`c${si}-${i}`} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={3.4} fill={varCss("--surface")}
          stroke={warna} strokeWidth={2.2}>
          <title>{`${s.name ? s.name + ": " : ""}${angka(s.data.filter((v) => v != null)[i], yDecimals)}${unit ? " " + unit : ""}`}</title>
        </circle>,
      );
    });
  });

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grafik garis">
        <defs>{defs}</defs>
        {grid}
        {area}
        {jalur}
        {titik}
        {xLabel}
      </svg>
      {series.length > 1 ? (
        <div className="chart-legend">
          {series.map((s, si) => (
            <span className="chart-legend-item" key={si}>
              <i style={{ background: s.color || pal[si % pal.length] }} />
              {s.name || `Seri ${si + 1}`}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

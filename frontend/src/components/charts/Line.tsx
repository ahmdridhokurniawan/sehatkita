"use client";

import { useEffect, useId, useRef, useState } from "react";
import { angka } from "@/lib/format";

export type Seri = { name?: string; color?: string; data: (number | null)[]; dashed?: boolean };

type Props = {
  labels: string[];
  series: Seri[];
  unit?: string;
  yDecimals?: number;
  height?: number;
};

const PALET = ["var(--c-1)", "var(--c-2)", "var(--c-3)", "var(--c-4)", "var(--c-5)", "var(--c-6)"];

/** Grafik garis/area SVG — aman SSR & interaktif saat hover/klik. */
export default function Line({ labels, series, unit = "", yDecimals = 0, height = 260 }: Props) {
  const uid = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [aktifIdx, setAktifIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const updateWidth = () => {
      const next = el.clientWidth || 640;
      setW((prev) => (prev === next ? prev : next));
    };
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    updateWidth();
    return () => ro.disconnect();
  }, []);

  const pad = { t: 18, r: 16, b: 34, l: 46 };
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;

  const semua = series.flatMap((s) => s.data.filter((v): v is number => v != null));
  let min = semua.length ? Math.min(...semua) : 0;
  let max = semua.length ? Math.max(...semua) : 10;
  if (!isFinite(min) || !isFinite(max)) {
    min = 0;
    max = 10;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;
  const top = max;
  const bot = Math.max(0, Math.floor(min));

  const X = (i: number) => pad.l + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const Y = (v: number) => pad.t + ih - ((v - bot) / (top - bot)) * ih;

  const langkah = 4;
  const grid = [];
  for (let i = 0; i <= langkah; i++) {
    const v = bot + (top - bot) * (i / langkah);
    const y = Y(v);
    grid.push(
      <g key={`g${i}`}>
        <line
          x1={pad.l}
          y1={y}
          x2={w - pad.r}
          y2={y}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray={i === 0 ? undefined : "3 5"}
        />
        <text x={pad.l - 9} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-2)">
          {angka(v, yDecimals)}
        </text>
      </g>,
    );
  }

  const skip = Math.ceil(labels.length / 7) || 1;
  const xLabel = labels.map((lb, i) =>
    i % skip !== 0 && i !== labels.length - 1 ? null : (
      <text key={`x${i}`} x={X(i)} y={height - 12} textAnchor="middle" fontSize={11} fill="var(--text-2)">
        {lb}
      </text>
    ),
  );

  const defs: React.ReactNode[] = [];
  const area: React.ReactNode[] = [];
  const jalur: React.ReactNode[] = [];
  const titik: React.ReactNode[] = [];

  series.forEach((s, si) => {
    const warna = s.color || PALET[si % PALET.length];
    const pts = s.data
      .map((v, i) => (v == null ? null : { i, x: X(i), y: Y(v), val: v }))
      .filter((p): p is { i: number; x: number; y: number; val: number } => p != null);
    if (!pts.length) return;

    const d = pts.map((p, idx) => `${idx ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    if (series.length === 1) {
      const gid = `${uid}-lg-${si}`;
      defs.push(
        <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={warna} stopOpacity={0.28} />
          <stop offset="100%" stopColor={warna} stopOpacity={0} />
        </linearGradient>,
      );
      area.push(
        <path
          key={`a${si}`}
          d={`${d} L ${pts[pts.length - 1].x.toFixed(1)} ${pad.t + ih} L ${pts[0].x.toFixed(1)} ${pad.t + ih} Z`}
          fill={`url(#${gid})`}
        />,
      );
    }

    jalur.push(
      <path
        key={`p${si}`}
        d={d}
        fill="none"
        stroke={warna}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={s.dashed ? "6 5" : undefined}
      />,
    );

    pts.forEach((p) => {
      const disorot = aktifIdx === p.i;
      titik.push(
        <circle
          key={`c${si}-${p.i}`}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r={disorot ? 5.2 : 3.4}
          fill="var(--surface)"
          stroke={warna}
          strokeWidth={disorot ? 2.8 : 2.2}
        >
          <title>{`${s.name ? s.name + ": " : ""}${angka(p.val, yDecimals)}${unit ? " " + unit : ""}`}</title>
        </circle>,
      );
    });
  });

  // Hitung tooltip aktif
  const idxAman = aktifIdx !== null && aktifIdx >= 0 && aktifIdx < labels.length ? aktifIdx : null;
  const tipX = idxAman !== null ? X(idxAman) : 0;
  const nilaiAktif =
    idxAman !== null
      ? series
          .map((s, si) => ({
            nama: s.name || `Seri ${si + 1}`,
            warna: s.color || PALET[si % PALET.length],
            val: s.data[idxAman],
          }))
          .filter((d): d is { nama: string; warna: string; val: number } => d.val != null)
      : [];

  const tipTopY =
    idxAman !== null && nilaiAktif.length > 0
      ? Math.min(...nilaiAktif.map((d) => Y(d.val)))
      : pad.t + ih * 0.4;

  const slotLebar = labels.length > 1 ? iw / (labels.length - 1) : iw;

  return (
    <div className="chart chart-wrap" ref={ref} onMouseLeave={() => setAktifIdx(null)}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Grafik garis"
      >
        <defs>{defs}</defs>
        {grid}
        {idxAman !== null ? (
          <line
            x1={tipX}
            y1={pad.t}
            x2={tipX}
            y2={pad.t + ih}
            stroke="var(--primary)"
            strokeWidth={1.2}
            strokeDasharray="3 3"
            opacity={0.55}
          />
        ) : null}
        {area}
        {jalur}
        {titik}
        {xLabel}
        {/* Area hit-target transparan per titik agar hover & sentuh HP responsif */}
        {labels.map((_, i) => {
          const xStart = i === 0 ? pad.l : X(i) - slotLebar / 2;
          const xEnd = i === labels.length - 1 ? w - pad.r : X(i) + slotLebar / 2;
          return (
            <rect
              key={`hit${i}`}
              x={Math.max(pad.l, xStart)}
              y={pad.t}
              width={Math.max(8, xEnd - Math.max(pad.l, xStart))}
              height={ih}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setAktifIdx(i)}
              onClick={() => setAktifIdx((prev) => (prev === i ? null : i))}
            />
          );
        })}
      </svg>

      {idxAman !== null && nilaiAktif.length > 0 ? (
        <div
          className="chart-tip"
          style={{
            left: `${Math.min(86, Math.max(14, (tipX / w) * 100))}%`,
            top: Math.max(46, tipTopY),
          }}
        >
          <strong>{labels[idxAman]}</strong>
          {nilaiAktif.map((item, idx) => (
            <div className="chart-tip-row" key={idx}>
              <i style={{ background: item.warna }} />
              <span>
                {series.length > 1 ? `${item.nama}: ` : ""}
                <b>
                  {angka(item.val, yDecimals)}
                  {unit ? ` ${unit}` : ""}
                </b>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {series.length > 1 ? (
        <div className="chart-legend">
          {series.map((s, si) => (
            <span className="chart-legend-item" key={si}>
              <i style={{ background: s.color || PALET[si % PALET.length] }} />
              {s.name || `Seri ${si + 1}`}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

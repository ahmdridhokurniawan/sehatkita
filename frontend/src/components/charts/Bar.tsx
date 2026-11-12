"use client";

import { useEffect, useRef, useState } from "react";
import { angka } from "@/lib/format";

type Props = {
  labels: string[];
  values: number[];
  unit?: string;
  height?: number;
  colors?: string[];
  horizontal?: boolean;
};

const PALET = ["var(--c-1)", "var(--c-2)", "var(--c-3)", "var(--c-4)", "var(--c-5)", "var(--c-6)"];

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

/** Grafik batang — aman SSR & interaktif saat hover/klik. */
export default function Bar({ labels, values, unit = "", height = 260, colors, horizontal }: Props) {
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

  if (horizontal) {
    const max = niceMax(Math.max(...values, 1));
    return (
      <div className="chart" ref={ref}>
        {labels.map((lb, i) => {
          const lebar = (values[i] / max) * 100;
          const warna = colors?.[i] || PALET[i % PALET.length];
          return (
            <div className="hbar" key={i}>
              <div className="hbar-label">{lb}</div>
              <div className="hbar-track">
                <div className="hbar-fill" style={{ width: `${lebar}%`, background: warna }}>
                  <span>
                    {angka(values[i])}
                    {unit ? ` ${unit}` : ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const pad = { t: 16, r: 12, b: 32, l: 44 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(...values, 1));
  const slot = iw / (labels.length || 1);
  const bw = Math.min(46, slot * 0.6);

  const grid = [];
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ih - (i / 4) * ih;
    grid.push(
      <g key={i}>
        <line
          x1={pad.l}
          y1={y}
          x2={w - pad.r}
          y2={y}
          stroke="var(--border)"
          strokeDasharray={i === 0 ? undefined : "3 5"}
        />
        <text x={pad.l - 9} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-2)">
          {angka(max * (i / 4))}
        </text>
      </g>,
    );
  }

  const batang = values.map((v, i) => {
    const h = (v / max) * ih;
    const x = pad.l + slot * i + (slot - bw) / 2;
    const y = pad.t + ih - h;
    const warna = colors?.[i] || PALET[i % PALET.length];
    const disorot = aktifIdx === i;
    return (
      <g
        key={i}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setAktifIdx(i)}
        onClick={() => setAktifIdx((prev) => (prev === i ? null : i))}
      >
        <rect
          x={x.toFixed(1)}
          y={y.toFixed(1)}
          width={bw}
          height={Math.max(2, h).toFixed(1)}
          rx={5}
          fill={warna}
          opacity={aktifIdx !== null && !disorot ? 0.55 : 1}
        >
          <title>{`${labels[i]}: ${angka(v)}${unit ? " " + unit : ""}`}</title>
        </rect>
        <text x={(x + bw / 2).toFixed(1)} y={height - 11} textAnchor="middle" fontSize={11} fill="var(--text-2)">
          {labels[i]}
        </text>
      </g>
    );
  });

  const tipIdx = aktifIdx !== null && aktifIdx >= 0 && aktifIdx < labels.length ? aktifIdx : null;
  const tipX = tipIdx !== null ? pad.l + slot * tipIdx + slot / 2 : 0;
  const tipY = tipIdx !== null ? pad.t + ih - (values[tipIdx] / max) * ih : 0;

  return (
    <div className="chart chart-wrap" ref={ref} onMouseLeave={() => setAktifIdx(null)}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Grafik batang"
      >
        {grid}
        {batang}
      </svg>
      {tipIdx !== null ? (
        <div
          className="chart-tip"
          style={{
            left: `${Math.min(86, Math.max(14, (tipX / w) * 100))}%`,
            top: Math.max(44, tipY),
          }}
        >
          <strong>{labels[tipIdx]}</strong>
          <div className="chart-tip-row">
            <i style={{ background: colors?.[tipIdx] || PALET[tipIdx % PALET.length] }} />
            <b>
              {angka(values[tipIdx])}
              {unit ? ` ${unit}` : ""}
            </b>
          </div>
        </div>
      ) : null}
    </div>
  );
}

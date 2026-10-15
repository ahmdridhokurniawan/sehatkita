"use client";

import { angka } from "@/lib/format";

export type Segmen = { label: string; value: number; color?: string };

type Props = { segments: Segmen[]; centerLabel?: string; centerValue?: string | number };

function varCss(nama: string, fallback = "#888"): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(nama).trim() || fallback;
}
const PALET = () => [1, 2, 3, 4, 5, 6].map((i) => varCss(`--c-${i}`));

/** Diagram donat — diporting dari prototype `charts.js`. */
export default function Donut({ segments, centerLabel = "", centerValue = "" }: Props) {
  const pal = PALET();
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const size = 190, r = 70, cx = size / 2, cy = size / 2, stroke = 22;
  const C = 2 * Math.PI * r;

  let offset = 0;
  const busur = segments.map((s, i) => {
    const frac = s.value / total;
    const len = frac * C;
    const warna = s.color || pal[i % pal.length];
    const el = (
      <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={warna} strokeWidth={stroke}
        strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`} strokeDashoffset={(-offset).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt">
        <title>{`${s.label}: ${angka(s.value)} (${Math.round(frac * 100)}%)`}</title>
      </circle>
    );
    offset += len;
    return el;
  });

  return (
    <div className="donut-wrap">
      <div className="donut-svg">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Diagram donat">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={varCss("--border")} strokeWidth={stroke} />
          {busur}
        </svg>
        <div className="donut-center">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {segments.map((s, i) => (
          <li key={i}>
            <i style={{ background: s.color || pal[i % pal.length] }} />
            <span className="dl-label">{s.label}</span>
            <span className="dl-val">
              {angka(s.value)} <em>{Math.round((s.value / total) * 100)}%</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

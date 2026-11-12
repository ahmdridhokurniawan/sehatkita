"use client";

import { useState } from "react";
import { angka } from "@/lib/format";

export type Segmen = { label: string; value: number; color?: string };

type Props = { segments: Segmen[]; centerLabel?: string; centerValue?: string | number };

const PALET = ["var(--c-1)", "var(--c-2)", "var(--c-3)", "var(--c-4)", "var(--c-5)", "var(--c-6)"];

/** Diagram donat — aman SSR & interaktif saat hover segmen/legenda. */
export default function Donut({ segments, centerLabel = "", centerValue = "" }: Props) {
  const [aktif, setAktif] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const size = 190;
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 22;
  const C = 2 * Math.PI * r;

  const busurData = segments.reduce<
    Array<{
      seg: Segmen;
      frac: number;
      len: number;
      offset: number;
      warna: string;
    }>
  >((acc, seg, i) => {
    const prev = acc[acc.length - 1];
    const offset = prev ? prev.offset + prev.len : 0;
    const frac = seg.value / total;
    const len = frac * C;
    const warna = seg.color || PALET[i % PALET.length];
    acc.push({ seg, frac, len, offset, warna });
    return acc;
  }, []);

  const fokus = aktif !== null && busurData[aktif] ? busurData[aktif] : null;
  const tampilValue = fokus ? `${Math.round(fokus.frac * 100)}%` : centerValue;
  const tampilLabel = fokus ? fokus.seg.label : centerLabel;

  return (
    <div className="donut-wrap" onMouseLeave={() => setAktif(null)}>
      <div className="donut-svg">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Diagram donat">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          {busurData.map((b, i) => {
            const disorot = aktif === i;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={b.warna}
                strokeWidth={disorot ? stroke + 4 : stroke}
                opacity={aktif !== null && !disorot ? 0.52 : 1}
                strokeDasharray={`${b.len.toFixed(2)} ${(C - b.len).toFixed(2)}`}
                strokeDashoffset={(-b.offset).toFixed(2)}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="butt"
                style={{ cursor: "pointer", transition: "stroke-width .15s ease, opacity .15s ease" }}
                onMouseEnter={() => setAktif(i)}
                onClick={() => setAktif((prev) => (prev === i ? null : i))}
              >
                <title>{`${b.seg.label}: ${angka(b.seg.value)} (${Math.round(b.frac * 100)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="donut-center">
          <strong>{tampilValue}</strong>
          <span>{tampilLabel}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {busurData.map((b, i) => (
          <li
            key={i}
            style={{ cursor: "pointer", opacity: aktif !== null && aktif !== i ? 0.55 : 1 }}
            onMouseEnter={() => setAktif(i)}
            onClick={() => setAktif((prev) => (prev === i ? null : i))}
          >
            <i style={{ background: b.warna }} />
            <span className="dl-label">{b.seg.label}</span>
            <span className="dl-val">
              {angka(b.seg.value)} <em>{Math.round(b.frac * 100)}%</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

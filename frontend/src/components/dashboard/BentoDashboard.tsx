"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";

export type BentoAccent = "primary" | "safe" | "warning" | "accent" | "danger" | "info";

export type BentoCardItem = {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: string;
  accent?: BentoAccent;
  /** Nilai 0–100 untuk cincin progres di kanan atas kartu. */
  ringPercent?: number;
  ringLabel?: string;
  href?: string;
};

/** Cincin SVG mini di pojok kanan kartu metrik. */
function BentoRing({ percent = 0, label, accent = "primary" }: {
  percent?: number;
  label?: string;
  accent?: BentoAccent;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 19;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (clamped / 100) * c;
  const colorVar: Record<BentoAccent, string> = {
    primary: "var(--primary)",
    safe: "var(--safe)",
    warning: "var(--warning)",
    accent: "var(--accent)",
    danger: "var(--danger)",
    info: "var(--info)",
  };

  return (
    <div className="bento-ring" aria-label={label || `${clamped}%`}>
      <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden="true">
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={3.5}
        />
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          stroke={colorVar[accent]}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="bento-ring-txt">{label ?? `${clamped}%`}</span>
    </div>
  );
}

/** Kartu metrik dengan aksen pita warna di tepi kanan & cincin progres opsional. */
function BentoCard({ item }: { item: BentoCardItem }) {
  const inner = (
    <>
      <div className="bento-card-top">
        <span className="bento-card-ico">
          <Icon name={item.icon} size={18} />
        </span>
        {item.ringPercent !== undefined ? (
          <BentoRing
            percent={item.ringPercent}
            label={item.ringLabel}
            accent={item.accent || "primary"}
          />
        ) : null}
      </div>
      <div>
        <div className="bento-card-label">{item.label}</div>
        <div className="bento-card-val-row mt-4">
          <span className="bento-card-val">{item.value}</span>
          {item.unit ? <span className="bento-card-unit">{item.unit}</span> : null}
        </div>
        {item.subtitle ? <div className="bento-card-sub mt-4">{item.subtitle}</div> : null}
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="bento-card" data-accent={item.accent || "primary"}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="bento-card" data-accent={item.accent || "primary"}>
      {inner}
    </div>
  );
}

/** Baris 4 kartu metrik utama di bagian atas dashboard. */
export function BentoKpiRow({ items }: { items: BentoCardItem[] }) {
  return (
    <div className="bento-kpi-grid">
      {items.map((item) => (
        <BentoCard key={item.id} item={item} />
      ))}
    </div>
  );
}

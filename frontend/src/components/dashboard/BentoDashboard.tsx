"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";

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

export type BentoHistoryItem = {
  id: string | number;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  badgeTone?: "primary" | "safe" | "warning" | "danger" | "info" | "default";
  href?: string;
};

/** Cincin SVG mini di pojok kanan kartu metrik. */
export function BentoRing({ percent = 0, label, accent = "primary" }: {
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

/** Header bagian dashboard ala layout bento. */
export function BentoSection({
  title,
  actionLabel,
  actionHref,
  rightSlot,
  children,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bento-sec">
      <div className="bento-sec-head">
        <h2 className="bento-sec-title">{title}</h2>
        {rightSlot ? (
          rightSlot
        ) : actionLabel && actionHref ? (
          <Link href={actionHref} className="bento-sec-action">
            {actionLabel} <Icon name="chevron-right" size={15} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Kartu metrik dengan aksen pita warna di tepi kanan & cincin progres opsional. */
export function BentoCard({ item }: { item: BentoCardItem }) {
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

/** Kartu hero kiri bergradien warna SehatKita + gauge setengah lingkaran SVG. */
export function BentoGaugeHero({
  tag,
  percent,
  displayPercent,
  icon = "heart-pulse",
  title,
  bigValue,
  subtitle,
  tone = "primary",
  actionLabel,
  actionHref,
  onAction,
}: {
  tag: string;
  percent: number;
  displayPercent?: string;
  icon?: string;
  title: string;
  bigValue: string | number;
  subtitle?: string;
  tone?: "primary" | "warning" | "danger";
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 68;
  const semiCircumference = Math.PI * r;
  const dashOffset = semiCircumference - (clamped / 100) * semiCircumference;
  const arcColor =
    tone === "danger" ? "#FFE0DC" : tone === "warning" ? "#FFE8CC" : "#D9F99D";

  const toneClass = tone === "warning" ? " tone-warning" : tone === "danger" ? " tone-danger" : "";

  return (
    <div className={`bento-hero${toneClass}`}>
      <div className="bento-hero-top">
        <span>{tag}</span>
        <Icon name="sparkles" size={14} />
      </div>

      <div className="bento-gauge-wrap" aria-label={`${title}: ${clamped}%`}>
        <svg width={180} height={100} viewBox="0 0 180 100" aria-hidden="true">
          <path
            d="M 22 90 A 68 68 0 0 1 158 90"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d="M 22 90 A 68 68 0 0 1 158 90"
            fill="none"
            stroke={arcColor}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={semiCircumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="bento-gauge-val">{displayPercent ?? `${clamped}%`}</div>
      </div>

      <div className="bento-hero-meta">
        <div className="bento-hero-ico" style={{ marginInline: "auto" }}>
          <Icon name={icon} size={18} />
        </div>
        <div className="bento-hero-title">{title}</div>
        <div className="bento-hero-big">{bigValue}</div>
        {subtitle ? <div className="bento-hero-sub">{subtitle}</div> : null}
      </div>

      {actionLabel && onAction ? (
        <button type="button" className="bento-hero-btn" onClick={onAction}>
          {actionLabel} <Icon name="arrow-right" size={14} />
        </button>
      ) : actionLabel && actionHref ? (
        <Link href={actionHref} className="bento-hero-btn">
          {actionLabel} <Icon name="arrow-right" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

/** Grid tengah asimetris: Hero Gauge (kiri), 2 sub-kartu bertumpuk (tengah), Panel Grafik (kanan). */
export function BentoMidLayout({
  hero,
  subCards,
  chartTitle,
  chartSubtitle,
  chartAction,
  chart,
}: {
  hero: ReactNode;
  subCards: [BentoCardItem, BentoCardItem];
  chartTitle: string;
  chartSubtitle?: string;
  chartAction?: ReactNode;
  chart: ReactNode;
}) {
  return (
    <div className="bento-mid-grid">
      {hero}
      <div className="bento-sub-stack">
        <BentoCard item={subCards[0]} />
        <BentoCard item={subCards[1]} />
      </div>
      <div className="bento-chart-panel">
        <div className="bento-chart-head">
          <div>
            <h3>{chartTitle}</h3>
            {chartSubtitle ? <p>{chartSubtitle}</p> : null}
          </div>
          {chartAction ?? null}
        </div>
        <div style={{ flex: 1, minHeight: 190 }}>{chart}</div>
      </div>
    </div>
  );
}

/** Strip riwayat baris horizontal ala bagian History di referensi UI. */
export function BentoHistoryList({
  items,
  emptyTitle,
  emptyDesc,
}: {
  items: BentoHistoryItem[];
  emptyTitle: string;
  emptyDesc: string;
}) {
  if (!items.length) {
    return (
      <div className="card card-flat">
        <strong className="text-sm" style={{ display: "block" }}>{emptyTitle}</strong>
        <p className="tiny mt-4">{emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="bento-history-list">
      {items.map((row) => {
        const inner = (
          <>
            <span
              className="bento-history-ico"
              style={{
                background: row.iconBg || undefined,
                color: row.iconColor || undefined,
              }}
            >
              <Icon name={row.icon || "activity"} size={16} />
            </span>
            <div className="bento-history-main">
              <strong>{row.title}</strong>
              {row.subtitle ? <span>{row.subtitle}</span> : null}
            </div>
            <div className="bento-history-mid">{row.meta || "—"}</div>
            <div>
              {row.badge ? (
                <Badge tone={row.badgeTone || "safe"}>{row.badge}</Badge>
              ) : (
                <Icon name="chevron-right" size={16} />
              )}
            </div>
          </>
        );

        return row.href ? (
          <Link key={row.id} href={row.href} className="bento-history-row">
            {inner}
          </Link>
        ) : (
          <div key={row.id} className="bento-history-row">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

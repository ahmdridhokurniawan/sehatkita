import Link from "next/link";
import Icon from "@/components/ui/Icon";

export type GlassyPillTone = "safe" | "info" | "warning" | "danger";
export type GlassyAccent = "danger" | "primary" | "safe";

export type GlassyKpiItem = {
  id: string;
  title: string;
  subtitle: string;
  value: string | number;
  unit?: string;
  icon: string;
  pillText: string;
  pillTone?: GlassyPillTone;
  accent?: GlassyAccent;
  sparkPath: string;
  sparkColor?: string;
  href?: string;
};

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Bangun path SVG sparkline dari deretan angka nyata agar kurva kartu KPI mencerminkan tren data.
 */
export function buildSparklinePath(values: number[], fallback = "M2 18 C 14 15, 28 15, 42 13 C 52 11, 58 10, 64 9"): string {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length < 2) return fallback;

  const slice = valid.slice(-8);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const span = max - min || 1;

  const pts = slice.map((val, idx) => {
    const x = 2 + (idx / (slice.length - 1)) * 62;
    const y = max === min ? 12 : 20 - ((val - min) / span) * 16;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))] as const;
  });

  return pts
    .map(([x, y], idx) => (idx === 0 ? `M${x} ${y}` : `L${x} ${y}`))
    .join(" ");
}

export function GlassySparkline({ path, color = "currentColor" }: { path: string; color?: string }) {
  return (
    <svg viewBox="0 0 66 24" className="gv-spark" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Cincin progres melingkar pada sisi kanan kartu Hero Glassy Dashboard V24.
 */
export function GlassyProgressRing({
  percent,
  centerLabel,
  caption,
  ariaLabel,
}: {
  percent: number;
  centerLabel: string;
  caption: string;
  ariaLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const ringOffset = circumference * (1 - clamped / 100);

  return (
    <div className="gv-hero-ring-wrap">
      <div className="gv-ring-box" aria-label={ariaLabel || `${clamped}% ${centerLabel}`}>
        <svg viewBox="0 0 120 120" className="gv-ring-svg">
          <circle cx="60" cy="60" r={radius} className="gv-ring-track" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="gv-ring-fill"
            strokeDasharray={circumference}
            strokeDashoffset={ringOffset}
          />
        </svg>
        <div className="gv-ring-center">
          <strong>{clamped}%</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <span className="gv-ring-cap">{caption}</span>
    </div>
  );
}

/**
 * Penanda tanggal kalender lokal pada kepala kartu panel agenda kanan.
 */
export function GlassyAgendaDate() {
  const sekarang = new Date();
  const tglHariIni = String(sekarang.getDate()).padStart(2, "0");
  const hariIniLabel = HARI_ID[sekarang.getDay()];
  const bulanTahunLabel = `${BULAN_ID[sekarang.getMonth()]} ${sekarang.getFullYear()}`;

  return (
    <div className="gv-agenda-date">
      <span className="gv-agenda-daynum">{tglHariIni}</span>
      <div className="gv-agenda-datemeta">
        <strong>{hariIniLabel}</strong>
        <span>{bulanTahunLabel}</span>
      </div>
    </div>
  );
}

const DEFAULT_SPARK_COLOR: Record<GlassyPillTone, string> = {
  safe: "var(--safe)",
  info: "var(--info)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

/**
 * Strip 4 KPI Glassmorphism sejajar dengan pil indikator dan inline SVG sparkline.
 */
export function GlassyKpiGrid({ items }: { items: GlassyKpiItem[] }) {
  return (
    <div className="gv-kpi-grid">
      {items.map((item, idx) => {
        const pillClass =
          item.pillTone && item.pillTone !== "safe"
            ? `gv-kpi-pill is-${item.pillTone}`
            : "gv-kpi-pill";
        const cardClass = item.accent
          ? `gv-kpi is-accent${item.accent === "danger" ? "" : ` is-${item.accent}`}`
          : "gv-kpi";
        const sparkColor =
          item.sparkColor ??
          (item.accent ? "rgba(255,255,255,.92)" : DEFAULT_SPARK_COLOR[item.pillTone ?? "safe"]);

        const body = (
          <>
            <div className="gv-kpi-top">
              <span className="gv-kpi-ico">
                <Icon name={item.icon} size={17} />
              </span>
              <span className={pillClass}>{item.pillText}</span>
            </div>
            <div className="gv-kpi-val">
              {item.value}
              {item.unit ? <span className="gv-kpi-unit">{item.unit}</span> : null}
            </div>
            <div className="gv-kpi-bottom">
              <div className="gv-kpi-meta">
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
              <GlassySparkline path={item.sparkPath} color={sparkColor} />
            </div>
          </>
        );

        const style = { animationDelay: `${idx * 45}ms` };

        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className={cardClass} style={style}>
              {body}
            </Link>
          );
        }

        return (
          <div key={item.id} className={cardClass} style={style}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Kerangka skeleton Glassy Dashboard V24 untuk seluruh peran saat memuat data awal.
 */
export function GlassyDashboardSkeleton({ label = "Memuat ringkasan…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} style={{ display: "grid", gap: 14 }}>
      {/* HEADER SKELETON */}
      <div className="gv-head">
        <div style={{ display: "grid", gap: 8 }}>
          <div className="skeleton" style={{ width: 210, height: 26, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: 290, maxWidth: "75vw", height: 14, borderRadius: 8 }} />
        </div>
        <div className="gv-head-actions">
          <div className="skeleton skel-pill" style={{ width: 118, height: 34 }} />
          <div className="skeleton skel-pill" style={{ width: 138, height: 34 }} />
        </div>
      </div>

      {/* BARIS 1 — HERO + AGENDA SKELETON */}
      <div className="gv-top-grid">
        <div className="gv-skel-hero">
          <div className="gv-hero-main">
            <div className="skeleton skel-pill" style={{ width: 158, height: 24 }} />
            <div style={{ display: "grid", gap: 8 }}>
              <div className="skeleton" style={{ width: "74%", height: 26, borderRadius: 10 }} />
              <div className="skeleton" style={{ width: "88%", height: 13, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: "66%", height: 13, borderRadius: 8 }} />
            </div>
            <div className="gv-hero-metrics">
              {[0, 1, 2].map((i) => (
                <div key={i} className="gv-hero-metric" style={{ gap: 6 }}>
                  <div className="skeleton" style={{ width: 64, height: 22, borderRadius: 8 }} />
                  <div className="skeleton" style={{ width: 92, height: 11, borderRadius: 6 }} />
                </div>
              ))}
            </div>
            <div className="gv-hero-actions">
              <div className="skeleton skel-pill" style={{ width: 140, height: 34 }} />
              <div className="skeleton skel-pill" style={{ width: 130, height: 34 }} />
            </div>
          </div>

          <div className="gv-hero-ring-wrap">
            <div className="skeleton skel-circle" style={{ width: 126, height: 126 }} />
            <div className="skeleton skel-pill" style={{ width: 124, height: 22 }} />
          </div>
        </div>

        <div className="gv-agenda">
          <div className="gv-agenda-head">
            <div className="gv-agenda-date">
              <div className="skeleton" style={{ width: 42, height: 40, borderRadius: 10 }} />
              <div style={{ display: "grid", gap: 6 }}>
                <div className="skeleton" style={{ width: 64, height: 13 }} />
                <div className="skeleton" style={{ width: 98, height: 11 }} />
              </div>
            </div>
            <div className="skeleton skel-pill" style={{ width: 76, height: 22 }} />
          </div>

          <div className="gv-tab-strip">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 28, borderRadius: 10 }} />
            ))}
          </div>

          <div className="gv-agenda-body">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel-row">
                <div className="skeleton skel-circle" style={{ width: 32, height: 32 }} />
                <div style={{ flex: 1, display: "grid", gap: 5 }}>
                  <div className="skeleton" style={{ width: i === 1 ? "64%" : "52%", height: 12 }} />
                  <div className="skeleton" style={{ width: "80%", height: 10 }} />
                </div>
                <div className="skeleton skel-pill" style={{ width: 52, height: 20 }} />
              </div>
            ))}
          </div>

          <div className="gv-agenda-foot">
            <div className="skeleton" style={{ width: 140, height: 12 }} />
            <div className="skeleton" style={{ width: 76, height: 12 }} />
          </div>
        </div>
      </div>

      {/* BARIS 2 — 4 KPI GLASS CARDS SKELETON */}
      <div className="gv-kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="gv-kpi gv-skel-kpi">
            <div className="gv-kpi-top">
              <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 11 }} />
              <div className="skeleton skel-pill" style={{ width: 68, height: 22 }} />
            </div>
            <div className="skeleton" style={{ width: "52%", height: 30, borderRadius: 8 }} />
            <div className="gv-kpi-bottom">
              <div style={{ flex: 1, display: "grid", gap: 6 }}>
                <div className="skeleton" style={{ width: "74%", height: 13 }} />
                <div className="skeleton" style={{ width: "56%", height: 11 }} />
              </div>
              <div className="skeleton" style={{ width: 66, height: 24, borderRadius: 8 }} />
            </div>
          </div>
        ))}
      </div>

      {/* BARIS 3 — STRIP PINTASAN SKELETON */}
      <div className="gv-quick-bar">
        <div className="gv-quick-links">
          {[104, 122, 112, 118].map((w, i) => (
            <div key={i} className="skeleton skel-pill" style={{ width: w, height: 28 }} />
          ))}
        </div>
        <div className="skeleton" style={{ width: 220, maxWidth: "60vw", height: 12 }} />
      </div>
    </div>
  );
}

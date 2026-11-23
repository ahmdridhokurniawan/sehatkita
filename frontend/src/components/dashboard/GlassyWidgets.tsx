import Link from "next/link";

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
  sparkPath?: string;
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
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const ringOffset = circumference * (1 - clamped / 100);

  return (
    <div className="gv-hero-ring-wrap">
      <div className="gv-ring-box" aria-label={ariaLabel || `${clamped}% ${centerLabel}`}>
        <svg viewBox="0 0 96 96" className="gv-ring-svg">
          <circle cx="48" cy="48" r={radius} className="gv-ring-track" />
          <circle
            cx="48"
            cy="48"
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

/**
 * Strip 4 KPI terpadu bersekat garis tipis dengan pil indikator status.
 */
export function GlassyKpiGrid({ items }: { items: GlassyKpiItem[] }) {
  return (
    <div className="gv-kpi-strip">
      {items.map((item) => {
        const pillClass =
          item.pillTone && item.pillTone !== "safe"
            ? `gv-kpi-pill is-${item.pillTone}`
            : "gv-kpi-pill";

        const body = (
          <>
            <div className="gv-kpi-cell-head">
              <span className="gv-kpi-cell-title">{item.title}</span>
              <span className={pillClass}>{item.pillText}</span>
            </div>
            <div className="gv-kpi-val">
              {item.value}
              {item.unit ? <span className="gv-kpi-unit">{item.unit}</span> : null}
            </div>
            <span className="gv-kpi-cell-sub">{item.subtitle}</span>
          </>
        );

        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className="gv-kpi-cell">
              {body}
            </Link>
          );
        }

        return (
          <div key={item.id} className="gv-kpi-cell">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Kerangka skeleton dashboard terpadu untuk seluruh peran saat memuat data awal.
 */
export function GlassyDashboardSkeleton({ label = "Memuat ringkasan…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} style={{ display: "grid", gap: 16 }}>
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

      {/* PANEL UTAMA TERPADU SKELETON */}
      <section className="gv-surface">
        <div className="gv-top-grid">
          <div className="gv-hero">
            <div className="gv-hero-main">
              <div className="skeleton skel-pill" style={{ width: 142, height: 22 }} />
              <div style={{ display: "grid", gap: 8 }}>
                <div className="skeleton" style={{ width: "72%", height: 24, borderRadius: 8 }} />
                <div className="skeleton" style={{ width: "86%", height: 13, borderRadius: 6 }} />
              </div>
              <div className="gv-hero-metrics">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="gv-hero-metric" style={{ gap: 6 }}>
                    <div className="skeleton" style={{ width: 64, height: 20, borderRadius: 6 }} />
                    <div className="skeleton" style={{ width: 92, height: 11, borderRadius: 6 }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="gv-hero-ring-wrap">
              <div className="skeleton skel-circle" style={{ width: 96, height: 96 }} />
              <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 6 }} />
            </div>
          </div>

          <div className="gv-agenda">
            <div className="gv-agenda-head">
              <div className="gv-agenda-date">
                <div className="skeleton" style={{ width: 38, height: 36, borderRadius: 8 }} />
                <div style={{ display: "grid", gap: 6 }}>
                  <div className="skeleton" style={{ width: 64, height: 12 }} />
                  <div className="skeleton" style={{ width: 96, height: 10 }} />
                </div>
              </div>
              <div className="skeleton skel-pill" style={{ width: 76, height: 22 }} />
            </div>

            <div className="gv-tab-strip">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ height: 28, borderRadius: 8 }} />
              ))}
            </div>

            <div className="gv-agenda-body">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skel-row">
                  <div className="skeleton skel-circle" style={{ width: 30, height: 30 }} />
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

        <div className="gv-kpi-strip">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="gv-kpi-cell">
              <div className="gv-kpi-cell-head">
                <div className="skeleton" style={{ width: "52%", height: 12 }} />
                <div className="skeleton skel-pill" style={{ width: 58, height: 20 }} />
              </div>
              <div className="skeleton" style={{ width: "44%", height: 26, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: "68%", height: 11 }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

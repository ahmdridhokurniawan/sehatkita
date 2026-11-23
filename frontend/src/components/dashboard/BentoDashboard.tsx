"use client";

import Link from "next/link";

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

/** Strip metrik ringkas utama di bagian atas halaman terpadu. */
export function BentoKpiRow({ items }: { items: BentoCardItem[] }) {
  return (
    <div className="card" style={{ padding: "6px 10px" }}>
      <div className="kpi-strip-flat" style={{ border: "none", padding: 0 }}>
        {items.map((item) => {
          const content = (
            <>
              <span className="kpi-strip-label">{item.label}</span>
              <strong className="kpi-strip-val">
                {item.value}
                {item.unit ? (
                  <span className="tiny fw-600" style={{ marginLeft: 4 }}>
                    {item.unit}
                  </span>
                ) : null}
              </strong>
              {item.subtitle ? <span className="kpi-strip-sub">{item.subtitle}</span> : null}
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="kpi-strip-item"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={item.id} className="kpi-strip-item">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

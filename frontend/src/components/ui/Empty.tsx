import type { ReactNode } from "react";
import Icon from "./Icon";
import type { IconName } from "@/lib/icons";

/** Blok status: memuat (memakai kerangka skeleton menyerupai konten agar bebas spinner) */
export function Loading({
  text = "Memuat data…",
  variant = "list",
}: {
  text?: string;
  variant?: "list" | "cards" | "spinner";
}) {
  if (variant === "cards") {
    return (
      <div className="loading-skel" role="status" aria-live="polite" aria-label={text}>
        <div className="loading-skel-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gv-kpi gv-skel-kpi" style={{ minHeight: 118 }}>
              <div className="gv-kpi-top">
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 10 }} />
                <div className="skeleton skel-pill" style={{ width: 64, height: 20 }} />
              </div>
              <div className="skeleton" style={{ width: "48%", height: 26 }} />
              <div className="skeleton" style={{ width: "76%", height: 12 }} />
            </div>
          ))}
        </div>
        <div className="gv-agenda" style={{ gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel-row">
              <div className="skeleton skel-circle" style={{ width: 36, height: 36 }} />
              <div style={{ flex: 1, display: "grid", gap: 6 }}>
                <div className="skeleton" style={{ width: i === 1 ? "64%" : "52%", height: 13 }} />
                <div className="skeleton" style={{ width: "80%", height: 11 }} />
              </div>
              <div className="skeleton skel-pill" style={{ width: 62, height: 22 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rows = variant === "spinner" ? [0, 1] : [0, 1, 2, 3];
  return (
    <div className="loading-skel" role="status" aria-live="polite" aria-label={text}>
      {rows.map((i) => (
        <div key={i} className="skel-row">
          <div className="skeleton skel-circle" style={{ width: 36, height: 36 }} />
          <div style={{ flex: 1, display: "grid", gap: 6 }}>
            <div className="skeleton" style={{ width: i % 2 === 0 ? "46%" : "62%", height: 13 }} />
            <div className="skeleton" style={{ width: i % 2 === 0 ? "78%" : "68%", height: 11 }} />
          </div>
          <div className="skeleton skel-pill" style={{ width: 58, height: 22 }} />
        </div>
      ))}
    </div>
  );
}

/** Blok status: gagal memuat */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="empty">
      <div className="empty-ico is-danger" aria-hidden="true">
        <Icon name="alert-triangle" size={26} />
      </div>
      <h4>Gagal memuat data</h4>
      <p>{message || "Terjadi kesalahan. Coba lagi."}</p>
      {onRetry ? (
        <button className="btn btn-outline mt-16" onClick={onRetry}>
          <Icon name="refresh" size={18} /> Coba lagi
        </button>
      ) : null}
    </div>
  );
}

/** Blok status: belum ada data */
export function EmptyState({
  title = "Belum ada data",
  desc = "Data akan muncul di sini setelah tersedia.",
  icon = "file-text",
  action,
}: {
  title?: string;
  desc?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-ico" aria-hidden="true">
        <Icon name={icon} size={26} />
      </div>
      <h4>{title}</h4>
      <p>{desc}</p>
      {action}
    </div>
  );
}

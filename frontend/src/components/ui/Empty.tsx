import type { ReactNode } from "react";
import Icon from "./Icon";
import type { IconName } from "@/lib/icons";

/** Blok status: memuat (default memakai skeleton agar menyatu dengan kartu/daftar) */
export function Loading({
  text = "Memuat data…",
  variant = "list",
}: {
  text?: string;
  variant?: "list" | "cards" | "spinner";
}) {
  if (variant === "spinner") {
    return (
      <div className="empty" role="status" aria-live="polite">
        <div className="spinner" style={{ margin: "0 auto 14px" }} />
        <p>{text}</p>
      </div>
    );
  }
  if (variant === "cards") {
    return (
      <div className="loading-skel" role="status" aria-live="polite" aria-label={text}>
        <div className="loading-skel-grid">
          <div className="skeleton" style={{ height: 112 }} />
          <div className="skeleton" style={{ height: 112 }} />
          <div className="skeleton" style={{ height: 112 }} />
        </div>
        <div className="skeleton" style={{ height: 180 }} />
        <p className="tiny muted center">{text}</p>
      </div>
    );
  }
  return (
    <div className="loading-skel" role="status" aria-live="polite" aria-label={text}>
      <div className="skeleton" style={{ height: 54 }} />
      <div className="skeleton" style={{ height: 54 }} />
      <div className="skeleton" style={{ height: 54 }} />
      <p className="tiny muted center">{text}</p>
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

/** Banner "Data Demo" — dipakai untuk data yang belum ada di backend */
export function DemoBanner() {
  return (
    <div className="demo-banner">
      <Icon name="alert-triangle" size={17} />
      <span>
        Data pada halaman ini adalah <b>Data Demo</b> — bukan statistik produksi. Akan diganti data API
        saat backend siap.
      </span>
    </div>
  );
}

/** Tag kecil "Data Demo" */
export function DemoTag() {
  return (
    <span className="demo-tag">
      <Icon name="info" size={12} /> Data Demo
    </span>
  );
}

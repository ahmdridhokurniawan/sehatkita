import type { ReactNode } from "react";
import Icon from "./Icon";

/** Blok status: memuat */
export function Loading({ text = "Memuat data…" }: { text?: string }) {
  return (
    <div className="empty">
      <div className="spinner" style={{ margin: "0 auto 14px" }} />
      <p>{text}</p>
    </div>
  );
}

/** Blok status: gagal memuat */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="empty">
      <Icon name="alert-triangle" size={44} />
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
  action,
}: {
  title?: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name="file-text" size={44} />
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

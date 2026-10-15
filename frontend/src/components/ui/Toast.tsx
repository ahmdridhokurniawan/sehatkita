"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Icon from "./Icon";

type Jenis = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; msg: string; jenis: Jenis; title?: string };

type ToastCtx = {
  show: (msg: string, jenis?: Jenis, opts?: { title?: string; duration?: number }) => void;
  success: (msg: string, opts?: { title?: string; duration?: number }) => void;
  error: (msg: string, opts?: { title?: string; duration?: number }) => void;
  info: (msg: string, opts?: { title?: string; duration?: number }) => void;
  warning: (msg: string, opts?: { title?: string; duration?: number }) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

const IKON: Record<Jenis, string> = {
  success: "check-circle",
  error: "alert-circle",
  warning: "alert-triangle",
  info: "info",
};

/** Provider notifikasi (toast) — pengganti SK.Toast pada prototype. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback(
    (msg: string, jenis: Jenis = "info", opts?: { title?: string; duration?: number }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, msg, jenis, title: opts?.title }]);
      const dur = opts?.duration ?? 3600;
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), dur);
    },
    [],
  );

  const value: ToastCtx = {
    show,
    success: (m, o) => show(m, "success", o),
    error: (m, o) => show(m, "error", o),
    info: (m, o) => show(m, "info", o),
    warning: (m, o) => show(m, "warning", o),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.jenis}`}>
            <Icon name={IKON[t.jenis]} size={19} />
            <div>
              {t.title ? <div className="toast-title">{t.title}</div> : null}
              <div className="toast-desc">{t.msg}</div>
            </div>
            <button className="toast-close" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} aria-label="Tutup">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return c;
}

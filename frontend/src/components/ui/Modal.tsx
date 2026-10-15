"use client";

import { useEffect, type ReactNode } from "react";
import Icon from "./Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
};

/** Modal dialog — mengikuti .modal pada design system prototype. */
export default function Modal({ open, onClose, title, children, footer, size = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${size === "lg" ? "modal-lg" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="modal-head">
            <div className="card-title">{title}</div>
            <button className="btn-icon btn-sm btn-ghost" onClick={onClose} aria-label="Tutup">
              <Icon name="x" size={18} />
            </button>
          </div>
        ) : null}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

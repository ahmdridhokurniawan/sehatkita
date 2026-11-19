"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "legal" | "lg";
  /** Elemen yang diletakkan di sisi belakang modal (mis. animasi canvas), di atas backdrop tapi di bawah dialog. */
  backdropContent?: ReactNode;
};

/** Modal dialog — mengikuti .modal pada design system prototype. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  size = "md",
  backdropContent,
}: Props) {
  const titleId = useId();

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

  const sizeClass =
    size === "sm" ? "modal-sm" : size === "lg" ? "modal-lg" : size === "legal" ? "modal-legal" : "";

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      {backdropContent ? (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
          {backdropContent}
        </div>
      ) : null}
      <div
        className={`modal ${sizeClass}${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="modal-head">
            <div className="card-title" id={titleId}>{title}</div>
            <button type="button" className="btn btn-icon btn-sm btn-ghost" onClick={onClose} aria-label="Tutup">
              <Icon name="x" size={18} />
            </button>
          </div>
        ) : null}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

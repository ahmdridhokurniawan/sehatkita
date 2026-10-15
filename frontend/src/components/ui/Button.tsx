"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icon from "./Icon";

/** Nama varian baru (design system prototype) */
type VariantBaru = "primary" | "outline" | "ghost" | "danger" | "default";
/** Nama varian lama (agar halaman lama tetap jalan) */
type VariantLama = "secondary";
type Variant = VariantBaru | VariantLama;

type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** fullWidth = alias lama untuk block */
  fullWidth?: boolean;
  block?: boolean;
  loading?: boolean;
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
};

const VARIAN_LAMA: Record<string, VariantBaru> = {
  secondary: "default",
};

/** Tombol — kelas mengikuti design system prototype (.btn). */
export default function Button({
  variant = "primary",
  size = "md",
  block,
  fullWidth,
  loading,
  icon,
  iconRight,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const v = (VARIAN_LAMA[variant as string] ?? variant) as VariantBaru;
  const cls = [
    "btn",
    v !== "default" ? `btn-${v}` : "",
    size !== "md" ? `btn-${size}` : "",
    block || fullWidth ? "btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="spinner" style={{ borderTopColor: "currentColor" }} />
      ) : icon ? (
        <Icon name={icon} size={18} />
      ) : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={18} /> : null}
    </button>
  );
}

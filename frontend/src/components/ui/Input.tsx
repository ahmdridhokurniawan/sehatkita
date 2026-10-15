"use client";

import type { InputHTMLAttributes } from "react";
import Icon from "./Icon";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** Tampilkan tanda * merah (wajib) — permintaan pembimbing */
  required?: boolean;
  /** Label opsional: tampil "(opsional)" tanpa tanda bintang */
  optional?: boolean;
  error?: string;
  hint?: string;
  /** Nama ikon di dalam input (kiri) */
  icon?: string;
  /** Satuan di kanan input, mis. "kg" */
  suffix?: string;
};

/** Input teks — mengikuti .input pada design system prototype. */
export default function Input({
  label,
  required,
  optional,
  error,
  hint,
  icon,
  suffix,
  className = "",
  id,
  ...rest
}: Props) {
  const inputId = id || rest.name;
  const input = (
    <input
      id={inputId}
      className={`input ${error ? "is-error" : ""} ${className}`}
      required={required}
      {...rest}
    />
  );
  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label}
          {required ? <span className="req">*</span> : null}
          {optional ? <span className="opt">(opsional)</span> : null}
        </label>
      ) : null}

      {icon ? (
        <div className="input-icon">
          <Icon name={icon} size={18} />
          {input}
        </div>
      ) : suffix ? (
        <div className="input-group">
          {input}
          <span className="suffix">{suffix}</span>
        </div>
      ) : (
        input
      )}

      {error ? <div className="err-msg show">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

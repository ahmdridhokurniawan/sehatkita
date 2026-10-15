"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";

export type Opsi = { value: string | number; label: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  /** Cara baru: daftar opsi */
  options?: Opsi[];
  placeholder?: string;
  /** Cara lama: <option> sebagai children */
  children?: ReactNode;
};

/** Dropdown — mengikuti .select pada design system prototype. */
export default function Select({
  label,
  required,
  optional,
  error,
  hint,
  options,
  placeholder,
  children,
  className = "",
  id,
  ...rest
}: Props) {
  const inputId = id || rest.name;
  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label}
          {required ? <span className="req">*</span> : null}
          {optional ? <span className="opt">(opsional)</span> : null}
        </label>
      ) : null}
      <select id={inputId} className={`select ${error ? "is-error" : ""} ${className}`} {...rest}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      {error ? <div className="err-msg show">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

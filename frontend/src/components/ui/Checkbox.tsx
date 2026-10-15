"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  error?: string;
};

/** Checkbox — mengikuti .check pada design system prototype. */
export default function Checkbox({ label, error, className = "", id, ...rest }: Props) {
  const inputId = id || rest.name;
  return (
    <div className="field">
      <label className="check" htmlFor={inputId}>
        <input type="checkbox" id={inputId} className={className} {...rest} />
        {label ? <span>{label}</span> : null}
      </label>
      {error ? <div className="err-msg show">{error}</div> : null}
    </div>
  );
}

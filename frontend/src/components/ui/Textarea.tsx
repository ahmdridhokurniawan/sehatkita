"use client";

import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
};

/** Area teks — mengikuti .textarea pada design system prototype. */
export default function Textarea({
  label,
  required,
  optional,
  error,
  hint,
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
      <textarea
        id={inputId}
        className={`textarea ${error ? "is-error" : ""} ${className}`}
        required={required}
        {...rest}
      />
      {error ? <div className="err-msg show">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

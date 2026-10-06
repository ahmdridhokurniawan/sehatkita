import type { InputHTMLAttributes, ReactNode } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  error?: string;
}

export default function Checkbox({
  label,
  error,
  id,
  name,
  className = "",
  ...props
}: CheckboxProps) {
  const inputId = id ?? name;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700"
      >
        <input
          id={inputId}
          name={name}
          type="checkbox"
          className={[
            "mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600",
            "focus:ring-2 focus:ring-emerald-500/40",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

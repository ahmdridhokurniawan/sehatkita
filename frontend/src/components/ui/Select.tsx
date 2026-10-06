import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export default function Select({
  label,
  error,
  id,
  name,
  className = "",
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? name;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        className={[
          "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
          error ? "border-red-400 focus:ring-red-400/40" : "border-slate-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

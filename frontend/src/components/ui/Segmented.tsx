"use client";

export type SegmenItem = { value: string; label: string; title?: string };

type Props = {
  items: SegmenItem[];
  value: string;
  onChange: (value: string) => void;
};

/** Segmented control — mengikuti .segment prototype. */
export default function Segmented({ items, value, onChange }: Props) {
  return (
    <div className="segment">
      {items.map((s) => (
        <button
          key={s.value}
          type="button"
          title={s.title}
          aria-label={s.title || s.label}
          className={value === s.value ? "active" : ""}
          onClick={() => onChange(s.value)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

"use client";

export type TabItem = { key: string; label: string };

type Props = {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
};

/** Tab — mengikuti .tabs/.tab pada design system prototype. */
export default function Tabs({ items, active, onChange }: Props) {
  return (
    <div className="tabs" role="tablist">
      {items.map((t) => (
        <button
          key={t.key}
          role="tab"
          className={`tab ${active === t.key ? "active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

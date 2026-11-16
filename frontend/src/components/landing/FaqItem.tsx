"use client";

import Icon from "@/components/ui/Icon";

type FaqItemProps = {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
};

/** Item akordeon FAQ bersama untuk halaman beranda dan Pusat Bantuan. */
export default function FaqItem({ q, a, open, onToggle }: FaqItemProps) {
  return (
    <div className={`acc ${open ? "open" : ""}`}>
      <button className="acc-q" aria-expanded={open} onClick={onToggle} type="button">
        {q} <Icon name="chevron-down" />
      </button>
      <div className="acc-a">
        <div className="acc-a-inner">
          <div className="acc-a-pad">{a}</div>
        </div>
      </div>
    </div>
  );
}

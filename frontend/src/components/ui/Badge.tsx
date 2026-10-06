import type { ReactNode } from "react";

type BadgeTone = "netral" | "sukses" | "peringatan" | "bahaya" | "info";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  netral: "bg-slate-100 text-slate-700",
  sukses: "bg-emerald-100 text-emerald-700",
  peringatan: "bg-amber-100 text-amber-700",
  bahaya: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
};

export default function Badge({
  tone = "netral",
  children,
  className = "",
}: BadgeProps) {
  const classes = [
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
    TONES[tone],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}

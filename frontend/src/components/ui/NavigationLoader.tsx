"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Pembungkus transisi rute ringan tanpa overlay loading dan tanpa remount children:
 * halaman langsung terbuka dengan fade halus (~220ms) saat berpindah antar rute.
 */
export default function NavigationLoader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const el = stageRef.current;
    if (!el || typeof el.animate !== "function") return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const target = el.querySelector<HTMLElement>("#appBody") ?? el;
    if (!target || typeof target.animate !== "function") return;

    const anim = target.animate(
      [
        { opacity: 0.82, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "none" },
    );
    return () => anim.cancel();
  }, [pathname]);

  return (
    <div ref={stageRef} className="route-stage">
      {children}
    </div>
  );
}

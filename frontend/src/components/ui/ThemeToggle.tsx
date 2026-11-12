"use client";

import { useSyncExternalStore } from "react";
import Icon from "./Icon";
import { gantiTema, ikutiTemaSistem, temaSaatIni, type Mode } from "@/lib/theme";

function berlanggananTema(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onTheme = () => cb();
  document.addEventListener("themechange", onTheme);
  const berhentiSistem = ikutiTemaSistem();
  return () => {
    document.removeEventListener("themechange", onTheme);
    berhentiSistem();
  };
}

/** Tombol ganti tema terang/gelap — mengikuti .theme-toggle prototype. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const mode = useSyncExternalStore<Mode>(berlanggananTema, temaSaatIni, () => "light");

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={() => {
        gantiTema();
      }}
      aria-label="Ubah tema terang/gelap"
      type="button"
    >
      {mode === "dark" ? <Icon name="sun" size={19} /> : <Icon name="moon" size={19} />}
    </button>
  );
}

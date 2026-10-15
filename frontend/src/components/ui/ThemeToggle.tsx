"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { gantiTema, ikutiTemaSistem, temaSaatIni, type Mode } from "@/lib/theme";

/** Tombol ganti tema terang/gelap — mengikuti .theme-toggle prototype. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    setMode(temaSaatIni());
    return ikutiTemaSistem();
  }, []);

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={() => setMode(gantiTema())}
      aria-label="Ubah tema terang/gelap"
      type="button"
    >
      {mode === "dark" ? <Icon name="sun" size={19} /> : <Icon name="moon" size={19} />}
    </button>
  );
}

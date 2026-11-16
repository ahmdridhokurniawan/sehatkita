/**
 * Tema (terang/gelap) — diporting dari prototype `assets/js/core.js` (Theme).
 * Tema disimpan di localStorage dan diterapkan lewat atribut data-theme
 * pada elemen <html> (dibaca oleh design-system.css).
 */

export const THEME_KEY = "sehatkita.theme";
export type Mode = "light" | "dark";

/** Skrip kecil untuk dipasang di <head> agar tema tidak berkedip saat memuat */
export const SKRIP_TEMA = `(function(){try{var k='${THEME_KEY}';var s=localStorage.getItem(k);var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme', s||(d?'dark':'light'));}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export function temaSaatIni(): Mode {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Mode) || "light";
}

type TransitionDoc = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

export function terapkanTema(mode: Mode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", mode);
  document.dispatchEvent(new CustomEvent("themechange", { detail: { mode } }));

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.classList.remove("theme-switching");
      });
    });
  } else {
    root.classList.remove("theme-switching");
  }
}

export function gantiTema(): Mode {
  const next: Mode = temaSaatIni() === "dark" ? "light" : "dark";
  if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, next);

  const kurangiGerak =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = typeof document !== "undefined" ? (document as TransitionDoc) : undefined;

  if (!kurangiGerak && doc && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => {
      terapkanTema(next);
    });
  } else {
    terapkanTema(next);
  }
  return next;
}

/** Ikuti perubahan tema sistem bila pengguna belum memilih manual */
export function ikutiTemaSistem(): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    if (!window.localStorage.getItem(THEME_KEY)) terapkanTema(e.matches ? "dark" : "light");
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

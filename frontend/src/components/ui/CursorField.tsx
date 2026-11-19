"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

type Variant = "aside" | "hero";

type WaveSpec = {
  yRatio: number;
  amp: number;
  freq: number;
  speed: number;
  phase: number;
  hueIdx: number;
  lineWidth: number;
};

type Props = {
  /** `aside` untuk panel gelap (AuthAside, CTA band); `hero` untuk latar terang/gelap Hero landing. */
  variant?: Variant;
  className?: string;
};

// Palet vital SehatKita (Hijau Emerald Murni) yang selaras, tenang, dan ramah mata
const ASIDE_PALETTE: [number, number, number][] = [
  [74, 222, 128],  // hijau emerald cerah
  [52, 211, 130],  // hijau mint murni
  [134, 239, 172], // hijau muda tenang
  [187, 247, 208], // mint lembut
];

const HERO_PALETTE_LIGHT: [number, number, number][] = [
  [15, 115, 71],   // emerald utama
  [24, 140, 87],   // hijau sehat
  [21, 128, 61],   // hijau alam
  [75, 181, 127],  // mint lembut
];

const HERO_PALETTE_DARK: [number, number, number][] = [
  [74, 222, 128],  // hijau emerald cerah
  [52, 211, 130],  // hijau mint murni
  [134, 239, 172], // hijau muda tenang
  [187, 247, 208], // mint lembut
];

const ASIDE_WAVES: WaveSpec[] = [
  { yRatio: 0.30, amp: 10, freq: 0.0085, speed: 0.42, phase: 0.3, hueIdx: 0, lineWidth: 1.35 },
  { yRatio: 0.68, amp: 13, freq: 0.0072, speed: -0.36, phase: 2.0, hueIdx: 1, lineWidth: 1.55 },
];

const HERO_WAVES: WaveSpec[] = [
  { yRatio: 0.28, amp: 11, freq: 0.0055, speed: 0.38, phase: 0.4, hueIdx: 0, lineWidth: 1.35 },
  { yRatio: 0.56, amp: 14, freq: 0.0048, speed: -0.32, phase: 2.2, hueIdx: 1, lineWidth: 1.55 },
  { yRatio: 0.80, amp: 10, freq: 0.0062, speed: 0.35, phase: 4.1, hueIdx: 3, lineWidth: 1.30 },
];

/** Set posisi sorot kursor lokal (`--lx`, `--ly`) pada card/elemen interaktif tunggal. */
export function setLocalSpotlight(el: HTMLElement | null, clientX: number, clientY: number) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--lx", `${(clientX - r.left).toFixed(1)}px`);
  el.style.setProperty("--ly", `${(clientY - r.top).toFixed(1)}px`);
  el.style.setProperty("--lo", "1");
}

/** Matikan sorot kursor lokal pada elemen tunggal. */
export function clearLocalSpotlight(el: HTMLElement | null) {
  if (!el) return;
  el.style.setProperty("--lo", "0");
}

/** Hitung posisi kursor ke seluruh anak `.feat` di dalam grid untuk efek proximity border glow. */
export function handleGridSpotlightMove(e: ReactPointerEvent<HTMLElement>, selector = ".feat") {
  const cards = e.currentTarget.querySelectorAll<HTMLElement>(selector);
  const cx = e.clientX;
  const cy = e.clientY;
  for (const card of cards) {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--lx", `${(cx - r.left).toFixed(1)}px`);
    card.style.setProperty("--ly", `${(cy - r.top).toFixed(1)}px`);
    card.style.setProperty("--lo", "1");
  }
}

export function handleGridSpotlightLeave(e: ReactPointerEvent<HTMLElement>, selector = ".feat") {
  const cards = e.currentTarget.querySelectorAll<HTMLElement>(selector);
  for (const card of cards) {
    card.style.setProperty("--lo", "0");
  }
}

function interpolatePalette(palette: [number, number, number][], t: number): [number, number, number] {
  const norm = ((t % 1) + 1) % 1;
  const scaled = norm * palette.length;
  const i0 = Math.floor(scaled) % palette.length;
  const i1 = (i0 + 1) % palette.length;
  const frac = scaled - Math.floor(scaled);
  const c0 = palette[i0];
  const c1 = palette[i1];
  return [
    Math.round(c0[0] + (c1[0] - c0[0]) * frac),
    Math.round(c0[1] + (c1[1] - c0[1]) * frac),
    Math.round(c0[2] + (c1[2] - c0[2]) * frac),
  ];
}

/**
 * Kanvas Bio-Pulse tenang khas SehatKita: gelombang vital tipis tanpa partikel berlebih
 * agar nyaman dibaca semua usia termasuk orang tua, namun warna & lengkung gelombang tetap mengikuti kursor.
 */
export default function CursorField({ variant = "aside", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.closest<HTMLElement>(".auth-aside, .hero, .cta-band") ?? canvas.parentElement;
    if (!host) return;

    const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
    const ctx = !isJsdom && typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    let targetX = 0.5;
    let targetY = 0.4;
    let curX = 0.5;
    let curY = 0.4;
    let targetActive = 0;
    let curActive = 0;
    let rafId = 0;
    let time = 0;

    const isDarkTheme = () => document.documentElement.getAttribute("data-theme") === "dark";

    const getActiveColor = (normX: number, normY: number): [number, number, number] => {
      const dark = isDarkTheme();
      const palette = variant === "aside" ? ASIDE_PALETTE : dark ? HERO_PALETTE_DARK : HERO_PALETTE_LIGHT;
      return interpolatePalette(palette, normX * 0.65 + normY * 0.35 + time * 0.03);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const drawWaves = () => {
      if (!ctx || width <= 1 || height <= 1) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const dark = isDarkTheme();
      const palette = variant === "aside" ? ASIDE_PALETTE : dark ? HERO_PALETTE_DARK : HERO_PALETTE_LIGHT;
      const waves = variant === "aside" ? ASIDE_WAVES : HERO_WAVES;
      const px = curX * width;
      const py = curY * height;
      const radius = variant === "hero" ? 240 : 200;
      const stepX = Math.max(10, Math.round(width / 84));
      const activeCol = getActiveColor(curX, curY);

      for (const wv of waves) {
        const baseY = height * wv.yRatio;
        const waveCol = palette[wv.hueIdx % palette.length];

        ctx.beginPath();
        let started = false;
        for (let x = 0; x <= width + stepX; x += stepX) {
          const clampedX = Math.min(width, x);
          const baseSin =
            Math.sin(clampedX * wv.freq + time * wv.speed + wv.phase) * wv.amp +
            Math.cos(clampedX * (wv.freq * 1.6) - time * wv.speed * 0.7) * (wv.amp * 0.28);

          // Simpangan tenang & halus saat kursor mendekati gelombang
          let pulseOffset = 0;
          if (curActive > 0.01) {
            const dx = clampedX - px;
            const dyBase = baseY + baseSin - py;
            const dist = Math.hypot(dx, dyBase * 0.8);
            if (dist < radius) {
              const env = Math.pow(1 - dist / radius, 2) * curActive;
              const beat = Math.sin(dx * 0.042 - time * 3.4) * 7.5;
              const pullDir = py < baseY ? -1 : 1;
              pulseOffset = env * (beat + pullDir * 8);
            }
          }

          const y = baseY + baseSin + pulseOffset;
          if (!started) {
            ctx.moveTo(clampedX, y);
            started = true;
          } else {
            ctx.lineTo(clampedX, y);
          }
        }

        const strokeGrad = ctx.createLinearGradient(0, baseY - 20, width, baseY + 20);
        const baseStrokeAlpha = variant === "aside" ? 0.17 : dark ? 0.15 : 0.13;
        const boostStrokeAlpha = variant === "aside" ? 0.50 : dark ? 0.40 : 0.34;
        const hiStop = Math.max(0.05, Math.min(0.95, curX));
        const leftStop = Math.max(0, hiStop - 0.25);
        const rightStop = Math.min(1, hiStop + 0.25);

        strokeGrad.addColorStop(0, `rgba(${waveCol[0]}, ${waveCol[1]}, ${waveCol[2]}, ${baseStrokeAlpha})`);
        if (curActive > 0.02) {
          strokeGrad.addColorStop(leftStop, `rgba(${waveCol[0]}, ${waveCol[1]}, ${waveCol[2]}, ${baseStrokeAlpha})`);
          strokeGrad.addColorStop(
            hiStop,
            `rgba(${activeCol[0]}, ${activeCol[1]}, ${activeCol[2]}, ${(baseStrokeAlpha + (boostStrokeAlpha - baseStrokeAlpha) * curActive).toFixed(3)})`,
          );
          strokeGrad.addColorStop(rightStop, `rgba(${waveCol[0]}, ${waveCol[1]}, ${waveCol[2]}, ${baseStrokeAlpha})`);
        }
        strokeGrad.addColorStop(1, `rgba(${waveCol[0]}, ${waveCol[1]}, ${waveCol[2]}, ${baseStrokeAlpha})`);

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = strokeGrad;

        // Soft outer glow tipis agar garis menyatu natural
        ctx.globalAlpha = variant === "aside" ? 0.11 : 0.09;
        ctx.lineWidth = wv.lineWidth * 2.2;
        ctx.stroke();

        // Garis inti halus
        ctx.globalAlpha = 1;
        ctx.lineWidth = wv.lineWidth + curActive * 0.25;
        ctx.stroke();

        // Area gradasi sangat tipis di bawah garis
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, baseY - 14, 0, Math.min(height, baseY + 95));
        const areaAlpha = variant === "aside" ? 0.042 : dark ? 0.032 : 0.026;
        areaGrad.addColorStop(0, `rgba(${waveCol[0]}, ${waveCol[1]}, ${waveCol[2]}, ${areaAlpha})`);
        areaGrad.addColorStop(1, `rgba(${waveCol[0]}, ${waveCol[1]}, ${waveCol[2]}, 0)`);
        ctx.fillStyle = areaGrad;
        ctx.fill();
        ctx.restore();
      }
    };

    const syncCssVars = () => {
      host.style.setProperty("--cx", `${(curX * 100).toFixed(2)}%`);
      host.style.setProperty("--cy", `${(curY * 100).toFixed(2)}%`);
      host.style.setProperty("--c-active", curActive.toFixed(3));
      const hueShift = Math.round((curX - 0.5) * 44 + (curY - 0.5) * 26);
      host.style.setProperty("--c-hue", `${hueShift}deg`);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      targetX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      targetY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      targetActive = 1;
    };

    const onPointerLeave = () => {
      targetActive = 0;
    };

    resize();
    syncCssVars();

    if (reduceMotion) {
      drawWaves();
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
      ro?.observe(host);
      return () => ro?.disconnect();
    }

    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerleave", onPointerLeave, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(host);

    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      time += dt;

      const ease = 1 - Math.pow(0.0022, dt);
      curX += (targetX - curX) * ease;
      curY += (targetY - curY) * ease;
      curActive += (targetActive - curActive) * ease;

      syncCssVars();
      drawWaves();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      ro?.disconnect();
    };
  }, [variant]);

  return <canvas ref={canvasRef} className={className ? `cursor-field ${className}` : "cursor-field"} aria-hidden="true" />;
}

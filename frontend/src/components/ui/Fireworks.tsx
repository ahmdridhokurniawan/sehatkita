"use client";

import { useEffect, useRef } from "react";

type Partikel = {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  usia: number;
  maksUsia: number;
  ukuran: number;
  warna: string;
};

const PALET = ["#22c55e", "#4ade80", "#facc15", "#fb923c", "#38bdf8", "#f472b6", "#a3e635"];

let ctxAudio: AudioContext | null = null;

export function playCelebrationSound(): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctxAudio = ctxAudio || new Ctor();
    if (ctxAudio.state === "suspended") void ctxAudio.resume();
    const waktu = ctxAudio.currentTime;
    const osci = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    osci.type = "sine";
    osci.frequency.setValueAtTime(220, waktu);
    osci.frequency.exponentialRampToValueAtTime(42, waktu + 0.35);
    gain.gain.setValueAtTime(0.0001, waktu);
    gain.gain.exponentialRampToValueAtTime(0.22, waktu + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, waktu + 0.42);
    osci.connect(gain);
    gain.connect(ctxAudio.destination);
    osci.start(waktu);
    osci.stop(waktu + 0.45);
  } catch {
    // Audio tidak tersedia / diblokir browser — hentikan diam, jangan ganggu.
  }
}

export default function FireworksCanvas({ aktif }: { aktif: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!aktif) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let lebar = window.innerWidth;
    let tinggi = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const daftar: Partikel[] = [];

    const ukuran = () => {
      lebar = window.innerWidth;
      tinggi = window.innerHeight;
      canvas.width = Math.floor(lebar * dpr);
      canvas.height = Math.floor(tinggi * dpr);
      canvas.style.width = `${lebar}px`;
      canvas.style.height = `${tinggi}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ukuran();
    window.addEventListener("resize", ukuran);

    const lepas = () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      window.removeEventListener("resize", ukuran);
    };

    const ledak = (bx: number, by: number) => {
      const warna = PALET[Math.floor(Math.random() * PALET.length)];
      const jumlah = 44 + Math.floor(Math.random() * 22);
      for (let i = 0; i < jumlah; i++) {
        const sudut = (Math.PI * 2 * i) / jumlah + Math.random() * 0.12;
        const laju = 2.4 + Math.random() * 5;
        daftar.push({
          x: bx,
          y: by,
          px: bx,
          py: by,
          vx: Math.cos(sudut) * laju,
          vy: Math.sin(sudut) * laju,
          usia: 0,
          maksUsia: 48 + Math.random() * 34,
          ukuran: 1.4 + Math.random() * 1.8,
          warna,
        });
      }
    };

    const gambarTitik = (p: Partikel, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.warna;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.warna;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.ukuran * 1.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (kurangiGerak) {
      for (let i = 0; i < 6; i++) {
        ledak(lebar * (0.12 + Math.random() * 0.76), tinggi * (0.16 + Math.random() * 0.34));
      }
      ctx.clearRect(0, 0, lebar, tinggi);
      for (const p of daftar) gambarTitik(p, 0.85);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      return () => {
        lepas();
      };
    }

    let jeda = 0;
    const tick = () => {
      ctx.clearRect(0, 0, lebar, tinggi);
      for (let i = daftar.length - 1; i >= 0; i--) {
        const p = daftar[i];
        p.px = p.x;
        p.py = p.y;
        p.vy += 0.02;
        p.vx *= 0.991;
        p.vy *= 0.991;
        p.x += p.vx;
        p.y += p.vy;
        p.usia += 1;
        if (p.usia >= p.maksUsia) {
          daftar.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, 1 - p.usia / p.maksUsia);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.warna;
        ctx.lineWidth = p.ukuran;
        ctx.lineCap = "round";
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.warna;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (jeda <= 0 && daftar.length < 520) {
        ledak(lebar * (0.1 + Math.random() * 0.8), tinggi * (0.12 + Math.random() * 0.4));
        if (Math.random() < 0.35) {
          ledak(lebar * (0.1 + Math.random() * 0.8), tinggi * (0.12 + Math.random() * 0.4));
        }
        jeda = 22 + Math.floor(Math.random() * 30);
      } else {
        jeda -= 1;
      }
      rafId.current = requestAnimationFrame(tick);
    };

    ledak(lebar * 0.3, tinggi * 0.28);
    ledak(lebar * 0.7, tinggi * 0.32);
    rafId.current = requestAnimationFrame(tick);

    return () => {
      lepas();
    };
  }, [aktif]);

  if (!aktif) return null;

  return <canvas ref={canvasRef} className="celebration-canvas" aria-hidden="true" />;
}

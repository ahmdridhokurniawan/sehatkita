"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";
import CursorField, { clearLocalSpotlight, setLocalSpotlight } from "@/components/ui/CursorField";

export type AuthAsideFeature =
  | [string, string]
  | {
      icon: string;
      tag?: string;
      title: string;
      desc?: string;
    };

type NormalizedFeature = {
  icon: string;
  tag?: string;
  title: string;
  desc?: string;
};

type Props = {
  /** Judul besar di panel kiri */
  judul: string;
  /** Paragraf pengantar */
  teks: string;
  /** Daftar fitur andalan (ditampilkan sebagai showcase carousel horizontal) */
  fitur: AuthAsideFeature[];
  /** Teks kecil di bawah panel kiri */
  catatan?: string;
};

const AUTO_SLIDE_MS = 4500;

function normalizeFeature(item: AuthAsideFeature): NormalizedFeature {
  return Array.isArray(item) ? { icon: item[0], title: item[1] } : item;
}

function findNearestSlide(track: HTMLElement): number {
  let nearest = 0;
  let bestDist = Infinity;
  for (let i = 0; i < track.children.length; i += 1) {
    const child = track.children[i] as HTMLElement;
    const dist = Math.abs(child.offsetLeft - track.scrollLeft);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = i;
    }
  }
  return nearest;
}

/** Panel kiri halaman auth bergaya showcase dengan carousel fitur otomatis + geser manual. */
export default function AuthAside({ judul, teks, fitur, catatan }: Props) {
  const slides = useMemo(() => fitur.map(normalizeFeature), [fitur]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const activeRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 });
  const rafRef = useRef<number | null>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const safeActive = slides.length > 0 ? Math.min(activeIdx, slides.length - 1) : 0;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track || slides.length === 0) return;
      const wrapped = ((index % slides.length) + slides.length) % slides.length;
      activeRef.current = wrapped;
      setActiveIdx(wrapped);
      const target = track.children[wrapped] as HTMLElement | undefined;
      if (target && typeof track.scrollTo === "function") {
        track.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
      }
    },
    [slides.length],
  );

  // Sinkronkan indikator aktif saat pengguna menggulir/menggeser carousel secara manual
  const handleTrackScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || slides.length === 0) return;
    if (typeof requestAnimationFrame === "undefined") {
      const nearest = findNearestSlide(track);
      activeRef.current = nearest;
      setActiveIdx(nearest);
      return;
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const nearest = findNearestSlide(track);
      activeRef.current = nearest;
      setActiveIdx(nearest);
    });
  }, [slides.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Auto-slide ke samping; berhenti sementara saat hover/drag/fokus atau reduced-motion
  useEffect(() => {
    if (slides.length <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const id = window.setInterval(() => {
      if (!pausedRef.current) {
        goTo(activeRef.current + 1);
      }
    }, AUTO_SLIDE_MS);

    return () => window.clearInterval(id);
  }, [slides.length, goTo]);

  function onMouseDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    dragRef.current = { active: true, startX: e.clientX, startScroll: track.scrollLeft };
    pausedRef.current = true;
    setDragging(true);
  }

  function onMouseDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = dragRef.current.startScroll - (e.clientX - dragRef.current.startX);
  }

  function onMouseDragEnd() {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    pausedRef.current = false;
    setDragging(false);
    const track = trackRef.current;
    if (track) goTo(findNearestSlide(track));
  }

  return (
    <aside className="auth-aside auth-aside-interactive">
      <div className="auth-aside-bg" aria-hidden="true">
        <CursorField variant="aside" />
        <span className="auth-cursor-aura" />
        <span className="auth-orb auth-orb-1" />
        <span className="auth-orb auth-orb-2" />
      </div>

      <Link href="/" className="brand auth-aside-top" style={{ color: "#fff" }}>
        <BrandLockup variant="lg" />
        <span>
          SehatKita
          <small style={{ color: "rgba(255,255,255,.8)" }}>Kota Banjarbaru</small>
        </span>
      </Link>

      <div className="auth-aside-body">
        <span className="auth-aside-kicker">
          <span className="auth-aside-dot" aria-hidden="true" />
          Layanan Kesehatan Warga
        </span>
        <h2>{judul}</h2>
        <p>{teks}</p>

        {slides.length > 0 ? (
          <div
            className="auth-carousel"
            onPointerEnter={() => {
              pausedRef.current = true;
            }}
            onPointerLeave={() => {
              pausedRef.current = false;
              onMouseDragEnd();
            }}
            onFocusCapture={() => {
              pausedRef.current = true;
            }}
            onBlurCapture={() => {
              pausedRef.current = false;
            }}
          >
            <div className="auth-carousel-head">
              <span className="auth-carousel-label">
                Fitur Andalan · <strong>0{safeActive + 1}</strong> / 0{slides.length}
              </span>
              {slides.length > 1 ? (
                <div className="auth-carousel-nav">
                  <button
                    type="button"
                    className="auth-nav-btn"
                    aria-label="Fitur sebelumnya"
                    onClick={() => goTo(safeActive - 1)}
                  >
                    <Icon name="chevron-left" size={15} />
                  </button>
                  <button
                    type="button"
                    className="auth-nav-btn"
                    aria-label="Fitur berikutnya"
                    onClick={() => goTo(safeActive + 1)}
                  >
                    <Icon name="chevron-right" size={15} />
                  </button>
                </div>
              ) : null}
            </div>

            <div
              ref={trackRef}
              className={`auth-carousel-track ${dragging ? "is-dragging" : ""}`}
              role="region"
              aria-roledescription="carousel"
              aria-label="Fitur unggulan SehatKita"
              onScroll={handleTrackScroll}
              onPointerDown={onMouseDragStart}
              onPointerMove={onMouseDragMove}
              onPointerUp={onMouseDragEnd}
              onPointerCancel={onMouseDragEnd}
            >
              {slides.map((item, i) => (
                <div
                  key={i}
                  className="auth-slide"
                  onPointerMove={(e) => setLocalSpotlight(e.currentTarget, e.clientX, e.clientY)}
                  onPointerLeave={(e) => clearLocalSpotlight(e.currentTarget)}
                >
                  <div className="auth-slide-top">
                    <span className="feature-ico">
                      <Icon name={item.icon} size={17} />
                    </span>
                    {item.tag ? <span className="auth-slide-tag">{item.tag}</span> : null}
                  </div>
                  <div className="auth-slide-title">{item.title}</div>
                  {item.desc ? <p className="auth-slide-desc">{item.desc}</p> : null}
                </div>
              ))}
            </div>

            {slides.length > 1 ? (
              <div className="auth-carousel-dots" role="tablist" aria-label="Pilih fitur">
                {slides.map((item, i) => (
                  <button
                    key={item.title}
                    type="button"
                    role="tab"
                    aria-selected={i === safeActive}
                    aria-label={`Tampilkan fitur ${i + 1}: ${item.title}`}
                    className={`auth-dot ${i === safeActive ? "is-active" : ""}`}
                    onClick={() => goTo(i)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="auth-aside-foot">
        <Icon name="shield-check" size={16} />
        <p className="tiny">
          {catatan ?? "SehatKita bukan alat diagnosis medis dan tidak menggantikan pemeriksaan tenaga kesehatan."}
        </p>
      </div>
    </aside>
  );
}

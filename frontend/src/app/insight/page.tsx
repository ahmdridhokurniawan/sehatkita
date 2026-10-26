"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Segmented from "@/components/ui/Segmented";
import { EmptyState, ErrorState } from "@/components/ui/Empty";
import { insight as insightApi, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import { LABEL_INSIGHT } from "@/lib/labels";
import PanelAmbang from "@/components/insight/PanelAmbang";
import type { AmbangBaris, Insight } from "@/types";
import type { LevelInsight } from "@/lib/enums";
import "@/styles/insight.css";

/* ------------------------------------------------------------------
   Insight Kesehatan — §8.3 GET /insight.
   Saran rule-engine backend, filter tingkat: bahaya/peringatan/info.

   Animasi: CSS murni — hanya transform/opacity (jalur compositor,
   tidak memicu reflow) + skeleton saat memuat. Tanpa library, tanpa
   gambar tambahan, tanpa request baru. Otomatis mati bila pengguna
   mengaktifkan "kurangi gerakan" di sistem operasi.
   ------------------------------------------------------------------ */

const TINGKAT = [
  { value: "semua", label: "Semua" },
  { value: "bahaya", label: "Bahaya" },
  { value: "peringatan", label: "Peringatan" },
  { value: "info", label: "Info" },
];

const TONE: Record<string, { cls: string; ico: string; label: string; ringkas: string }> = {
  bahaya: { cls: "danger", ico: "alert-triangle", label: "Bahaya", ringkas: "perlu tindakan" },
  peringatan: { cls: "warning", ico: "alert-circle", label: "Peringatan", ringkas: "perlu dipantau" },
  info: { cls: "primary", ico: "info", label: "Info", ringkas: "sekadar informasi" },
};

const URUTAN = ["bahaya", "peringatan", "info"];

/** Inisial dari kode insight, mis. "gula_darah_tinggi" → "GD". */
function inisialKode(kode: string) {
  return kode
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function InsightPage() {
  const [filter, setFilter] = useState("semua");
  const [semua, setSemua] = useState<Insight[]>([]);
  const [ambang, setAmbang] = useState<AmbangBaris[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sorot, setSorot] = useState("");
  const daftarRef = useRef<HTMLDivElement | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const [res, am] = await Promise.all([
        insightApi.list(filter === "semua" ? undefined : { level: filter as LevelInsight }),
        insightApi.ambang().catch(() => [] as AmbangBaris[]),
      ]);
      setSemua(res ?? []);
      setAmbang(am ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat insight");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  const daftar = useMemo(
    () => [...semua].sort((a, b) => URUTAN.indexOf(a.level) - URUTAN.indexOf(b.level)),
    [semua],
  );

  const hitung = (t: string) => semua.filter((i) => i.level === t).length;
  const total = semua.length;
  const bahaya = hitung("bahaya");

  /** Klik kartu ringkasan: saring ke tingkat itu, beri kilau, gulir ke daftar. */
  function pilihTingkat(t: string) {
    setFilter(filter === t ? "semua" : t);
    setSorot(t);
    window.setTimeout(
      () => daftarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      70,
    );
  }

  return (
    <AppShell noFab>
      <header className="ins-head">
        <div>
          <h1 className="h3">Insight Kesehatan</h1>
          <p className="tiny">
            {loading
              ? "Menyusun saran dari catatan terakhirmu…"
              : total === 0
                ? "Belum ada saran. Catat kesehatan rutin agar insight muncul."
                : bahaya > 0
                  ? `${total} saran · ${bahaya} perlu tindakan cepat`
                  : `${total} saran · tidak ada yang mendesak`}
          </p>
        </div>
      </header>

      <div className="ins-summary grid grid-3">
        {URUTAN.map((t, idx) => {
          const tone = TONE[t];
          const n = hitung(t);
          return (
            <button
              key={t}
              type="button"
              className={`ins-sum-card tone-${tone.cls}${filter === t ? " aktif" : ""}${
                sorot === t ? " sorot" : ""
              }`}
              style={{ ["--i" as string]: idx }}
              onClick={() => pilihTingkat(t)}
              aria-pressed={filter === t}
            >
              <span className="ins-sum-ico">
                <Icon name={tone.ico} size={18} />
              </span>
              <span className="ins-sum-num">{loading ? "–" : n}</span>
              <span className="ins-sum-label">{tone.label}</span>
              <span className="ins-sum-sub">{n === 0 ? "tidak ada" : tone.ringkas}</span>
              <span className="ins-sum-bar" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div ref={daftarRef} className="ins-anchor" />

      <Segmented items={TINGKAT} value={filter} onChange={setFilter} />

      {loading ? (
        <div className="ins-skeleton-wrap mt-12" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div className="ins-skeleton" key={i} style={{ ["--i" as string]: i }}>
              <span className="sk-ico" />
              <span className="sk-line w-40" />
              <span className="sk-line w-90" />
              <span className="sk-line w-60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : (
        <div className="ins-list">
          {daftar.length === 0 ? (
            <div className="card card-flat">
              <EmptyState
                title="Tidak ada insight"
                desc={
                  filter === "semua"
                    ? "Catat kesehatan secara rutin agar saran otomatis muncul di sini."
                    : `Tidak ada insight tingkat ${
                        TINGKAT.find((x) => x.value === filter)?.label ?? filter
                      }.`
                }
              />
            </div>
          ) : (
            daftar.map((i, idx) => {
              const tone = TONE[i.level] ?? TONE.info;
              return (
                <article
                  key={`${i.kode}-${i.level}-${idx}`}
                  className={`ins-card tone-${tone.cls}`}
                  style={{ ["--i" as string]: Math.min(idx, 8) }}
                >
                  <span className="ins-card-rail" aria-hidden="true" />
                  <div className="ins-card-body">
                    <div className="ins-card-top">
                      <span className="ins-ico">
                        <Icon name={tone.ico} size={18} />
                      </span>
                      <div className="ins-card-title">
                        <strong>{LABEL_INSIGHT[i.kode] || i.kode}</strong>
                        <span className="ins-meta">
                          {tone.label} · {tanggal(i.dibuat_pada, "short")}
                        </span>
                      </div>
                      <span className="ins-badge" aria-hidden="true">
                        {inisialKode(i.kode)}
                      </span>
                    </div>
                    <p className="ins-teks">{i.teks}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      <PanelAmbang data={ambang} />

      <p className="tiny center mt-16 mb-16">
        <Icon name="shield" size={13} /> Insight berbasis aturan (bukan ML) dan bukan diagnosis
        medis.
      </p>
    </AppShell>
  );
}

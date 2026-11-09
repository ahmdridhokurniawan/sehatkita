"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { pengguna as penggunaApi, ApiError } from "@/lib/api";
import type { WargaCari } from "@/types";

/* ------------------------------------------------------------------
   Pilih Warga — autocomplete NIK untuk petugas (kader / admin / super).
   Sumber: GET /pengguna/cari-nik?nik=… (minimal 3 digit, maks 10 hasil).
   Warga tanpa NIK tidak akan muncul — backend hanya mencari kolom nik.
   ------------------------------------------------------------------ */

type Props = {
  value: WargaCari | null;
  onChange: (warga: WargaCari | null) => void;
  error?: string;
  /** id untuk <input>, dipakai label htmlFor */
  id?: string;
  label?: string;
  /**
   * Batasi hasil ke satu wilayah. Kader & admin kelurahan hanya boleh mencatat
   * warga di wilayah kerjanya (backend `dalamBinaan`), jadi hasil di luar
   * wilayah disaring agar tidak berujung error 404. null = tanpa filter.
   */
  wilayahId?: number | null;
};

export default function PilihWarga({
  value,
  onChange,
  error,
  id = "cariWarga",
  label = "Warga binaan",
  wilayahId = null,
}: Props) {
  const [nik, setNik] = useState("");
  const [hasil, setHasil] = useState<WargaCari[]>([]);
  const [mencari, setMencari] = useState(false);
  const [pesan, setPesan] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    const bersih = nik.replace(/\D/g, "");
    if (bersih.length < 3) {
      setHasil([]);
      setPesan("");
      setMencari(false);
      return;
    }

    setMencari(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await penggunaApi.cariNik(bersih);
        const tersaring = wilayahId
          ? (data ?? []).filter((w) => Number(w.wilayah_id) === Number(wilayahId))
          : (data ?? []);
        setHasil(tersaring);
        setPesan(tersaring.length === 0 ? "Warga dengan NIK tersebut tidak ditemukan." : "");
      } catch (err) {
        const e = err as ApiError;
        setHasil([]);
        setPesan(e.message || "Gagal mencari warga.");
      } finally {
        setMencari(false);
      }
    }, 400);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [nik, wilayahId]);

  if (value) {
    return (
      <div className="field">
        <label className="label">{label}</label>
        <div className="card card-flat" style={{ padding: 12 }}>
          <div className="row-between">
            <div>
              <strong className="text-sm">{value.name}</strong>
              <div className="tiny">
                NIK {value.nik}
                {value.wilayah ? ` · ${value.wilayah}` : ""}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                onChange(null);
                setNik("");
                setHasil([]);
                setPesan("");
              }}
            >
              Ganti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label} <span className="req">*</span>
      </label>
      <div className="input-icon">
        <Icon name="search" size={18} />
        <input
          className={"input" + (error ? " is-error" : "")}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ketik minimal 3 digit NIK…"
          value={nik}
          onChange={(e) => {
            setNik(e.target.value.replace(/\D/g, ""));
            setTerbuka(true);
          }}
          onFocus={() => setTerbuka(true)}
        />
      </div>
      {error ? <div className="err-msg show">{error}</div> : null}

      {mencari ? <div className="hint">Mencari warga…</div> : null}
      {!mencari && pesan ? <div className="hint">{pesan}</div> : null}

      {terbuka && !mencari && hasil.length > 0 ? (
        <div className="card card-flat mt-8" style={{ padding: 8 }}>
          <div style={{ display: "grid", gap: 4 }}>
            {hasil.map((w) => (
              <button
                key={w.id}
                type="button"
                className="btn btn-ghost"
                style={{ justifyContent: "flex-start", textAlign: "left" }}
                onClick={() => {
                  onChange(w);
                  setTerbuka(false);
                }}
              >
                <span>
                  <strong className="text-sm">{w.name}</strong>
                  <span className="tiny"> · NIK {w.nik}{w.wilayah ? ` · ${w.wilayah}` : ""}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="hint">
        Pencarian memakai awalan NIK. Warga yang belum punya NIK tidak muncul — minta admin melengkapinya.
      </div>
    </div>
  );
}

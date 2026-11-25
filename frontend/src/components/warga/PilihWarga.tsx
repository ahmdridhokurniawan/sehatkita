"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useUser } from "@/hooks/useUser";
import { pengguna as penggunaApi, ApiError } from "@/lib/api";
import type { WargaCari } from "@/types";

/* ------------------------------------------------------------------
   Pilih Warga — dropdown + pencarian nama atau NIK untuk petugas.
   - Kader (1 kelurahan): langsung memuat daftar warga binaan dalam dropdown
     dan bisa disaring lewat ketikan nama/NIK.
   - Super Admin (lintas kelurahan): autocomplete min. 2 huruf / 3 digit NIK.
   Sumber: GET /pengguna/cari-nik?nik=…
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
  /** Tampilkan tanda wajib (*) di label; matikan untuk pemakaian sebagai filter opsional. */
  required?: boolean;
};

export default function PilihWarga({
  value,
  onChange,
  error,
  id = "cariWarga",
  label = "Warga binaan",
  wilayahId = null,
  required = true,
}: Props) {
  const { user } = useUser();
  const modeDropdown = user?.role === "kader" || Boolean(wilayahId);
  const dropdownKey = modeDropdown ? `${user?.role ?? ""}:${wilayahId ?? "all"}` : null;

  const [nik, setNik] = useState("");
  const [daftarBinaan, setDaftarBinaan] = useState<WargaCari[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [binaanErr, setBinaanErr] = useState("");
  const [hasil, setHasil] = useState<WargaCari[]>([]);
  const [mencari, setMencari] = useState(false);
  const [pesan, setPesan] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const binaanLoaded = dropdownKey !== null && loadedKey === dropdownKey;
  const memuatBinaan = modeDropdown && !binaanLoaded;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!modeDropdown || !dropdownKey || binaanLoaded) return;
    let aktif = true;
    penggunaApi
      .cariNik("", wilayahId)
      .then((data) => {
        if (!aktif) return;
        const tersaring = wilayahId
          ? (data ?? []).filter((w) => Number(w.wilayah_id) === Number(wilayahId))
          : (data ?? []);
        setDaftarBinaan(tersaring);
        setBinaanErr("");
      })
      .catch((err) => {
        if (!aktif) return;
        const e = err as ApiError;
        setDaftarBinaan([]);
        setBinaanErr(e.message || "Gagal memuat daftar warga.");
      })
      .finally(() => {
        if (aktif) setLoadedKey(dropdownKey);
      });
    return () => {
      aktif = false;
    };
  }, [modeDropdown, dropdownKey, wilayahId, binaanLoaded]);

  useEffect(() => {
    if (modeDropdown) return;
    if (timer.current) clearTimeout(timer.current);

    const kata = nik.trim();
    const hanyaAngka = kata !== "" && /^[0-9\s-]+$/.test(kata);
    const digit = kata.replace(/\D/g, "");
    const cukup = hanyaAngka ? digit.length >= 3 : kata.length >= 2;
    if (!cukup) {
      return;
    }

    timer.current = setTimeout(async () => {
      setMencari(true);
      try {
        const data = await penggunaApi.cariNik(hanyaAngka ? digit : kata, wilayahId);
        const tersaring = wilayahId
          ? (data ?? []).filter((w) => Number(w.wilayah_id) === Number(wilayahId))
          : (data ?? []);
        setHasil(tersaring);
        setPesan(tersaring.length === 0 ? "Warga dengan nama/NIK tersebut tidak ditemukan." : "");
      } catch (err) {
        const e = err as ApiError;
        setHasil([]);
        setPesan(e.message || "Gagal mencari warga.");
      } finally {
        setMencari(false);
      }
    }, 350);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [modeDropdown, nik, wilayahId]);

  const hasilBinaan = useMemo(() => {
    if (!modeDropdown) return [];
    const q = nik.trim().toLowerCase();
    const digit = q.replace(/\D/g, "");
    if (!q) return daftarBinaan;
    return daftarBinaan.filter((w) => {
      const cocokNama = w.name.toLowerCase().includes(q);
      const nikWarga = w.nik || "";
      const cocokNik =
        digit !== "" &&
        (nikWarga.includes(digit) ||
          (digit.length > 6 &&
            nikWarga.startsWith(digit.slice(0, 6)) &&
            (digit.length < 13 || nikWarga.endsWith(digit.slice(-4)))));
      return cocokNama || cocokNik;
    });
  }, [modeDropdown, daftarBinaan, nik]);

  const daftarTampil = modeDropdown ? hasilBinaan : hasil;
  const sedangMemuat = modeDropdown ? memuatBinaan : mencari;
  const pesanTampil = modeDropdown
    ? binaanErr || (!memuatBinaan && terbuka && daftarTampil.length === 0 ? "Warga binaan tidak ditemukan." : "")
    : !mencari
      ? pesan
      : "";

  if (value) {
    return (
      <div className="field">
        <label className="label" style={{ marginBottom: 8, display: "block" }}>{label}</label>
        <div className="card card-flat" style={{ padding: "12px 14px", marginTop: 4 }}>
          <div className="row-between">
            <div>
              <strong className="text-sm">
                {value.nik ? `${value.nik} — ${value.name}` : value.name}
              </strong>
              <div className="tiny" style={{ marginTop: 2 }}>
                {value.nik ? `NIK: ${value.nik}` : "NIK belum terdaftar"}
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
                setTerbuka(modeDropdown);
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
    <div className="field" ref={containerRef}>
      <label className="label" htmlFor={id}>
        {label} {required ? <span className="req">*</span> : null}
      </label>
      <div className="input-icon" style={{ position: "relative" }}>
        <Icon name="search" size={18} />
        <input
          className={"input" + (error ? " is-error" : "")}
          id={id}
          type="text"
          autoComplete="off"
          style={modeDropdown ? { paddingRight: 38 } : undefined}
          placeholder={
            modeDropdown
              ? "Pilih dari daftar atau ketik nama / NIK…"
              : "Ketik min. 2 huruf nama atau 3 digit NIK…"
          }
          value={nik}
          onChange={(e) => {
            const next = e.target.value;
            setNik(next);
            setTerbuka(true);
            if (!modeDropdown) {
              const trimmed = next.trim();
              const angkaSaja = trimmed !== "" && /^[0-9\s-]+$/.test(trimmed);
              const cukup = angkaSaja ? trimmed.replace(/\D/g, "").length >= 3 : trimmed.length >= 2;
              if (!cukup) {
                setHasil([]);
                setPesan("");
                setMencari(false);
              }
            }
          }}
          onFocus={() => setTerbuka(true)}
        />
        {modeDropdown ? (
          <button
            type="button"
            aria-label={terbuka ? "Tutup daftar warga" : "Buka daftar warga"}
            onClick={() => setTerbuka((v) => !v)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "var(--text-2)",
              cursor: "pointer",
              padding: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={terbuka ? "chevron-up" : "chevron-down"} size={18} />
          </button>
        ) : null}
      </div>
      {error ? <div className="err-msg show">{error}</div> : null}

      {sedangMemuat ? (
        <div className="hint">{modeDropdown ? "Memuat daftar warga…" : "Mencari warga…"}</div>
      ) : null}
      {!sedangMemuat && pesanTampil ? <div className="hint">{pesanTampil}</div> : null}

      {terbuka && !sedangMemuat && daftarTampil.length > 0 ? (
        <div
          className="card card-flat mt-8"
          style={{ padding: 6, maxHeight: 230, overflowY: "auto" }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            {daftarTampil.map((w) => (
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
                  <strong className="text-sm">
                    {w.nik ? `${w.nik} — ${w.name}` : w.name}
                  </strong>
                  <span className="tiny">
                    {w.wilayah ? ` · ${w.wilayah}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="hint">
        {modeDropdown
          ? "Klik kolom di atas untuk memilih langsung dari daftar warga, atau ketik nama / awalan NIK."
          : "Bisa mencari lewat nama warga (min. 2 huruf) atau awalan NIK (min. 3 digit)."}
      </div>
    </div>
  );
}

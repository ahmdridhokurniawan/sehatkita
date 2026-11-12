"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";

type Kategori = {
  label: string;
  tone: "safe" | "warning" | "danger";
  pesan: string;
  saran: string;
};

function hitungKategori(imt: number): Kategori {
  if (imt < 18.5) {
    return {
      label: "Kurus (Kurang)",
      tone: "warning",
      pesan: "Berat badan Anda di bawah batas normal.",
      saran: "Tingkatkan asupan kalori bernutrisi seimbang dan perbanyak sumber protein sehat.",
    };
  }
  if (imt < 23) {
    return {
      label: "Normal (Ideal)",
      tone: "safe",
      pesan: "Selamat! Berat badan Anda berada pada kisaran ideal.",
      saran: "Pertahankan pola makan bergizi seimbang dan luangkan waktu olahraga rutin 30 menit sehari.",
    };
  }
  if (imt < 25) {
    return {
      label: "Kelebihan Berat Badan",
      tone: "warning",
      pesan: "Berat badan sedikit melebihi batas normal.",
      saran: "Batasi konsumsi gula, garam, dan makanan berlemak tinggi. Tingkatkan intensitas aktivitas fisik.",
    };
  }
  return {
    label: "Obesitas",
    tone: "danger",
    pesan: "Berat badan Anda berada dalam kategori obesitas berisiko.",
    saran: "Disarankan untuk berkonsultasi dengan petugas kesehatan/Posbindu dan mengatur pola makan terukur.",
  };
}

export default function KalkulatorBMI() {
  const [tinggi, setTinggi] = useState("");
  const [berat, setBerat] = useState("");
  const [hasil, setHasil] = useState<{
    imt: number;
    kategori: Kategori;
    beratMin: number;
    beratMax: number;
    selisih: number;
  } | null>(null);

  function hitung() {
    const t = parseFloat(tinggi);
    const b = parseFloat(berat);
    if (!t || !b || t <= 0 || b <= 0) return;

    const meter = t / 100;
    const imt = b / (meter * meter);
    const kategori = hitungKategori(imt);

    // Rentang berat badan normal (standar Kemenkes RI/Asia Pasifik: IMT 18.5 - 22.9)
    const beratMin = parseFloat((18.5 * meter * meter).toFixed(1));
    const beratMax = parseFloat((22.9 * meter * meter).toFixed(1));

    let selisih = 0;
    if (b < beratMin) {
      selisih = parseFloat((beratMin - b).toFixed(1));
    } else if (b > beratMax) {
      selisih = parseFloat((b - beratMax).toFixed(1));
    }

    setHasil({
      imt: parseFloat(imt.toFixed(1)),
      kategori,
      beratMin,
      beratMax,
      selisih,
    });
  }

  function reset() {
    setTinggi("");
    setBerat("");
    setHasil(null);
  }

  // Hitung persentase posisi jarum gauge (rentang 14 - 35)
  const posisiPersen = hasil
    ? Math.min(Math.max(((hasil.imt - 14) / (32 - 14)) * 100, 3), 97)
    : 0;

  return (
    <div className="card mt-12" style={{ position: "relative", overflow: "hidden" }}>
      {/* Header Kalkulator */}
      <div className="row-between mb-16" style={{ alignItems: "flex-start", gap: 12 }}>
        <div className="row gap-12 items-center">
          <div
            className="stat-ico"
            style={{
              width: 42,
              height: 42,
              borderRadius: "var(--radius)",
              background: "var(--primary-050)",
              color: "var(--primary)",
            }}
          >
            <Icon name="scale" size={22} />
          </div>
          <div>
            <strong className="text-sm" style={{ fontSize: "1rem", display: "block" }}>
              Kalkulator IMT
            </strong>
            <p className="tiny" style={{ marginTop: 2 }}>
              Hitung Indeks Massa Tubuh & rekomendasi berat ideal Anda
            </p>
          </div>
        </div>
        {hasil && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={reset}
            title="Hitung ulang"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="refresh" size={14} /> Reset
          </button>
        )}
      </div>

      {/* Form Input - Grid Seimbang & Rata */}
      <div className="grid grid-2" style={{ gap: 14 }}>
        <div className="field">
          <label className="label" htmlFor="bmi-tinggi">
            <span>Tinggi Badan</span>
            <span className="opt">(cm)</span>
          </label>
          <div className="input-group">
            <input
              id="bmi-tinggi"
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="Contoh: 165"
              value={tinggi}
              onChange={(e) => setTinggi(e.target.value)}
            />
            <span className="suffix">cm</span>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="bmi-berat">
            <span>Berat Badan</span>
            <span className="opt">(kg)</span>
          </label>
          <div className="input-group">
            <input
              id="bmi-berat"
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="Contoh: 58"
              value={berat}
              onChange={(e) => setBerat(e.target.value)}
            />
            <span className="suffix">kg</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block mt-16"
        onClick={hitung}
        disabled={!tinggi || !berat}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Icon name="sparkles" size={17} /> Hitung IMT & Berat Ideal
      </button>

      {/* Hasil Kalkulasi Interaktif */}
      {hasil && (
        <div
          className="mt-20 fade-up"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 18,
          }}
        >
          {/* Skor & Status */}
          <div className="row-between items-center" style={{ gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="row gap-8 items-center">
                <Badge tone={hasil.kategori.tone}>{hasil.kategori.label}</Badge>
                <span className="tiny" style={{ fontWeight: 600 }}>Standar Kemenkes RI</span>
              </div>
              <p className="text-sm mt-4 fw-600">{hasil.kategori.pesan}</p>
            </div>
            <div className="center" style={{ marginLeft: "auto" }}>
              <div
                className="score"
                style={{
                  fontSize: "2.4rem",
                  fontWeight: 800,
                  lineHeight: 1,
                  color:
                    hasil.kategori.tone === "safe"
                      ? "var(--safe)"
                      : hasil.kategori.tone === "danger"
                      ? "var(--danger)"
                      : "var(--warning)",
                }}
              >
                {hasil.imt}
              </div>
              <span className="tiny" style={{ fontSize: ".7rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                kg / m²
              </span>
            </div>
          </div>

          {/* Visual Gauge Bar */}
          <div className="mt-16">
            <div
              style={{
                display: "flex",
                height: 10,
                borderRadius: 999,
                overflow: "hidden",
                position: "relative",
                background: "var(--surface-3)",
              }}
            >
              <div style={{ flex: "18.5", background: "var(--warning)" }} title="Kurus (< 18.5)" />
              <div style={{ flex: "4.4", background: "var(--safe)" }} title="Normal (18.5 - 22.9)" />
              <div style={{ flex: "2.0", background: "var(--accent)" }} title="Berlebih (23 - 24.9)" />
              <div style={{ flex: "7.1", background: "var(--danger)" }} title="Obesitas (>= 25)" />
            </div>

            {/* Indikator Jarum */}
            <div style={{ position: "relative", height: 16, marginTop: 4 }}>
              <div
                style={{
                  position: "absolute",
                  left: `${posisiPersen}%`,
                  transform: "translateX(-50%)",
                  transition: "left .4s var(--ease)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderBottom: "6px solid var(--text)",
                  }}
                />
                <span className="tiny" style={{ fontWeight: 700, fontSize: "0.7rem", marginTop: 1 }}>
                  {hasil.imt}
                </span>
              </div>
            </div>

            {/* Label Skala */}
            <div className="row-between tiny mt-4" style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>
              <span>&lt;18.5 Kurus</span>
              <span>18.5–22.9 Ideal</span>
              <span>23–24.9 Berlebih</span>
              <span>≥25 Obesitas</span>
            </div>
          </div>

          {/* Rekomendasi Berat Badan Ideal */}
          <div
            className="mt-16"
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="row gap-8 items-start">
              <span className="text-primary" style={{ marginTop: 2 }}>
                <Icon name="target" size={17} />
              </span>
              <div className="flex-1">
                <strong className="text-sm">Rekomendasi Berat Ideal:</strong>
                <p className="tiny mt-4" style={{ color: "var(--text)" }}>
                  Untuk tinggi <b>{tinggi} cm</b>, rentang berat ideal Anda adalah{" "}
                  <b className="text-primary">{hasil.beratMin} – {hasil.beratMax} kg</b>.
                </p>
                {hasil.selisih > 0 ? (
                  <p className="tiny mt-2" style={{ color: "var(--text-2)" }}>
                    {parseFloat(berat) > hasil.beratMax ? (
                      <>Disarankan menurunkan sekitar <b>{hasil.selisih} kg</b> untuk mencapai batas normal.</>
                    ) : (
                      <>Disarankan menaikkan sekitar <b>{hasil.selisih} kg</b> untuk mencapai batas normal.</>
                    )}
                  </p>
                ) : (
                  <p className="tiny mt-2 text-safe">
                    Berat badan Anda sudah berada dalam rentang ideal Kemenkes RI!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Saran Kesehatan */}
          <div className="row gap-8 mt-12 items-start">
            <span style={{ color: "var(--text-3)", marginTop: 2 }}>
              <Icon name="info" size={15} />
            </span>
            <p className="tiny" style={{ color: "var(--text-2)", lineHeight: 1.5 }}>
              {hasil.kategori.saran}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

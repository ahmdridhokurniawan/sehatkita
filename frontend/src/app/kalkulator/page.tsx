"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";

type TabKalkulator = "imt" | "kalori" | "air" | "jantung" | "klinis";

const TAB_LIST: { id: TabKalkulator; label: string; icon: string; tone: string }[] = [
  { id: "imt", label: "IMT & BB Ideal", icon: "scale", tone: "var(--primary)" },
  { id: "kalori", label: "Kalori (BMR/TDEE)", icon: "flame", tone: "var(--accent)" },
  { id: "air", label: "Air Harian", icon: "droplet", tone: "var(--info)" },
  { id: "jantung", label: "Detak Jantung & Kardio", icon: "activity", tone: "var(--danger)" },
  { id: "klinis", label: "Tensi & Gula", icon: "heart-pulse", tone: "var(--warning)" },
];

export default function KalkulatorPage() {
  const [tab, setTab] = useState<TabKalkulator>("imt");

  // Input bersama & spesifik (terisi contoh siap coba)
  const [jk, setJk] = useState<"L" | "P">("L");
  const [usia, setUsia] = useState("28");
  const [berat, setBerat] = useState("65");
  const [tinggi, setTinggi] = useState("168");
  const [aktivitas, setAktivitas] = useState("1.55");
  const [menitOlahraga, setMenitOlahraga] = useState("30");

  // Tensi & Gula
  const [sistol, setSistol] = useState("118");
  const [diastol, setDiastol] = useState("76");
  const [gula, setGula] = useState("94");
  const [jenisGula, setJenisGula] = useState<"puasa" | "2jam_pp">("puasa");

  function pakaiContoh(preset: "ideal" | "turun_bb" | "pantau_tensi") {
    if (preset === "ideal") {
      setJk("P");
      setUsia("25");
      setBerat("54");
      setTinggi("160");
      setAktivitas("1.375");
      setMenitOlahraga("30");
      setSistol("115");
      setDiastol("75");
      setGula("90");
      setJenisGula("puasa");
    } else if (preset === "turun_bb") {
      setJk("L");
      setUsia("34");
      setBerat("82");
      setTinggi("168");
      setAktivitas("1.2");
      setMenitOlahraga("20");
      setSistol("128");
      setDiastol("82");
      setGula("112");
      setJenisGula("puasa");
    } else {
      setJk("L");
      setUsia("48");
      setBerat("74");
      setTinggi("165");
      setAktivitas("1.375");
      setMenitOlahraga("15");
      setSistol("144");
      setDiastol("92");
      setGula("168");
      setJenisGula("2jam_pp");
    }
  }

  const hasilImt = useMemo(() => {
    const bb = parseFloat(berat);
    const tbCm = parseFloat(tinggi);
    if (!bb || !tbCm || bb <= 0 || tbCm < 50) return null;
    const tbM = tbCm / 100;
    const imt = bb / (tbM * tbM);

    let kategori = "Normal (Ideal)";
    let tone: "safe" | "warning" | "danger" | "info" = "safe";
    let saran = "Berat badan Anda berada pada rentang seimbang. Pertahankan pola makan bergizi dan aktivitas rutin.";
    if (imt < 18.5) {
      kategori = "Kurus (Kekurangan Berat)";
      tone = "info";
      saran = "Tingkatkan asupan energi sehat dan protein berkualitas untuk mencapai rentang berat ideal.";
    } else if (imt > 27) {
      kategori = "Obesitas";
      tone = "danger";
      saran = "Disarankan mengatur defisit kalori bertahap, kurangi gula/gorengan, dan konsultasi kader/Puskesmas.";
    } else if (imt > 25) {
      kategori = "Gemuk (Kelebihan Berat)";
      tone = "warning";
      saran = "Tambah jalan cepat 150 menit/minggu dan perhatikan porsi karbohidrat sederhana.";
    }

    const minSehat = 18.5 * tbM * tbM;
    const maxSehat = 25.0 * tbM * tbM;
    const faktorBroca = jk === "L" ? 0.1 : 0.15;
    const bbIdealBroca = (tbCm - 100) - (tbCm - 100) * faktorBroca;

    return {
      imt: imt.toFixed(1),
      kategori,
      tone,
      saran,
      minSehat: minSehat.toFixed(1),
      maxSehat: maxSehat.toFixed(1),
      bbIdealBroca: Math.max(30, bbIdealBroca).toFixed(1),
    };
  }, [berat, tinggi, jk]);

  const hasilKalori = useMemo(() => {
    const bb = parseFloat(berat);
    const tb = parseFloat(tinggi);
    const u = parseFloat(usia);
    const pal = parseFloat(aktivitas);
    if (!bb || !tb || !u || !pal || bb <= 0 || tb < 50 || u <= 0) return null;

    // Rumus Mifflin-St Jeor
    const bmr = 10 * bb + 6.25 * tb - 5 * u + (jk === "L" ? 5 : -161);
    const tdee = bmr * pal;
    const proteinMin = Math.round(bb * 0.8);
    const proteinIdeal = Math.round(bb * 1.2);

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      defisit: Math.max(1200, Math.round(tdee - 400)),
      surplus: Math.round(tdee + 350),
      proteinMin,
      proteinIdeal,
    };
  }, [berat, tinggi, usia, aktivitas, jk]);

  const hasilAir = useMemo(() => {
    const bb = parseFloat(berat);
    const mnt = Math.max(0, parseFloat(menitOlahraga) || 0);
    if (!bb || bb <= 0) return null;
    const minDasar = Math.round(bb * 30);
    const dasar = Math.round(bb * 35);
    const tambahanAktivitas = Math.round((mnt / 30) * 350);
    const totalMl = Math.round(dasar + tambahanAktivitas);
    const liter = (totalMl / 1000).toFixed(2);
    const gelas = Math.round(totalMl / 250);
    return { totalMl, minDasar, dasar, tambahanAktivitas, liter, gelas };
  }, [berat, menitOlahraga]);

  const hasilJantung = useMemo(() => {
    const u = parseFloat(usia);
    if (!u || u < 10 || u > 110) return null;
    const hrMax = Math.round(220 - u);
    const zona = [
      {
        nama: "Zona Pemanasan (50%–60%)",
        min: Math.round(hrMax * 0.5),
        max: Math.round(hrMax * 0.6),
        manfaat: "Pemulihan aktif, jalan santai, meningkatkan aliran darah.",
      },
      {
        nama: "Zona Bakar Lemak (60%–70%)",
        min: Math.round(hrMax * 0.6),
        max: Math.round(hrMax * 0.7),
        manfaat: "Optimal pembakaran lemak & daya tahan harian (jalan cepat/bersepeda santai).",
      },
      {
        nama: "Zona Kardio / Aerobik (70%–85%)",
        min: Math.round(hrMax * 0.7),
        max: Math.round(hrMax * 0.85),
        manfaat: "Memperkuat jantung, paru-paru, dan stamina tubuh (joging/senam ritmik).",
      },
      {
        nama: "Zona Puncak (85%–95%)",
        min: Math.round(hrMax * 0.85),
        max: Math.round(hrMax * 0.95),
        manfaat: "Latihan interval intensitas tinggi (singkat, bagi yang terlatih).",
      },
    ];
    return {
      usia: u,
      hrMax,
      targetMin: Math.round(hrMax * 0.6),
      targetMax: Math.round(hrMax * 0.85),
      zona,
    };
  }, [usia]);

  const hasilKlinis = useMemo(() => {
    const s = parseFloat(sistol);
    const d = parseFloat(diastol);
    const g = parseFloat(gula);

    let tensiInfo: { map: string; kategori: string; tone: "safe" | "warning" | "danger" } | null = null;
    if (s > 0 && d > 0) {
      const map = (s + 2 * d) / 3;
      let kategori = "Normal";
      let tone: "safe" | "warning" | "danger" = "safe";
      if (s >= 140 || d >= 90) {
        kategori = "Hipertensi / Tinggi";
        tone = "danger";
      } else if (s >= 120 || d >= 80) {
        kategori = "Prahipertensi / Waspada";
        tone = "warning";
      }
      tensiInfo = { map: map.toFixed(0), kategori, tone };
    }

    let gulaInfo: { nilai: number; kategori: string; tone: "safe" | "warning" | "danger"; batas: string } | null = null;
    if (g > 0) {
      if (jenisGula === "puasa") {
        let kategori = "Normal (< 100 mg/dL)";
        let tone: "safe" | "warning" | "danger" = "safe";
        if (g >= 126) {
          kategori = "Tinggi (≥ 126 mg/dL)";
          tone = "danger";
        } else if (g >= 100) {
          kategori = "Waspada / Pradiabetes (100–125 mg/dL)";
          tone = "warning";
        }
        gulaInfo = { nilai: g, kategori, tone, batas: "Puasa (minimal 8 jam tidak makan)" };
      } else {
        let kategori = "Normal (< 140 mg/dL)";
        let tone: "safe" | "warning" | "danger" = "safe";
        if (g >= 200) {
          kategori = "Tinggi (≥ 200 mg/dL)";
          tone = "danger";
        } else if (g >= 140) {
          kategori = "Waspada (140–199 mg/dL)";
          tone = "warning";
        }
        gulaInfo = { nilai: g, kategori, tone, batas: "2 Jam Setelah Makan (2JPP)" };
      }
    }

    return { tensiInfo, gulaInfo };
  }, [sistol, diastol, gula, jenisGula]);

  return (
    <AppShell noFab>
      <div className="row-between wrap gap-12 mb-12">
        <div>
          <h1 className="h2">Kalkulator Kesehatan</h1>
          <p className="tiny mt-4">
            Simulasi dan contoh perhitungan praktis untuk membantu memantau target kesehatan harian Anda.
          </p>
        </div>
        <div className="row wrap gap-6">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => pakaiContoh("ideal")}>
            Contoh Normal
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => pakaiContoh("turun_bb")}>
            Contoh Diet
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => pakaiContoh("pantau_tensi")}>
            Contoh Waspada
          </button>
        </div>
      </div>

      {/* Pilihan Jenis Kalkulator */}
      <div className="tabs mb-16" role="tablist" aria-label="Pilih kalkulator kesehatan">
        {TAB_LIST.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tab ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={15} /> {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-2" style={{ gap: 16, alignItems: "start" }}>
        {/* PANEL INPUT */}
        <section className="card">
          <div className="row gap-10 mb-12">
            <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
              <Icon name={TAB_LIST.find((t) => t.id === tab)?.icon || "calculator"} size={18} />
            </span>
            <div>
              <h2 className="h4">Parameter Perhitungan</h2>
              <p className="tiny">Ubah angka di bawah ini — hasil langsung terhitung otomatis.</p>
            </div>
          </div>

          {(tab === "imt" || tab === "kalori") && (
            <div className="field">
              <span className="label">Jenis Kelamin</span>
              <div className="segment">
                <button
                  type="button"
                  className={jk === "L" ? "active" : ""}
                  onClick={() => setJk("L")}
                >
                  Laki-laki
                </button>
                <button
                  type="button"
                  className={jk === "P" ? "active" : ""}
                  onClick={() => setJk("P")}
                >
                  Perempuan
                </button>
              </div>
            </div>
          )}

          {tab !== "klinis" && tab !== "jantung" && (
            <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
              <div className="field">
                <label className="label" htmlFor="kalk-bb">
                  Berat Badan (kg)
                </label>
                <div className="input-group">
                  <input
                    id="kalk-bb"
                    type="number"
                    min={20}
                    max={300}
                    step="0.5"
                    className="input"
                    value={berat}
                    onChange={(e) => setBerat(e.target.value)}
                  />
                  <span className="suffix">kg</span>
                </div>
              </div>

              {tab !== "air" ? (
                <div className="field">
                  <label className="label" htmlFor="kalk-tb">
                    Tinggi Badan (cm)
                  </label>
                  <div className="input-group">
                    <input
                      id="kalk-tb"
                      type="number"
                      min={100}
                      max={230}
                      step="1"
                      className="input"
                      value={tinggi}
                      onChange={(e) => setTinggi(e.target.value)}
                    />
                    <span className="suffix">cm</span>
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label className="label" htmlFor="kalk-olahraga">
                    Olahraga / Hari (menit)
                  </label>
                  <div className="input-group">
                    <input
                      id="kalk-olahraga"
                      type="number"
                      min={0}
                      max={300}
                      step="5"
                      className="input"
                      value={menitOlahraga}
                      onChange={(e) => setMenitOlahraga(e.target.value)}
                    />
                    <span className="suffix">mnt</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "jantung" && (
            <div className="field mt-12">
              <label className="label" htmlFor="kalk-usia-jantung">
                Usia Saat Ini (tahun)
              </label>
              <div className="input-group">
                <input
                  id="kalk-usia-jantung"
                  type="number"
                  min={10}
                  max={110}
                  className="input"
                  value={usia}
                  onChange={(e) => setUsia(e.target.value)}
                />
                <span className="suffix">thn</span>
              </div>
              <p className="hint">Digunakan untuk menghitung Detak Jantung Maksimal (220 − usia) dan zona latihan kardio.</p>
            </div>
          )}

          {tab === "kalori" && (
            <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
              <div className="field">
                <label className="label" htmlFor="kalk-usia">
                  Usia (tahun)
                </label>
                <div className="input-group">
                  <input
                    id="kalk-usia"
                    type="number"
                    min={10}
                    max={110}
                    className="input"
                    value={usia}
                    onChange={(e) => setUsia(e.target.value)}
                  />
                  <span className="suffix">thn</span>
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="kalk-aktivitas">
                  Tingkat Aktivitas
                </label>
                <select
                  id="kalk-aktivitas"
                  className="select"
                  value={aktivitas}
                  onChange={(e) => setAktivitas(e.target.value)}
                >
                  <option value="1.2">Santai / Minim Olahraga (1.2×)</option>
                  <option value="1.375">Ringan 1–3×/minggu (1.375×)</option>
                  <option value="1.55">Sedang 3–5×/minggu (1.55×)</option>
                  <option value="1.725">Berat 6–7×/minggu (1.725×)</option>
                </select>
              </div>
            </div>
          )}

          {tab === "klinis" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field">
                  <label className="label" htmlFor="kalk-sistol">
                    Tekanan Sistol
                  </label>
                  <div className="input-group">
                    <input
                      id="kalk-sistol"
                      type="number"
                      min={60}
                      max={280}
                      className="input"
                      value={sistol}
                      onChange={(e) => setSistol(e.target.value)}
                    />
                    <span className="suffix">mmHg</span>
                  </div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="kalk-diastol">
                    Tekanan Diastol
                  </label>
                  <div className="input-group">
                    <input
                      id="kalk-diastol"
                      type="number"
                      min={40}
                      max={180}
                      className="input"
                      value={diastol}
                      onChange={(e) => setDiastol(e.target.value)}
                    />
                    <span className="suffix">mmHg</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field">
                  <label className="label" htmlFor="kalk-gula">
                    Gula Darah
                  </label>
                  <div className="input-group">
                    <input
                      id="kalk-gula"
                      type="number"
                      min={30}
                      max={800}
                      className="input"
                      value={gula}
                      onChange={(e) => setGula(e.target.value)}
                    />
                    <span className="suffix">mg/dL</span>
                  </div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="kalk-jenis-gula">
                    Waktu Pengukuran Gula
                  </label>
                  <select
                    id="kalk-jenis-gula"
                    className="select"
                    value={jenisGula}
                    onChange={(e) => setJenisGula(e.target.value as "puasa" | "2jam_pp")}
                  >
                    <option value="puasa">Puasa (8 jam)</option>
                    <option value="2jam_pp">2 Jam Setelah Makan</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* PANEL HASIL */}
        <section className="card">
          {tab === "imt" && (
            <>
              <div className="row-between mb-12">
                <h2 className="h4">Hasil Indeks Massa Tubuh</h2>
                {hasilImt ? <Badge tone={hasilImt.tone}>{hasilImt.kategori}</Badge> : null}
              </div>
              {hasilImt ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <div className="metric">
                      <span className="metric-name">Skor IMT Anda</span>
                      <span className="metric-val">{hasilImt.imt}</span>
                      <span className="tiny">kg/m² (Rumus BB ÷ TB²)</span>
                    </div>
                    <div className="metric">
                      <span className="metric-name">BB Ideal (Broca)</span>
                      <span className="metric-val">{hasilImt.bbIdealBroca} kg</span>
                      <span className="tiny">
                        Rentang sehat: {hasilImt.minSehat}–{hasilImt.maxSehat} kg
                      </span>
                    </div>
                  </div>
                  <div className="alert alert-info">
                    <Icon name="info" size={18} />
                    <div className="tiny">
                      {hasilImt.saran}{" "}
                      {hasilKalori ? (
                        <>
                          Rekomendasi target kalori Kemenkes sekitar{" "}
                          <strong>{Math.round(Number(hasilImt.bbIdealBroca) * 30)} kkal/hari</strong> (atau{" "}
                          <strong>{hasilKalori.tdee} kkal</strong> sesuai tingkat aktivitas Anda).
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="tiny">Masukkan berat dan tinggi badan yang valid untuk menghitung IMT.</p>
              )}
            </>
          )}

          {tab === "kalori" && (
            <>
              <div className="row-between mb-12">
                <h2 className="h4">Kebutuhan Kalori &amp; Protein</h2>
                <Badge tone="primary">Mifflin-St Jeor</Badge>
              </div>
              {hasilKalori ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <div className="metric">
                      <span className="metric-name">Kalori Harian (TDEE)</span>
                      <span className="metric-val">{hasilKalori.tdee} kkal</span>
                      <span className="tiny">BMR istirahat: {hasilKalori.bmr} kkal</span>
                    </div>
                    <div className="metric">
                      <span className="metric-name">Kebutuhan Protein</span>
                      <span className="metric-val">
                        {hasilKalori.proteinMin}–{hasilKalori.proteinIdeal} g
                      </span>
                      <span className="tiny">Per hari menjaga massa otot</span>
                    </div>
                  </div>
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <div className="card card-flat" style={{ padding: 12 }}>
                      <div className="tiny">Target Turun Berat</div>
                      <strong className="text-sm text-primary">{hasilKalori.defisit} kkal/hari</strong>
                    </div>
                    <div className="card card-flat" style={{ padding: 12 }}>
                      <div className="tiny">Target Naik Massa</div>
                      <strong className="text-sm text-warning">{hasilKalori.surplus} kkal/hari</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="tiny">Lengkapi berat, tinggi, dan usia untuk menghitung kebutuhan kalori.</p>
              )}
            </>
          )}

          {tab === "air" && (
            <>
              <div className="row-between mb-12">
                <h2 className="h4">Target Asupan Cairan Harian</h2>
                <Badge tone="info">Hidrasi</Badge>
              </div>
              {hasilAir ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <div className="metric">
                      <span className="metric-name">Kebutuhan Air Total</span>
                      <span className="metric-val">{hasilAir.liter} L</span>
                      <span className="tiny">{hasilAir.totalMl} mL per hari</span>
                    </div>
                    <div className="metric">
                      <span className="metric-name">Setara Gelas (250 mL)</span>
                      <span className="metric-val">{hasilAir.gelas} gelas</span>
                      <span className="tiny">
                        Dasar 30–35 mL/kg: {hasilAir.minDasar}–{hasilAir.dasar} mL + aktivitas {hasilAir.tambahanAktivitas} mL
                      </span>
                    </div>
                  </div>
                  <div className="alert alert-safe">
                    <Icon name="droplet" size={18} />
                    <div className="tiny">
                      Rumus: <strong>30–35 mL × BB (kg)</strong> + <strong>350 mL</strong> tiap 30 menit olahraga.
                    </div>
                  </div>
                </div>
              ) : (
                <p className="tiny">Masukkan berat badan yang valid.</p>
              )}
            </>
          )}

          {tab === "jantung" && (
            <>
              <div className="row-between mb-12">
                <h2 className="h4">Detak Jantung Maksimal &amp; Target Kardio</h2>
                <Badge tone="danger">Rumus 220 − Usia</Badge>
              </div>
              {hasilJantung ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <div className="metric">
                      <span className="metric-name">Detak Maksimal (HR Max)</span>
                      <span className="metric-val">{hasilJantung.hrMax} dpm</span>
                      <span className="tiny">Denyut per menit untuk usia {hasilJantung.usia} thn</span>
                    </div>
                    <div className="metric">
                      <span className="metric-name">Target Latihan Optimal</span>
                      <span className="metric-val">
                        {hasilJantung.targetMin}–{hasilJantung.targetMax} dpm
                      </span>
                      <span className="tiny">Rentang aman 60%–85% HR Max</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {hasilJantung.zona.map((z) => (
                      <div key={z.nama} className="card card-flat" style={{ padding: "10px 12px" }}>
                        <div className="row-between">
                          <strong className="text-xs">{z.nama}</strong>
                          <strong className="text-xs text-primary">
                            {z.min}–{z.max} dpm
                          </strong>
                        </div>
                        <p className="tiny mt-4">{z.manfaat}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="tiny">Masukkan usia antara 10 hingga 110 tahun untuk menghitung zona detak jantung.</p>
              )}
            </>
          )}

          {tab === "klinis" && (
            <>
              <div className="row-between mb-12">
                <h2 className="h4">Evaluasi Tensi &amp; Gula Darah</h2>
                <Badge tone="warning">Skrining Mandiri</Badge>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {hasilKlinis.tensiInfo ? (
                  <div className="card card-flat" style={{ padding: 12 }}>
                    <div className="row-between">
                      <strong className="text-sm">Tekanan Darah &amp; MAP</strong>
                      <Badge tone={hasilKlinis.tensiInfo.tone}>{hasilKlinis.tensiInfo.kategori}</Badge>
                    </div>
                    <p className="tiny mt-6">
                      MAP (Mean Arterial Pressure): <strong>{hasilKlinis.tensiInfo.map} mmHg</strong> (rentang ideal
                      70–100 mmHg).
                    </p>
                  </div>
                ) : null}

                {hasilKlinis.gulaInfo ? (
                  <div className="card card-flat" style={{ padding: 12 }}>
                    <div className="row-between">
                      <strong className="text-sm">Gula Darah ({hasilKlinis.gulaInfo.nilai} mg/dL)</strong>
                      <Badge tone={hasilKlinis.gulaInfo.tone}>{hasilKlinis.gulaInfo.kategori}</Badge>
                    </div>
                    <p className="tiny mt-6">Jenis ukur: {hasilKlinis.gulaInfo.batas}.</p>
                  </div>
                ) : null}

                {!hasilKlinis.tensiInfo && !hasilKlinis.gulaInfo ? (
                  <p className="tiny">Isi angka sistol/diastol atau gula darah untuk melihat interpretasi.</p>
                ) : null}
              </div>
            </>
          )}

          <div className="divider" />
          <div className="row-between wrap gap-8">
            <span className="tiny text-2">Bukan diagnosis medis. Simpan progres Anda di aplikasi:</span>
            <div className="row gap-8 wrap">
              <Link href="/target-kesehatan" className="btn btn-sm btn-outline">
                <Icon name="target" size={14} /> Atur Target
              </Link>
              <Link href="/rekam-medis" className="btn btn-sm btn-primary">
                <Icon name="clipboard" size={14} /> Rekam Medis
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

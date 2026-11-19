"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import PublicHeader from "@/components/landing/PublicHeader";
import PublicFooter from "@/components/landing/PublicFooter";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { useUser } from "@/hooks/useUser";

type TabKalkulator = "imt" | "kalori" | "air" | "jantung" | "klinis";

const TAB_LIST: { id: TabKalkulator; label: string; icon: string; tone: string }[] = [
  { id: "imt", label: "IMT & BB Ideal", icon: "scale", tone: "var(--primary)" },
  { id: "kalori", label: "Kalori (BMR/TDEE)", icon: "flame", tone: "var(--accent)" },
  { id: "air", label: "Air Harian", icon: "droplet", tone: "var(--info)" },
  { id: "jantung", label: "Detak Jantung & Kardio", icon: "activity", tone: "var(--danger)" },
  { id: "klinis", label: "Tensi & Gula", icon: "heart-pulse", tone: "var(--warning)" },
];

type PenjelasanTab = {
  judul: string;
  butir: { istilah: string; arti: string }[];
  catatan?: string;
};

const TAB_PENJELASAN: Record<TabKalkulator, PenjelasanTab> = {
  imt: {
    judul: "Penjelasan Istilah (IMT & BB Ideal)",
    butir: [
      {
        istilah: "IMT (Indeks Massa Tubuh)",
        arti: "Angka perbandingan berat badan dan tinggi badan (BB kg / TB m²) untuk mengetahui status gizi dewasa: kurus, normal, gemuk, atau obesitas.",
      },
      {
        istilah: "BB Ideal (Rumus Broca)",
        arti: "Perkiraan satu titik berat badan ideal berdasarkan tinggi badan. Rentang sehat di bawahnya adalah batas aman agar IMT tetap normal (18,5–25,0).",
      },
    ],
    catatan: "Acuan Permenkes RI No. 41 Tahun 2014: Kurus (< 18,5) · Normal (18,5–25,0) · Gemuk (> 25,0–27,0) · Obesitas (> 27,0).",
  },
  kalori: {
    judul: "Penjelasan Istilah (Kalori, BMR & TDEE)",
    butir: [
      {
        istilah: "BMR (Basal Metabolic Rate)",
        arti: "Energi minimum (kkal) yang tetap dibakar tubuh saat istirahat total/tidur untuk menjaga organ vital bekerja.",
      },
      {
        istilah: "TDEE (Total Daily Energy Expenditure)",
        arti: "Total kebutuhan kalori harian termasuk seluruh aktivitas fisik Anda, dihitung dengan rumus medis Mifflin-St Jeor (1990).",
      },
      {
        istilah: "Target Turun vs Naik Berat",
        arti: "Makan sedikit di bawah TDEE (defisit) membantu menurunkan berat; makan di atas TDEE (surplus) membantu menaikkan massa tubuh.",
      },
    ],
    catatan: "Acuan: Jurnal Am. J. Clin. Nutr. (Mifflin & St Jeor, 1990) & Permenkes RI No. 28 Tahun 2019 (Angka Kecukupan Gizi).",
  },
  air: {
    judul: "Penjelasan Kebutuhan Air Harian",
    butir: [
      {
        istilah: "Kebutuhan Dasar (30–35 mL/kg)",
        arti: "Tubuh membutuhkan sekitar 30–35 mL cairan per kilogram berat badan untuk kerja ginjal, metabolisme, dan menjaga suhu tubuh.",
      },
      {
        istilah: "Tambahan Aktivitas Fisik",
        arti: "Setiap 30 menit olahraga perlu tambahan sekitar 350 mL air guna mengganti cairan yang keluar melalui keringat.",
      },
    ],
    catatan: "Acuan umum dewasa: Permenkes RI No. 28 Tahun 2019 (AKG cairan ~1.600–2.500 mL/hari) & estimasi hidrasi berbasis berat badan.",
  },
  jantung: {
    judul: "Penjelasan Istilah (HR Max & dpm)",
    butir: [
      {
        istilah: "Detak Maksimal (HR Max) & dpm",
        arti: "Batas tertinggi denyut jantung per menit (dpm) saat berolahraga sesuai usia Anda (rumus 220 − usia).",
      },
      {
        istilah: "Zona Latihan (60%–85% HR Max)",
        arti: "Rentang aman dan optimal agar jantung terlatih dan pembakaran lemak efektif tanpa membebani jantung secara berlebihan.",
      },
    ],
    catatan: "Acuan: Fox SM, Naughton JP, Haskell WL (Annals of Clinical Research, 1971) & anjuran aktivitas fisik Permenkes RI No. 71 Tahun 2015.",
  },
  klinis: {
    judul: "Penjelasan Istilah (Tensi & Gula Darah)",
    butir: [
      {
        istilah: "Tekanan Sistol (angka atas) & Diastol (angka bawah)",
        arti: "Sistol mengukur tekanan saat jantung memompa darah keluar; diastol saat jantung berelaksasi. Batas normal skrining Kemenkes RI/PERHI: < 130/85 mmHg.",
      },
      {
        istilah: "MAP (Mean Arterial Pressure)",
        arti: "Rata-rata tekanan aliran darah menuju organ penting (otak & ginjal) dengan rumus (Sistol + 2 × Diastol) / 3. Nilai normalnya 70–100 mmHg.",
      },
      {
        istilah: "Gula Puasa vs 2 Jam Setelah Makan (2JPP)",
        arti: "Gula puasa (min. 8 jam tidak makan/minum manis) normal < 100 mg/dL. Gula 2JPP (2 jam sesudah makan) normal < 140 mg/dL.",
      },
    ],
    catatan: "Acuan: Pedoman Pengendalian PTM Kemenkes RI / PERHI (Permenkes No. 71 Tahun 2015) — Hipertensi ≥ 140/90 mmHg, Krisis/Rujukan ≥ 180/110 mmHg.",
  },
};

const REFERENSI_MEDIS: { sumber: string; rincian: string }[] = [
  {
    sumber: "Permenkes RI No. 41 Tahun 2014 (Pedoman Gizi Seimbang)",
    rincian: "Klasifikasi IMT dewasa Indonesia: Kurus (< 18,5), Normal (18,5–25,0), Gemuk (> 25,0–27,0), Obesitas (> 27,0).",
  },
  {
    sumber: "Permenkes RI No. 71 Tahun 2015 & Pedoman PTM Kemenkes RI / PERHI",
    rincian: "Ambang skrining Posbindu PTM: tensi normal (< 130/85 mmHg), gula puasa (< 100 mg/dL), gula 2JPP (< 140 mg/dL), dan kolesterol (< 200 mg/dL).",
  },
  {
    sumber: "Permenkes RI No. 28 Tahun 2019 (Angka Kecukupan Gizi Indonesia)",
    rincian: "Rujukan kebutuhan energi dan cairan harian dewasa Indonesia, dipadukan estimasi hidrasi berbasis berat badan (30–35 mL/kg).",
  },
  {
    sumber: "Mifflin MD, St Jeor ST, et al. (1990) — Am. J. Clin. Nutr. 51(2): 241–247",
    rincian: "\"A new predictive equation for resting energy expenditure in healthy individuals\" untuk menghitung BMR dan kebutuhan kalori (TDEE).",
  },
  {
    sumber: "Fox SM, Naughton JP, Haskell WL (1971) — Annals of Clinical Research",
    rincian: "\"Physical Activity and the Prevention of Coronary Heart Disease\" untuk estimasi detak jantung maksimal (220 − usia) dan zona latihan kardio.",
  },
  {
    sumber: "Rumus Klinis Broca & MAP (Mean Arterial Pressure)",
    rincian: "Estimasi berat badan ideal berdasarkan tinggi badan (Broca) serta tekanan aliran darah rata-rata MAP = (Sistol + 2 × Diastol) / 3.",
  },
];

function PanduanIstilah({ info }: { info: PenjelasanTab }) {
  return (
    <div className="flat-sub">
      <div className="row items-center gap-8 mb-8">
        <Icon name="help-circle" size={16} className="text-primary shrink-0" />
        <strong className="text-sm">{info.judul}</strong>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {info.butir.map((b) => (
          <p key={b.istilah} className="tiny" style={{ lineHeight: 1.5 }}>
            <strong style={{ color: "var(--text)" }}>{b.istilah}:</strong> {b.arti}
          </p>
        ))}
        {info.catatan ? (
          <p className="tiny fw-600 text-primary mt-2" style={{ lineHeight: 1.5 }}>
            {info.catatan}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ReferensiMedisBox() {
  const [buka, setBuka] = useState(false);
  return (
    <div className="flat-sub">
      <button
        type="button"
        aria-expanded={buka}
        onClick={() => setBuka((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: 0,
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        <Icon name="info" size={16} className="text-primary shrink-0" />
        <span className="li-main">
          <strong>Referensi Regulasi Kemenkes RI &amp; Jurnal Ilmiah</strong>
          <span>Lihat dasar hukum (Permenkes) dan jurnal rumus medis ({REFERENSI_MEDIS.length} sumber)</span>
        </span>
        <Icon name={buka ? "chevron-up" : "chevron-down"} size={16} className="shrink-0" />
      </button>
      {buka ? (
        <div className="mt-8" style={{ borderTop: "1px dashed color-mix(in srgb, var(--border) 80%, transparent)" }}>
          {REFERENSI_MEDIS.map((ref) => (
            <div
              key={ref.sumber}
              className="li"
              style={{ padding: "8px 0", minHeight: "unset", alignItems: "flex-start" }}
            >
              <div className="li-main">
                <strong>{ref.sumber}</strong>
                <span style={{ display: "block", marginTop: 2, lineHeight: 1.45 }}>{ref.rincian}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KalkulatorContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  // Kalkulator yang dibuka dari landing page / footer / bantuan selalu tampil di halaman luar.
  // Tampilan dashboard (<AppShell>) hanya aktif bila user masuk dan membukanya lewat menu aplikasi (?app=1).
  const dalamAplikasi = Boolean(user && searchParams.get("app") === "1");
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
      let kategori = "Normal (< 130/85 mmHg)";
      let tone: "safe" | "warning" | "danger" = "safe";
      if (s >= 180 || d >= 110) {
        kategori = "Krisis — Segera Rujuk Faskes";
        tone = "danger";
      } else if (s >= 140 || d >= 90) {
        kategori = "Tinggi / Hipertensi (≥ 140/90)";
        tone = "danger";
      } else if (s >= 130 || d >= 85) {
        kategori = "Perlu Perhatian (130–139 / 85–89)";
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

  const kontenKalkulator = (
    <>
      {!dalamAplikasi ? (
        <nav className="legal-breadcrumb mb-10" aria-label="Breadcrumb">
          <Link href="/">Beranda</Link>
          <Icon name="chevron-right" size={14} />
          <span className="text-primary fw-600">Kalkulator Kesehatan</span>
        </nav>
      ) : null}
      <div className="row-between wrap gap-12 kalk-head">
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
      <div className="tabs kalk-tabs" role="tablist" aria-label="Pilih kalkulator kesehatan">
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

      <div className="grid kalk-stack">
        {/* PANEL INPUT (ATAS FULL-WIDTH) */}
        <section className="card kalk-panel">
          <div className="row gap-10 mb-8">
            <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
              <Icon name={TAB_LIST.find((t) => t.id === tab)?.icon || "calculator"} size={18} />
            </span>
            <div>
              <h2 className="h4">Parameter Perhitungan</h2>
              <p className="tiny">Ubah angka di bawah ini — hasil langsung terhitung otomatis.</p>
            </div>
          </div>

          <div className="kalk-input-grid">
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
              <>
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
              </>
            )}

            {tab === "jantung" && (
              <>
                <div className="field">
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
                </div>
                <div className="kalk-hint-box">
                  Digunakan untuk menghitung <strong>Detak Jantung Maksimal (220 − usia)</strong> dan zona latihan kardio yang aman.
                </div>
              </>
            )}

            {tab === "kalori" && (
              <>
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
              </>
            )}

            {tab === "klinis" && (
              <>
                <div className="field">
                  <label className="label" htmlFor="kalk-sistol">
                    Tekanan Sistol <span className="opt">(angka atas)</span>
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
                    Tekanan Diastol <span className="opt">(angka bawah)</span>
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
              </>
            )}
        </div>

        <div className="divider" />

        {/* BAGIAN HASIL */}
        <div>
          {tab === "imt" && (
            <>
              <div className="row-between wrap gap-8 mb-12">
                <h2 className="h4">Hasil Indeks Massa Tubuh</h2>
                {hasilImt ? <Badge tone={hasilImt.tone}>{hasilImt.kategori}</Badge> : null}
              </div>
              {hasilImt ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="stat-strip">
                    <div className="stat-cell" style={{ borderLeftColor: "var(--primary)" }}>
                      <span className="stat-cell-label">Skor IMT Anda</span>
                      <span className="stat-cell-val">{hasilImt.imt}</span>
                      <span className="stat-cell-sub">kg/m² · Normal: 18,5–25,0</span>
                    </div>
                    <div className="stat-cell" style={{ borderLeftColor: "var(--safe)" }}>
                      <span className="stat-cell-label">BB Ideal (Broca)</span>
                      <span className="stat-cell-val">{hasilImt.bbIdealBroca} kg</span>
                      <span className="stat-cell-sub">
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
              <div className="row-between wrap gap-8 mb-12">
                <h2 className="h4">Kebutuhan Kalori &amp; Protein</h2>
                <Badge tone="primary">Mifflin-St Jeor</Badge>
              </div>
              {hasilKalori ? (
                <div className="stat-strip">
                  <div className="stat-cell" style={{ borderLeftColor: "var(--primary)" }}>
                    <span className="stat-cell-label">Kalori Harian (TDEE)</span>
                    <span className="stat-cell-val">{hasilKalori.tdee} kkal</span>
                    <span className="stat-cell-sub">BMR istirahat: {hasilKalori.bmr} kkal</span>
                  </div>
                  <div className="stat-cell" style={{ borderLeftColor: "var(--safe)" }}>
                    <span className="stat-cell-label">Kebutuhan Protein</span>
                    <span className="stat-cell-val">
                      {hasilKalori.proteinMin}–{hasilKalori.proteinIdeal} g
                    </span>
                    <span className="stat-cell-sub">Per hari untuk massa otot &amp; imun</span>
                  </div>
                  <div className="stat-cell" style={{ borderLeftColor: "var(--info)" }}>
                    <span className="stat-cell-label">Target Turun Berat</span>
                    <span className="stat-cell-val">{hasilKalori.defisit} kkal</span>
                    <span className="stat-cell-sub">Defisit aman per hari</span>
                  </div>
                  <div className="stat-cell" style={{ borderLeftColor: "var(--warning)" }}>
                    <span className="stat-cell-label">Target Naik Massa</span>
                    <span className="stat-cell-val">{hasilKalori.surplus} kkal</span>
                    <span className="stat-cell-sub">Surplus terukur per hari</span>
                  </div>
                </div>
              ) : (
                <p className="tiny">Lengkapi berat, tinggi, dan usia untuk menghitung kebutuhan kalori.</p>
              )}
            </>
          )}

          {tab === "air" && (
            <>
              <div className="row-between wrap gap-8 mb-12">
                <h2 className="h4">Target Asupan Cairan Harian</h2>
                <Badge tone="info">Hidrasi</Badge>
              </div>
              {hasilAir ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="stat-strip">
                    <div className="stat-cell" style={{ borderLeftColor: "var(--info)" }}>
                      <span className="stat-cell-label">Kebutuhan Air Total</span>
                      <span className="stat-cell-val">{hasilAir.liter} L</span>
                      <span className="stat-cell-sub">{hasilAir.totalMl} mL per hari</span>
                    </div>
                    <div className="stat-cell" style={{ borderLeftColor: "var(--safe)" }}>
                      <span className="stat-cell-label">Setara Gelas (250 mL)</span>
                      <span className="stat-cell-val">{hasilAir.gelas} gelas</span>
                      <span className="stat-cell-sub">
                        Dasar: {hasilAir.minDasar}–{hasilAir.dasar} mL + aktivitas {hasilAir.tambahanAktivitas} mL
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
              <div className="row-between wrap gap-8 mb-12">
                <h2 className="h4">Detak Jantung Maksimal &amp; Target Kardio</h2>
                <Badge tone="danger">Rumus 220 − Usia</Badge>
              </div>
              {hasilJantung ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="stat-strip">
                    <div className="stat-cell" style={{ borderLeftColor: "var(--danger)" }}>
                      <span className="stat-cell-label">Detak Maksimal (HR Max)</span>
                      <span className="stat-cell-val">{hasilJantung.hrMax} dpm</span>
                      <span className="stat-cell-sub">Usia {hasilJantung.usia} thn</span>
                    </div>
                    <div className="stat-cell" style={{ borderLeftColor: "var(--primary)" }}>
                      <span className="stat-cell-label">Target Latihan Optimal</span>
                      <span className="stat-cell-val">
                        {hasilJantung.targetMin}–{hasilJantung.targetMax} dpm
                      </span>
                      <span className="stat-cell-sub">Rentang aman 60%–85% HR Max</span>
                    </div>
                  </div>
                  <div className="flat-sub" style={{ marginTop: 4, paddingTop: 6 }}>
                    {hasilJantung.zona.map((z) => (
                      <div key={z.nama} className="li" style={{ padding: "8px 0", minHeight: "unset" }}>
                        <div className="li-main">
                          <div className="row-between gap-8 wrap">
                            <strong style={{ display: "inline", margin: 0 }}>{z.nama}</strong>
                            <strong className="text-xs text-primary" style={{ display: "inline", margin: 0 }}>
                              {z.min}–{z.max} dpm
                            </strong>
                          </div>
                          <span style={{ display: "block", marginTop: 2 }}>{z.manfaat}</span>
                        </div>
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
              <div className="row-between wrap gap-8 mb-12">
                <h2 className="h4">Evaluasi Tensi &amp; Gula Darah</h2>
                <Badge tone="warning">Skrining Mandiri</Badge>
              </div>
              {hasilKlinis.tensiInfo || hasilKlinis.gulaInfo ? (
                <div className="stat-strip">
                  {hasilKlinis.tensiInfo ? (
                    <div className="stat-cell" style={{ borderLeftColor: "var(--warning)" }}>
                      <div className="row-between gap-8 wrap">
                        <span className="stat-cell-label">Tekanan Darah &amp; MAP</span>
                        <Badge tone={hasilKlinis.tensiInfo.tone}>{hasilKlinis.tensiInfo.kategori}</Badge>
                      </div>
                      <span className="stat-cell-val">MAP {hasilKlinis.tensiInfo.map} mmHg</span>
                      <span className="stat-cell-sub">Rentang MAP ideal 70–100 mmHg · Skrining normal &lt; 130/85 mmHg</span>
                    </div>
                  ) : null}

                  {hasilKlinis.gulaInfo ? (
                    <div className="stat-cell" style={{ borderLeftColor: "var(--info)" }}>
                      <div className="row-between gap-8 wrap">
                        <span className="stat-cell-label">Gula Darah</span>
                        <Badge tone={hasilKlinis.gulaInfo.tone}>{hasilKlinis.gulaInfo.kategori}</Badge>
                      </div>
                      <span className="stat-cell-val">{hasilKlinis.gulaInfo.nilai} mg/dL</span>
                      <span className="stat-cell-sub">
                        {hasilKlinis.gulaInfo.batas} · Normal {jenisGula === "puasa" ? "< 100 mg/dL" : "< 140 mg/dL"}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="tiny">Isi angka sistol/diastol atau gula darah untuk melihat interpretasi.</p>
              )}
            </>
          )}

          <PanduanIstilah info={TAB_PENJELASAN[tab]} />
          <ReferensiMedisBox />

          <div className="divider" />
          <div className="row-between wrap gap-8">
            <span className="tiny text-2">
              {!user
                ? "Bukan diagnosis medis. Masuk atau daftar untuk menyimpan riwayat pemeriksaan:"
                : user.role === "user"
                  ? "Bukan diagnosis medis. Simpan progres Anda di aplikasi:"
                  : user.role === "kader"
                    ? "Bukan diagnosis medis. Catat atau pantau pemeriksaan warga di aplikasi:"
                    : "Bukan diagnosis medis. Gunakan sebagai alat bantu simulasi dan pantau data wilayah:"}
            </span>
            <div className="row gap-8 wrap">
              {!user ? (
                <>
                  <Link href="/login" className="btn btn-sm btn-outline">
                    Masuk
                  </Link>
                  <Link href="/register" className="btn btn-sm btn-primary">
                    Daftar Gratis
                  </Link>
                </>
              ) : user.role === "user" ? (
                <>
                  <Link href="/target-kesehatan" className="btn btn-sm btn-outline">
                    <Icon name="target" size={14} /> Atur Target
                  </Link>
                  <Link href="/rekam-medis" className="btn btn-sm btn-primary">
                    <Icon name="clipboard" size={14} /> Rekam Medis
                  </Link>
                </>
              ) : user.role === "kader" ? (
                <Link href="/rekam-medis" className="btn btn-sm btn-primary">
                  <Icon name="clipboard" size={14} /> Rekam Medis
                </Link>
              ) : (
                <Link href="/laporan" className="btn btn-sm btn-primary">
                  <Icon name="bar-chart" size={14} /> Laporan Wilayah
                </Link>
              )}
            </div>
          </div>
        </div>
        </section>
      </div>
    </>
  );

  if (dalamAplikasi) {
    return <AppShell noFab>{kontenKalkulator}</AppShell>;
  }

  return (
    <div className="landing">
      <PublicHeader />
      <main className="section-sm">
        <div className="container">{kontenKalkulator}</div>
      </main>
      <PublicFooter />
    </div>
  );
}

function KalkulatorFallback() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ padding: 24, display: "grid", gap: 12 }}>
        <div className="skeleton" style={{ width: 180, height: 24, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: "65%", height: 14, borderRadius: 6 }} />
      </div>
      <div className="grid col-2 gap-16">
        <div className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
          <div className="skeleton" style={{ width: 120, height: 18, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: "100%", height: 42, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: "100%", height: 42, borderRadius: 8 }} />
        </div>
        <div className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
          <div className="skeleton" style={{ width: 120, height: 18, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: "100%", height: 120, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}

export default function KalkulatorPage() {
  const searchParams = useSearchParams();
  const dalamAplikasi = searchParams.get("app") === "1";

  if (dalamAplikasi) {
    return (
      <AppShell noFab>
        <Suspense fallback={<KalkulatorFallback />}>
          <KalkulatorContent />
        </Suspense>
      </AppShell>
    );
  }

  return (
    <div className="landing">
      <PublicHeader />
      <main className="section-sm">
        <div className="container">
          <Suspense fallback={<KalkulatorFallback />}>
            <KalkulatorContent />
          </Suspense>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

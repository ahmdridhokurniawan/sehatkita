"use client";

import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";

const PANDUAN = [
  {
    kode: "hipertensi",
    judul: "Hipertensi (Tekanan Darah Tinggi)",
    ikon: "heart-pulse",
    ringkas:
      "Tekanan darah di atas 140/90 mmHg yang menetap. Pantau rutin, kurangi garam, dan konsultasi bila perlu tindakan.",
    poin: [
      "Ukur tensi di waktu yang sama tiap hari, dalam keadaan duduk tenang.",
      "Batasi garam jadi <5 gram (1 sendok teh) per hari.",
      "Olahraga ringan 30 menit, minimal 5 hari/minggu.",
      "Jangan hentikan obat tanpa sepengetahuan tenaga kesehatan.",
    ],
  },
  {
    kode: "diabetes",
    judul: "Gula Darah / Diabetes",
    ikon: "droplet",
    ringkas:
      "Gula darah puasa ≥126 mg/dL menandakan diabetes. Kendalikan pola makan dan aktivitas fisik.",
    poin: [
      "Batasi gula tambahan dan makanan/minuman manis.",
      "Utamakan karbohidrat kompleks dan serat (biji-bijian, sayur).",
      "Cek gula darah sesuai jadwal skrining.",
      "Jaga berat badan ideal; turunkan berat bila berlebih.",
    ],
  },
  {
    kode: "imt",
    judul: "Berat Badan & IMT",
    ikon: "activity",
    ringkas:
      "IMT = berat (kg) / tinggi² (m). IMT 18,5–22,9 masuk kisaran normal bagi orang Indonesia.",
    poin: [
      "Gunakan kalkulator IMT di dashboard untuk memantau.",
      "Penurunan berat 5–10% sudah berdampak pada tekanan darah dan gula.",
      "Kombinasikan pola makan sehat dengan aktivitas fisik.",
    ],
  },
  {
    kode: "rujukan",
    judul: "Rujukan",
    ikon: "send",
    ringkas:
      "Rujukan adalah pengalihan layanan dari Posbindu/faskes pertama ke layanan lanjutan sesuai indikasi.",
    poin: [
      "Bawa surat rujukan saat datang ke faskes tujuan.",
      "Ikuti jadwal tindak lanjut yang diberikan tenaga kesehatan.",
      "Sampaikan keluhan dan riwayat yang relevan saat pemeriksaan.",
    ],
  },
];

const ISTILAH = [
  { istilah: "Sistol", definisi: "Tekanan di pembuluh darah saat jantung memompa darah ke tubuh — angka atas pada pengukuran (mis. 120 dari 120/80)." },
  { istilah: "Diastol", definisi: "Tekanan di pembuluh darah saat jantung relaksasi/istirahat sejenak sebelum memompa lagi — angka bawah (mis. 80 dari 120/80)." },
  { istilah: "Tekanan darah", definisi: "Kekuatan darah mendorong dinding pembuluh darah, ditulis sebagai sistol/diastol (mis. 120/80 mmHg)." },
  { istilah: "IMT (Indeks Massa Tubuh)", definisi: "Angka perbandingan berat badan terhadap tinggi badan: berat (kg) dibagi tinggi kuadrat (m²). Normal orang Indonesia 18,5–22,9." },
  { istilah: "Gula darah puasa", definisi: "Kadar gula darah yang diukur setelah berpuasa minimal 8 jam. Normal di bawah 100 mg/dL; diabetes bila 126 mg/dL ke atas." },
  { istilah: "Kolesterol total", definisi: "Jumlah seluruh lemak (kolesterol) di dalam darah. Normal di bawah 200 mg/dL; lebih tinggi menambah risiko penyakit jantung." },
  { istilah: "Asam urat", definisi: "Zat sisa metabolisme yang bila terlalu tinggi bisa mengendap di sendi dan menyebabkan nyeri. Normal pria di bawah 7 mg/dL, wanita di bawah 6 mg/dL." },
  { istilah: "Lingkar perut", definisi: "Ukuran keliling pinggang. Berisiko bila 90 cm ke atas pada pria, atau 80 cm ke atas pada wanita (standar Asia)." },
];

export default function PanduanPage() {
  const [terbuka, setTerbuka] = useState<string | null>(PANDUAN[0].kode);

  return (
    <AppShell>
      <div className="mt-16">
        <div className="app-section-title">
          <h2>Panduan Kesehatan</h2>
          <span className="tiny">Materi edukasi untuk warga</span>
        </div>

        <div className="mt-12" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PANDUAN.map((p) => {
            const aktif = terbuka === p.kode;
            return (
              <div key={p.kode} className="card">
                <button
                  type="button"
                  className="row-between"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => setTerbuka(aktif ? null : p.kode)}
                >
                  <span className="row" style={{ gap: 12 }}>
                    <span className="li-ico">
                      <Icon name={p.ikon} size={18} />
                    </span>
                    <span>
                      <strong className="text-sm">{p.judul}</strong>
                      <span className="tiny" style={{ display: "block" }}>{p.ringkas}</span>
                    </span>
                  </span>
                  <Icon name={aktif ? "chevron-up" : "chevron-down"} size={16} />
                </button>
                {aktif && (
                  <div className="mt-12">
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {p.poin.map((t, i) => (
                        <li key={i} className="row" style={{ gap: 8 }}>
                          <Badge tone="primary">✓</Badge>
                          <span className="tiny">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-16">
          <div className="app-section-title">
            <h2>Definisi Istilah</h2>
            <span className="tiny">Pengertian istilah medis yang muncul di aplikasi</span>
          </div>
          <div className="mt-12" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {ISTILAH.map((i) => (
              <div key={i.istilah} className="card" style={{ padding: "14px 16px" }}>
                <strong className="text-sm" style={{ color: "var(--primary)" }}>{i.istilah}</strong>
                <span className="tiny" style={{ display: "block", marginTop: 6 }}>{i.definisi}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="tiny mt-16">
          <Icon name="shield" size={13} /> Panduan ini bersifat edukatif dan tidak menggantikan
          pemeriksaan tenaga kesehatan.
        </p>
      </div>
    </AppShell>
  );
}

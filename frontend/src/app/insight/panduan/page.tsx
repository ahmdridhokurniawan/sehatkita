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

        <p className="tiny mt-16">
          <Icon name="shield" size={13} /> Panduan ini bersifat edukatif dan tidak menggantikan
          pemeriksaan tenaga kesehatan.
        </p>
      </div>
    </AppShell>
  );
}

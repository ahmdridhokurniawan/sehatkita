"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Pagination, { type Meta } from "@/components/ui/Pagination";

const PANDUAN = [
  {
    kode: "hipertensi",
    judul: "Hipertensi (Tekanan Darah Tinggi)",
    ikon: "heart-pulse",
    ringkas:
      "Tekanan darah 140/90 mmHg atau lebih yang terjadi berulang. Pantau rutin, kurangi garam, dan periksa ke fasilitas kesehatan bila tinggi.",
    poin: [
      "Ukur tekanan darah di waktu yang sama setiap hari dalam posisi duduk tenang minimal 5 menit.",
      "Batasi garam kurang dari 5 gram (sekitar 1 sendok teh) per hari.",
      "Lakukan aktivitas fisik ringan seperti jalan kaki 30 menit, minimal 5 hari seminggu.",
      "Jangan menghentikan obat tekanan darah tanpa persetujuan dokter atau petugas kesehatan.",
    ],
  },
  {
    kode: "diabetes",
    judul: "Gula Darah Tinggi & Diabetes",
    ikon: "droplet",
    ringkas:
      "Gula darah puasa ≥ 126 mg/dL atau 2 jam setelah makan ≥ 200 mg/dL menandakan diabetes. Jaga pola makan dan cek gula darah berkala.",
    poin: [
      "Kurangi gula tambahan, minuman kemasan manis, serta camilan tinggi tepung.",
      "Utamakan makanan berserat seperti sayur, buah segar, dan karbohidrat kompleks.",
      "Lakukan pemeriksaan gula darah secara berkala sesuai anjuran Posbindu atau puskesmas.",
      "Jaga berat badan tetap ideal agar kerja hormon insulin lebih optimal.",
    ],
  },
  {
    kode: "imt",
    judul: "Berat Badan & Indeks Massa Tubuh (IMT)",
    ikon: "activity",
    ringkas:
      "IMT dihitung dari berat badan (kg) dibagi tinggi badan kuadrat (m²). Menurut Permenkes RI No. 41 Tahun 2014, kisaran normal orang dewasa Indonesia adalah 18,5–25,0.",
    poin: [
      "Klasifikasi Kemenkes RI: Kurus (< 18,5), Normal (18,5–25,0), Gemuk (> 25,0–27,0), dan Obesitas (> 27,0).",
      "Gunakan menu Kalkulator untuk menghitung IMT, berat ideal, dan kebutuhan kalori harian.",
      "Menurunkan 5–10% berat badan berlebih sudah membantu menurunkan tekanan darah dan gula darah.",
      "Kombinasikan porsi makan gizi seimbang dengan gerak aktif harian dan cukup minum air.",
    ],
  },
  {
    kode: "rujukan",
    judul: "Rujukan ke Fasilitas Kesehatan",
    ikon: "send",
    ringkas:
      "Rujukan adalah pengalihan layanan dari Posbindu atau kader ke puskesmas/rumah sakit agar warga berisiko mendapat pemeriksaan dokter.",
    poin: [
      "Simpan atau cetak surat rujukan dari menu Rujukan saat hendak berobat ke faskes tujuan.",
      "Datang sesuai jadwal tindak lanjut yang diarahkan oleh kader atau petugas kesehatan.",
      "Sampaikan keluhan, obat yang sedang diminum, dan riwayat kesehatan keluarga saat diperiksa.",
    ],
  },
];

const ISTILAH: { istilah: string; definisi: string; accent: string }[] = [
  {
    istilah: "PTM (Penyakit Tidak Menular)",
    definisi:
      "Penyakit kronis yang tidak menular antarorang namun perlu dicegah sejak dini, seperti hipertensi, diabetes, jantung, dan stroke.",
    accent: "primary",
  },
  {
    istilah: "Posbindu",
    definisi:
      "Pos Pembinaan Terpadu — kegiatan pemeriksaan kesehatan rutin warga di tingkat kelurahan oleh kader untuk memantau faktor risiko PTM.",
    accent: "safe",
  },
  {
    istilah: "Skrining",
    definisi:
      "Pemeriksaan kesehatan awal (tensi, gula darah, berat badan, lingkar perut) untuk mendeteksi risiko penyakit sebelum muncul gejala berat.",
    accent: "info",
  },
  {
    istilah: "Faskes (Fasilitas Kesehatan)",
    definisi:
      "Tempat pelayanan kesehatan seperti puskesmas, klinik, atau rumah sakit tujuan pemeriksaan lanjutan dan rujukan.",
    accent: "accent",
  },
  {
    istilah: "Sistol",
    definisi:
      "Angka atas pada hasil tensi (batas normal skrining Kemenkes RI < 130 mmHg), menunjukkan tekanan saat jantung memompa darah.",
    accent: "primary",
  },
  {
    istilah: "Diastol",
    definisi:
      "Angka bawah pada hasil tensi (batas normal skrining Kemenkes RI < 85 mmHg), menunjukkan tekanan pembuluh darah saat jantung beristirahat.",
    accent: "info",
  },
  {
    istilah: "Prehipertensi (Normal-Tinggi)",
    definisi:
      "Tahap peringatan dini tekanan darah (130–139 / 85–89 mmHg pada ambang skrining Kemenkes RI/PERHI): belum hipertensi, tetapi berisiko naik bila tidak dijaga.",
    accent: "warning",
  },
  {
    istilah: "Prediabetes",
    definisi:
      "Kadar gula darah di atas normal (puasa 100–125 mg/dL), namun belum setinggi diabetes. Pola makan & olahraga bisa mencegahnya berkembang.",
    accent: "warning",
  },
  {
    istilah: "IMT (Indeks Massa Tubuh)",
    definisi:
      "Angka perbandingan berat badan terhadap tinggi badan: berat (kg) dibagi tinggi kuadrat (m²). Menurut Permenkes No. 41/2014: normal 18,5–25,0; gemuk > 25,0–27,0; obesitas > 27,0.",
    accent: "safe",
  },
  {
    istilah: "Gula Darah Puasa & 2 Jam PP",
    definisi:
      "Gula darah puasa diukur setelah tidak makan minimal 8 jam (normal < 100 mg/dL). 2 Jam PP berarti diukur 2 jam setelah makan (normal < 140 mg/dL).",
    accent: "info",
  },
  {
    istilah: "Kolesterol Total & Asam Urat",
    definisi:
      "Kolesterol total normal < 200 mg/dL. Asam urat pada ambang skrining Posbindu normal < 7 mg/dL (pria < 7 mg/dL, wanita < 6 mg/dL); kadar tinggi memicu nyeri sendi.",
    accent: "accent",
  },
  {
    istilah: "Lingkar Perut",
    definisi:
      "Ukuran keliling pinggang untuk deteksi obesitas sentral sesuai Permenkes No. 71 Tahun 2015: batas aman < 90 cm (pria) dan < 80 cm (wanita).",
    accent: "warning",
  },
  {
    istilah: "Poin Sehat (EXP) & Lencana",
    definisi:
      "Penghargaan poin aktivitas ketika warga mengikuti tantangan hidup sehat. Poin dipakai untuk klasemen keaktifan, bukan ukuran kondisi medis.",
    accent: "primary",
  },
  {
    istilah: "Ringkasan Wilayah (Data Agregat)",
    definisi:
      "Rekap statistik gabungan kondisi kesehatan suatu kelurahan tanpa menampilkan nama atau identitas perorangan demi menjaga privasi warga.",
    accent: "safe",
  },
];

const PER_PAGE_KAMUS = 4;

export default function PanduanPage() {
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [cariIstilah, setCariIstilah] = useState("");
  const [halamanKamus, setHalamanKamus] = useState(1);

  const istilahTersaring = useMemo(() => {
    const q = cariIstilah.trim().toLowerCase();
    if (!q) return ISTILAH;
    return ISTILAH.filter(
      (i) =>
        i.istilah.toLowerCase().includes(q) ||
        i.definisi.toLowerCase().includes(q),
    );
  }, [cariIstilah]);

  const totalKamus = istilahTersaring.length;
  const lastPageKamus = Math.max(1, Math.ceil(totalKamus / PER_PAGE_KAMUS));
  const halamanKamusAman = Math.min(halamanKamus, lastPageKamus);
  const kamusTampil = istilahTersaring.slice(
    (halamanKamusAman - 1) * PER_PAGE_KAMUS,
    halamanKamusAman * PER_PAGE_KAMUS,
  );
  const metaKamus: Meta = {
    page: halamanKamusAman,
    per_page: PER_PAGE_KAMUS,
    total: totalKamus,
    last_page: lastPageKamus,
  };

  return (
    <AppShell noFab>
      <div className="row-between wrap gap-12 mb-16">
        <div>
          <h1 className="h3">Panduan Kesehatan</h1>
          <p className="tiny">
            Penjelasan praktis pencegahan PTM dan arti istilah kesehatan/aplikasi dalam bahasa sehari-hari.
          </p>
        </div>
        <Badge tone="primary">{PANDUAN.length} topik · {ISTILAH.length} istilah</Badge>
      </div>

      <div className="app-section-title">
        <h2>Topik Utama</h2>
        <span className="tiny">Pilih topik untuk melihat langkah praktisnya</span>
      </div>

      <div className="card mt-12" style={{ padding: 0, overflow: "hidden" }}>
        {PANDUAN.map((p, idx) => {
          const aktif = terbuka === p.kode;
          return (
            <div
              key={p.kode}
              style={{
                borderBottom: idx < PANDUAN.length - 1 ? "1px solid var(--border)" : "none",
                borderLeft: aktif ? "3px solid var(--primary)" : "3px solid transparent",
              }}
            >
              <button
                type="button"
                aria-expanded={aktif}
                className="li li-hover"
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "10px 14px",
                  minHeight: "unset",
                  color: "var(--text)",
                  cursor: "pointer",
                  alignItems: "flex-start",
                }}
                onClick={() => setTerbuka(aktif ? null : p.kode)}
              >
                <span className="li-ico" style={{ width: 32, height: 32, borderRadius: 9 }}>
                  <Icon name={p.ikon} size={16} />
                </span>
                <span className="li-main">
                  <strong>{p.judul}</strong>
                  <span style={{ display: "block", marginTop: 2, lineHeight: 1.4 }}>{p.ringkas}</span>
                </span>
                <Icon name={aktif ? "chevron-up" : "chevron-down"} size={16} className="shrink-0" />
              </button>
              {aktif && (
                <div style={{ padding: "8px 14px 12px 58px", borderTop: "1px dashed var(--border)" }}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {p.poin.map((t, i) => (
                      <li key={i} className="tiny" style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "var(--text)", lineHeight: 1.45 }}>
                        <span style={{ color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="mt-20">
        <div className="app-section-title">
          <h2>Kamus Istilah SehatKita</h2>
          <span className="tiny">Penjelasan singkat istilah medis dan menu di aplikasi</span>
        </div>

        <div className="input-icon mt-12">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Cari istilah (mis. PTM, Sistol, IMT, Skrining, EXP)…"
            value={cariIstilah}
            onChange={(e) => {
              setCariIstilah(e.target.value);
              setHalamanKamus(1);
            }}
          />
        </div>

        {istilahTersaring.length === 0 ? (
          <div className="card card-flat mt-12">
            <p className="tiny center">Tidak ada istilah yang cocok dengan “{cariIstilah}”.</p>
          </div>
        ) : (
          <>
            <div className="card mt-12" style={{ padding: 0, overflow: "hidden" }}>
              {kamusTampil.map((item) => (
                <div
                  key={item.istilah}
                  className="li"
                  style={{
                    padding: "10px 14px",
                    minHeight: "unset",
                    alignItems: "flex-start",
                  }}
                >
                  <div className="li-main">
                    <strong>{item.istilah}</strong>
                    <span style={{ display: "block", marginTop: 2, lineHeight: 1.45 }}>{item.definisi}</span>
                  </div>
                </div>
              ))}
            </div>
            <Pagination meta={metaKamus} onPage={setHalamanKamus} />
          </>
        )}
      </section>

      <div
        className="tiny mt-20 mb-16"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}
      >
        <Icon name="shield" size={14} className="shrink-0" />
        <span>Panduan ini bersifat edukatif dan tidak menggantikan pemeriksaan dokter atau tenaga kesehatan.</span>
      </div>
    </AppShell>
  );
}

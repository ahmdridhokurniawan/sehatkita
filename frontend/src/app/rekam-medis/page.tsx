"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Segmented from "@/components/ui/Segmented";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import Line from "@/components/charts/Line";
import { EmptyState } from "@/components/ui/Empty";
import { CATATAN_DEMO, hariLalu } from "@/lib/demo";
import { tanggal } from "@/lib/format";

type CatatanLengkap = (typeof CATATAN_DEMO)[number] & {
  dicatat_pada: string;
  imt: number;
  kategori_imt: string;
  kategori_tensi: string;
  kategori_gula_darah: string;
  status_kesehatan: string;
  catatan: string;
};

/** Hitung IMT dari bb (tinggi demo 168 cm). */
const TINGGI_M = 1.68;
function imtDari(bb: number): number {
  return +(bb / (TINGGI_M * TINGGI_M)).toFixed(1);
}
function kategoriImt(imt: number): string {
  if (imt < 18.5) return "Kurus";
  if (imt < 25) return "Normal";
  if (imt < 30) return "Gemuk";
  return "Obesitas";
}
function kategoriTensi(s: number, d: number): string {
  if (s >= 160 || d >= 100) return "Hipertensi Derajat 2";
  if (s >= 140 || d >= 90) return "Hipertensi Derajat 1";
  if (s >= 120) return "Prehipertensi";
  return "Normal";
}
function kategoriGula(g: number): string {
  if (g >= 126) return "Tinggi";
  if (g >= 100) return "Batas Atas";
  return "Normal";
}

const INDIKATOR = [
  { k: "bb_kg", label: "Berat Badan", unit: "kg", dec: 0 },
  { k: "imt", label: "IMT", unit: "kg/m²", dec: 1 },
  { k: "sistol", label: "Sistol", unit: "mmHg", dec: 0 },
  { k: "diastol", label: "Diastol", unit: "mmHg", dec: 0 },
  { k: "gula_darah", label: "Gula Darah", unit: "mg/dL", dec: 0 },
  { k: "kolesterol", label: "Kolesterol", unit: "mg/dL", dec: 0 },
  { k: "asam_urat", label: "Asam Urat", unit: "mg/dL", dec: 1 },
  { k: "lingkar_perut", label: "Lingkar Perut", unit: "cm", dec: 0 },
] as const;

const PERIODE = [
  { value: "1m", label: "1m" },
  { value: "3m", label: "3m" },
  { value: "6m", label: "6m" },
  { value: "1y", label: "1y" },
];
const HARI_PERIODE: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };

const PER_HALAMAN = 5;

/** Data demo lengkap dengan turunan (porting dari mock.js `enrich`). */
const SEMUA: CatatanLengkap[] = CATATAN_DEMO.map((c, i, arr) => {
  const imt = imtDari(c.bb_kg);
  const teksDemo = [
    "Sering begadang karena kerja.",
    "Pemeriksaan rutin Posbindu.",
    "",
    "",
    "Disarankan kurangi gula.",
    "",
    "",
    "",
    "Awal mencatat di SehatKita.",
  ];
  return {
    ...c,
    dicatat_pada: hariLalu(c.hari_lalu),
    imt,
    kategori_imt: kategoriImt(imt),
    kategori_tensi: kategoriTensi(c.sistol, c.diastol),
    kategori_gula_darah: kategoriGula(c.gula_darah),
    status_kesehatan: kategoriTensi(c.sistol, c.diastol).includes("Hipertensi") ? "perlu_perhatian" : "normal",
    catatan: teksDemo[i] ?? (arr.length && i === arr.length - 1 ? "Awal mencatat di SehatKita." : ""),
  };
}).reverse(); // terbaru dulu

function toneKategori(k = ""): "safe" | "warning" | "danger" {
  if (/derajat 2|obesitas|tinggi|berisiko/i.test(k)) return "danger";
  if (/derajat 1|gemuk|batas|prehipertensi/i.test(k)) return "warning";
  return "safe";
}

export default function RekamMedisPage() {
  const router = useRouter();
  const [periode, setPeriode] = useState("3m");
  const [indikator, setIndikator] = useState<string>("bb_kg");
  const [cari, setCari] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [detail, setDetail] = useState<CatatanLengkap | null>(null);

  const ind = INDIKATOR.find((i) => i.k === indikator) || INDIKATOR[0];

  // Grafik: urut lama → baru, difilter periode
  const seri = useMemo(() => {
    const batas = Date.now() - HARI_PERIODE[periode] * 864e5;
    return SEMUA.slice()
      .reverse()
      .filter((c) => new Date(c.dicatat_pada).getTime() >= batas)
      .map((c) => ({
        tanggal: c.dicatat_pada,
        nilai: indikator === "imt" ? c.imt : (c as unknown as Record<string, number>)[indikator],
      }));
  }, [periode, indikator]);

  // Daftar catatan: filter cari + paginasi
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return SEMUA;
    return SEMUA.filter((c) =>
      [tanggal(c.dicatat_pada, "day"), c.sumber, c.kategori_imt, String(c.bb_kg)].join(" ").toLowerCase().includes(q)
    );
  }, [cari]);

  const total = tersaring.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halamanAman = Math.min(halaman, lastPage);
  const baris = tersaring.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  const meta: Meta = { page: halamanAman, per_page: PER_HALAMAN, total, last_page: lastPage };

  return (
    <AppShell noFab onFab={() => router.push("/catatan-kesehatan")}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Rekam Medis</h1>
          <p className="tiny">Riwayat pemeriksaan dan grafik perkembangan indikator.</p>
        </div>
      </div>

      {/* Kartu grafik */}
      <div className="card">
        <div className="row-between mb-12">
          <strong className="text-sm">{ind.label}</strong>
          <Segmented items={PERIODE} value={periode} onChange={setPeriode} />
        </div>
        {seri.length < 2 ? (
          <EmptyState
            title="Belum cukup data"
            desc="Grafik muncul setelah minimal dua pengukuran. Satu titik data belum dapat membentuk tren."
          />
        ) : (
          <Line
            labels={seri.map((p) => tanggal(p.tanggal, "short"))}
            series={[{ name: ind.label, data: seri.map((p) => p.nilai) }]}
            unit={ind.unit}
            height={190}
            yDecimals={ind.dec}
          />
        )}
        <div className="mt-12">
          <label className="label" htmlFor="pilihIndikator">
            Tampilkan indikator
          </label>
          <select
            className="select"
            id="pilihIndikator"
            value={indikator}
            onChange={(e) => setIndikator(e.target.value)}
          >
            {INDIKATOR.map((i) => (
              <option value={i.k} key={i.k}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="app-section-title mt-20">
        <h2>Riwayat Catatan</h2>
      </div>
      <div className="input-icon mt-12">
        <Icon name="search" size={18} />
        <input
          className="input"
          type="search"
          placeholder="Cari catatan…"
          value={cari}
          onChange={(e) => {
            setCari(e.target.value);
            setHalaman(1);
          }}
        />
      </div>

      <div className="mt-16">
        {baris.length === 0 ? (
          <EmptyState title="Belum ada catatan" desc="Tekan tombol Catat Kesehatan untuk mulai mencatat." />
        ) : (
          baris.map((c) => {
            const items = [
              `${c.bb_kg} kg`,
              `${c.sistol}/${c.diastol} mmHg`,
              `GD ${c.gula_darah}`,
            ];
            return (
              <div className="card card-flat mb-12" key={c.id}>
                <div className="row-between">
                  <div className="row gap-10">
                    <span className="li-ico">
                      <Icon name={c.sumber === "posbindu" ? "users" : "pencil"} size={18} />
                    </span>
                    <div>
                      <strong className="text-sm">{tanggal(c.dicatat_pada, "day")}</strong>
                      <div className="tiny">
                        {c.sumber === "mandiri" ? "Catatan mandiri" : "Posbindu / Kader"}
                      </div>
                    </div>
                  </div>
                  <div className="row gap-6">
                    <Badge tone={toneKategori(c.kategori_imt)}>{c.kategori_imt}</Badge>
                  </div>
                </div>
                <div className="row gap-6 mt-12" style={{ flexWrap: "wrap" }}>
                  {items.map((t) => (
                    <span className="badge" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                {c.catatan ? <p className="tiny mt-8">{c.catatan}</p> : null}
                <div className="row gap-8 mt-12">
                  <button className="btn btn-sm btn-outline" onClick={() => setDetail(c)}>
                    <Icon name="eye" size={15} /> Detail
                  </button>
                  <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)" }}>
                    <Icon name="trash" size={15} /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
        <Pagination meta={meta} onPage={setHalaman} />
      </div>

      {/* Modal detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Catatan">
        {detail ? (
          <>
            <p className="tiny">
              {tanggal(detail.dicatat_pada, "day")} · {detail.sumber}
            </p>
            <dl className="dl mt-12">
              <Baris label="Berat badan" nilai={`${detail.bb_kg} kg`} />
              <Baris label="IMT" nilai={detail.imt} />
              <Baris label="Kategori IMT" nilai={detail.kategori_imt} />
              <Baris label="Tekanan darah" nilai={`${detail.sistol}/${detail.diastol} mmHg`} />
              <Baris label="Kategori tensi" nilai={detail.kategori_tensi} />
              <Baris label="Gula darah" nilai={`${detail.gula_darah} mg/dL (${detail.jenis_gula_darah})`} />
              <Baris label="Kategori gula darah" nilai={detail.kategori_gula_darah} />
              <Baris label="Kolesterol" nilai={`${detail.kolesterol} mg/dL`} />
              <Baris label="Asam urat" nilai={`${detail.asam_urat} mg/dL`} />
              <Baris label="Lingkar perut" nilai={`${detail.lingkar_perut} cm`} />
              <Baris label="Jam tidur" nilai={`${detail.tidur_jam} jam`} />
            </dl>
            {detail.catatan ? (
              <>
                <div className="divider" />
                <div>
                  <div className="tiny">Catatan</div>
                  <p className="text-sm mt-4">{detail.catatan}</p>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string | number }) {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{nilai}</dd>
    </div>
  );
}

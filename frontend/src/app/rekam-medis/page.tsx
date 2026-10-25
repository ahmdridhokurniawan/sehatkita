"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Segmented from "@/components/ui/Segmented";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import Line from "@/components/charts/Line";
import CatatModal from "@/components/catatan/CatatModal";
import { EmptyState } from "@/components/ui/Empty";
import { catatanKesehatan, rekamMedis, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import { LABEL_SUMBER } from "@/lib/labels";
import type { CatatanKesehatan, RekamMedis as RekamMedisType } from "@/types";

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

const PER_HALAMAN = 5;

function toneKategori(k = ""): "safe" | "warning" | "danger" {
  if (/derajat 2|obesitas|tinggi|berisiko/i.test(k)) return "danger";
  if (/derajat 1|gemuk|batas|prehipertensi/i.test(k)) return "warning";
  return "safe";
}

export default function RekamMedisPage() {
  const [periode, setPeriode] = useState<"1m" | "3m" | "6m" | "1y">("3m");
  const [indikator, setIndikator] = useState<string>("bb_kg");
  const [cari, setCari] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [detail, setDetail] = useState<CatatanKesehatan | null>(null);
  const [catatTerbuka, setCatatTerbuka] = useState(false);

  // Fetch data
  const [catatan, setCatatan] = useState<CatatanKesehatan[]>([]);
  const [grafik, setGrafik] = useState<RekamMedisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch list
        const cList = await catatanKesehatan.list();
        setCatatan(cList);

        // Fetch grafik
        const gData = await rekamMedis.get({ indikator, periode });
        setGrafik(gData);

        setError(null);
      } catch (err: any) {
        const apiErr = err as ApiError;
        console.error("Rekam medis fetch error:", apiErr);
        setError(apiErr.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [indikator, periode]);

  const ind = INDIKATOR.find((i) => i.k === indikator) || INDIKATOR[0];

  // Grafik
  const seri = useMemo(() => {
    if (!grafik?.series?.[0]) return [];
    const s = grafik.series[0];
    return s.titik.map((t) => ({ tanggal: t.tanggal, nilai: t.nilai }));
  }, [grafik]);

  // Daftar catatan: filter cari + paginasi
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return catatan;
    return catatan.filter((c) =>
      [tanggal(c.dicatat_pada, "day"), c.sumber, c.kategori_imt || "", String(c.bb_kg || "")].join(" ").toLowerCase().includes(q)
    );
  }, [cari, catatan]);

  const total = tersaring.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halamanAman = Math.min(halaman, lastPage);
  const baris = tersaring.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  const meta: Meta = { page: halamanAman, per_page: PER_HALAMAN, total, last_page: lastPage };

  if (loading) {
    return (
      <AppShell onFab={() => setCatatTerbuka(true)}>
        <EmptyState title="Memuat..." desc="Data rekam medis sedang dimuat..." />
      </AppShell>
    );
  }

  return (
    <AppShell onFab={() => setCatatTerbuka(true)}>
      {error && (
        <div className="alert alert-warning mb-16">
          <Icon name="alert-circle" />
          <div>{error}</div>
        </div>
      )}

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
          <Segmented items={PERIODE} value={periode} onChange={(val) => setPeriode(val as "1m" | "3m" | "6m" | "1y")} />
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
              c.bb_kg !== null ? `${c.bb_kg} kg` : null,
              c.sistol !== null && c.diastol !== null ? `${c.sistol}/${c.diastol} mmHg` : null,
              c.gula_darah !== null ? `GD ${c.gula_darah}` : null,
            ].filter((x) => x !== null);

            return (
              <div className="card card-flat mb-12" key={c.id}>
                <div className="row-between">
                  <div className="row gap-10">
                    <span className="li-ico">
                      <Icon name={c.sumber === "puskesmas" ? "users" : "pencil"} size={18} />
                    </span>
                    <div>
                      <strong className="text-sm">{tanggal(c.dicatat_pada, "day")}</strong>
                      <div className="tiny">{c.sumber === "mandiri" ? "Catatan mandiri" : "Posbindu / Kader"}</div>
                    </div>
                  </div>
                  <div className="row gap-6">
                    {c.kategori_imt && <Badge tone={toneKategori(c.kategori_imt)}>{c.kategori_imt}</Badge>}
                  </div>
                </div>
                {items.length > 0 && (
                  <div className="row gap-6 mt-12" style={{ flexWrap: "wrap" }}>
                    {items.map((t, idx) => (
                      <span className="badge" key={idx}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {c.catatan ? <p className="tiny mt-8">{c.catatan}</p> : null}
                <div className="row gap-8 mt-12">
                  <button className="btn btn-sm btn-outline" onClick={() => setDetail(c)}>
                    <Icon name="eye" size={15} /> Detail
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    style={{ color: "var(--danger)" }}
                    onClick={async () => {
                      if (confirm("Hapus catatan ini?")) {
                        try {
                          await catatanKesehatan.hapus(c.id);
                          setCatatan(catatan.filter((x) => x.id !== c.id));
                        } catch (err) {
                          console.error("Hapus error:", err);
                          alert("Gagal menghapus");
                        }
                      }
                    }}
                  >
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
              {tanggal(detail.dicatat_pada, "day")} · {LABEL_SUMBER[detail.sumber] || detail.sumber}
            </p>
            <dl className="dl mt-12">
              {detail.bb_kg !== null && <Baris label="Berat badan" nilai={`${detail.bb_kg} kg`} />}
              {detail.imt !== null && <Baris label="IMT" nilai={detail.imt} />}
              {detail.kategori_imt && <Baris label="Kategori IMT" nilai={detail.kategori_imt} />}
              {detail.sistol !== null && detail.diastol !== null && (
                <Baris label="Tekanan darah" nilai={`${detail.sistol}/${detail.diastol} mmHg`} />
              )}
              {detail.kategori_tensi && <Baris label="Kategori tensi" nilai={detail.kategori_tensi} />}
              {detail.gula_darah !== null && (
                <Baris label="Gula darah" nilai={`${detail.gula_darah} mg/dL (${detail.jenis_gula_darah})`} />
              )}
              {detail.kategori_gula_darah && <Baris label="Kategori gula darah" nilai={detail.kategori_gula_darah} />}
              {detail.kolesterol !== null && <Baris label="Kolesterol" nilai={`${detail.kolesterol} mg/dL`} />}
              {detail.asam_urat !== null && <Baris label="Asam urat" nilai={`${detail.asam_urat} mg/dL`} />}
              {detail.lingkar_perut !== null && <Baris label="Lingkar perut" nilai={`${detail.lingkar_perut} cm`} />}
              {detail.tidur_jam !== null && <Baris label="Jam tidur" nilai={`${detail.tidur_jam} jam`} />}
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
      <CatatModal open={catatTerbuka} onClose={() => setCatatTerbuka(false)} />
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

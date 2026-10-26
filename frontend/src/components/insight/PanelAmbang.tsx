"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { AmbangBaris } from "@/types";

/* ------------------------------------------------------------------
   Panel penjelasan ambang — menjawab "kapan aman, kapan siaga,
   kapan bahaya". Angka diambil langsung dari tabel ambang_kategori
   (GET /insight/ambang), tabel yang sama yang dipakai backend untuk
   menghitung skor & memicu rujukan. Jadi penjelasan di sini tidak
   bisa berbeda dari perhitungan sebenarnya.
   ------------------------------------------------------------------ */

const STATUS: Record<string, { label: string; cls: string; ico: string }> = {
  normal: { label: "Aman", cls: "safe", ico: "check-circle" },
  perlu_perhatian: { label: "Siaga", cls: "warning", ico: "alert-circle" },
  berisiko: { label: "Bahaya", cls: "danger", ico: "alert-triangle" },
};

const LABEL_KATEGORI: Record<string, string> = {
  kurus: "Kurus",
  normal: "Normal",
  gemuk: "Gemuk",
  obesitas: "Obesitas",
  perlu_perhatian: "Perlu perhatian",
  tinggi: "Tinggi",
  krisis: "Krisis",
  rendah: "Rendah",
};

const LABEL_GULA: Record<string, string> = {
  puasa: "Gula darah puasa",
  "2jam_pp": "Gula darah 2 jam setelah makan",
};

function rentang(b: AmbangBaris) {
  const { batas_min: min, batas_max: max } = b;
  const angka = (v: number) => String(v).replace(".", ",");
  if (min === null && max !== null) return `< ${angka(max)}`;
  if (min !== null && max === null) return `≥ ${angka(min)}`;
  if (min === null && max === null) return "—";
  return `${angka(min!)} – ${angka(max!)}`;
}

export default function PanelAmbang({ data }: { data: AmbangBaris[] }) {
  const [buka, setBuka] = useState(false);

  if (data.length === 0) return null;

  // Kelompokkan per indikator, urutan tetap seperti dari backend.
  const grup: { kode: string; nama: string; satuan: string | null; baris: AmbangBaris[] }[] = [];
  for (const b of data) {
    const kunci = b.jenis_gula_darah ? `${b.kode}:${b.jenis_gula_darah}` : b.kode;
    let g = grup.find((x) => x.kode === kunci);
    if (!g) {
      g = {
        kode: kunci,
        nama: b.jenis_gula_darah ? LABEL_GULA[b.jenis_gula_darah] ?? b.nama : b.nama,
        satuan: b.satuan,
        baris: [],
      };
      grup.push(g);
    }
    g.baris.push(b);
  }

  return (
    <div className="card card-flat mt-16">
      <button
        type="button"
        className="row-between w-full"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}
      >
        <div className="row items-center gap-10">
          <span className="li-ico">
            <Icon name="info" size={19} />
          </span>
          <div>
            <strong className="text-sm">Kapan saya dinyatakan aman, siaga, atau bahaya?</strong>
            <p className="tiny">Berdasarkan tabel ambang resmi aplikasi.</p>
          </div>
        </div>
        <span className="tiny">
          <Icon name={buka ? "chevron-up" : "chevron-down"} size={18} />
        </span>
      </button>

      {buka ? (
        <div className="mt-16">
          <p className="tiny mb-12">
            Setiap indikator dibagi menjadi beberapa rentang. Rentang yang Anda masuki
            menentukan status <strong>Aman</strong> (skor 0), <strong>Siaga</strong> (perlu
            perhatian), atau <strong>Bahaya</strong> (berisiko). Bila status berisiko dan
            indikator ditandai memicu rujukan, aplikasi otomatis membuat rujukan ke
            puskesmas.
          </p>

          {grup.map((g) => (
            <div key={g.kode} className="mb-16">
              <div className="row-between mb-8">
                <strong className="text-sm">{g.nama}</strong>
                {g.satuan ? <span className="tiny">{g.satuan}</span> : null}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {g.baris.map((b, i) => {
                  const s = STATUS[b.status] ?? STATUS.normal;
                  return (
                    <div
                      key={`${g.kode}-${i}`}
                      className="row-between items-center"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--surface-2, rgba(127,127,127,0.07))",
                      }}
                    >
                      <div className="row items-center gap-8">
                        <span className="tiny" style={{ minWidth: 78, fontWeight: 700 }}>
                          {rentang(b)}
                        </span>
                        <span className="tiny">
                          {LABEL_KATEGORI[b.kategori] ?? b.kategori}
                        </span>
                      </div>
                      <div className="row items-center gap-8">
                        {b.memicu_rujukan ? (
                          <span className="tiny" title="Otomatis membuat rujukan">
                            <Icon name="send" size={13} /> rujukan
                          </span>
                        ) : null}
                        <span className={`badge badge-${s.cls}`}>
                          <Icon name={s.ico} size={12} /> {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="tiny">
            <Icon name="shield" size={13} /> Tabel ini dikelola admin lewat menu Master
            Indikator. Angka bisa berubah bila kebijakan kesehatan diperbarui.
          </p>
        </div>
      ) : null}
    </div>
  );
}

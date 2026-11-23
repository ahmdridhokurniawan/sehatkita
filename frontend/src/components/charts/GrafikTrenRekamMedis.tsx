"use client";

import { useEffect, useState } from "react";
import Line from "@/components/charts/Line";
import { EmptyState } from "@/components/ui/Empty";
import Segmented from "@/components/ui/Segmented";
import PilihWarga from "@/components/warga/PilihWarga";
import { rekamMedis } from "@/lib/api";
import { tanggal } from "@/lib/format";
import type { RekamMedis as RekamMedisType, User, WargaCari } from "@/types";

const INDIKATOR: { k: string; label: string; unit: string; dec: number }[] = [
  { k: "imt", label: "Indeks Massa Tubuh (IMT)", unit: "", dec: 1 },
  { k: "bb_kg", label: "Berat Badan", unit: "kg", dec: 1 },
  { k: "sistol", label: "Tekanan Darah Sistol", unit: "mmHg", dec: 0 },
  { k: "diastol", label: "Tekanan Darah Diastol", unit: "mmHg", dec: 0 },
  { k: "gula_darah", label: "Gula Darah", unit: "mg/dL", dec: 0 },
  { k: "kolesterol", label: "Kolesterol", unit: "mg/dL", dec: 0 },
  { k: "asam_urat", label: "Asam Urat", unit: "mg/dL", dec: 1 },
];

const PERIODE = [
  { value: "1m", label: "1B" },
  { value: "3m", label: "3B" },
  { value: "6m", label: "6B" },
  { value: "1y", label: "1T" },
];

type Props = {
  user: User;
};

export default function GrafikTrenRekamMedis({ user }: Props) {
  const bisaPilihWarga = user.role === "kader" || user.role === "super_admin";
  const [wargaDipilih, setWargaDipilih] = useState<WargaCari | null>(null);
  const [indikator, setIndikator] = useState("sistol");
  const [periode, setPeriode] = useState<"1m" | "3m" | "6m" | "1y">("3m");
  const [grafik, setGrafik] = useState<RekamMedisType | null>(null);

  useEffect(() => {
    if (user.role === "admin_kelurahan") return;
    if (bisaPilihWarga && !wargaDipilih) {
      setGrafik(null);
      return;
    }
    let aktif = true;
    rekamMedis
      .get({ indikator, periode, user_id: wargaDipilih?.id })
      .then((res) => {
        if (aktif) setGrafik(res);
      })
      .catch(() => {
        if (aktif) setGrafik(null);
      });
    return () => {
      aktif = false;
    };
  }, [user.role, bisaPilihWarga, wargaDipilih, indikator, periode]);

  if (user.role === "admin_kelurahan") return null;

  const ind = INDIKATOR.find((i) => i.k === indikator) ?? INDIKATOR[0];
  const seri = grafik?.series?.[0]?.titik ?? [];

  return (
    <div className="card">
      <div className="row-between mb-12" style={{ flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong className="text-sm">Grafik Tren Kesehatan — {ind.label}</strong>
          <div className="tiny">Dipindahkan dari Rekam Medis agar pemantauan langsung terlihat di Beranda.</div>
        </div>
        <Segmented
          items={PERIODE}
          value={periode}
          onChange={(val) => setPeriode(val as "1m" | "3m" | "6m" | "1y")}
        />
      </div>

      {bisaPilihWarga ? (
        <div className="mb-12">
          <PilihWarga
            value={wargaDipilih}
            onChange={(w) => {
              setWargaDipilih(w);
              if (!w) setGrafik(null);
            }}
            id="beranda-grafik-warga"
            label="Pilih warga (NIK atau nama) untuk grafik tren"
            wilayahId={user.role === "kader" ? user.wilayah_id : null}
          />
        </div>
      ) : null}

      {bisaPilihWarga && !wargaDipilih ? (
        <EmptyState
          icon="users"
          title="Pilih warga terlebih dahulu"
          desc="Cari dan pilih warga berdasarkan NIK atau nama di atas untuk menampilkan grafik tren kesehatannya."
        />
      ) : seri.length < 2 ? (
        <EmptyState
          icon="line-chart"
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
        <label className="label" htmlFor="berandaPilihIndikator">
          Tampilkan indikator
        </label>
        <select
          className="select"
          id="berandaPilihIndikator"
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
  );
}

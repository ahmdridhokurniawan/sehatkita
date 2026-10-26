"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import CatatModal from "@/components/catatan/CatatModal";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { catatanKesehatan as catatanApi, ApiError } from "@/lib/api";
import { tanggal as fmtTanggal, angka } from "@/lib/format";
import type { CatatanKesehatan } from "@/types";
import { LABEL_KATEGORI_IMT } from "@/lib/labels";

/* ------------------------------------------------------------------
   Catatan Kesehatan — riwayat pengukuran (§7.3 GET /catatan-kesehatan).
   Data dari API nyata; form catat memakai CatatModal.
   ------------------------------------------------------------------ */

const LABEL_SUMBER: Record<string, string> = {
  mandiri: "Mandiri",
  kader: "Posbindu / Kader",
  puskesmas: "Fasilitas Kesehatan",
};

function tampil(nilai: number | null | undefined, satuan = ""): string {
  if (nilai === null || nilai === undefined) return "—";
  return `${nilai}${satuan}`;
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tiny">{label}</div>
      <div className="text-sm fw-600">{value}</div>
    </div>
  );
}

export default function CatatanKesehatanPage() {
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [daftar, setDaftar] = useState<CatatanKesehatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await catatanApi.list({ per_page: 50 });
      setDaftar(res ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat catatan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <AppShell onFab={() => setFormTerbuka(true)}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Catatan Kesehatan</h1>
          <p className="tiny">Riwayat pengukuran kamu.</p>
        </div>
        <button
          className="btn btn-sm btn-primary"
          type="button"
          onClick={() => setFormTerbuka(true)}
        >
          <Icon name="plus" size={15} /> Catat
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {daftar.length === 0 ? (
            <div className="card card-flat">
              <EmptyState
                title="Belum ada catatan"
                desc="Catat pengukuran pertamamu dengan tombol Catat."
              />
            </div>
          ) : (
            daftar.map((c) => (
              <div className="card card-flat" key={c.id}>
                <div className="row-between mb-12">
                  <strong className="text-sm">{fmtTanggal(c.dicatat_pada, "day")}</strong>
                  <div className="row gap-6">
                    {c.status_kesehatan ? (
                      <span className="badge badge-primary">{c.status_kesehatan}</span>
                    ) : null}
                    <span className="badge">
                      <Icon name="clipboard" size={12} /> {LABEL_SUMBER[c.sumber] ?? c.sumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-3" style={{ gap: 12 }}>
                  <Baris label="Berat badan" value={tampil(c.bb_kg, " kg")} />
                  <Baris
                    label="Tekanan darah"
                    value={
                      c.sistol != null && c.diastol != null
                        ? `${c.sistol}/${c.diastol} mmHg`
                        : "—"
                    }
                  />
                  <Baris label="Gula darah" value={tampil(c.gula_darah, " mg/dL")} />
                  <Baris label="Kolesterol" value={tampil(c.kolesterol, " mg/dL")} />
                  <Baris label="Asam urat" value={tampil(c.asam_urat, " mg/dL")} />
                  <Baris label="Lingkar perut" value={tampil(c.lingkar_perut, " cm")} />
                  <Baris
                    label="IMT"
                    value={
                      c.imt == null
                        ? "—"
                        : `${angka(c.imt, 1)}${
                            c.kategori_imt ? ` (${LABEL_KATEGORI_IMT[c.kategori_imt] ?? c.kategori_imt})` : ""
                          }`
                    }
                  />
                  <Baris label="Jam tidur" value={tampil(c.tidur_jam, " jam")} />
                  <Baris
                    label="Merokok"
                    value={c.merokok == null ? "—" : c.merokok ? "Ya" : "Tidak"}
                  />
                </div>

                {c.catatan ? <p className="tiny mt-8">{c.catatan}</p> : null}
              </div>
            ))
          )}
        </div>
      )}

      <CatatModal open={formTerbuka} onClose={() => setFormTerbuka(false)} onSaved={() => muat()} />
    </AppShell>
  );
}

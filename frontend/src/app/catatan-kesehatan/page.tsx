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
    let aktif = true;
    catatanApi
      .list({ per_page: 50 })
      .then((res) => {
        if (!aktif) return;
        setDaftar(res ?? []);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat catatan");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

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
            <div className="grid grid-2" style={{ gap: 12 }}>
              {daftar.map((c) => {
                const gulaLabel =
                  c.jenis_gula_darah === "puasa"
                    ? " (Puasa)"
                    : c.jenis_gula_darah === "2jam_pp"
                      ? " (2 Jam PP)"
                      : "";
                const items: { label: string; value: string }[] = [];
                if (c.bb_kg != null) items.push({ label: "Berat badan", value: `${angka(c.bb_kg, 1)} kg` });
                if (c.sistol != null && c.diastol != null)
                  items.push({ label: "Tekanan darah", value: `${c.sistol}/${c.diastol} mmHg` });
                if (c.gula_darah != null)
                  items.push({ label: `Gula darah${gulaLabel}`, value: `${angka(c.gula_darah, 0)} mg/dL` });
                if (c.kolesterol != null) items.push({ label: "Kolesterol", value: `${angka(c.kolesterol, 0)} mg/dL` });
                if (c.asam_urat != null) items.push({ label: "Asam urat", value: `${angka(c.asam_urat, 1)} mg/dL` });
                if (c.lingkar_perut != null) items.push({ label: "Lingkar perut", value: `${angka(c.lingkar_perut, 1)} cm` });
                if (c.imt != null)
                  items.push({
                    label: "IMT",
                    value: `${angka(c.imt, 1)}${
                      c.kategori_imt ? ` (${LABEL_KATEGORI_IMT[c.kategori_imt] ?? c.kategori_imt})` : ""
                    }`,
                  });
                if (c.tidur_jam != null) items.push({ label: "Jam tidur", value: `${angka(c.tidur_jam, 1)} jam` });
                if (c.merokok != null) items.push({ label: "Merokok", value: c.merokok ? "Ya" : "Tidak" });

                return (
                  <div className="card card-flat" key={c.id}>
                    <div className="row-between wrap gap-6 mb-12">
                      <strong className="text-sm">{fmtTanggal(c.dicatat_pada, "day")}</strong>
                      <div className="row gap-6 wrap">
                        {c.status_kesehatan ? (
                          <span className="badge badge-primary">{c.status_kesehatan}</span>
                        ) : null}
                        <span className="badge">
                          <Icon name="clipboard" size={12} /> {LABEL_SUMBER[c.sumber] ?? c.sumber}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {items.map((it) => (
                        <Baris key={it.label} label={it.label} value={it.value} />
                      ))}
                    </div>

                    {c.catatan ? <p className="tiny mt-10 border-t" style={{ paddingTop: 8 }}>{c.catatan}</p> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CatatModal open={formTerbuka} onClose={() => setFormTerbuka(false)} onSaved={() => muat()} />
    </AppShell>
  );
}

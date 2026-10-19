"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { LABEL_STATUS_RUJUKAN } from "@/lib/labels";
import { tanggal } from "@/lib/format";
import { rujukan as rujukanApi, ApiError } from "@/lib/api";
import type { StatusRujukan } from "@/lib/enums";

/* ------------------------------------------------------------------
   Rujukan — halaman masyarakat. Daftar rujukan ke fasilitas kesehatan
   dengan filter status + ringkasan jumlah per status.
   ------------------------------------------------------------------ */

type Tone = "info" | "peringatan" | "sukses" | "bahaya";

const TONE_STATUS: Record<StatusRujukan, Tone> = {
  baru: "info",
  dihubungi: "peringatan",
  tertangani: "sukses",
  ditolak: "bahaya",
};

const URUTAN_STATUS: StatusRujukan[] = ["baru", "dihubungi", "tertangani", "ditolak"];

const FILTER = [
  { value: "semua", label: "Semua" },
  ...URUTAN_STATUS.map((s) => ({ value: s, label: LABEL_STATUS_RUJUKAN[s] })),
];

export default function RujukanPage() {
  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [daftarRujukan, setDaftarRujukan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch rujukan on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await rujukanApi.list();
        setDaftarRujukan(res);
        setError("");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Gagal muat rujukan";
        setError(msg);
        console.error("Fetch rujukan:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return daftarRujukan.filter((r: any) => {
      const cocokStatus = filter === "semua" || r.status === filter;
      const cocokCari =
        q === "" ||
        r.faskes?.nama?.toLowerCase().includes(q) ||
        r.alasan?.toLowerCase().includes(q);
      return cocokStatus && cocokCari;
    });
  }, [filter, cari, daftarRujukan]);

  const hitung = (s: StatusRujukan) => daftarRujukan.filter((r: any) => r.status === s).length;

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Rujukan</h1>
          <p className="tiny">Daftar rujukan ke fasilitas kesehatan.</p>
        </div>
      </div>

      {error && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="row gap-10 items-center">
            <span className="text-danger">
              <Icon name="alert-circle" size={18} />
            </span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="tiny center">Memuat…</p>
        </div>
      ) : (
        <>
          <div className="grid grid-4 mb-12" style={{ gap: 10 }}>
            {URUTAN_STATUS.map((s) => (
              <div className="metric" key={s} style={{ alignItems: "center" }}>
                <span className="metric-val">{hitung(s)}</span>
                <span className="tiny">{LABEL_STATUS_RUJUKAN[s]}</span>
              </div>
            ))}
          </div>

          <Segmented items={FILTER} value={filter} onChange={setFilter} />

          <div className="input-icon mt-12">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari rujukan…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {daftar.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Tidak ada rujukan" desc="Tidak ada rujukan dengan status ini." />
              </div>
            ) : (
              daftar.map((r: any) => (
                <div className="card card-flat" key={r.id}>
                  <div className="row items-start gap-10">
                    <span className="li-ico">
                      <Icon name="send" size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="row-between">
                        <strong className="text-sm">{r.faskes?.nama || r.faskes}</strong>
                        <Badge tone={TONE_STATUS[r.status as StatusRujukan]}>{LABEL_STATUS_RUJUKAN[r.status as StatusRujukan]}</Badge>
                      </div>
                      <p className="tiny mt-4">{r.alasan}</p>
                      <p className="tiny mt-4">
                        <Icon name="calendar" size={12} /> Dibuat {tanggal(r.created_at, "day")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Data diambil dari GET /rujukan.
          </p>
        </>
      )}
    </AppShell>
  );
}

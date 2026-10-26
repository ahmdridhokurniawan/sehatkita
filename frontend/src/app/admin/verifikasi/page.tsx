"use client";

/**
 * Admin → Verifikasi Catatan Kesehatan (§15).
 * GET   /admin/catatan-kesehatan/perlu-verifikasi
 * PATCH /admin/catatan-kesehatan/{id}/verifikasi  { setuju: true|false }
 * setuju=true  → flag dilepas, masuk agregat
 * setuju=false → catatan di-soft-delete
 */

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/Empty";
import { tanggal, angka } from "@/lib/format";
import { LABEL_SUMBER } from "@/lib/labels";
import { admin as adminApi, ApiError } from "@/lib/api";
import type { CatatanKesehatan } from "@/types";

type Baris = CatatanKesehatan & {
  pengguna?: { id: number; name: string; email: string } | null;
};

export default function AdminVerifikasiPage() {
  const [daftar, setDaftar] = useState<Baris[]>([]);
  const [meta, setMeta] = useState<{ total: number; last_page: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proses, setProses] = useState<number | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.verifikasi.list({ page, per_page: 20 });
      setDaftar(res.data as Baris[]);
      setMeta(res.meta ? { total: res.meta.total, last_page: res.meta.last_page } : null);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function putuskan(id: number, setuju: boolean) {
    setProses(id);
    try {
      await adminApi.verifikasi.putuskan(id, setuju);
      setDaftar((lama) => lama.filter((b) => b.id !== id));
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan keputusan.");
    } finally {
      setProses(null);
    }
  }

  return (
    <AppShell noFab roles={["super_admin"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Verifikasi Catatan</h1>
          <p className="tiny">
            Catatan yang ditandai sistem butuh pengecekan sebelum masuk agregat wilayah.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={muat} disabled={loading}>
          <Icon name="refresh" size={15} /> Muat ulang
        </button>
      </div>

      {error && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--danger)" }}>
          <p className="tiny">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="tiny center py-16">Memuat…</p>
      ) : daftar.length === 0 ? (
        <EmptyState
          title="Tidak ada catatan menunggu"
          desc="Semua catatan ber-flag sudah diverifikasi."
        />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {daftar.map((b, idx) => (
            <div
              key={b.id}
              className="li"
              style={{
                borderBottom: idx < daftar.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "flex-start",
              }}
            >
              <span className="li-ico">
                <Icon name="clipboard" size={18} />
              </span>
              <div className="li-main">
                <strong className="text-sm">
                  {b.pengguna?.name || "Pengguna"} · {tanggal(b.dicatat_pada)}
                </strong>
                <span className="tiny">
                  Sumber {LABEL_SUMBER[b.sumber] || b.sumber}
                  {b.sistol && b.diastol ? ` · TD ${b.sistol}/${b.diastol}` : ""}
                  {b.gula_darah ? ` · Gula ${angka(b.gula_darah)}` : ""}
                  {b.imt ? ` · IMT ${angka(b.imt)}` : ""}
                </span>
                {b.catatan && <span className="tiny">{b.catatan}</span>}
              </div>
              <span className="li-side">
                {b.status_kesehatan && (
                  <Badge tone={b.status_kesehatan === "berisiko" ? "danger" : "warning"}>
                    {b.status_kesehatan}
                  </Badge>
                )}
              </span>
              <div className="row gap-8" style={{ flexShrink: 0 }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={proses === b.id}
                  onClick={() => putuskan(b.id, true)}
                >
                  Setujui
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={proses === b.id}
                  onClick={() => putuskan(b.id, false)}
                >
                  Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="row-between mt-16">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </button>
          <span className="tiny">
            Halaman {page} / {meta.last_page} · {meta.total} catatan
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= meta.last_page || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </button>
        </div>
      )}

      <p className="tiny center mt-16">
        <Icon name="info" size={13} /> Menolak catatan akan menghapusnya dari riwayat pengguna.
      </p>
    </AppShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { admin as adminApi, ApiError } from "@/lib/api";

const FILTER = [
  { value: "semua", label: "Semua" },
  { value: "puskesmas", label: "Puskesmas" },
  { value: "rumah_sakit", label: "Rumah Sakit" },
  { value: "klinik", label: "Klinik" },
];

const JENIS_BADGE: Record<string, string> = {
  puskesmas: "info",
  rumah_sakit: "danger",
  klinik: "warning",
};

export default function AdminFaskesPage() {
  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [daftar, setDaftar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch faskes on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await adminApi.faskes.list();
        setDaftar(res);
        setError("");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Gagal muat faskes";
        setError(msg);
        console.error("Fetch faskes:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return daftar.filter((f: any) => {
      const cocokJenis = filter === "semua" || f.jenis === filter;
      const cocokCari =
        q === "" ||
        f.nama?.toLowerCase().includes(q) ||
        f.alamat?.toLowerCase().includes(q) ||
        f.wilayah?.nama?.toLowerCase().includes(q);
      return cocokJenis && cocokCari;
    });
  }, [filter, cari, daftar]);

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Kelola Faskes</h1>
          <p className="tiny">Daftar fasilitas kesehatan & rujukan.</p>
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
          <div className="metric mb-12">
            <span className="metric-val">{daftar.length}</span>
            <span className="tiny">Total Faskes</span>
          </div>

          <Segmented items={FILTER} value={filter} onChange={setFilter} />

          <div className="input-icon mt-12">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari faskes…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Tidak ada faskes" desc="Tidak ada faskes dengan filter ini." />
              </div>
            ) : (
              filtered.map((f: any) => (
                <div className="card card-flat" key={f.id}>
                  <div className="row items-start gap-10">
                    <span className="li-ico">
                      <Icon name="hospital" size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="row-between">
                        <strong className="text-sm">{f.nama}</strong>
                        <Badge tone={JENIS_BADGE[f.jenis] as any || "muted"}>{f.jenis}</Badge>
                      </div>
                      <p className="tiny mt-4">{f.alamat}</p>
                      <p className="tiny mt-2">Wilayah: {f.wilayah?.nama || "—"}</p>
                      {f.telepon && <p className="tiny mt-2">📞 {f.telepon}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Data dari GET /admin/faskes.
          </p>
        </>
      )}
    </AppShell>
  );
}

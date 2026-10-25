"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { admin as adminApi, ApiError } from "@/lib/api";

import { LABEL_STATUS_KESEHATAN } from "@/lib/labels";
export default function AdminIndikatorPage() {
  const [indikator, setIndikator] = useState<any[]>([]);
  const [ambang, setAmbang] = useState<any[]>([]);
  const [tab, setTab] = useState<"indikator" | "ambang">("indikator");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch indikator & ambang on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [indRes, ambRes] = await Promise.all([
          adminApi.indikator.list(),
          adminApi.ambangKategori.list(),
        ]);
        setIndikator(indRes);
        setAmbang(ambRes);
        setError("");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Gagal muat indikator";
        setError(msg);
        console.error("Fetch indikator:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell noFab roles={["super_admin"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Indikator & Ambang</h1>
          <p className="tiny">Atur indikator kesehatan & kategori batas.</p>
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
          <div className="segmented mb-12">
            <button
              className={`segmented-item ${tab === "indikator" ? "active" : ""}`}
              onClick={() => setTab("indikator")}
            >
              Indikator ({indikator.length})
            </button>
            <button
              className={`segmented-item ${tab === "ambang" ? "active" : ""}`}
              onClick={() => setTab("ambang")}
            >
              Ambang ({ambang.length})
            </button>
          </div>

          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {tab === "indikator" &&
              (indikator.length === 0 ? (
                <div className="card card-flat">
                  <EmptyState title="Tidak ada indikator" desc="Belum ada indikator kesehatan." />
                </div>
              ) : (
                indikator.map((ind: any) => (
                  <div className="card card-flat" key={ind.id}>
                    <div className="row items-start gap-10">
                      <span className="li-ico">
                        <Icon name="activity" size={18} />
                      </span>
                      <div className="flex-1">
                        <div className="row-between">
                          <strong className="text-sm">{ind.nama}</strong>
                          <Badge tone="info">{ind.kode}</Badge>
                        </div>
                        <p className="tiny mt-4">Satuan: {ind.satuan}</p>
                        <p className="tiny mt-2">Kelompok: {ind.kelompok || "—"}</p>
                      </div>
                    </div>
                  </div>
                ))
              ))}

            {tab === "ambang" &&
              (ambang.length === 0 ? (
                <div className="card card-flat">
                  <EmptyState title="Tidak ada ambang" desc="Belum ada ambang batas kategori." />
                </div>
              ) : (
                ambang.map((amb: any) => (
                  <div className="card card-flat" key={amb.id}>
                    <div className="row items-start gap-10">
                      <span className="li-ico">
                        <Icon name="trending-up" size={18} />
                      </span>
                      <div className="flex-1">
                        <div className="row-between">
                          <strong className="text-sm">
                            {amb.indikator?.nama || "—"}
                          </strong>
                          <Badge tone="warning">{amb.kategori}</Badge>
                        </div>
                        <p className="tiny mt-4">
                          Batas: {amb.batas_min} — {amb.batas_max}
                        </p>
                        <p className="tiny mt-2">
                          Status: <strong>{LABEL_STATUS_KESEHATAN[amb.status as keyof typeof LABEL_STATUS_KESEHATAN] || amb.status}</strong> (Skor: {amb.skor})
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ))}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Ambang menentukan kategori yang dipakai saat menilai catatan baru.
          </p>
        </>
      )}
    </AppShell>
  );
}

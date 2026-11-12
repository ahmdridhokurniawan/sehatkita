"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/Empty";
import { pengaduanApi, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import type { Pengaduan, StatusPengaduan } from "@/types";
import "./pengaduan.css";

const STATUS_LABEL: Record<StatusPengaduan, string> = {
  menunggu: "Menunggu",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const STATUS_TONE: Record<StatusPengaduan, "warning" | "info" | "safe" | "danger"> = {
  menunggu: "warning",
  diproses: "info",
  selesai: "safe",
  ditolak: "danger",
};

const PENGOLAHAN: { kode: Exclude<StatusPengaduan, "menunggu">; label: string }[] = [
  { kode: "diproses", label: "Diproses" },
  { kode: "selesai", label: "Selesai" },
  { kode: "ditolak", label: "Ditolak" },
];

export default function HalamanAdminPengaduan() {
  const [list, setList] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  const [aktif, setAktif] = useState<Pengaduan | null>(null);
  const [status, setStatus] = useState<Exclude<StatusPengaduan, "menunggu">>("diproses");
  const [tanggapan, setTanggapan] = useState("");
  const [submit, setSubmit] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await pengaduanApi.list(filter ? { status: filter } : undefined);
      setList(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memuat pengaduan.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  const buka = (p: Pengaduan) => {
    setAktif(p);
    setStatus(p.status === "menunggu" ? "diproses" : p.status);
    setTanggapan(p.tanggapan ?? "");
    setPesan(null);
  };

  const simpan = async () => {
    if (!aktif || !tanggapan.trim() || submit) return;
    setSubmit(true);
    setPesan(null);
    try {
      await pengaduanApi.tanggapi(aktif.id, { status, tanggapan: tanggapan.trim() });
      setPesan("Tanggapan disimpan.");
      setAktif(null);
      await muat();
    } catch (e) {
      setPesan(e instanceof ApiError ? e.message : "Gagal menyimpan tanggapan.");
    } finally {
      setSubmit(false);
    }
  };

  return (
    <AppShell roles={["admin_kelurahan", "super_admin"]}>
      <div className="page-head">
        <h1>Pengaduan Warga</h1>
        <p className="muted">Tindak lanjuti keluhan warga di wilayahmu.</p>
      </div>

      <div className="row gap-8 mb-12">
        {["", "menunggu", "diproses", "selesai", "ditolak"].map((s) => (
          <button
            key={s || "semua"}
            type="button"
            className={`btn ${filter === s ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter(s)}
          >
            {s === "" ? "Semua" : STATUS_LABEL[s as StatusPengaduan]}
          </button>
        ))}
      </div>

      {loading ? (
        <EmptyState title="Memuat…" />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : list.length === 0 ? (
        <EmptyState title="Tidak ada pengaduan" desc="Tidak ada pengaduan dengan filter ini." />
      ) : (
        <div className="pengaduan-list">
          {list.map((p) => (
            <article key={p.id} className="card pengaduan-item">
              <div className="row-between">
                <div className="row gap-8">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <span className="badge badge-default">{p.wilayah?.nama ?? "—"}</span>
                </div>
                <span className="tiny muted">{tanggal(p.created_at, "long")}</span>
              </div>
              <h3 className="text-sm fw-600 mt-8">{p.judul}</h3>
              <p className="pengaduan-isi">{p.isi}</p>
              <div className="row-between mt-8">
                <span className="tiny muted">
                  {p.pengguna?.name ?? "—"} · {p.kategori}
                </span>
                <button type="button" className="link-btn" onClick={() => buka(p)}>
                  Tanggapi
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!aktif} onClose={() => setAktif(null)} title="Tanggapi Pengaduan">
        {aktif ? (
          <>
            <h3 className="text-sm fw-600">{aktif.judul}</h3>
            <p className="pengaduan-isi mt-8">{aktif.isi}</p>
            <div className="mt-16">
              <div className="field">
                <label className="label">Status Penanganan</label>
                <select
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Exclude<StatusPengaduan, "menunggu">)}
                >
                  {PENGOLAHAN.map((s) => (
                    <option key={s.kode} value={s.kode}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field mt-12">
                <label className="label">Tanggapan Resmi</label>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="Tuliskan tanggapan atau tindakan yang telah diambil…"
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                />
              </div>
            </div>
            {pesan ? <p className="alert alert-info mt-8">{pesan}</p> : null}
            <div className="row gap-8 mt-12" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setAktif(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submit || !tanggapan.trim()}
                onClick={simpan}
              >
                {submit ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}

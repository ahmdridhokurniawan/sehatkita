"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/Empty";
import { pengaduanApi, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import type { Pengaduan, KategoriPengaduan, StatusPengaduan } from "@/types";
import "./pengaduan.css";

const KATEGORI: { kode: KategoriPengaduan; label: string }[] = [
  { kode: "layanan_posbindu", label: "Layanan Posbindu" },
  { kode: "faskes", label: "Faskes" },
  { kode: "rujukan", label: "Rujukan" },
  { kode: "aplikasi", label: "Aplikasi" },
  { kode: "lainnya", label: "Lainnya" },
];

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

export default function HalamanPengaduan() {
  const [list, setList] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [kategori, setKategori] = useState<KategoriPengaduan>("layanan_posbindu");
  const [submit, setSubmit] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await pengaduanApi.list();
      setList(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memuat pengaduan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const kirim = async () => {
    if (!judul.trim() || !isi.trim() || submit) return;
    setSubmit(true);
    setPesan(null);
    try {
      await pengaduanApi.buat({
        judul: judul.trim(),
        isi: isi.trim(),
        kategori,
      });
      setJudul("");
      setIsi("");
      setKategori("layanan_posbindu");
      setPesan("Pengaduan terkirim. Terima kasih!");
      await muat();
    } catch (e) {
      setPesan(e instanceof ApiError ? e.message : "Gagal mengirim pengaduan.");
    } finally {
      setSubmit(false);
    }
  };

  return (
    <AppShell greet="Halo" roles={["user"]}>
      <div className="page-head">
        <h1>Pengaduan</h1>
        <p className="muted">Sampaikan keluhan atau saran. Kami akan tindak lanjuti.</p>
      </div>

      <div className="card mb-12">
        <h2 className="card-title">Kirim Pengaduan</h2>
        <div className="form-grid">
          <label>
            <span>Kategori</span>
            <select value={kategori} onChange={(e) => setKategori(e.target.value as KategoriPengaduan)}>
              {KATEGORI.map((k) => (
                <option key={k.kode} value={k.kode}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Judul</span>
            <input
              type="text"
              maxLength={150}
              placeholder="Ringkasan pengaduan"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
            />
          </label>
          <label className="span-2">
            <span>Isi keluhan</span>
            <textarea
              rows={4}
              placeholder="Jelaskan masalahnya…"
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
            />
          </label>
        </div>
        {pesan ? <p className="alert alert-info mt-8">{pesan}</p> : null}
        <div className="mt-12">
          <button
            type="button"
            className="btn btn-primary"
            disabled={submit || !judul.trim() || !isi.trim()}
            onClick={kirim}
          >
            {submit ? "Mengirim…" : "Kirim Pengaduan"}
          </button>
        </div>
      </div>

      <section>
        <div className="app-section-title">
          <h2>Riwayat Pengaduan</h2>
        </div>
        {loading ? (
          <EmptyState title="Memuat…" />
        ) : error ? (
          <ErrorState message={error} onRetry={muat} />
        ) : list.length === 0 ? (
          <EmptyState title="Belum ada pengaduan" desc="Belum ada pengaduan yang kamu kirim." />
        ) : (
          <div className="pengaduan-list">
            {list.map((p) => (
              <article key={p.id} className="card pengaduan-item">
                <div className="row-between">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <span className="tiny muted">{tanggal(p.created_at, "long")}</span>
                </div>
                <h3 className="text-sm fw-600 mt-8">{p.judul}</h3>
                <p className="pengaduan-isi">{p.isi}</p>
                <div className="row gap-8 mt-8">
                  <span className="badge badge-default">{kategoriLabel(p.kategori)}</span>
                </div>
                {p.tanggapan ? (
                  <div className="pengaduan-tanggapan mt-8">
                    <div className="row gap-6">
                      <Icon name="mail" size={14} />
                      <strong className="tiny">Tanggapan admin</strong>
                    </div>
                    <p className="tiny mt-4">{p.tanggapan}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function kategoriLabel(k: string): string {
  return KATEGORI.find((x) => x.kode === k)?.label ?? k;
}

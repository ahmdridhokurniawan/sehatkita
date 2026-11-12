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
  const [isError, setIsError] = useState(false);

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
    let aktif = true;
    pengaduanApi
      .list()
      .then((d) => {
        if (!aktif) return;
        setList(d);
        setError(null);
      })
      .catch((e) => {
        if (aktif) setError(e instanceof ApiError ? e.message : "Gagal memuat pengaduan.");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !isi.trim() || submit) return;
    setSubmit(true);
    setPesan(null);
    setIsError(false);
    try {
      await pengaduanApi.buat({
        judul: judul.trim(),
        isi: isi.trim(),
        kategori,
      });
      setJudul("");
      setIsi("");
      setKategori("layanan_posbindu");
      setPesan("Pengaduan berhasil dikirim. Terima kasih atas masukan Anda!");
      await muat();
    } catch (e) {
      setIsError(true);
      setPesan(e instanceof ApiError ? e.message : "Gagal mengirim pengaduan.");
    } finally {
      setSubmit(false);
    }
  };

  return (
    <AppShell greet="Halo" roles={["user"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Pengaduan Masyarakat</h1>
          <p className="tiny">Sampaikan keluhan, aspirasi, atau masukan untuk layanan kesehatan kelurahan.</p>
        </div>
      </div>

      <div className="card mb-20">
        <div className="row gap-12 items-center mb-16">
          <div
            className="stat-ico"
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius)",
              background: "var(--primary-050)",
              color: "var(--primary)",
            }}
          >
            <Icon name="edit" size={20} />
          </div>
          <div>
            <strong className="text-sm" style={{ fontSize: "1rem" }}>
              Tulis Pengaduan Baru
            </strong>
            <p className="tiny">Pengaduan akan ditinjau oleh pihak kelurahan dan fasilitas kesehatan terkait.</p>
          </div>
        </div>

        <form onSubmit={kirim}>
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field">
              <label className="label" htmlFor="kategori-pengaduan">
                Kategori <span className="req">*</span>
              </label>
              <select
                id="kategori-pengaduan"
                className="select"
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriPengaduan)}
              >
                {KATEGORI.map((k) => (
                  <option key={k.kode} value={k.kode}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="judul-pengaduan">
                Judul Pengaduan <span className="req">*</span>
              </label>
              <input
                id="judul-pengaduan"
                className="input"
                type="text"
                maxLength={150}
                placeholder="Contoh: Jadwal Posbindu RT 04"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field mt-12">
            <label className="label" htmlFor="isi-pengaduan">
              Isi Keluhan / Masukan <span className="req">*</span>
            </label>
            <textarea
              id="isi-pengaduan"
              className="textarea"
              rows={4}
              placeholder="Ceritakan detail keluhan atau masukan Anda secara jelas…"
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              required
            />
          </div>

          {pesan && (
            <div className={`alert ${isError ? "alert-danger" : "alert-success"} mt-12`}>
              <Icon name={isError ? "alert-circle" : "check-circle"} size={18} />
              <div>{pesan}</div>
            </div>
          )}

          <div className="mt-16 row-between items-center">
            <span className="tiny text-3">
              <Icon name="shield" size={13} /> Identitas Anda terlindungi sesuai ketentuan privasi.
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submit || !judul.trim() || !isi.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="send" size={16} />
              {submit ? "Mengirim…" : "Kirim Pengaduan"}
            </button>
          </div>
        </form>
      </div>

      <section>
        <div className="app-section-title">
          <h2>Riwayat Pengaduan Anda</h2>
          <span className="tiny">{list.length} pengaduan</span>
        </div>

        {loading ? (
          <EmptyState title="Memuat data pengaduan…" />
        ) : error ? (
          <ErrorState message={error} onRetry={muat} />
        ) : list.length === 0 ? (
          <EmptyState
            title="Belum ada pengaduan"
            desc="Anda belum pernah mengirim pengaduan. Kirimkan pengaduan melalui formulir di atas bila mengalami kendala."
          />
        ) : (
          <div className="pengaduan-list mt-12">
            {list.map((p) => (
              <article key={p.id} className="card card-flat" style={{ border: "1px solid var(--border)" }}>
                <div className="row-between mb-8">
                  <div className="row gap-8 items-center">
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    <span className="badge">{kategoriLabel(p.kategori)}</span>
                  </div>
                  <span className="tiny text-3">{tanggal(p.created_at, "long")}</span>
                </div>
                <h3 className="text-sm fw-700" style={{ fontSize: "1.05rem" }}>
                  {p.judul}
                </h3>
                <p className="tiny mt-6" style={{ lineHeight: 1.6, color: "var(--text)" }}>
                  {p.isi}
                </p>

                {p.tanggapan ? (
                  <div
                    className="mt-12"
                    style={{
                      background: "var(--surface-2)",
                      borderLeft: "4px solid var(--primary)",
                      borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                      padding: "12px 14px",
                    }}
                  >
                    <div className="row gap-6 items-center">
                      <span className="text-primary">
                        <Icon name="mail" size={15} />
                      </span>
                      <strong className="tiny">Tanggapan Kelurahan / Petugas:</strong>
                    </div>
                    <p className="tiny mt-4" style={{ lineHeight: 1.5, color: "var(--text)" }}>
                      {p.tanggapan}
                    </p>
                  </div>
                ) : (
                  <div className="row gap-6 mt-8 items-center">
                    <span className="text-3">
                      <Icon name="clock" size={13} />
                    </span>
                    <span className="tiny text-3">Menunggu peninjauan petugas kelurahan</span>
                  </div>
                )}
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

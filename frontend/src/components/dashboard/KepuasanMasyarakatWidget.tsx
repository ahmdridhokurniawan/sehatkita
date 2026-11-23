"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { kepuasanMasyarakatApi, ApiError } from "@/lib/api";
import { relatif } from "@/lib/format";
import type { KepuasanMasyarakatItem, KepuasanRingkasan } from "@/types";

const ASPEK_PILIHAN = [
  "Layanan Posbindu & Kader",
  "Kemudahan Pencatatan Kesehatan",
  "Fitur Rujukan & Faskes",
  "Materi Edukasi & Tantangan",
  "Kecepatan & Tampilan Aplikasi",
];

export function FormKepuasanMasyarakat() {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [aspek, setAspek] = useState(ASPEK_PILIHAN[0]);
  const [komentar, setKomentar] = useState("");
  const [kirim, setKirim] = useState(false);
  const [terkirim, setTerkirim] = useState(false);

  async function submit() {
    setKirim(true);
    try {
      await kepuasanMasyarakatApi.kirim({
        rating,
        aspek_pelayanan: aspek,
        komentar: komentar.trim() || undefined,
      });
      toast.success("Terima kasih atas penilaian kepuasan Anda!", { title: "Terkirim" });
      setKomentar("");
      setTerkirim(true);
    } catch (err) {
      const e = err as ApiError;
      toast.warning(e.message || "Gagal mengirim penilaian.");
    } finally {
      setKirim(false);
    }
  }

  return (
    <div className="card">
      <div className="row-between mb-8" style={{ flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong className="text-sm">Survei Kepuasan Masyarakat</strong>
          <div className="tiny">Masukan Anda tampil pada evaluasi Admin Kelurahan &amp; Super Admin.</div>
        </div>
        {terkirim ? <span className="pill pill-safe">Penilaian terkirim</span> : null}
      </div>

      <div className="row gap-6 mb-12" role="group" aria-label="Pilih rating bintang">
        {[1, 2, 3, 4, 5].map((b) => (
          <button
            key={b}
            type="button"
            className={"btn btn-sm " + (rating >= b ? "btn-primary" : "btn-outline")}
            style={rating >= b ? { color: "#ffffff" } : undefined}
            onClick={() => {
              setRating(b);
              setTerkirim(false);
            }}
          >
            ★ {b}
          </button>
        ))}
      </div>

      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label className="label" htmlFor="kepuasan-aspek">Aspek layanan</label>
          <select
            id="kepuasan-aspek"
            className="select"
            value={aspek}
            onChange={(e) => setAspek(e.target.value)}
          >
            {ASPEK_PILIHAN.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="kepuasan-komentar">Komentar / saran (opsional)</label>
          <input
            id="kepuasan-komentar"
            className="input"
            type="text"
            placeholder="Tulis saran singkat untuk layanan…"
            value={komentar}
            onChange={(e) => setKomentar(e.target.value)}
          />
        </div>
      </div>

      <div className="row mt-8" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-sm btn-primary" disabled={kirim} onClick={submit}>
          <Icon name="send" size={14} /> {kirim ? "Mengirim…" : "Kirim Penilaian"}
        </button>
      </div>
    </div>
  );
}

export function RekapKepuasanMasyarakat({ wilayahId }: { wilayahId?: number | null }) {
  const [items, setItems] = useState<KepuasanMasyarakatItem[]>([]);
  const [ringkasan, setRingkasan] = useState<KepuasanRingkasan | null>(null);

  useEffect(() => {
    let aktif = true;
    kepuasanMasyarakatApi
      .list({ per_page: 5, wilayah_id: wilayahId ?? undefined })
      .then((res) => {
        if (!aktif) return;
        setItems(res.data);
        setRingkasan(res.ringkasan);
      })
      .catch(() => {
        if (!aktif) return;
        setItems([]);
      });
    return () => {
      aktif = false;
    };
  }, [wilayahId]);

  return (
    <div className="card">
      <div className="row-between mb-12" style={{ flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong className="text-sm">Indeks Kepuasan Masyarakat</strong>
          <div className="tiny">Rekap penilaian warga terhadap layanan Posbindu &amp; SehatKita.</div>
        </div>
        <div className="row gap-8">
          <span className="pill pill-safe">
            ★ {ringkasan?.rata_rata_rating?.toFixed(1) ?? "0.0"} / 5.0
          </span>
          <span className="pill">
            IKM {ringkasan?.indeks_kepuasan_persen ?? 0}% ({ringkasan?.total_responden ?? 0} responden)
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="tiny">Belum ada penilaian kepuasan masyarakat yang masuk.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item) => (
            <div key={item.id} className="card card-flat" style={{ padding: "10px 12px" }}>
              <div className="row-between" style={{ gap: 8 }}>
                <strong className="text-xs">
                  {"★".repeat(item.rating)} ({item.rating}/5) · {item.aspek_pelayanan || "Layanan Umum"}
                </strong>
                <span className="tiny">
                  {item.pengguna?.name ?? "Warga"}
                  {item.wilayah?.nama ? ` · ${item.wilayah.nama}` : ""}
                  {item.created_at ? ` · ${relatif(item.created_at)}` : ""}
                </span>
              </div>
              {item.komentar ? (
                <p className="text-xs mt-4" style={{ marginBottom: 0 }}>{item.komentar}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

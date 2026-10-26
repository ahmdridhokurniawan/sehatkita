"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { program as programApi, ApiError } from "@/lib/api";
import type { Peringkat } from "@/types";

/* ------------------------------------------------------------------
   Peringkat kelurahan — §12.5 GET /peringkat.
   Dihitung dari exp_total, bukan data kesehatan.
   Nama disamarkan bila warga tidak mengaktifkan tampil_di_peringkat.
   Bila peserta < 5 → daftar kosong (suppression §12.5).
   ------------------------------------------------------------------ */

const MEDALI = ["#D4AF37", "#A8A8A8", "#B87333"];

export default function PeringkatPage() {
  const [data, setData] = useState<Peringkat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await programApi.peringkat();
      setData(res);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat peringkat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Peringkat Kelurahan</h1>
          <p className="tiny">
            Diurutkan dari perolehan EXP tantangan. Bukan penilaian kondisi kesehatan.
          </p>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : !data ? null : (
        <>
          <div className="card card-flat">
            <div className="row items-center gap-10">
              <span className="li-ico">
                <Icon name="trending-up" size={19} />
              </span>
              <div className="flex-1">
                <strong className="text-sm">{data.wilayah.nama}</strong>
                <p className="tiny">
                  {data.peserta_peringkat} peserta ikut diperingkat
                </p>
              </div>
            </div>
          </div>

          {data.saya ? (
            <div className="card card-flat mt-12" style={{ borderLeft: "4px solid var(--primary)" }}>
              <div className="row-between">
                <div>
                  <p className="tiny">Peringkat Anda</p>
                  <strong className="h3">
                    {data.saya.rank === null ? "—" : `#${data.saya.rank}`}
                  </strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="tiny">EXP</p>
                  <strong className="h3">{data.saya.exp_total}</strong>
                </div>
              </div>
              {data.saya.rank === null ? (
                <p className="tiny mt-8">
                  Peringkat belum ditampilkan karena peserta di kelurahan ini kurang dari 5.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="card card-flat mt-12">
            {data.daftar.length === 0 ? (
              <EmptyState
                title="Peringkat belum tersedia"
                desc={`Butuh minimal 5 peserta di ${data.wilayah.nama}. Saat ini ${data.peserta_peringkat} peserta.`}
              />
            ) : (
              data.daftar.map((b, i) => (
                <div className="li" key={b.rank}>
                  <span
                    className="li-ico"
                    style={
                      i < 3
                        ? { background: MEDALI[i], color: "#fff", fontWeight: 800 }
                        : { fontWeight: 800 }
                    }
                  >
                    {b.rank}
                  </span>
                  <div className="li-main">
                    <strong className="text-sm">{b.nama}</strong>
                    <span className="tiny">Level {b.level_gamifikasi}</span>
                  </div>
                  <div className="li-side">
                    <strong className="text-sm">{b.exp_total}</strong>
                    <span className="tiny">EXP</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="shield" size={13} /> Nama hanya tampil bila Anda mengaktifkan
            &quot;Tampilkan nama di peringkat&quot; pada menu Profil.
          </p>
        </>
      )}
    </AppShell>
  );
}

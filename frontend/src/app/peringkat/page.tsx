"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { program as programApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import type { Peringkat, Wilayah } from "@/types";

/* ------------------------------------------------------------------
   Peringkat kelurahan — §12.5 GET /peringkat.
   Dihitung dari exp_total, bukan data kesehatan.
   Nama disamarkan bila warga tidak mengaktifkan tampil_di_peringkat.
   Bila peserta < 5 → daftar kosong (suppression §12.5).
   ------------------------------------------------------------------ */

const MEDALI = [
  { warna: "#D4AF37", bg: "rgba(212, 175, 55, 0.14)", label: "Juara 1 · Emas", ikon: "🏆" },
  { warna: "#94A3B8", bg: "rgba(148, 163, 184, 0.16)", label: "Juara 2 · Perak", ikon: "🥈" },
  { warna: "#B87333", bg: "rgba(184, 115, 51, 0.15)", label: "Juara 3 · Perunggu", ikon: "🥉" },
];

export default function PeringkatPage() {
  const { user, loading: loadingUser } = useUser();
  const [data, setData] = useState<Peringkat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // super_admin tidak punya wilayah sendiri — wajib pilih kelurahan.
  const perluPilihWilayah = user?.role === "super_admin";
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [wilayahId, setWilayahId] = useState<number | null>(null);

  useEffect(() => {
    if (!perluPilihWilayah) return;
    let aktif = true;
    wilayahApi
      .list({ tipe: "kelurahan" })
      .then((rows) => {
        if (!aktif) return;
        setWilayahList(rows);
        if (rows.length) setWilayahId((kini) => kini ?? rows[0].id);
        else setLoading(false);
      })
      .catch(() => {
        if (!aktif) return;
        setWilayahList([]);
        setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [perluPilihWilayah]);

  const muat = useCallback(async () => {
    if (loadingUser || (perluPilihWilayah && !wilayahId)) return;
    setLoading(true);
    try {
      const res = await programApi.peringkat(
        perluPilihWilayah && wilayahId ? { wilayah_id: wilayahId } : undefined,
      );
      setData(res);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat peringkat");
    } finally {
      setLoading(false);
    }
  }, [loadingUser, perluPilihWilayah, wilayahId]);

  useEffect(() => {
    if (loadingUser || (perluPilihWilayah && !wilayahId)) return;
    let aktif = true;
    programApi
      .peringkat(perluPilihWilayah && wilayahId ? { wilayah_id: wilayahId } : undefined)
      .then((res) => {
        if (!aktif) return;
        setData(res);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat peringkat");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [loadingUser, perluPilihWilayah, wilayahId]);

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Peringkat Kelurahan</h1>
          <p className="tiny">
            Diurutkan dari perolehan EXP tantangan. Bukan penilaian kondisi kesehatan.
          </p>
        </div>
        {perluPilihWilayah ? (
          <select
            value={wilayahId ?? ""}
            onChange={(e) => {
              setLoading(true);
              setWilayahId(Number(e.target.value) || null);
            }}
            className="input"
            aria-label="Pilih kelurahan"
            style={{ maxWidth: 220 }}
          >
            {wilayahList.length ? null : <option value="">Pilih kelurahan…</option>}
            {wilayahList.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nama}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : !data ? null : (
        <>
          <div className="card card-flat">
            <div className="row items-center gap-10">
              <span className="li-ico" style={{ background: "rgba(212, 175, 55, 0.16)", color: "#D4AF37" }}>
                <Icon name="trophy" size={19} />
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
                icon="award"
                title="Peringkat belum tersedia"
                desc={`Butuh minimal 5 peserta di ${data.wilayah.nama}. Saat ini ${data.peserta_peringkat} peserta.`}
              />
            ) : (
              data.daftar.map((b, i) => {
                const juara = i < 3 ? MEDALI[i] : null;
                return (
                  <div
                    className="li"
                    key={b.rank}
                    style={juara ? { background: juara.bg, borderRadius: 10, paddingInline: 10 } : undefined}
                  >
                    <span
                      className="li-ico"
                      style={
                        juara
                          ? { background: juara.warna, color: "#fff", fontWeight: 800 }
                          : { fontWeight: 800 }
                      }
                      title={juara ? juara.label : `Peringkat ${b.rank}`}
                    >
                      {juara ? <Icon name="trophy" size={17} /> : b.rank}
                    </span>
                    <div className="li-main">
                      <div className="row wrap items-center gap-6">
                        <strong className="text-sm">
                          {juara ? `${juara.ikon} ` : ""}
                          {b.nama}
                        </strong>
                        {juara ? (
                          <span
                            className="tiny fw-600"
                            style={{
                              padding: "1px 8px",
                              borderRadius: 999,
                              background: "var(--surface)",
                              border: `1px solid ${juara.warna}`,
                              color: juara.warna,
                            }}
                          >
                            {juara.label}
                          </span>
                        ) : null}
                      </div>
                      <span className="tiny">Level {b.level_gamifikasi}</span>
                    </div>
                    <div className="li-side">
                      <strong className="text-sm">{b.exp_total}</strong>
                      <span className="tiny">EXP</span>
                    </div>
                  </div>
                );
              })
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

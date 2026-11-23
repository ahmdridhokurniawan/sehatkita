"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import TombolKembaliAdmin from "@/components/admin/TombolKembaliAdmin";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { achievementApi, program as programApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { angka, tanggal } from "@/lib/format";
import type { AchievementResponse, Peringkat, Wilayah } from "@/types";

/* ------------------------------------------------------------------
   Peringkat kelurahan — §12.5 GET /peringkat.
   Dihitung dari exp_total, bukan data kesehatan.
   Nama disamarkan bila warga tidak mengaktifkan tampil_di_peringkat.
   Bila peserta < 5 → daftar kosong (suppression §12.5).
   ------------------------------------------------------------------ */

const MEDALI = [
  { warna: "#B48A18", bg: "rgba(180, 138, 24, 0.12)", label: "Juara 1" },
  { warna: "#64748B", bg: "rgba(100, 116, 139, 0.12)", label: "Juara 2" },
  { warna: "#9A5B25", bg: "rgba(154, 91, 37, 0.12)", label: "Juara 3" },
];

export default function PeringkatPage() {
  const { user, loading: loadingUser } = useUser();
  const isWarga = user?.role === "user";
  const [data, setData] = useState<Peringkat | null>(null);
  const [achievement, setAchievement] = useState<AchievementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");
  const [tabInfo, setTabInfo] = useState<"lencana" | "riwayat">("lencana");

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
      const [res, ach] = await Promise.all([
        programApi.peringkat(
          perluPilihWilayah && wilayahId ? { wilayah_id: wilayahId } : undefined,
        ),
        isWarga ? achievementApi.list().catch(() => null) : Promise.resolve(null),
      ]);
      setData(res);
      setAchievement(ach);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat peringkat");
    } finally {
      setLoading(false);
    }
  }, [loadingUser, perluPilihWilayah, wilayahId, isWarga]);

  useEffect(() => {
    if (loadingUser || (perluPilihWilayah && !wilayahId)) return;
    let aktif = true;
    Promise.all([
      programApi.peringkat(
        perluPilihWilayah && wilayahId ? { wilayah_id: wilayahId } : undefined,
      ),
      isWarga ? achievementApi.list().catch(() => null) : Promise.resolve(null),
    ])
      .then(([res, ach]) => {
        if (!aktif) return;
        setData(res);
        setAchievement(ach);
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
  }, [loadingUser, perluPilihWilayah, wilayahId, isWarga]);

  return (
    <AppShell noFab>
      <TombolKembaliAdmin hanyaSuperAdmin />
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

      {tampilLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : !data ? null : (
        <>
          <section className="card sa-board">
            <div className="prof-band">
              <div className="row-between wrap gap-12">
                <div className="row items-center gap-10">
                  <span
                    className="li-ico"
                    style={{ background: "rgba(180, 138, 24, 0.12)", color: "#B48A18", borderColor: "transparent" }}
                  >
                    <Icon name="trophy" size={18} />
                  </span>
                  <div>
                    <strong className="text-sm">{data.wilayah.nama}</strong>
                    <p className="tiny">
                      {data.peserta_peringkat} peserta ikut diperingkat
                      {data.periode ? ` · Periode ${data.periode.label}` : ""}
                    </p>
                  </div>
                </div>
                {data.periode ? (
                  <div style={{ textAlign: "right" }}>
                    <Badge tone="info">Siklus 3 Bulan · {data.periode.kode}</Badge>
                    <p className="tiny mt-4">
                      Reset EXP berikutnya {tanggal(data.periode.reset_berikutnya, "short")} ({data.periode.sisa_hari} hari lagi)
                    </p>
                  </div>
                ) : null}
              </div>

              {data.saya ? (
                <>
                  <div className="stat-strip is-2 mt-12">
                    <div className="stat-cell">
                      <span className="stat-cell-label">Peringkat Anda</span>
                      <strong className="stat-cell-val">
                        {data.saya.rank === null ? "—" : `#${data.saya.rank}`}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-cell-label">Total EXP</span>
                      <strong className="stat-cell-val">{angka(data.saya.exp_total)}</strong>
                    </div>
                  </div>
                  {data.saya.rank === null ? (
                    <p className="tiny mt-8">
                      Peringkat belum ditampilkan karena peserta di kelurahan ini kurang dari 5.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="board-band">
              {data.daftar.length === 0 ? (
                <div style={{ padding: "24px" }}>
                  <EmptyState
                    icon="award"
                    title="Peringkat belum tersedia"
                    desc={`Butuh minimal 5 peserta di ${data.wilayah.nama}. Saat ini ${data.peserta_peringkat} peserta.`}
                  />
                </div>
              ) : (
                data.daftar.map((b, i) => {
                  const juara = i < 3 ? MEDALI[i] : null;
                  return (
                    <div className="li" key={b.rank} style={{ paddingInline: 24 }}>
                      <span
                        className="li-ico"
                        style={
                          juara
                            ? { background: juara.bg, color: juara.warna, borderColor: "transparent", fontWeight: 700 }
                            : { fontWeight: 700 }
                        }
                        title={juara ? juara.label : `Peringkat ${b.rank}`}
                      >
                        {juara ? <Icon name="trophy" size={16} /> : b.rank}
                      </span>
                      <div className="li-main">
                        <div className="row wrap items-center gap-8">
                          <strong className="text-sm">{b.nama}</strong>
                          {juara ? (
                            <span className="tiny fw-600" style={{ color: juara.warna }}>
                              {juara.label}
                            </span>
                          ) : null}
                        </div>
                        <span className="tiny">Level {b.level_gamifikasi}</span>
                      </div>
                      <div className="li-side" style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                        <strong className="text-sm">{b.exp_total}</strong>
                        <span className="tiny">EXP</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {user?.role === "user" ? (
            <section className="card sa-board mt-16">
              <div className="prof-band">
                <div className="row-between wrap gap-8 mb-12">
                  <div>
                    <h2 className="h4" style={{ margin: 0 }}>Lencana &amp; Riwayat Aktivitas</h2>
                    <p className="tiny">
                      {tabInfo === "lencana"
                        ? "Simbol pencapaian permanen meski EXP peringkat direset tiap 3 bulan."
                        : "Arsip perolehan EXP dan peringkat akhir setiap pergantian periode 3 bulan."}
                    </p>
                  </div>
                  {tabInfo === "lencana" && achievement ? (
                    <Badge tone="safe">
                      {angka(achievement.ringkasan.diraih)} / {angka(achievement.ringkasan.total)} Diraih ({achievement.ringkasan.persen}%)
                    </Badge>
                  ) : null}
                </div>

                <div className="tabs kalk-tabs" role="tablist" aria-label="Informasi pencapaian" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tabInfo === "lencana"}
                    className={`tab${tabInfo === "lencana" ? " active" : ""}`}
                    onClick={() => setTabInfo("lencana")}
                  >
                    Lencana Keaktifan
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tabInfo === "riwayat"}
                    className={`tab${tabInfo === "riwayat" ? " active" : ""}`}
                    onClick={() => setTabInfo("riwayat")}
                  >
                    Riwayat 3 Bulan
                  </button>
                </div>
              </div>

              <div className="prof-band board-band">
                {tabInfo === "lencana" ? (
                  achievement ? (
                    <>
                      <div className="progress mb-12" style={{ height: 6 }}>
                        <i style={{ width: `${achievement.ringkasan.persen}%`, background: "var(--primary)" }} />
                      </div>
                      <div className="grid grid-2" style={{ gap: 12 }}>
                        {achievement.daftar.map((item) => {
                          const tierLabel =
                            item.tier === "emas" ? "Emas" : item.tier === "perak" ? "Perak" : "Perunggu";
                          return (
                            <div
                              key={item.kode}
                              style={{
                                padding: "12px 0",
                                borderTop: "1px solid var(--border)",
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                opacity: item.diraih ? 1 : 0.65,
                              }}
                            >
                              <span
                                className="li-ico shrink-0"
                                style={{
                                  background: item.diraih ? "var(--primary-050)" : "var(--surface-2)",
                                  color: item.diraih ? "var(--primary)" : "var(--text-3)",
                                }}
                              >
                                <Icon name={item.ikon || "award"} size={18} />
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="row-between wrap gap-6">
                                  <strong className="text-sm">{item.nama}</strong>
                                  <Badge tone={item.diraih ? "safe" : "default"}>
                                    {item.diraih ? `${tierLabel} · Diraih` : tierLabel}
                                  </Badge>
                                </div>
                                <p className="tiny mt-2">{item.deskripsi}</p>
                                <p className="tiny mt-2" style={{ color: "var(--text-3)" }}>
                                  Syarat: {item.syarat}
                                  {item.diraih && item.diraih_pada ? ` · Diraih ${tanggal(item.diraih_pada, "short")}` : ""}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="tiny">Data lencana belum tersedia.</p>
                  )
                ) : data.riwayat_saya && data.riwayat_saya.length > 0 ? (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Periode</th>
                          <th>Wilayah</th>
                          <th className="num">EXP Akhir</th>
                          <th className="num">Level</th>
                          <th className="num">Peringkat Akhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.riwayat_saya.map((r) => (
                          <tr key={r.periode_kode}>
                            <td>
                              <strong>{r.periode_label}</strong>
                              <div className="tiny">{r.periode_kode}</div>
                            </td>
                            <td>{r.wilayah?.nama || data.wilayah.nama}</td>
                            <td className="num"><strong>{angka(r.exp_akhir)} EXP</strong></td>
                            <td className="num">Level {r.level_akhir}</td>
                            <td className="num">
                              {r.peringkat_akhir != null ? `#${r.peringkat_akhir} / ${angka(r.total_peserta)}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="tiny">
                    Belum ada riwayat periode 3 bulanan sebelumnya. Catatan EXP &amp; peringkat terakhir akan muncul di sini setelah pergantian kuartal pertama.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <div
            className="tiny mt-16 mb-16"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}
          >
            <Icon name="shield" size={14} className="shrink-0" />
            <span>
              {user?.role === "user"
                ? 'Demi privasi, nama Anda disamarkan menjadi "Peserta anonim" kecuali opsi "Tampilkan nama di peringkat" diaktifkan pada menu Profil.'
                : 'Demi privasi, peserta yang tidak mengaktifkan "Tampilkan nama di peringkat" pada profilnya akan ditampilkan sebagai "Peserta anonim".'}
            </span>
          </div>
        </>
      )}
    </AppShell>
  );
}

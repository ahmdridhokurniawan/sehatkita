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
  { warna: "#D4AF37", bg: "rgba(212, 175, 55, 0.14)", label: "Juara 1 · Emas", ikon: "🏆" },
  { warna: "#94A3B8", bg: "rgba(148, 163, 184, 0.16)", label: "Juara 2 · Perak", ikon: "🥈" },
  { warna: "#B87333", bg: "rgba(184, 115, 51, 0.15)", label: "Juara 3 · Perunggu", ikon: "🥉" },
];

export default function PeringkatPage() {
  const { user, loading: loadingUser } = useUser();
  const isWarga = user?.role === "user";
  const [data, setData] = useState<Peringkat | null>(null);
  const [achievement, setAchievement] = useState<AchievementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
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
          <div className="card card-flat">
            <div className="row-between wrap gap-12">
              <div className="row items-center gap-10">
                <span className="li-ico" style={{ background: "rgba(212, 175, 55, 0.16)", color: "#D4AF37" }}>
                  <Icon name="trophy" size={19} />
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
          </div>

          {user?.role === "user" && achievement ? (
            <section className="card card-flat mt-12">
              <div className="row-between wrap gap-8 mb-8">
                <div>
                  <h2 className="h4" style={{ margin: 0 }}>Achievement &amp; Lencana Keaktifan</h2>
                  <p className="tiny">
                    Simbol pencapaian aktif yang bersifat permanen meskipun EXP peringkat direset tiap 3 bulan.
                  </p>
                </div>
                <Badge tone="safe">
                  {angka(achievement.ringkasan.diraih)} / {angka(achievement.ringkasan.total)} Diraih ({achievement.ringkasan.persen}%)
                </Badge>
              </div>
              <div className="progress mb-12" style={{ height: 7 }}>
                <i style={{ width: `${achievement.ringkasan.persen}%`, background: "var(--primary)" }} />
              </div>
              <div className="grid grid-2" style={{ gap: 10 }}>
                {achievement.daftar.map((item) => {
                  const tierLabel =
                    item.tier === "emas" ? "Emas" : item.tier === "perak" ? "Perak" : "Perunggu";
                  return (
                    <div
                      key={item.kode}
                      className="flat-sub"
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        opacity: item.diraih ? 1 : 0.72,
                        borderColor: item.diraih ? "var(--primary)" : "var(--border)",
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
            </section>
          ) : null}

          {user?.role === "user" ? (
            <section className="card card-flat mt-12">
              <div className="row-between wrap gap-8 mb-8">
                <div>
                  <h2 className="h4" style={{ margin: 0 }}>Riwayat Peringkat &amp; EXP (Reset Per 3 Bulan)</h2>
                  <p className="tiny">
                    Setiap pergantian periode 3 bulan, EXP direset ke 0 sementara perolehan EXP &amp; peringkat terakhir Anda diarsipkan di sini.
                  </p>
                </div>
              </div>
              {data.riwayat_saya && data.riwayat_saya.length > 0 ? (
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
            </section>
          ) : null}

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
                          ? { background: juara.warna, color: "#141B0B", fontWeight: 800 }
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
                    <div className="li-side" style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                      <strong className="text-sm">{b.exp_total}</strong>
                      <span className="tiny">EXP</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

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

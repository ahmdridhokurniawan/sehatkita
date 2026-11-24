"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import TombolKembaliAdmin from "@/components/admin/TombolKembaliAdmin";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
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

const GAYA_BADGE_KATEGORI: Record<string, { label: string; warna: string; bg: string }> = {
  pencatatan: { label: "Pencatatan", warna: "#10B981", bg: "rgba(16, 185, 129, 0.14)" },
  posbindu: { label: "Posbindu", warna: "#F43F5E", bg: "rgba(244, 63, 94, 0.14)" },
  target: { label: "Target", warna: "#8B5CF6", bg: "rgba(139, 92, 246, 0.14)" },
  tantangan: { label: "Tantangan", warna: "#F59E0B", bg: "rgba(245, 158, 11, 0.14)" },
  edukasi: { label: "Edukasi", warna: "#0EA5E9", bg: "rgba(14, 165, 233, 0.14)" },
  keaktifan: { label: "Keaktifan", warna: "#EAB308", bg: "rgba(234, 179, 8, 0.14)" },
  program: { label: "Program", warna: "#14B8A6", bg: "rgba(20, 184, 166, 0.14)" },
};

const IKON_BADGE_KODE: Record<string, string> = {
  langkah_pertama: "activity",
  rajin_mencatat: "clipboard",
  konsisten_sehat: "flame",
  aktif_posbindu: "heart-pulse",
  rutin_posbindu: "shield",
  penakluk_target: "target",
  pejuang_tantangan: "trophy",
  pembelajar_sehat: "book-open",
  warga_teladan: "star",
  sahabat_sehat: "sparkles",
};

const TUJUAN_KEAKTIFAN: Record<string, { href: string; label: string }> = {
  langkah_pertama: { href: "/rekam-medis", label: "Catat Pemeriksaan →" },
  rajin_mencatat: { href: "/rekam-medis", label: "Catat Pemeriksaan →" },
  konsisten_sehat: { href: "/rekam-medis", label: "Catat Pemeriksaan →" },
  aktif_posbindu: { href: "/posbindu", label: "Lihat Posbindu →" },
  rutin_posbindu: { href: "/posbindu", label: "Lihat Posbindu →" },
  penakluk_target: { href: "/target-kesehatan", label: "Kelola Target →" },
  pejuang_tantangan: { href: "/program", label: "Lihat Tantangan →" },
  pembelajar_sehat: { href: "/edukasi", label: "Buka Edukasi →" },
  sahabat_sehat: { href: "/dashboard", label: "Isi Survei di Beranda →" },
};

export default function PeringkatPage() {
  const { user, loading: loadingUser } = useUser();
  const isWarga = user?.role === "user";
  const [data, setData] = useState<Peringkat | null>(null);
  const [achievement, setAchievement] = useState<AchievementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");
  const [tabInfo, setTabInfo] = useState<"lencana" | "riwayat">("lencana");
  const [filterLencana, setFilterLencana] = useState<"semua" | "diraih" | "belum" | "lewat">("semua");
  const [lencanaPage, setLencanaPage] = useState(1);
  const [lencanaPerPage, setLencanaPerPage] = useState(6);

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
                      <span className="stat-cell-label">Total Lencana (Badge)</span>
                      <strong className="stat-cell-val">
                        {angka(data.saya.jumlah_badge ?? data.saya.badges?.length ?? 0)} Badge
                      </strong>
                      <span className="tiny">({angka(data.saya.exp_total)} EXP)</span>
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
                        <div className="row wrap items-center gap-6 mt-2">
                          <span className="tiny">
                            Level {b.level_gamifikasi} · {b.exp_total} EXP
                          </span>
                          {b.badges && b.badges.length > 0 ? (
                            <span className="row items-center gap-4" title={b.badges.join(", ")}>
                              {b.badges.slice(0, 5).map((kode) => (
                                <span
                                  key={kode}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 20,
                                    height: 20,
                                    borderRadius: 999,
                                    background: "var(--primary-050)",
                                    color: "var(--primary)",
                                  }}
                                  title={kode.replace(/_/g, " ")}
                                >
                                  <Icon name={IKON_BADGE_KODE[kode] || "trophy"} size={12} />
                                </span>
                              ))}
                              {b.badges.length > 5 ? (
                                <span className="tiny">+{b.badges.length - 5}</span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="li-side" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Icon name="award" size={14} className="text-primary" />
                        <strong className="text-sm">{b.jumlah_badge ?? b.badges?.length ?? 0}</strong>
                        <span className="tiny">Badge</span>
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
                    (() => {
                      const semuaLencana = achievement.daftar;
                      const jmlDiraih = semuaLencana.filter((d) => d.diraih).length;
                      const jmlLewat = semuaLencana.filter((d) => !d.diraih && Boolean(d.lewat_tenggat)).length;
                      const jmlBelum = semuaLencana.filter((d) => !d.diraih && !d.lewat_tenggat).length;

                      const daftarTersaring = semuaLencana.filter((d) => {
                        if (filterLencana === "diraih") return d.diraih;
                        if (filterLencana === "lewat") return !d.diraih && Boolean(d.lewat_tenggat);
                        if (filterLencana === "belum") return !d.diraih && !d.lewat_tenggat;
                        return true;
                      });

                      const totalLencana = daftarTersaring.length;
                      const lastPage = Math.max(1, Math.ceil(totalLencana / lencanaPerPage));
                      const curPage = Math.min(lencanaPage, lastPage);
                      const daftarTampil = daftarTersaring.slice(
                        (curPage - 1) * lencanaPerPage,
                        curPage * lencanaPerPage,
                      );

                      return (
                        <>
                          <div className="progress mb-12" style={{ height: 6 }}>
                            <i style={{ width: `${achievement.ringkasan.persen}%`, background: "var(--primary)" }} />
                          </div>
                          <div className="chip-row mb-14" style={{ flexWrap: "wrap", gap: 6 }}>
                            {[
                              { k: "semua" as const, l: `Semua (${angka(semuaLencana.length)})` },
                              { k: "diraih" as const, l: `Sudah Diraih (${angka(jmlDiraih)})` },
                              { k: "belum" as const, l: `Belum Diraih (${angka(jmlBelum)})` },
                              { k: "lewat" as const, l: `Lewat Tenggat (${angka(jmlLewat)})` },
                            ].map((opt) => (
                              <button
                                key={opt.k}
                                type="button"
                                className={`chip${filterLencana === opt.k ? " is-active" : ""}`}
                                onClick={() => {
                                  setFilterLencana(opt.k);
                                  setLencanaPage(1);
                                }}
                              >
                                {opt.l}
                              </button>
                            ))}
                          </div>
                          {daftarTampil.length === 0 ? (
                            <EmptyState
                              icon="award"
                              title="Tidak ada lencana pada filter ini"
                              desc="Pilih filter lain untuk melihat daftar lencana Anda."
                            />
                          ) : (
                            <div className="grid grid-2" style={{ gap: 12 }}>
                              {daftarTampil.map((item) => {
                                const gaya = GAYA_BADGE_KATEGORI[item.kategori] ?? {
                                  label: item.kategori || "Lencana",
                                  warna: "var(--primary)",
                                  bg: "var(--primary-050)",
                                };
                                const lewat = !item.diraih && Boolean(item.lewat_tenggat);
                                const tujuanKeaktifan =
                                  !item.diraih && item.sumber === "keaktifan"
                                    ? TUJUAN_KEAKTIFAN[item.kode]
                                    : undefined;

                                return (
                                  <div
                                    key={item.kode}
                                    className="card card-flat"
                                    style={{
                                      padding: "14px 16px",
                                      display: "flex",
                                      gap: 12,
                                      alignItems: "flex-start",
                                      opacity: item.diraih ? 1 : lewat ? 0.65 : 0.88,
                                      borderColor: item.diraih
                                        ? "color-mix(in srgb, var(--primary) 34%, var(--border))"
                                        : undefined,
                                    }}
                                  >
                                    <span
                                      className="li-ico shrink-0"
                                      style={{
                                        background: item.diraih ? gaya.bg : "var(--surface-2)",
                                        color: item.diraih ? gaya.warna : "var(--text-3)",
                                        borderColor: "transparent",
                                      }}
                                    >
                                      <Icon name={item.ikon || "award"} size={18} />
                                    </span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div className="row-between wrap gap-6">
                                        <strong className="text-sm">{item.nama}</strong>
                                        <Badge tone={item.diraih ? "safe" : lewat ? "danger" : "default"}>
                                          {item.diraih
                                            ? `${gaya.label} · Diraih`
                                            : lewat
                                              ? "Lewat Tenggat"
                                              : gaya.label}
                                        </Badge>
                                      </div>
                                      <p className="tiny mt-4">{item.deskripsi}</p>
                                      <p className="tiny mt-4" style={{ color: "var(--text-3)" }}>
                                        Syarat: {item.syarat}
                                        {item.diraih && item.diraih_pada ? ` · Diraih ${tanggal(item.diraih_pada, "short")}` : ""}
                                        {!item.diraih && item.tenggat
                                          ? ` · Tenggat ${tanggal(item.tenggat, "short")}`
                                          : ""}
                                      </p>
                                      {!item.diraih && item.sumber === "program" ? (
                                        lewat ? (
                                          <p className="tiny mt-6" style={{ color: "var(--danger)", marginBottom: 0 }}>
                                            Periode tantangan sudah berakhir.
                                          </p>
                                        ) : item.program_id ? (
                                          <div className="mt-8">
                                            <Link
                                              href={`/program/${item.program_id}`}
                                              className="btn btn-sm btn-outline"
                                            >
                                              Ikuti Tantangan <Icon name="chevron-right" size={14} />
                                            </Link>
                                          </div>
                                        ) : null
                                      ) : tujuanKeaktifan ? (
                                        <div className="mt-8">
                                          <Link href={tujuanKeaktifan.href} className="tiny text-primary fw-600">
                                            {tujuanKeaktifan.label}
                                          </Link>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="mt-14">
                            <Pagination
                              meta={{
                                page: curPage,
                                per_page: lencanaPerPage,
                                total: totalLencana,
                                last_page: lastPage,
                              }}
                              perPage={lencanaPerPage}
                              perPageOptions={[4, 6, 8, 12, 16]}
                              onPage={setLencanaPage}
                              onPerPage={(next) => {
                                setLencanaPerPage(next);
                                setLencanaPage(1);
                              }}
                            />
                          </div>
                        </>
                      );
                    })()
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
            className="alert alert-info mt-16 mb-16"
            style={{ alignItems: "center", justifyContent: "flex-start", textAlign: "left", gap: 10 }}
          >
            <Icon name="shield" size={16} />
            <span className="tiny">
              {user?.role === "user" ? (
                <>
                  Demi privasi, nama Anda disamarkan sebagai <strong>Peserta anonim</strong> kecuali opsi{" "}
                  <strong>Tampilkan nama di peringkat</strong> diaktifkan di{" "}
                  <Link href="/profil" style={{ fontWeight: 600, textDecoration: "underline" }}>
                    Profil
                  </Link>
                  .
                </>
              ) : (
                <>
                  Demi privasi, peserta yang tidak mengaktifkan <strong>Tampilkan nama di peringkat</strong>{" "}
                  ditampilkan sebagai <strong>Peserta anonim</strong>.
                </>
              )}
            </span>
          </div>
        </>
      )}
    </AppShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import {
  achievementApi,
  edukasiApi,
  program as programApi,
  targetKesehatan as targetApi,
  ApiError,
} from "@/lib/api";
import { angka, tanggal } from "@/lib/format";
import type {
  AchievementResponse,
  Program,
  RingkasanProgresEdukasi,
  TargetKesehatan,
} from "@/types";

export default function ProgresPribadiPage() {
  const { user, loading: loadingUser } = useUser();
  const toast = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [targets, setTargets] = useState<TargetKesehatan[]>([]);
  const [eduRingkas, setEduRingkas] = useState<RingkasanProgresEdukasi | null>(null);
  const [achievement, setAchievement] = useState<AchievementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");
  const [inputCapaian, setInputCapaian] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [filterProgres, setFilterProgres] = useState<"semua" | "belum" | "selesai">("semua");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const [progRes, targetRes, eduRes, achRes] = await Promise.all([
        programApi.listPaged({ per_page: 50, exclude_jenis: "edukasi" }),
        targetApi.list({ per_page: 50 }),
        edukasiApi.listPaged({ per_page: 1 }),
        achievementApi.list(),
      ]);
      setPrograms((progRes.data || []).filter((p) => p.diikuti && p.status_saya !== "berhenti"));
      setTargets(targetRes || []);
      setEduRingkas(eduRes.ringkasan_progres);
      setAchievement(achRes);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat progres pribadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadingUser || !user) return;
    let aktif = true;
    Promise.all([
      programApi.listPaged({ per_page: 50, exclude_jenis: "edukasi" }),
      targetApi.list({ per_page: 50 }),
      edukasiApi.listPaged({ per_page: 1 }),
      achievementApi.list(),
    ])
      .then(([progRes, targetRes, eduRes, achRes]) => {
        if (!aktif) return;
        setPrograms((progRes.data || []).filter((p) => p.diikuti && p.status_saya !== "berhenti"));
        setTargets(targetRes || []);
        setEduRingkas(eduRes.ringkasan_progres);
        setAchievement(achRes);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat progres pribadi");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [loadingUser, user]);

  async function simpanCapaianCepat(p: Program) {
    const val = Number(inputCapaian[p.id] ?? "");
    if (Number.isNaN(val) || val <= 0) {
      toast.warning("Masukkan angka capaian lebih dari 0.");
      return;
    }
    setSavingId(p.id);
    try {
      const updated = await programApi.perbaruiProgres(p.id, { tambah_capaian: val });
      setPrograms((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, peserta_saya: updated } : item)),
      );
      setInputCapaian((prev) => ({ ...prev, [p.id]: "" }));
      toast.success(`Progres "${p.judul}" diperbarui menjadi ${updated.progres_persen ?? 0}%.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan progres");
    } finally {
      setSavingId(null);
    }
  }

  const targetTercapai = targets.filter((t) => t.tercapai).length;
  const isProgresSelesai = (p: Program) =>
    (p.peserta_saya?.status || p.status_saya) === "selesai" ||
    (p.peserta_saya?.progres_persen ?? 0) >= 100;

  const jumlahSelesai = programs.filter(isProgresSelesai).length;
  const jumlahBelum = programs.length - jumlahSelesai;
  const programsTersaring = programs.filter((p) => {
    if (filterProgres === "selesai") return isProgresSelesai(p);
    if (filterProgres === "belum") return !isProgresSelesai(p);
    return true;
  });

  return (
    <AppShell greet="Progres Pribadi" roles={["user"]}>
      <div
        className="mb-16"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 className="h3" style={{ margin: 0 }}>Progres Pribadi Saya</h1>
          <p className="tiny mt-4" style={{ marginBottom: 0 }}>
            Pantau perkembangan tantangan, target kesehatan, materi edukasi, dan lencana keaktifan Anda.
          </p>
        </div>
        <Link href="/program" className="btn btn-sm btn-primary" style={{ flexShrink: 0 }}>
          <Icon name="award" size={14} /> Jelajahi Tantangan
        </Link>
      </div>

      {tampilLoading ? <Loading /> : null}
      {!tampilLoading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {!tampilLoading && !error ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
            }}
          >
            <div className="card">
              <div className="tiny">Tantangan Diikuti</div>
              <div className="metric-val">{angka(programs.length)}</div>
              <div className="tiny mt-4">
                {angka(programs.filter((p) => (p.peserta_saya?.status || p.status_saya) === "selesai").length)} selesai terverifikasi
              </div>
            </div>
            <div className="card">
              <div className="tiny">Target Kesehatan</div>
              <div className="metric-val">
                {angka(targetTercapai)} / {angka(targets.length)}
              </div>
              <div className="tiny mt-4">
                <Link href="/target-kesehatan" className="text-primary fw-600">
                  Kelola Target Kesehatan →
                </Link>
              </div>
            </div>
            <div className="card">
              <div className="tiny">Progres Edukasi</div>
              <div className="metric-val">{eduRingkas?.persen_keseluruhan ?? 0}%</div>
              <div className="tiny mt-4">
                {angka(eduRingkas?.selesai ?? 0)} dari {angka(eduRingkas?.total_materi ?? 0)} materi selesai
              </div>
            </div>
            <div className="card">
              <div className="tiny">Lencana Keaktifan</div>
              <div className="metric-val">
                {angka(achievement?.ringkasan.diraih ?? 0)} / {angka(achievement?.ringkasan.total ?? 0)}
              </div>
              <div className="tiny mt-4">
                <Link href="/peringkat" className="text-primary fw-600">
                  Lihat Achievement &amp; Peringkat →
                </Link>
              </div>
            </div>
          </div>

          <section className="card">
            <div
              className="mb-12"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 className="h4" style={{ margin: 0 }}>Progres Tantangan</h2>
                <p className="tiny mt-2" style={{ marginBottom: 0 }}>
                  Catat capaian langsung atau buka detail misi untuk mengunggah bukti foto.
                </p>
              </div>
              <div className="chip-row" style={{ flexWrap: "wrap", gap: 6 }}>
                {[
                  { k: "semua" as const, l: `Semua (${angka(programs.length)})` },
                  { k: "belum" as const, l: `Belum Selesai (${angka(jumlahBelum)})` },
                  { k: "selesai" as const, l: `Sudah Selesai (${angka(jumlahSelesai)})` },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    type="button"
                    className={`chip${filterProgres === opt.k ? " is-active" : ""}`}
                    onClick={() => setFilterProgres(opt.k)}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {programs.length === 0 ? (
              <EmptyState
                icon="award"
                title="Belum mengikuti tantangan"
                desc="Daftar pada salah satu tantangan di menu Tantangan untuk mulai mencatat progres pribadi Anda."
              />
            ) : programsTersaring.length === 0 ? (
              <EmptyState
                icon="award"
                title={filterProgres === "selesai" ? "Belum ada progres yang selesai" : "Semua tantangan sudah selesai"}
                desc={
                  filterProgres === "selesai"
                    ? "Selesaikan tantangan hingga 100% atau terverifikasi petugas untuk muncul di sini."
                    : "Hebat! Tidak ada tantangan yang tertunda saat ini."
                }
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {programsTersaring.map((p) => {
                  const mode =
                    p.mode_progres ??
                    (p.target_nilai && p.target_nilai > 0 ? "otomatis" : "manual");
                  const ps = p.peserta_saya;
                  const persen = ps?.progres_persen ?? 0;
                  const selesai = (ps?.status || p.status_saya) === "selesai";

                  return (
                    <div key={p.id} className="card card-flat" style={{ padding: "14px 16px" }}>
                      <div className="row-between wrap gap-8">
                        <div>
                          <strong className="text-sm">{p.judul}</strong>
                          <div className="tiny mt-2">
                            {tanggal(p.mulai)} – {tanggal(p.selesai)} · +{angka(p.exp)} EXP
                          </div>
                        </div>
                        <div className="row gap-6">
                          {mode !== "tanpa_progres" ? (
                            <Badge tone={selesai ? "safe" : "primary"}>
                              {selesai ? "100% Selesai" : `${persen}%`}
                            </Badge>
                          ) : (
                            <Badge tone={selesai ? "safe" : "info"}>
                              {selesai ? "Selesai" : "Tanpa Progres"}
                            </Badge>
                          )}
                          <Link href={`/program/${p.id}`} className="btn btn-sm btn-outline">
                            Detail
                          </Link>
                        </div>
                      </div>

                      {mode !== "tanpa_progres" ? (
                        <div className="mt-10">
                          <div className="progress" style={{ height: 6 }}>
                            <i
                              style={{
                                width: `${selesai ? 100 : persen}%`,
                                background: selesai ? "var(--safe)" : "var(--primary)",
                              }}
                            />
                          </div>
                          {mode === "otomatis" && p.target_nilai && !selesai ? (
                            <div className="row wrap gap-8 mt-10" style={{ alignItems: "center" }}>
                              <span className="tiny">
                                Tercatat: <strong>{ps?.capaian_nilai ?? 0}</strong> / {p.target_nilai}{" "}
                                {p.satuan_target || "unit"}
                              </span>
                              <input
                                type="number"
                                min={1}
                                step="any"
                                className="input"
                                style={{ width: 150, paddingBlock: 6 }}
                                placeholder={`Tambah (${p.satuan_target || "unit"})`}
                                value={inputCapaian[p.id] ?? ""}
                                onChange={(e) =>
                                  setInputCapaian((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                loading={savingId === p.id}
                                onClick={() => simpanCapaianCepat(p)}
                              >
                                Tambah Progres
                              </Button>
                            </div>
                          ) : null}
                          {ps?.catatan_progres ? (
                            <p className="tiny mt-6" style={{ marginBottom: 0 }}>
                              Catatan terakhir: {ps.catatan_progres}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

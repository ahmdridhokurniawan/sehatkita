"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { angka, tanggal } from "@/lib/format";
import { program as programApi, ApiError } from "@/lib/api";
import type { Program, PesertaProgram } from "@/types";
import { LABEL_STATUS_PESERTA } from "@/lib/labels";

/* Detail program — kontrak §12 tidak punya GET /program/{id};
   data diambil dari GET /program lalu difilter per id. */

const LABEL_JENIS: Record<string, string> = {
  olahraga: "Olahraga",
  edukasi: "Edukasi",
  pemeriksaan: "Pemeriksaan",
  lainnya: "Lainnya",
};

function statusProgram(mulai: string, selesai: string | null) {
  const hariIni = new Date().toISOString().slice(0, 10);
  const m = (mulai || "").slice(0, 10);
  const s = (selesai || "").slice(0, 10);
  if (m && m > hariIni) return { label: "Akan datang", tone: "warning" as const };
  if (s && s < hariIni) return { label: "Selesai", tone: "info" as const };
  return { label: "Berjalan", tone: "safe" as const };
}

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user, loading: loadingUser } = useUser();
  const bolehIkut = user?.role === "user";
  const bolehKelolaPeserta =
    user?.role === "kader" || user?.role === "admin_kelurahan" || user?.role === "super_admin";

  const [program, setProgram] = useState<Program | null>(null);
  const [peserta, setPeserta] = useState<PesertaProgram[]>([]);
  const [pesertaLoading, setPesertaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proses, setProses] = useState(false);
  const [aksiErr, setAksiErr] = useState("");
  const [tandaiId, setTandaiId] = useState<number | null>(null);

  async function muatPeserta() {
    if (!id || !bolehKelolaPeserta) return;
    setPesertaLoading(true);
    try {
      const res = await programApi.peserta(id);
      setPeserta(res || []);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403 && err.status !== 404) {
        setAksiErr(err.message || "Gagal memuat daftar peserta");
      }
    } finally {
      setPesertaLoading(false);
    }
  }

  async function muat() {
    if (!id) return;
    setLoading(true);
    try {
      const list = await programApi.list();
      const found = list.find((p) => p.id === id) || null;
      setProgram(found);
      setError(found ? "" : "Program tidak ditemukan.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat program");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadingUser && user) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingUser, user, id]);

  useEffect(() => {
    if (!loadingUser && user) muatPeserta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingUser, user, id]);

  async function toggle() {
    if (!program) return;
    setProses(true);
    setAksiErr("");
    const jadiIkut = !program.diikuti;
    try {
      if (jadiIkut) {
        await programApi.ikut(program.id);
      } else {
        await programApi.ubahPeserta(program.id, { status: "berhenti" });
      }
      await muat();
      setProgram((prev) => (prev ? { ...prev, diikuti: jadiIkut } : prev));
    } catch (err) {
      setAksiErr(err instanceof ApiError ? err.message : "Gagal mengubah keikutsertaan");
    } finally {
      setProses(false);
    }
  }

  async function tandaiSelesai(user_id: number) {
    if (!program) return;
    setTandaiId(user_id);
    setAksiErr("");
    try {
      await programApi.ubahPeserta(program.id, { status: "selesai", user_id });
      await muatPeserta();
    } catch (err) {
      setAksiErr(err instanceof ApiError ? err.message : "Gagal menandai selesai");
    } finally {
      setTandaiId(null);
    }
  }

  if (loadingUser) {
    return (
      <AppShell noFab>
        <Loading />
      </AppShell>
    );
  }

  const st = program ? statusProgram(program.mulai, program.selesai) : null;

  return (
    <AppShell noFab>
      <Link href="/program" className="tiny row gap-6 mb-16" style={{ textDecoration: "none" }}>
        <Icon name="chevron-left" size={16} /> Kembali
      </Link>

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {program && st ? (
        <>
          <div className="card">
            <div className="row-between mb-8" style={{ gap: 8 }}>
              <h2 className="h4">{program.judul}</h2>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <p className="tiny">
              {LABEL_JENIS[program.jenis] || program.jenis} · {tanggal(program.mulai, "long")} –{" "}
              {tanggal(program.selesai, "long")}
            </p>

            <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
              <div className="card card-flat">
                <div className="tiny">Peserta</div>
                <div className="metric-val">{angka(program.jumlah_peserta)}</div>
                <div className="tiny mt-4">dari target {angka(program.target_peserta)}</div>
              </div>
              <div className="card card-flat">
                <div className="tiny">Reward</div>
                <div className="metric-val">{angka(program.exp)}</div>
                <div className="tiny mt-4">EXP {program.label_level ? `· ${program.label_level}` : ""}</div>
              </div>
            </div>

            {program.badge ? (
              <p className="tiny mt-12">
                <Icon name="award" size={13} /> Badge: <strong>{program.badge}</strong>
              </p>
            ) : null}

            {program.rank_kelurahan ? (
              <p className="tiny mt-4">
                <Icon name="trending-up" size={13} /> Peringkat kelurahan: {program.rank_kelurahan}
              </p>
            ) : null}

            {aksiErr ? <div className="err-msg show mt-12">{aksiErr}</div> : null}

            {bolehIkut ? (
              <Button
                className="mt-16"
                variant={program.diikuti ? "secondary" : "primary"}
                onClick={toggle}
                loading={proses}
                block
                disabled={st.label === "Selesai"}
              >
                {program.diikuti ? "Berhenti mengikuti" : "Ikuti program"}
              </Button>
            ) : null}
          </div>

          <div className="card mt-12">
            <div className="li">
              <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
                <Icon name="info" size={18} />
              </span>
              <div className="li-main">
                <strong>Status keikutsertaan</strong>
                <span className="tiny mt-4">
                  {program.diikuti ? "Anda terdaftar di program ini." : "Anda belum terdaftar."}
                </span>
              </div>
            </div>
            <div className="li">
              <span className="li-ico" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <Icon name="check-circle" size={18} />
              </span>
              <div className="li-main">
                <strong>Penyelesaian</strong>
                <span className="tiny mt-4">
                  Status &quot;selesai&quot; dicatat oleh kader/admin agar EXP tidak diklaim sendiri.
                </span>
              </div>
            </div>
          </div>

          {bolehKelolaPeserta ? (
            <div className="card mt-12">
              <div className="row-between mb-8">
                <strong className="text-sm">Daftar Peserta</strong>
                <span className="tiny">{angka(program.jumlah_peserta)} orang</span>
              </div>

              {pesertaLoading ? (
                <p className="tiny center">Memuat peserta…</p>
              ) : peserta.length === 0 ? (
                <p className="tiny center" style={{ padding: "12px 0" }}>
                  Belum ada peserta terdaftar.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {peserta.map((p) => {
                    const selesai = p.status === "selesai";
                    return (
                      <div key={p.user_id} className="li">
                        <span className="li-ico">
                          <Icon name="user" size={18} />
                        </span>
                        <div className="li-main">
                          <strong className="text-sm">{p.name}</strong>
                          <span className="tiny mt-2">
                            {LABEL_STATUS_PESERTA[p.status] || p.status}
                          </span>
                        </div>
                        {!selesai ? (
                          <Button
                            size="sm"
                            variant={p.status === "berhenti" ? "outline" : "primary"}
                            onClick={() => tandaiSelesai(p.user_id)}
                            loading={tandaiId === p.user_id}
                          >
                            Tandai Selesai
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

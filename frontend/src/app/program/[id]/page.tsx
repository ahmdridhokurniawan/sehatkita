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
import type { Program } from "@/types";

/* Detail program — backend belum punya GET /program/{id},
   jadi data diambil dari GET /program lalu difilter per id. */

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

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proses, setProses] = useState(false);
  const [aksiErr, setAksiErr] = useState("");

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
        </>
      ) : null}
    </AppShell>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { angka, tanggal } from "@/lib/format";
import { program as programApi, ApiError } from "@/lib/api";
import { JENIS_PROGRAM } from "@/lib/enums";
import type { JenisProgram } from "@/lib/enums";
import type { Program } from "@/types";

/* ------------------------------------------------------------------
   Program / Tantangan (kontrak §12)
   - user    : lihat program, ikut, berhenti
   - kader   : lihat saja (belum ada endpoint daftar peserta)
   - admin   : buat program wilayahnya + lihat ringkasan
   Reward (exp/level/badge) diambil dari kolom program.* (§12.1).
   `status` dihitung FE dari `mulai`/`selesai` karena kolom BE statis.
   ------------------------------------------------------------------ */

const LABEL_STATUS: Record<string, string> = {
  berjalan: "Berjalan",
  selesai: "Selesai",
  akan_datang: "Akan datang",
};

const TONE_STATUS: Record<string, "safe" | "warning" | "info"> = {
  berjalan: "safe",
  selesai: "info",
  akan_datang: "warning",
};

const LABEL_JENIS: Record<string, string> = {
  olahraga: "Olahraga",
  edukasi: "Edukasi",
  pemeriksaan: "Pemeriksaan",
  lainnya: "Lainnya",
};

const PILIHAN_JENIS = Object.values(JENIS_PROGRAM);

function hitungStatus(mulai: string, selesai: string | null): keyof typeof LABEL_STATUS {
  const hariIni = new Date().toISOString().slice(0, 10);
  const m = (mulai || "").slice(0, 10);
  const s = (selesai || "").slice(0, 10);
  if (m && m > hariIni) return "akan_datang";
  if (s && s < hariIni) return "selesai";
  return "berjalan";
}

export default function ProgramPage() {
  const { user, loading: loadingUser } = useUser();
  const role = user?.role || "";
  const bolehBuat = role === "admin_kelurahan" || role === "super_admin";
  const bolehIkut = role === "user";

  const [program, setProgram] = useState<Program[]>([]);
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Program | null>(null);
  const [proses, setProses] = useState<number | null>(null);
  const [aksiErr, setAksiErr] = useState("");

  // form buat program
  const [buatOpen, setBuatOpen] = useState(false);
  const [fJudul, setFJudul] = useState("");
  const [fJenis, setFJenis] = useState<JenisProgram>("olahraga");
  const [fTarget, setFTarget] = useState("50");
  const [fMulai, setFMulai] = useState("");
  const [fSelesai, setFSelesai] = useState("");
  const [fErr, setFErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      setProgram(await programApi.list());
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat program");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingUser && user) muat();
  }, [loadingUser, user, muat]);

  async function toggle(p: Program) {
    setProses(p.id);
    setAksiErr("");
    const jadiIkut = !p.diikuti;
    try {
      if (jadiIkut) {
        await programApi.ikut(p.id);
      } else {
        await programApi.ubahPeserta(p.id, { status: "berhenti" });
      }
      await muat();
      // Backend masih menandai `diikuti` true walau status peserta "berhenti",
      // jadi field itu dioverride lokal sampai BE difilter.
      setProgram((prev) => prev.map((x) => (x.id === p.id ? { ...x, diikuti: jadiIkut } : x)));
    } catch (err) {
      setAksiErr(err instanceof ApiError ? err.message : "Gagal mengubah keikutsertaan");
    } finally {
      setProses(null);
    }
  }

  async function simpanProgram() {
    const e: Record<string, string> = {};
    if (!fJudul.trim()) e.judul = "Judul wajib diisi.";
    if (!fMulai) e.mulai = "Tanggal mulai wajib diisi.";
    if (fSelesai && fMulai && fSelesai < fMulai) e.selesai = "Selesai tidak boleh sebelum mulai.";
    setFErr(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await programApi.create({
        wilayah_id: user?.wilayah_id || 0,
        judul: fJudul.trim(),
        jenis: fJenis,
        target_peserta: Number(fTarget) || 1,
        mulai: fMulai,
        selesai: fSelesai || undefined,
      });
      setBuatOpen(false);
      setFJudul("");
      setFTarget("50");
      setFMulai("");
      setFSelesai("");
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.errors)) map[k] = v[0] ?? "Tidak valid";
        setFErr(map);
      }
      setAksiErr(apiErr.message || "Gagal membuat program");
    } finally {
      setSaving(false);
    }
  }

  const ringkas = useMemo(() => {
    const berjalan = program.filter((p) => hitungStatus(p.mulai, p.selesai) === "berjalan").length;
    const diikuti = program.filter((p) => p.diikuti).length;
    const peserta = program.reduce((s, p) => s + p.jumlah_peserta, 0);
    return { berjalan, diikuti, peserta };
  }, [program]);

  // Pencarian judul program (permintaan pembimbing: cari di setiap fitur)
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return program;
    return program.filter((p) => p.judul.toLowerCase().includes(q));
  }, [program, cari]);

  if (loadingUser) {
    return (
      <AppShell noFab>
        <Loading />
      </AppShell>
    );
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="h3">Program</h1>
          <p className="tiny">
            {bolehBuat ? "Kelola tantangan & penyuluhan wilayah Anda." : "Tantangan kesehatan yang bisa Anda ikuti."}
          </p>
        </div>
        {bolehBuat ? (
          <Button icon="plus" onClick={() => setBuatOpen(true)}>
            Buat program
          </Button>
        ) : null}
      </div>

      <div className="grid grid-2 mb-12" style={{ gap: 12 }}>
        <div className="card card-flat">
          <div className="tiny">Program berjalan</div>
          <div className="metric-val">{angka(ringkas.berjalan)}</div>
        </div>
        <div className="card card-flat">
          <div className="tiny">{bolehBuat ? "Total peserta" : "Diikuti"}</div>
          <div className="metric-val">{angka(bolehBuat ? ringkas.peserta : ringkas.diikuti)}</div>
        </div>
      </div>

      {aksiErr ? <div className="err-msg show mb-12">{aksiErr}</div> : null}

      <div className="input-icon mb-12">
        <Icon name="search" size={18} />
        <input
          className="input"
          type="search"
          placeholder="Cari program…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {!loading && !error && program.length === 0 ? (
        <EmptyState
          title="Belum ada program"
          desc={
            bolehBuat
              ? "Buat program pertama untuk wilayah Anda."
              : "Admin kelurahan belum membuat program untuk wilayah Anda."
          }
        />
      ) : null}

      {!loading && !error && program.length > 0 && tersaring.length === 0 ? (
        <EmptyState title="Program tidak ditemukan" desc={`Tidak ada program yang cocok dengan “${cari}”.`} />
      ) : null}

      {!loading && !error && tersaring.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {tersaring.map((p) => {
            const st = hitungStatus(p.mulai, p.selesai);
            const persen = p.target_peserta
              ? Math.min(100, Math.round((p.jumlah_peserta / p.target_peserta) * 100))
              : 0;
            return (
              <div className="card" key={p.id}>
                <div className="row-between mb-8" style={{ gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <strong className="text-sm">{p.judul}</strong>
                    <p className="tiny mt-4">
                      {LABEL_JENIS[p.jenis] || p.jenis} · {tanggal(p.mulai)} – {tanggal(p.selesai)}
                    </p>
                  </div>
                  <span className="row gap-6" style={{ flexShrink: 0 }}>
                    {p.diikuti ? <Badge tone="primary">Diikuti</Badge> : null}
                    <Badge tone={TONE_STATUS[st]}>{LABEL_STATUS[st]}</Badge>
                  </span>
                </div>

                <div className="row gap-12 mt-8" style={{ flexWrap: "wrap" }}>
                  <span className="tiny">
                    <Icon name="users" size={12} /> {angka(p.jumlah_peserta)}/{angka(p.target_peserta)} peserta
                  </span>
                  {p.exp > 0 ? (
                    <span className="tiny">
                      <Icon name="zap" size={12} /> +{angka(p.exp)} EXP
                    </span>
                  ) : null}
                  {p.label_level ? (
                    <span className="tiny">
                      <Icon name="bar-chart" size={12} /> {p.label_level}
                    </span>
                  ) : null}
                  {p.badge ? (
                    <span className="tiny">
                      <Icon name="award" size={12} /> {p.badge}
                    </span>
                  ) : null}
                </div>

                {p.target_peserta > 0 ? (
                  <div
                    className="mt-8"
                    style={{ height: 6, borderRadius: 99, background: "var(--muted-bg)", overflow: "hidden" }}
                  >
                    <div
                      style={{
                        width: `${persen}%`,
                        height: "100%",
                        background: "var(--primary)",
                        borderRadius: 99,
                      }}
                    />
                  </div>
                ) : null}

                <div className="row gap-8 mt-12">
                  {bolehIkut && st !== "selesai" ? (
                    <Button
                      variant={p.diikuti ? "secondary" : "primary"}
                      onClick={() => toggle(p)}
                      loading={proses === p.id}
                      style={{ flex: 1 }}
                    >
                      {p.diikuti ? "Berhenti" : "Ikuti"}
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => setDetail(p)} style={{ flex: 1 }}>
                    Detail
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.judul}>
        {detail ? (
          <dl className="dl">
            <div>
              <dt>Jenis</dt>
              <dd>{LABEL_JENIS[detail.jenis] || detail.jenis}</dd>
            </div>
            <div>
              <dt>Periode</dt>
              <dd>
                {tanggal(detail.mulai, "long")} – {tanggal(detail.selesai, "long")}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone={TONE_STATUS[hitungStatus(detail.mulai, detail.selesai)]}>
                  {LABEL_STATUS[hitungStatus(detail.mulai, detail.selesai)]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Peserta</dt>
              <dd>
                {angka(detail.jumlah_peserta)} / {angka(detail.target_peserta)}
              </dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd>
                +{angka(detail.exp)} EXP
                {detail.badge ? ` · badge ${detail.badge}` : ""}
                {detail.label_level ? ` · ${detail.label_level}` : ""}
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={buatOpen}
        onClose={() => setBuatOpen(false)}
        title="Program Baru"
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button className="btn btn-outline" onClick={() => setBuatOpen(false)} type="button">
              Batal
            </button>
            <Button onClick={simpanProgram} loading={saving}>
              Simpan
            </Button>
          </div>
        }
      >
        <Input
          label="Judul program"
          placeholder="Tantangan Push-up 21 Hari"
          value={fJudul}
          onChange={(e) => setFJudul(e.target.value)}
          error={fErr.judul}
          required
        />
        <div className="mt-12">
          <label className="label">Jenis</label>
          <select className="select" value={fJenis} onChange={(e) => setFJenis(e.target.value as JenisProgram)}>
            {PILIHAN_JENIS.map((j) => (
              <option key={j} value={j}>
                {LABEL_JENIS[j]}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-12">
          <Input
            label="Target peserta"
            type="number"
            min={1}
            value={fTarget}
            onChange={(e) => setFTarget(e.target.value)}
            error={fErr.target_peserta}
            optional
          />
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <Input
            label="Mulai"
            type="date"
            value={fMulai}
            onChange={(e) => setFMulai(e.target.value)}
            error={fErr.mulai}
            required
          />
          <Input
            label="Selesai"
            type="date"
            value={fSelesai}
            onChange={(e) => setFSelesai(e.target.value)}
            error={fErr.selesai}
            optional
          />
        </div>
      </Modal>
    </AppShell>
  );
}

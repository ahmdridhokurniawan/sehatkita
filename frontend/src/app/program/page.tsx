"use client";

import Link from "next/link";
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
import { program as programApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { JENIS_PROGRAM } from "@/lib/enums";
import { LABEL_STATUS_PESERTA } from "@/lib/labels";
import type { JenisProgram, StatusPeserta } from "@/lib/enums";
import type { Program, Wilayah } from "@/types";

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

const TONE_PESERTA: Record<StatusPeserta, "primary" | "warning" | "safe" | "danger" | "info"> = {
  terdaftar: "primary",
  menunggu_verifikasi: "warning",
  selesai: "safe",
  ditolak: "danger",
  berhenti: "info",
};

const LABEL_JENIS: Record<string, string> = {
  olahraga: "Olahraga",
  edukasi: "Edukasi",
  pemeriksaan: "Pemeriksaan",
  lainnya: "Lainnya",
};

const IKON_JENIS: Record<string, { icon: string; bg: string; color: string }> = {
  olahraga: { icon: "trophy", bg: "var(--accent-050)", color: "var(--accent)" },
  edukasi: { icon: "sparkles", bg: "var(--warning-bg)", color: "var(--warning)" },
  pemeriksaan: { icon: "activity", bg: "var(--safe-bg)", color: "var(--safe)" },
  lainnya: { icon: "award", bg: "var(--primary-050)", color: "var(--primary)" },
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

function defaultDeskripsi(p: Program): string {
  if (p.deskripsi) return p.deskripsi;
  if (p.jenis === "olahraga") return "Ajak tubuh aktif secara rutin untuk menjaga kebugaran dan tekanan darah.";
  if (p.jenis === "edukasi") return "Perkuat kebiasaan hidup sehat lewat edukasi dan praktik harian warga.";
  if (p.jenis === "pemeriksaan") return "Lakukan skrining dan pemeriksaan kesehatan berkala bersama kader.";
  return "Selesaikan misi kesehatan bersama warga kelurahan dan kumpulkan EXP.";
}

export default function ProgramPage() {
  const { user, loading: loadingUser } = useUser();
  const role = user?.role || "";
  const bolehBuat = role === "admin_kelurahan" || role === "super_admin";
  const bolehKelola = role === "kader" || bolehBuat;
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
  const [fDeskripsi, setFDeskripsi] = useState("");
  const [fKriteria, setFKriteria] = useState("");
  const [fJenis, setFJenis] = useState<JenisProgram>("olahraga");
  const [fWilayah, setFWilayah] = useState("");
  const [kelurahan, setKelurahan] = useState<Wilayah[]>([]);
  const [fTarget, setFTarget] = useState("50");
  const [fMulai, setFMulai] = useState("");
  const [fSelesai, setFSelesai] = useState("");
  const [fExp, setFExp] = useState("50");
  const [fBadge, setFBadge] = useState("");
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
    if (loadingUser || !user) return;
    let aktif = true;
    programApi
      .list()
      .then((res) => {
        if (!aktif) return;
        setProgram(res);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat program");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [loadingUser, user]);

  useEffect(() => {
    if (!loadingUser && role === "super_admin") {
      (async () => {
        try {
          const w = await wilayahApi.list();
          setKelurahan((w || []).filter((x) => x.tipe === "kelurahan"));
        } catch {
          setKelurahan([]);
        }
      })();
    }
  }, [loadingUser, role]);

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
      const wId = role === "super_admin"
        ? (fWilayah && Number(fWilayah) > 0 ? Number(fWilayah) : null)
        : (user?.wilayah_id || null);

      await programApi.create({
        wilayah_id: wId,
        judul: fJudul.trim(),
        deskripsi: fDeskripsi.trim() || undefined,
        kriteria_misi: fKriteria.trim() || undefined,
        jenis: fJenis,
        target_peserta: Number(fTarget) || 1,
        mulai: fMulai,
        selesai: fSelesai || undefined,
        exp: Number(fExp) || 0,
        badge: fBadge.trim() || undefined,
      });
      setBuatOpen(false);
      setFJudul("");
      setFDeskripsi("");
      setFKriteria("");
      setFWilayah("");
      setFTarget("50");
      setFMulai("");
      setFSelesai("");
      setFExp("50");
      setFBadge("");
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
    const totalExp = program.reduce((s, p) => s + (p.exp || 0), 0);
    return { berjalan, diikuti, peserta, totalExp };
  }, [program]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return program;
    return program.filter(
      (p) =>
        p.judul.toLowerCase().includes(q) ||
        (p.deskripsi || "").toLowerCase().includes(q) ||
        (LABEL_JENIS[p.jenis] || p.jenis).toLowerCase().includes(q),
    );
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
          <h1 className="h3">Tantangan &amp; Program</h1>
          <p className="tiny">
            {bolehBuat
              ? "Kelola misi sehat kelurahan dan verifikasi dokumentasi warga."
              : "Ikuti tantangan, kirim foto dokumentasi misi, dan raih EXP serta badge."}
          </p>
        </div>
        {bolehBuat ? (
          <Button icon="plus" onClick={() => setBuatOpen(true)}>
            Buat tantangan
          </Button>
        ) : null}
      </div>

      <div className="grid grid-3 mb-12" style={{ gap: 12 }}>
        <div className="card card-flat">
          <div className="tiny">Tantangan aktif</div>
          <div className="metric-val">{angka(ringkas.berjalan)}</div>
        </div>
        <div className="card card-flat">
          <div className="tiny">{bolehKelola ? "Total peserta" : "Sedang diikuti"}</div>
          <div className="metric-val">{angka(bolehKelola ? ringkas.peserta : ringkas.diikuti)}</div>
        </div>
        <div className="card card-flat">
          <div className="tiny">Total reward tersedia</div>
          <div className="metric-val">+{angka(ringkas.totalExp)} EXP</div>
        </div>
      </div>

      {aksiErr ? <div className="err-msg show mb-12">{aksiErr}</div> : null}

      <div className="input-icon mb-12">
        <Icon name="search" size={18} />
        <input
          className="input"
          type="search"
          placeholder="Cari judul tantangan atau kategori…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {!loading && !error && program.length === 0 ? (
        <EmptyState
          icon="award"
          title="Belum ada tantangan"
          desc={
            bolehBuat
              ? "Buat tantangan pertama untuk wilayah Anda."
              : "Admin kelurahan belum membuat program untuk wilayah Anda."
          }
        />
      ) : null}

      {!loading && !error && program.length > 0 && tersaring.length === 0 ? (
        <EmptyState icon="search" title="Tantangan tidak ditemukan" desc={`Tidak ada yang cocok dengan “${cari}”.`} />
      ) : null}

      {!loading && !error && tersaring.length > 0 ? (
        <div className="grid grid-2" style={{ gap: 14 }}>
          {tersaring.map((p) => {
            const st = hitungStatus(p.mulai, p.selesai);
            const ikon = IKON_JENIS[p.jenis] || IKON_JENIS.lainnya;
            const statusSaya = (p.status_saya || p.peserta_saya?.status) as StatusPeserta | undefined;
            const persen = p.target_peserta
              ? Math.min(100, Math.round((p.jumlah_peserta / p.target_peserta) * 100))
              : 0;
            return (
              <div className="card" key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="row-between" style={{ gap: 10, alignItems: "flex-start" }}>
                  <div className="row gap-10" style={{ alignItems: "flex-start", minWidth: 0 }}>
                    <span
                      className="li-ico"
                      style={{ background: ikon.bg, color: ikon.color, flexShrink: 0 }}
                    >
                      <Icon name={ikon.icon} size={18} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong className="text-sm">{p.judul}</strong>
                      <p className="tiny mt-2">
                        {LABEL_JENIS[p.jenis] || p.jenis} · {tanggal(p.mulai)} – {tanggal(p.selesai)}
                      </p>
                    </div>
                  </div>
                  <div className="row gap-6 wrap" style={{ justifyContent: "flex-end" }}>
                    {statusSaya && statusSaya !== "berhenti" ? (
                      <Badge tone={TONE_PESERTA[statusSaya] || "primary"}>
                        {LABEL_STATUS_PESERTA[statusSaya] || statusSaya}
                      </Badge>
                    ) : null}
                    <Badge tone={TONE_STATUS[st]}>{LABEL_STATUS[st]}</Badge>
                  </div>
                </div>

                <p className="tiny" style={{ color: "var(--text-2)" }}>
                  {defaultDeskripsi(p)}
                </p>

                {p.kriteria_misi ? (
                  <div
                    className="card card-flat"
                    style={{ padding: "8px 10px", background: "var(--surface-2)", borderStyle: "dashed" }}
                  >
                    <div className="tiny">
                      <strong>Syarat Misi:</strong> {p.kriteria_misi}
                    </div>
                  </div>
                ) : null}

                <div className="row gap-12 wrap" style={{ marginTop: "auto" }}>
                  <span className="tiny row gap-4">
                    <Icon name="users" size={13} /> {angka(p.jumlah_peserta)}/{angka(p.target_peserta)}
                  </span>
                  {p.exp > 0 ? (
                    <span className="badge badge-primary">
                      <Icon name="zap" size={12} /> +{angka(p.exp)} EXP
                    </span>
                  ) : null}
                  {p.badge ? (
                    <span className="badge badge-warning">
                      <Icon name="trophy" size={12} /> {p.badge}
                    </span>
                  ) : null}
                </div>

                {p.target_peserta > 0 ? (
                  <div style={{ height: 6, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
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

                <div className="row gap-8 wrap">
                  {bolehIkut && st !== "selesai" && !p.diikuti ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => toggle(p)}
                      loading={proses === p.id}
                      style={{ flex: 1 }}
                    >
                      Ikuti Tantangan
                    </Button>
                  ) : null}

                  {bolehIkut && p.diikuti && statusSaya !== "selesai" ? (
                    <Link href={`/program/${p.id}#bukti`} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
                      <Icon name="camera" size={14} />{" "}
                      {statusSaya === "menunggu_verifikasi" ? "Lihat Bukti" : "Kirim Bukti Foto"}
                    </Link>
                  ) : null}

                  <Link href={`/program/${p.id}`} className="btn btn-sm btn-outline" style={{ flex: 1 }}>
                    <Icon name="file-text" size={14} /> {bolehKelola ? "Validasi Peserta" : "Detail Misi"}
                  </Link>

                  <Button variant="ghost" size="sm" onClick={() => setDetail(p)} title="Ringkasan cepat">
                    Ringkas
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.judul}
        footer={
          detail ? (
            <div className="row-between" style={{ width: "100%" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>
                Tutup
              </button>
              <Link href={`/program/${detail.id}`} className="btn btn-primary" onClick={() => setDetail(null)}>
                Buka Halaman Misi <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div style={{ display: "grid", gap: 12 }}>
            <p className="tiny">{defaultDeskripsi(detail)}</p>
            {detail.kriteria_misi ? (
              <div className="alert alert-info">
                <Icon name="camera" size={18} />
                <div className="tiny">
                  <strong>Kriteria Bukti Foto:</strong> {detail.kriteria_misi}
                </div>
              </div>
            ) : null}
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
                  {detail.badge ? ` · Badge ${detail.badge}` : ""}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={buatOpen}
        onClose={() => setBuatOpen(false)}
        title="Tantangan Baru"
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
        <div style={{ display: "grid", gap: 12 }}>
          <Input
            label="Judul tantangan"
            placeholder="Tantangan Jalan Sehat 7 Hari"
            value={fJudul}
            onChange={(e) => setFJudul(e.target.value)}
            error={fErr.judul}
            required
          />
          <div className="field">
            <label className="label" htmlFor="prog-desc">
              Deskripsi tantangan <span className="opt">(opsional)</span>
            </label>
            <textarea
              id="prog-desc"
              className="textarea"
              rows={2}
              placeholder="Jelaskan tujuan dan aktivitas tantangan untuk warga…"
              value={fDeskripsi}
              onChange={(e) => setFDeskripsi(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="prog-kriteria">
              Syarat foto dokumentasi misi <span className="opt">(opsional)</span>
            </label>
            <input
              id="prog-kriteria"
              className="input"
              placeholder="misalnya Unggah foto aplikasi langkah / selfie saat olahraga"
              value={fKriteria}
              onChange={(e) => setFKriteria(e.target.value)}
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label">Jenis</label>
              <select className="select" value={fJenis} onChange={(e) => setFJenis(e.target.value as JenisProgram)}>
                {PILIHAN_JENIS.map((j) => (
                  <option key={j} value={j}>
                    {LABEL_JENIS[j]}
                  </option>
                ))}
              </select>
            </div>
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
          {role === "super_admin" ? (
            <div className="field">
              <label className="label">Kelurahan</label>
              <select className="select" value={fWilayah} onChange={(e) => setFWilayah(e.target.value)}>
                <option value="">Semua (se-kota)</option>
                {kelurahan.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid grid-2" style={{ gap: 12 }}>
            <Input
              label="Reward EXP"
              type="number"
              min={0}
              value={fExp}
              onChange={(e) => setFExp(e.target.value)}
              error={fErr.exp}
              optional
            />
            <Input
              label="Badge"
              placeholder="cth: Juara Sehat"
              value={fBadge}
              onChange={(e) => setFBadge(e.target.value)}
              error={fErr.badge}
              optional
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
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
        </div>
      </Modal>
    </AppShell>
  );
}

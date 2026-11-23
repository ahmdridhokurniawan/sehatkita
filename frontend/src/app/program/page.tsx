"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { angka, tanggal, todayLocalISO } from "@/lib/format";
import { program as programApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { JENIS_PROGRAM } from "@/lib/enums";
import { LABEL_STATUS_PESERTA } from "@/lib/labels";
import type { JenisProgram, StatusPeserta, StatusProgram } from "@/lib/enums";
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

const SARAN_KATEGORI_LAINNYA = [
  "Hidrasi & Minum Air",
  "Berhenti Merokok",
  "Pola Makan Sehat",
  "Tidur Berkualitas",
  "Kesehatan Mental",
  "Senam Lansia",
];

function labelJenisProgram(p: Pick<Program, "jenis" | "kategori_aktivitas">): string {
  const dasar = LABEL_JENIS[p.jenis] || p.jenis;
  if (p.jenis === "lainnya" && p.kategori_aktivitas?.trim()) {
    return `${dasar} · ${p.kategori_aktivitas.trim()}`;
  }
  return dasar;
}

function hitungStatus(
  mulai: string,
  selesai: string | null,
  status?: StatusProgram | null,
): keyof typeof LABEL_STATUS {
  if (status && status in LABEL_STATUS) return status;
  const hariIni = todayLocalISO();
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
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");
  const [proses, setProses] = useState<number | null>(null);
  const [aksiErr, setAksiErr] = useState("");

  // form buat / ubah program
  const [buatOpen, setBuatOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [hapusTarget, setHapusTarget] = useState<Program | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fJudul, setFJudul] = useState("");
  const [fDeskripsi, setFDeskripsi] = useState("");
  const [fKriteria, setFKriteria] = useState("");
  const [fJenis, setFJenis] = useState<JenisProgram>("olahraga");
  const [fKategori, setFKategori] = useState("");
  const [fWilayah, setFWilayah] = useState("");
  const [kelurahan, setKelurahan] = useState<Wilayah[]>([]);
  const [filterJenis, setFilterJenis] = useState<string>("");
  const [fTarget, setFTarget] = useState("50");
  const [fTargetNilai, setFTargetNilai] = useState("");
  const [fSatuanTarget, setFSatuanTarget] = useState("");
  const [fMulai, setFMulai] = useState("");
  const [fSelesai, setFSelesai] = useState("");
  const [fExp, setFExp] = useState("50");
  const [fBadge, setFBadge] = useState("");
  const [fErr, setFErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function bolehUbahProgram(p: Program): boolean {
    if (role === "super_admin") return true;
    if (role === "admin_kelurahan") {
      return p.wilayah_id != null && p.wilayah_id === user?.wilayah_id;
    }
    return false;
  }

  function bukaBuat() {
    setEditTarget(null);
    setFJudul("");
    setFDeskripsi("");
    setFKriteria("");
    setFJenis("olahraga");
    setFKategori("");
    setFWilayah("");
    setFTarget("50");
    setFTargetNilai("");
    setFSatuanTarget("");
    setFMulai("");
    setFSelesai("");
    setFExp("50");
    setFBadge("");
    setFErr({});
    setAksiErr("");
    setBuatOpen(true);
  }

  function bukaEdit(p: Program) {
    setEditTarget(p);
    setFJudul(p.judul || "");
    setFDeskripsi(p.deskripsi || "");
    setFKriteria(p.kriteria_misi || "");
    setFJenis(p.jenis);
    setFKategori(p.kategori_aktivitas || "");
    setFWilayah(p.wilayah_id != null ? String(p.wilayah_id) : "");
    setFTarget(String(p.target_peserta || 1));
    setFTargetNilai(p.target_nilai != null ? String(p.target_nilai) : "");
    setFSatuanTarget(p.satuan_target || "");
    setFMulai((p.mulai || "").slice(0, 10));
    setFSelesai((p.selesai || "").slice(0, 10));
    setFExp(String(p.exp ?? 50));
    setFBadge(p.badge || "");
    setFErr({});
    setAksiErr("");
    setBuatOpen(true);
  }

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await programApi.listPaged({
        page,
        per_page: 10,
        exclude_jenis: "edukasi",
        jenis: (filterJenis || undefined) as JenisProgram | undefined,
        search: cari.trim() || undefined,
      });
      setProgram(res.data);
      setMeta(res.meta);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat program");
    } finally {
      setLoading(false);
    }
  }, [page, cari, filterJenis]);

  useEffect(() => {
    if (loadingUser || !user) return;
    let aktif = true;
    programApi
      .listPaged({
        page,
        per_page: 10,
        exclude_jenis: "edukasi",
        jenis: (filterJenis || undefined) as JenisProgram | undefined,
        search: cari.trim() || undefined,
      })
      .then((res) => {
        if (!aktif) return;
        setProgram(res.data);
        setMeta(res.meta);
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
  }, [loadingUser, user, page, cari, filterJenis]);

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
    const expAngka = Number(fExp);
    if (!fJudul.trim()) e.judul = "Judul wajib diisi.";
    if (fJenis === "lainnya" && !fKategori.trim()) {
      e.kategori_aktivitas = "Tulis atau pilih kategori tantangan lainnya.";
    }
    if (!fExp.trim() || Number.isNaN(expAngka) || expAngka < 1) {
      e.exp = "Reward EXP wajib diisi minimal 1 poin.";
    }
    if (!fMulai) e.mulai = "Tanggal mulai wajib diisi.";
    if (!fSelesai) {
      e.selesai = "Tanggal selesai (tenggat) wajib diisi.";
    } else if (fMulai && fSelesai < fMulai) {
      e.selesai = "Tenggat selesai tidak boleh sebelum tanggal mulai.";
    }
    setFErr(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const wId = role === "super_admin"
        ? (fWilayah && Number(fWilayah) > 0 ? Number(fWilayah) : null)
        : (user?.wilayah_id || null);

      const kategoriVal = fJenis === "lainnya" ? fKategori.trim() : null;
      const payload = {
        wilayah_id: wId,
        judul: fJudul.trim(),
        deskripsi: fDeskripsi.trim() || undefined,
        kriteria_misi: fKriteria.trim() || undefined,
        jenis: fJenis,
        kategori_aktivitas: kategoriVal,
        target_peserta: Number(fTarget) || 1,
        target_nilai: fTargetNilai.trim() ? Number(fTargetNilai) : undefined,
        satuan_target: fSatuanTarget.trim() || undefined,
        mulai: fMulai,
        selesai: fSelesai,
        exp: Math.round(expAngka),
        badge: fBadge.trim() || undefined,
      };

      if (editTarget) {
        await programApi.update(editTarget.id, {
          ...payload,
          deskripsi: fDeskripsi.trim() || null,
          kriteria_misi: fKriteria.trim() || null,
        });
      } else {
        await programApi.create(payload);
      }
      setBuatOpen(false);
      setEditTarget(null);
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.errors)) map[k] = v[0] ?? "Tidak valid";
        setFErr(map);
      }
      setAksiErr(apiErr.message || (editTarget ? "Gagal memperbarui program" : "Gagal membuat program"));
    } finally {
      setSaving(false);
    }
  }

  async function hapusProgram() {
    if (!hapusTarget) return;
    setDeleting(true);
    setAksiErr("");
    try {
      await programApi.hapus(hapusTarget.id);
      setHapusTarget(null);
      await muat();
    } catch (err) {
      setAksiErr(err instanceof ApiError ? err.message : "Gagal menghapus program");
    } finally {
      setDeleting(false);
    }
  }

  const ringkas = useMemo(() => {
    const berjalan = program.filter((p) => hitungStatus(p.mulai, p.selesai, p.status) === "berjalan").length;
    const diikuti = program.filter((p) => p.diikuti).length;
    const peserta = program.reduce((s, p) => s + p.jumlah_peserta, 0);
    const totalExp = program.reduce((s, p) => s + (p.exp || 0), 0);
    return { berjalan, diikuti, peserta, totalExp };
  }, [program]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const hasil = q
      ? program.filter(
          (p) =>
            p.judul.toLowerCase().includes(q) ||
            (p.deskripsi || "").toLowerCase().includes(q) ||
            (LABEL_JENIS[p.jenis] || p.jenis).toLowerCase().includes(q),
        )
      : [...program];

    const prioritas = (p: Program): number => {
      const st = hitungStatus(p.mulai, p.selesai, p.status);
      const statusSaya = p.status_saya || p.peserta_saya?.status;
      if (st === "selesai" || statusSaya === "selesai") return 2;
      if (st === "akan_datang") return 1;
      return 0;
    };

    return hasil.sort((a, b) => prioritas(a) - prioritas(b) || (a.mulai || "").localeCompare(b.mulai || ""));
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
              ? "Kelola tantangan kesehatan kelurahan dan verifikasi dokumentasi warga. Materi bacaan dikelola di "
              : "Ikuti tantangan sehat, catat progres pribadi, dan kumpulkan EXP serta lencana. Materi pembelajaran ada di "}
            <Link href="/edukasi" className="text-primary fw-600">
              halaman Edukasi
            </Link>
            .
          </p>
        </div>
        {bolehBuat ? (
          <Button icon="plus" onClick={bukaBuat}>
            Buat tantangan
          </Button>
        ) : null}
      </div>

      <div className="summary-strip mb-12">
        <span className="summary-strip-item">
          Tantangan aktif: <strong>{angka(ringkas.berjalan)}</strong>
        </span>
        <span className="summary-strip-item">
          {bolehKelola ? "Total peserta:" : "Sedang diikuti:"}{" "}
          <strong>{angka(bolehKelola ? ringkas.peserta : ringkas.diikuti)}</strong>
        </span>
        <span className="summary-strip-item">
          Total hadiah poin: <strong className="text-primary">+{angka(ringkas.totalExp)} Poin (EXP)</strong>
        </span>
      </div>

      {aksiErr ? <div className="err-msg show mb-12">{aksiErr}</div> : null}

      <div className="input-icon mb-12">
        <Icon name="search" size={18} />
        <input
          className="input"
          type="search"
          placeholder="Cari judul tantangan atau kategori…"
          value={cari}
          onChange={(e) => {
            setCari(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="chip-row mb-12" style={{ flexWrap: "wrap", gap: 8 }}>
        {[
          { v: "", l: "Semua Kategori" },
          { v: "olahraga", l: "Olahraga" },
          { v: "edukasi", l: "Edukasi" },
          { v: "pemeriksaan", l: "Pemeriksaan" },
          { v: "lainnya", l: "Lainnya" },
        ].map((kat) => (
          <button
            key={kat.v || "semua"}
            type="button"
            className={`chip${filterJenis === kat.v ? " is-active" : ""}`}
            onClick={() => {
              setFilterJenis(kat.v);
              setPage(1);
            }}
          >
            {kat.l}
          </button>
        ))}
      </div>

      {tampilLoading ? <Loading /> : null}
      {!tampilLoading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {!tampilLoading && !error && program.length === 0 ? (
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

      {!tampilLoading && !error && program.length > 0 && tersaring.length === 0 ? (
        <EmptyState icon="search" title="Tantangan tidak ditemukan" desc={`Tidak ada yang cocok dengan “${cari}”.`} />
      ) : null}

      {!tampilLoading && !error && tersaring.length > 0 ? (
        <div className="card card-list">
          {tersaring.map((p) => {
            const st = hitungStatus(p.mulai, p.selesai, p.status);
            const ikon = IKON_JENIS[p.jenis] || IKON_JENIS.lainnya;
            const statusSaya = (p.status_saya || p.peserta_saya?.status) as StatusPeserta | undefined;
            const persen = p.target_peserta
              ? Math.min(100, Math.round((p.jumlah_peserta / p.target_peserta) * 100))
              : 0;
            return (
              <div
                className="li"
                key={p.id}
                style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}
              >
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
                        {labelJenisProgram(p)} · {tanggal(p.mulai)} – {tanggal(p.selesai)}
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
                  <p
                    className="tiny"
                    style={{
                      paddingLeft: 10,
                      borderLeft: "2px solid color-mix(in srgb, var(--primary) 55%, transparent)",
                      color: "var(--text-2)",
                      lineHeight: 1.45,
                    }}
                  >
                    <strong>Syarat Misi:</strong> {p.kriteria_misi}
                  </p>
                ) : null}

                <div className="row-between wrap gap-10" style={{ alignItems: "center" }}>
                  <div className="row gap-12 wrap">
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
                    <div style={{ width: 140, maxWidth: "100%", height: 6, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
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
                </div>

                {bolehIkut && p.diikuti && p.peserta_saya ? (
                  <div>
                    <div className="row-between tiny mb-4">
                      <span>Progres pribadi saya</span>
                      <strong>{p.peserta_saya.progres_persen ?? 0}%</strong>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <i
                        style={{
                          width: `${p.peserta_saya.progres_persen ?? 0}%`,
                          background: statusSaya === "selesai" ? "var(--safe)" : "var(--primary)",
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="row gap-8 wrap">
                  {bolehIkut && st !== "selesai" && !p.diikuti ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => toggle(p)}
                      loading={proses === p.id}
                    >
                      Ikuti Tantangan
                    </Button>
                  ) : null}

                  {bolehIkut && p.diikuti && statusSaya !== "selesai" ? (
                    <Link href={`/program/${p.id}#bukti`} className="btn btn-sm btn-primary">
                      <Icon name="camera" size={14} />{" "}
                      {statusSaya === "menunggu_verifikasi" ? "Lihat Bukti" : "Kirim Bukti Foto"}
                    </Link>
                  ) : null}

                  <Link href={`/program/${p.id}`} className="btn btn-sm btn-outline">
                    <Icon name="file-text" size={14} /> {bolehKelola ? "Validasi Peserta" : "Detail Misi"}
                  </Link>
                  {bolehUbahProgram(p) ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => bukaEdit(p)}
                        title="Ubah tantangan"
                        aria-label="Ubah tantangan"
                      >
                        <Icon name="pencil" size={14} /> Ubah
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setHapusTarget(p)}
                        title="Hapus tantangan"
                        aria-label="Hapus tantangan"
                      >
                        <Icon name="trash" size={14} /> Hapus
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!tampilLoading && !error && meta ? <Pagination meta={meta} onPage={setPage} /> : null}

      <Modal
        open={buatOpen}
        onClose={() => {
          setBuatOpen(false);
          setEditTarget(null);
        }}
        title={editTarget ? "Ubah Tantangan" : "Tantangan Baru"}
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button
              className="btn btn-outline"
              onClick={() => {
                setBuatOpen(false);
                setEditTarget(null);
              }}
              type="button"
            >
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
              <select
                className="select"
                value={fJenis}
                onChange={(e) => setFJenis(e.target.value as JenisProgram)}
              >
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
          {fJenis === "lainnya" ? (
            <div className="field">
              <Input
                label="Kategori aktivitas kustom"
                placeholder="Ketik kategori tantangan (cth: Hidrasi & Minum Air)"
                maxLength={50}
                value={fKategori}
                onChange={(e) => setFKategori(e.target.value)}
                error={fErr.kategori_aktivitas}
                required
              />
              <div className="chip-row mt-8" style={{ flexWrap: "wrap", gap: 6 }}>
                {SARAN_KATEGORI_LAINNYA.map((saran) => (
                  <button
                    key={saran}
                    type="button"
                    className={`chip${fKategori.trim().toLowerCase() === saran.toLowerCase() ? " is-active" : ""}`}
                    onClick={() => setFKategori(saran)}
                  >
                    {saran}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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
              label="Target capaian angka (opsional)"
              type="number"
              min={1}
              placeholder="misalnya 50 (untuk hitung % otomatis)"
              value={fTargetNilai}
              onChange={(e) => setFTargetNilai(e.target.value)}
            />
            <Input
              label="Satuan target (opsional)"
              type="text"
              maxLength={40}
              placeholder="misalnya kali, menit, km"
              value={fSatuanTarget}
              onChange={(e) => setFSatuanTarget(e.target.value)}
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <Input
              label="Reward EXP"
              type="number"
              min={1}
              max={10000}
              value={fExp}
              onChange={(e) => setFExp(e.target.value)}
              error={fErr.exp || fErr.exp_reward}
              required
            />
            <Input
              label="Badge"
              placeholder="cth: Juara Sehat"
              value={fBadge}
              onChange={(e) => setFBadge(e.target.value)}
              error={fErr.badge || fErr.badge_reward}
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
              label="Selesai (Tenggat)"
              type="date"
              min={fMulai || undefined}
              value={fSelesai}
              onChange={(e) => setFSelesai(e.target.value)}
              error={fErr.selesai}
              required
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!hapusTarget}
        onClose={() => setHapusTarget(null)}
        title="Hapus Tantangan"
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setHapusTarget(null)}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={hapusProgram}
              disabled={deleting}
            >
              {deleting ? "Menghapus…" : "Hapus"}
            </button>
          </div>
        }
      >
        <p className="text-sm">
          Yakin ingin menghapus tantangan <strong>{hapusTarget?.judul}</strong>? Tindakan ini tidak
          dapat dibatalkan.
        </p>
      </Modal>
    </AppShell>
  );
}

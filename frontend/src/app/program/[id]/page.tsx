"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Fireworks, { playCelebrationSound } from "@/components/ui/Fireworks";
import { shouldCelebrateCompletion } from "@/lib/celebration";
import { ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { useToast } from "@/components/ui/Toast";
import { angka, tanggal, todayLocalISO } from "@/lib/format";
import { program as programApi, fetchMediaBlobUrl, ApiError } from "@/lib/api";
import type { Program, PesertaProgram } from "@/types";
import type { StatusPeserta } from "@/lib/enums";
import { LABEL_STATUS_PESERTA } from "@/lib/labels";

const LABEL_JENIS: Record<string, string> = {
  olahraga: "Olahraga",
  edukasi: "Edukasi",
  pemeriksaan: "Pemeriksaan",
  lainnya: "Lainnya",
};

const TONE_PESERTA: Record<StatusPeserta, "primary" | "warning" | "safe" | "danger" | "info"> = {
  terdaftar: "primary",
  menunggu_verifikasi: "warning",
  selesai: "safe",
  ditolak: "danger",
  berhenti: "info",
};

function statusProgram(mulai: string, selesai: string | null) {
  const hariIni = todayLocalISO();
  const m = (mulai || "").slice(0, 10);
  const s = (selesai || "").slice(0, 10);
  if (m && m > hariIni) return { label: "Akan datang", tone: "warning" as const };
  if (s && s < hariIni) return { label: "Selesai", tone: "info" as const };
  return { label: "Berjalan", tone: "safe" as const };
}

const MAKS_FOTO_BUKTI = 5;

type DraftFoto = { file: File; url: string };

function formatUkuranFile(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Komponen gambar terautentikasi untuk bukti foto dokumentasi tantangan. */
function BuktiFotoThumb({
  url,
  alt,
  onPreview,
  inCard = false,
}: {
  url: string;
  alt: string;
  onPreview?: (src: string) => void;
  inCard?: boolean;
}) {
  const [src, setSrc] = useState<string>("");
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    let aktif = true;
    let objUrl = "";
    fetchMediaBlobUrl(url)
      .then((u) => {
        if (!aktif) {
          URL.revokeObjectURL(u);
          return;
        }
        objUrl = u;
        setSrc(u);
        setGagal(false);
      })
      .catch(() => {
        if (aktif) setGagal(true);
      });
    return () => {
      aktif = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [url]);

  if (gagal) {
    return <span className="tiny text-danger" style={{ padding: 10 }}>Foto gagal dimuat.</span>;
  }
  if (!src) {
    return <span className="tiny text-2" style={{ padding: 10 }}>Memuat foto…</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onPreview?.(src)}
      style={{
        display: "block",
        padding: 0,
        border: inCard ? "none" : "1px solid var(--border)",
        borderRadius: inCard ? 0 : 10,
        overflow: "hidden",
        background: "var(--surface-2)",
        cursor: "pointer",
        width: inCard ? "100%" : undefined,
        maxWidth: inCard ? undefined : 180,
      }}
      title="Klik untuk perbesar foto dokumentasi"
    >
      <img
        src={src}
        alt={alt}
        style={{
          display: "block",
          width: "100%",
          height: inCard ? 132 : undefined,
          maxHeight: inCard ? 132 : 140,
          objectFit: "cover",
        }}
      />
    </button>
  );
}

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const toast = useToast();
  const { user, loading: loadingUser } = useUser();
  const bolehIkut = user?.role === "user";
  const bolehKelolaPeserta =
    user?.role === "kader" || user?.role === "admin_kelurahan" || user?.role === "super_admin";

  const [program, setProgram] = useState<Program | null>(null);
  const [peserta, setPeserta] = useState<PesertaProgram[]>([]);
  const [pesertaLoading, setPesertaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");
  const [proses, setProses] = useState(false);
  const [aksiErr, setAksiErr] = useState("");
  const [tandaiId, setTandaiId] = useState<number | null>(null);

  // State unggah & hapus multi-foto dokumentasi warga
  const [draftFoto, setDraftFoto] = useState<DraftFoto[]>([]);
  const draftRef = useRef<DraftFoto[]>([]);
  const [catatanBukti, setCatatanBukti] = useState("");
  const [kirimLoading, setKirimLoading] = useState(false);
  const [hapusIndex, setHapusIndex] = useState<number | "semua" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal preview foto & modal tolak bukti
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [tolakTarget, setTolakTarget] = useState<PesertaProgram | null>(null);
  const [alasanTolak, setAlasanTolak] = useState("");

  // Animasi kembang api saat misi diselesaikan
  const [celebrate, setCelebrate] = useState(false);
  const prevStatusRef = useRef<StatusPeserta | undefined>(undefined);

  useEffect(() => {
    draftRef.current = draftFoto;
  }, [draftFoto]);

  useEffect(() => {
    return () => {
      draftRef.current.forEach((d) => URL.revokeObjectURL(d.url));
    };
  }, []);

  const muat = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await programApi.detail(id);
      setProgram(detail);
      if (detail.peserta) {
        setPeserta(detail.peserta);
      }
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat program");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const muatPeserta = useCallback(async () => {
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
  }, [id, bolehKelolaPeserta]);

  useEffect(() => {
    if (loadingUser || !user || !id) return;
    let aktif = true;
    programApi
      .detail(id)
      .then((detail) => {
        if (!aktif) return;
        setProgram(detail);
        if (detail.peserta) {
          setPeserta(detail.peserta);
        }
        setError("");
      })
      .catch((err) => {
        if (!aktif) return;
        setError(err instanceof ApiError ? err.message : "Gagal memuat program");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [loadingUser, user, id]);

  useEffect(() => {
    const status = (program?.peserta_saya?.status || program?.status_saya) as StatusPeserta | undefined;
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (shouldCelebrateCompletion(prev ?? null, status ?? null)) {
      setCelebrate(true);
      playCelebrationSound();
    }
  }, [program]);

  async function toggle() {
    if (!program) return;
    setProses(true);
    setAksiErr("");
    const jadiIkut = !program.diikuti;
    try {
      if (jadiIkut) {
        await programApi.ikut(program.id);
        toast.success("Anda resmi terdaftar di tantangan ini!");
      } else {
        await programApi.ubahPeserta(program.id, { status: "berhenti" });
        toast.info("Keikutsertaan dihentikan.");
      }
      await muat();
    } catch (err) {
      setAksiErr(err instanceof ApiError ? err.message : "Gagal mengubah keikutsertaan");
    } finally {
      setProses(false);
    }
  }

  function batalSemuaDraft() {
    setDraftFoto((prev) => {
      prev.forEach((d) => URL.revokeObjectURL(d.url));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function hapusDraftFoto(idx: number) {
    setDraftFoto((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const dipilih = Array.from(input.files || []);
    if (dipilih.length === 0) return;

    const terunggahCount =
      pSaya?.bukti_foto_urls?.length ?? (pSaya?.bukti_foto_url ? 1 : 0);
    const sisaSlot = Math.max(0, MAKS_FOTO_BUKTI - terunggahCount - draftFoto.length);

    if (sisaSlot <= 0) {
      toast.error(`Maksimal ${MAKS_FOTO_BUKTI} foto per tantangan. Hapus foto yang ada terlebih dahulu.`);
      input.value = "";
      return;
    }

    const tipeValid = new Set(["image/jpeg", "image/png", "image/webp"]);
    const maksBytes = 5 * 1024 * 1024;
    const ditolak: string[] = [];
    const valid: DraftFoto[] = [];
    let terpotongKuota = false;

    try {
      for (const file of dipilih) {
        if (valid.length >= sisaSlot) {
          terpotongKuota = true;
          break;
        }

        const ekstensiValid = /\.(jpe?g|png|webp)$/i.test(file.name);
        if ((file.type && !tipeValid.has(file.type)) || (!file.type && !ekstensiValid)) {
          ditolak.push(`${file.name} (format harus JPG, PNG, atau WebP)`);
          continue;
        }

        const buffer =
          typeof file.arrayBuffer === "function"
            ? await file.arrayBuffer()
            : await new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
              });

        if (buffer.byteLength === 0) {
          ditolak.push(`${file.name} (berukuran 0 B / file kosong atau belum terunduh)`);
          continue;
        }
        if (buffer.byteLength > maksBytes) {
          ditolak.push(`${file.name} (melebihi batas 5 MB)`);
          continue;
        }

        const safeFile = new File([buffer], file.name, {
          type: file.type || "image/png",
          lastModified: file.lastModified,
        });
        valid.push({
          file: safeFile,
          url: URL.createObjectURL(safeFile),
        });
      }

      if (terpotongKuota) {
        toast.info(`Hanya ${sisaSlot} foto lagi yang bisa ditambahkan (maks. ${MAKS_FOTO_BUKTI} foto).`);
      }

      if (valid.length > 0) {
        setDraftFoto((prev) => [...prev, ...valid]);
      }

      if (ditolak.length > 0) {
        const pesan = `File tidak dapat ditambahkan: ${ditolak.join("; ")}.`;
        setAksiErr(pesan);
        toast.error(pesan);
      } else {
        setAksiErr("");
      }
    } catch {
      const pesan = "Gagal membaca file gambar yang dipilih. Pastikan file tersedia di perangkat Anda.";
      setAksiErr(pesan);
      toast.error(pesan);
    } finally {
      input.value = "";
    }
  }

  async function kirimDokumentasi(ev: React.FormEvent) {
    ev.preventDefault();
    if (!program) return;
    if (draftFoto.length === 0) {
      setAksiErr("Pilih minimal 1 foto dokumentasi penyelesaian tantangan terlebih dahulu.");
      return;
    }
    setKirimLoading(true);
    setAksiErr("");
    try {
      const fd = new FormData();
      draftFoto.forEach((item) => fd.append("fotos[]", item.file));
      if (catatanBukti.trim()) fd.append("catatan_bukti", catatanBukti.trim());
      await programApi.kirimBukti(program.id, fd);
      toast.success("Dokumentasi misi berhasil dikirim dan menunggu verifikasi kader/admin.");
      batalSemuaDraft();
      setCatatanBukti("");
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      const msg = apiErr.message || "Gagal mengirim foto dokumentasi.";
      setAksiErr(msg);
      toast.error(msg);
    } finally {
      setKirimLoading(false);
    }
  }

  async function hapusDokumentasi(index?: number) {
    if (!program) return;
    setHapusIndex(index !== undefined ? index : "semua");
    setAksiErr("");
    try {
      const res = await programApi.hapusBukti(program.id, index);
      toast.info(
        index !== undefined
          ? "Foto dokumentasi terpilih berhasil dihapus."
          : "Semua foto dokumentasi berhasil dihapus.",
      );
      if ((res.bukti_foto_urls?.length ?? 0) === 0) {
        setCatatanBukti("");
      }
      await muat();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal menghapus foto dokumentasi.";
      setAksiErr(msg);
      toast.error(msg);
    } finally {
      setHapusIndex(null);
    }
  }

  async function verifikasiPeserta(user_id: number, status: "selesai" | "ditolak", catatan?: string) {
    if (!program) return;
    setTandaiId(user_id);
    setAksiErr("");
    try {
      await programApi.ubahPeserta(program.id, {
        status,
        user_id,
        catatan_verifikasi: catatan?.trim() || undefined,
      });
      toast.success(status === "selesai" ? "Misi disetujui dan EXP diberikan!" : "Bukti dikembalikan untuk perbaikan.");
      setTolakTarget(null);
      setAlasanTolak("");
      await muatPeserta();
      await muat();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal memverifikasi peserta";
      setAksiErr(msg);
      toast.error(msg);
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
  const pSaya = program?.peserta_saya;
  const statusSaya = (pSaya?.status || program?.status_saya) as StatusPeserta | undefined;
  const daftarFotoSaya = pSaya?.bukti_foto_urls?.length
    ? pSaya.bukti_foto_urls
    : pSaya?.bukti_foto_url
      ? [pSaya.bukti_foto_url]
      : [];
  const sisaKuotaFoto = Math.max(0, MAKS_FOTO_BUKTI - daftarFotoSaya.length - draftFoto.length);
  const persen = program && program.target_peserta
    ? Math.min(100, Math.round((program.jumlah_peserta / program.target_peserta) * 100))
    : 0;

  return (
    <AppShell noFab>
      <Link href="/program" className="tiny row gap-6 mb-16" style={{ textDecoration: "none" }}>
        <Icon name="chevron-left" size={16} /> Kembali ke Daftar Tantangan
      </Link>

      {tampilLoading ? <Loading /> : null}
      {!tampilLoading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {!tampilLoading && program && st ? (
        <>
          <div className="card">
            <div className="row-between mb-8" style={{ gap: 8, alignItems: "flex-start" }}>
              <div>
                <div className="row gap-8 wrap mb-6">
                  <Badge tone="primary">
                    {program.jenis === "lainnya" && program.kategori_aktivitas
                      ? `Lainnya · ${program.kategori_aktivitas}`
                      : LABEL_JENIS[program.jenis] || program.jenis}
                  </Badge>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {statusSaya && statusSaya !== "berhenti" ? (
                    <Badge tone={TONE_PESERTA[statusSaya] || "primary"}>
                      Status Anda: {LABEL_STATUS_PESERTA[statusSaya] || statusSaya}
                    </Badge>
                  ) : null}
                </div>
                <h1 className="h3">{program.judul}</h1>
                <p className="tiny mt-4">
                  <Icon name="calendar" size={13} /> {tanggal(program.mulai, "long")} –{" "}
                  {tanggal(program.selesai, "long")}
                </p>
              </div>
            </div>

            {program.deskripsi ? (
              <p className="text-sm mt-8">{program.deskripsi}</p>
            ) : (
              <p className="tiny mt-8">
                Ikuti tantangan ini secara aktif, dokumentasikan aktivitas Anda dengan foto, dan dapatkan EXP setelah
                diverifikasi kader/admin.
              </p>
            )}

            <div className="alert alert-info mt-12">
              <Icon name="camera" size={18} />
              <div className="tiny">
                <strong>Kriteria Penyelesaian Misi:</strong>{" "}
                {program.kriteria_misi ||
                  "Unggah foto dokumentasi nyata yang menunjukkan Anda telah menyelesaikan tantangan ini."}
              </div>
            </div>

            <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
              <div className="card card-flat">
                <div className="tiny">Peserta Terdaftar</div>
                <div className="metric-val">{angka(program.jumlah_peserta)}</div>
                <div className="tiny mt-4">dari target {angka(program.target_peserta)} ({persen}%)</div>
              </div>
              <div className="card card-flat">
                <div className="tiny">Hadiah Misi</div>
                <div className="metric-val">+{angka(program.exp)} EXP</div>
                <div className="tiny mt-4">
                  {program.badge ? (
                    <>
                      Badge: <strong>{program.badge}</strong>
                    </>
                  ) : (
                    "Poin peringkat kelurahan"
                  )}
                </div>
              </div>
            </div>

            {aksiErr ? <div className="err-msg show mt-12">{aksiErr}</div> : null}

            {bolehIkut && !program.diikuti ? (
              <Button
                className="mt-16"
                variant="primary"
                onClick={toggle}
                loading={proses}
                block
                disabled={st.label === "Selesai"}
              >
                Ikuti Tantangan Ini
              </Button>
            ) : null}

            {bolehIkut && program.diikuti && statusSaya !== "selesai" ? (
              <div className="mt-12" style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="ghost" size="sm" onClick={toggle} loading={proses}>
                  Berhenti dari tantangan
                </Button>
              </div>
            ) : null}
          </div>

          {/* KARTU VALIDASI & UNGGAH DOKUMENTASI FOTO (WARGA) */}
          {bolehIkut && program.diikuti ? (
            <div className="card mt-12" id="bukti">
              <div className="row-between mb-8">
                <div>
                  <h2 className="h4">Validasi Misi &amp; Foto Dokumentasi</h2>
                  <p className="tiny mt-2">
                    Unggah foto dokumentasi sebagai bukti penyelesaian misi untuk diperiksa kader/admin.
                  </p>
                </div>
                {statusSaya ? (
                  <Badge tone={TONE_PESERTA[statusSaya] || "primary"}>
                    {LABEL_STATUS_PESERTA[statusSaya] || statusSaya}
                  </Badge>
                ) : null}
              </div>

              {statusSaya === "selesai" ? (
                <div className="alert alert-safe mt-8">
                  <Icon name="check-circle" size={18} />
                  <div className="tiny">
                    <strong>Misi Terverifikasi Selesai!</strong> Hadiah +{angka(program.exp)} EXP telah ditambahkan ke
                    akun Anda.
                  </div>
                </div>
              ) : null}

              {statusSaya === "menunggu_verifikasi" ? (
                <div className="alert alert-warning mt-8">
                  <Icon name="clock" size={18} />
                  <div className="tiny">
                    <strong>Menunggu Verifikasi Kader/Admin.</strong> Foto dokumentasi Anda sedang ditinjau.
                  </div>
                </div>
              ) : null}

              {statusSaya === "ditolak" ? (
                <div className="alert alert-danger mt-8">
                  <Icon name="alert-circle" size={18} />
                  <div className="tiny">
                    <strong>Bukti Perlu Diperbaiki:</strong>{" "}
                    {pSaya?.catatan_verifikasi || "Foto dokumentasi belum sesuai kriteria misi. Silakan unggah ulang."}
                  </div>
                </div>
              ) : null}

              {daftarFotoSaya.length > 0 ? (
                <div className="mt-12">
                  <div className="row-between mb-8 wrap gap-8">
                    <div className="tiny fw-600">
                      Dokumentasi Terunggah Saat Ini ({daftarFotoSaya.length}/{MAKS_FOTO_BUKTI}):
                    </div>
                    {statusSaya !== "selesai" && daftarFotoSaya.length > 1 ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon="trash"
                        loading={hapusIndex === "semua"}
                        onClick={() => hapusDokumentasi()}
                      >
                        Hapus Semua Foto
                      </Button>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {daftarFotoSaya.map((url, idx) => (
                      <div
                        key={url}
                        style={{
                          width: 176,
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "var(--surface)",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <BuktiFotoThumb
                          url={url}
                          alt={`Foto bukti misi ${idx + 1}`}
                          onPreview={(src) => setFotoModal(src)}
                          inCard
                        />
                        <div style={{ padding: 8, display: "grid", gap: 6 }}>
                          <span className="tiny text-2 fw-600">Foto #{idx + 1}</span>
                          {statusSaya !== "selesai" ? (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              block
                              icon="trash"
                              loading={hapusIndex === idx || hapusIndex === "semua"}
                              onClick={() => hapusDokumentasi(idx)}
                            >
                              Hapus Foto
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {pSaya?.catatan_bukti ? <p className="tiny mt-8">Catatan Anda: “{pSaya.catatan_bukti}”</p> : null}
                </div>
              ) : null}

              {statusSaya !== "selesai" ? (
                <form onSubmit={kirimDokumentasi} className="mt-16" style={{ display: "grid", gap: 12 }}>
                  <div className="field">
                    <label className="label" htmlFor="foto-bukti">
                      {daftarFotoSaya.length > 0 ? "Tambah Foto Dokumentasi" : "Pilih Foto Dokumentasi"}{" "}
                      <span className="opt">(bisa lebih dari 1, maks. {MAKS_FOTO_BUKTI} foto)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      id="foto-bukti"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      disabled={sisaKuotaFoto === 0}
                      onChange={pilihFile}
                      style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        opacity: 0,
                        overflow: "hidden",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        border: "1.5px dashed var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        background: "var(--surface-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: "var(--primary-weak, rgba(46, 125, 50, 0.1))",
                            color: "var(--primary)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="camera" size={20} />
                        </span>
                        <div>
                          <div className="tiny fw-600">
                            {sisaKuotaFoto === 0
                              ? `Kuota maksimal ${MAKS_FOTO_BUKTI} foto sudah penuh`
                              : draftFoto.length > 0
                                ? `${draftFoto.length} foto dipilih — siap dikirim atau tambah lagi`
                                : "Belum ada foto dipilih (bisa pilih beberapa sekaligus)"}
                          </div>
                          <div className="tiny text-2">
                            {sisaKuotaFoto > 0
                              ? `JPG, PNG, atau WebP (maks. 5 MB/foto) • Sisa kuota: ${sisaKuotaFoto} foto`
                              : "Hapus salah satu foto di atas jika ingin mengganti."}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={draftFoto.length > 0 ? "outline" : "primary"}
                        size="sm"
                        icon={draftFoto.length > 0 ? "plus" : "upload"}
                        disabled={sisaKuotaFoto === 0}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {draftFoto.length > 0 ? "Tambah Foto" : "Pilih Foto"}
                      </Button>
                    </div>
                  </div>

                  {draftFoto.length > 0 ? (
                    <div>
                      <div className="row-between mb-8 wrap gap-8">
                        <div className="tiny fw-600">
                          Pratinjau Foto Siap Kirim ({draftFoto.length} foto):
                        </div>
                        {draftFoto.length > 1 ? (
                          <Button type="button" variant="danger" size="sm" icon="trash" onClick={batalSemuaDraft}>
                            Hapus Semua Pilihan
                          </Button>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {draftFoto.map((item, idx) => (
                          <div
                            key={item.url}
                            style={{
                              width: 176,
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              overflow: "hidden",
                              background: "var(--surface)",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setFotoModal(item.url)}
                              style={{ padding: 0, border: "none", background: "var(--surface-2)", cursor: "pointer" }}
                              title="Klik untuk perbesar pratinjau"
                            >
                              <img
                                src={item.url}
                                alt={`Pratinjau ${item.file.name}`}
                                style={{ display: "block", width: "100%", height: 132, objectFit: "cover" }}
                              />
                            </button>
                            <div style={{ padding: 8, display: "grid", gap: 6 }}>
                              <div
                                className="tiny fw-600"
                                title={item.file.name}
                                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {item.file.name}
                              </div>
                              <span className="tiny text-2">{formatUkuranFile(item.file.size)}</span>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                block
                                icon="trash"
                                onClick={() => hapusDraftFoto(idx)}
                              >
                                Hapus
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="field">
                    <label className="label" htmlFor="catatan-bukti">
                      Catatan Aktivitas <span className="opt">(opsional)</span>
                    </label>
                    <textarea
                      id="catatan-bukti"
                      className="textarea"
                      rows={2}
                      maxLength={500}
                      placeholder="misalnya Jalan santai pagi hari selama 35 menit mengelilingi taman kelurahan"
                      value={catatanBukti}
                      onChange={(e) => setCatatanBukti(e.target.value)}
                    />
                  </div>

                  <Button type="submit" icon="upload" loading={kirimLoading} disabled={draftFoto.length === 0}>
                    {draftFoto.length > 0
                      ? `Kirim ${draftFoto.length} Foto Dokumentasi`
                      : daftarFotoSaya.length > 0
                        ? "Tambah & Kirim Dokumentasi"
                        : "Kirim Dokumentasi Misi"}
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}

          {/* PANEL KADER / ADMIN: VALIDASI DOKUMENTASI PESERTA */}
          {bolehKelolaPeserta ? (
            <div className="card mt-12">
              <div className="row-between mb-12">
                <div>
                  <h2 className="h4">Daftar Peserta &amp; Verifikasi Misi</h2>
                  <p className="tiny">Periksa foto dokumentasi warga sebelum menyetujui hadiah EXP.</p>
                </div>
                <span className="badge badge-primary">{angka(peserta.length)} peserta</span>
              </div>

              {pesertaLoading ? (
                <Loading variant="list" text="Memuat peserta…" />
              ) : peserta.length === 0 ? (
                <p className="tiny center" style={{ padding: "12px 0" }}>
                  Belum ada peserta terdaftar.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {peserta.map((p) => {
                    const selesai = p.status === "selesai";
                    const stP = p.status as StatusPeserta;
                    const fotoPeserta = p.bukti_foto_urls?.length
                      ? p.bukti_foto_urls
                      : p.bukti_foto_url
                        ? [p.bukti_foto_url]
                        : [];
                    return (
                      <div
                        key={p.user_id}
                        className="card card-flat"
                        style={{ display: "grid", gap: 10, padding: 14 }}
                      >
                        <div className="row-between wrap gap-8">
                          <div className="row gap-10">
                            <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
                              <Icon name="user" size={18} />
                            </span>
                            <div>
                              <strong className="text-sm">{p.name}</strong>
                              <div className="tiny">{p.email}</div>
                            </div>
                          </div>
                          <Badge tone={TONE_PESERTA[stP] || "info"}>
                            {LABEL_STATUS_PESERTA[stP] || p.status}
                          </Badge>
                        </div>

                        {fotoPeserta.length > 0 ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                              {fotoPeserta.map((url, idx) => (
                                <BuktiFotoThumb
                                  key={url}
                                  url={url}
                                  alt={`Dokumentasi ${p.name} #${idx + 1}`}
                                  onPreview={(src) => setFotoModal(src)}
                                />
                              ))}
                            </div>
                            {p.catatan_bukti ? (
                              <p className="tiny">
                                <strong>Catatan peserta:</strong> {p.catatan_bukti}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="tiny text-2">Belum ada foto dokumentasi yang diunggah.</p>
                        )}

                        {p.catatan_verifikasi && p.status === "ditolak" ? (
                          <p className="tiny text-danger">
                            <strong>Catatan penolakan:</strong> {p.catatan_verifikasi}
                          </p>
                        ) : null}

                        {!selesai && p.status !== "berhenti" ? (
                          <div className="row gap-8 wrap">
                            <Button
                              size="sm"
                              variant="primary"
                              icon="check"
                              onClick={() => verifikasiPeserta(p.user_id, "selesai")}
                              loading={tandaiId === p.user_id}
                            >
                              Setujui &amp; Selesai
                            </Button>
                            {p.bukti_foto_url && p.status !== "ditolak" ? (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  setTolakTarget(p);
                                  setAlasanTolak("");
                                }}
                              >
                                Tolak Bukti
                              </Button>
                            ) : null}
                          </div>
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

      <Modal open={!!fotoModal} onClose={() => setFotoModal(null)} title="Foto Dokumentasi Misi">
        {fotoModal ? (
          <img
            src={fotoModal}
            alt="Foto dokumentasi ukuran penuh"
            style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 10 }}
          />
        ) : null}
      </Modal>

      <Modal
        open={!!tolakTarget}
        onClose={() => setTolakTarget(null)}
        title={`Tolak Bukti — ${tolakTarget?.name || ""}`}
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setTolakTarget(null)}>
              Batal
            </button>
            <Button
              variant="danger"
              loading={tolakTarget ? tandaiId === tolakTarget.user_id : false}
              onClick={() => tolakTarget && verifikasiPeserta(tolakTarget.user_id, "ditolak", alasanTolak)}
            >
              Kembalikan untuk Perbaikan
            </Button>
          </div>
        }
      >
        <div className="field">
          <label className="label" htmlFor="alasan-tolak">
            Alasan / Masukan untuk Peserta
          </label>
          <textarea
            id="alasan-tolak"
            className="textarea"
            rows={3}
            placeholder="misalnya Foto terlalu buram atau aktivitas belum terlihat jelas, mohon unggah ulang."
            value={alasanTolak}
            onChange={(e) => setAlasanTolak(e.target.value)}
          />
        </div>
      </Modal>

            <Modal
              open={celebrate}
              onClose={() => setCelebrate(false)}
              size="sm"
              className="modal-logout"
              backdropContent={<Fireworks aktif={celebrate} />}
              title={
                <span className="logout-modal-heading">
                  <span className="celebration-icon"><Icon name="check-circle" size={22} /></span>
                  <span className="celebration-title">Misi Selesai!</span>
                </span>
              }
              footer={
                <>
                  <button type="button" className="btn btn-outline" onClick={() => setCelebrate(false)}>
                    Tutup
                  </button>
                  <Link href="/peringkat" className="btn btn-primary">
                    Lihat Peringkat
                  </Link>
                </>
              }
            >
              <div className="celebration-copy">
                <p>
                  Kerja bagus, <strong>{user?.name || "Warga"}</strong>! Misi ini resmi selesai dan hadiahnya
                  sudah masuk.
                </p>
                <p>+{angka(program?.exp || 0)} EXP{program?.badge ? ` · Badge baru: <strong>{program.badge}</strong>` : ""}</p>
                <p className="tiny text-2">Terus tingkatkan aktivitas sehatmu untuk peringkat lebih tinggi.</p>
              </div>
            </Modal>
          </AppShell>
  );
}

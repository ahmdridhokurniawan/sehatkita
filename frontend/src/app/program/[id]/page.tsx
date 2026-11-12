"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/Toast";
import { angka, tanggal } from "@/lib/format";
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
  const hariIni = new Date().toISOString().slice(0, 10);
  const m = (mulai || "").slice(0, 10);
  const s = (selesai || "").slice(0, 10);
  if (m && m > hariIni) return { label: "Akan datang", tone: "warning" as const };
  if (s && s < hariIni) return { label: "Selesai", tone: "info" as const };
  return { label: "Berjalan", tone: "safe" as const };
}

/** Komponen gambar terautentikasi untuk bukti foto dokumentasi tantangan. */
function BuktiFotoThumb({ url, alt, onPreview }: { url: string; alt: string; onPreview?: (src: string) => void }) {
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
    return <span className="tiny text-danger">Foto gagal dimuat.</span>;
  }
  if (!src) {
    return <span className="tiny text-2">Memuat foto dokumentasi…</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onPreview?.(src)}
      style={{
        padding: 0,
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--surface-2)",
        cursor: "pointer",
        maxWidth: 220,
      }}
      title="Klik untuk perbesar foto dokumentasi"
    >
      <img src={src} alt={alt} style={{ display: "block", width: "100%", maxHeight: 150, objectFit: "cover" }} />
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
  const [error, setError] = useState("");
  const [proses, setProses] = useState(false);
  const [aksiErr, setAksiErr] = useState("");
  const [tandaiId, setTandaiId] = useState<number | null>(null);

  // State unggah bukti foto warga
  const [fileBukti, setFileBukti] = useState<File | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string>("");
  const [catatanBukti, setCatatanBukti] = useState("");
  const [kirimLoading, setKirimLoading] = useState(false);

  // Modal preview foto & modal tolak bukti
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [tolakTarget, setTolakTarget] = useState<PesertaProgram | null>(null);
  const [alasanTolak, setAlasanTolak] = useState("");

  useEffect(() => {
    return () => {
      if (previewLocal) URL.revokeObjectURL(previewLocal);
    };
  }, [previewLocal]);

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

  function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    if (f) {
      setFileBukti(f);
      setPreviewLocal(URL.createObjectURL(f));
      setAksiErr("");
    } else {
      setFileBukti(null);
      setPreviewLocal("");
    }
  }

  async function kirimDokumentasi(ev: React.FormEvent) {
    ev.preventDefault();
    if (!program) return;
    if (!fileBukti) {
      setAksiErr("Pilih foto dokumentasi penyelesaian tantangan terlebih dahulu.");
      return;
    }
    setKirimLoading(true);
    setAksiErr("");
    try {
      const fd = new FormData();
      fd.append("foto", fileBukti);
      if (catatanBukti.trim()) fd.append("catatan_bukti", catatanBukti.trim());
      await programApi.kirimBukti(program.id, fd);
      toast.success("Dokumentasi misi berhasil dikirim dan menunggu verifikasi kader/admin.");
      setFileBukti(null);
      if (previewLocal) URL.revokeObjectURL(previewLocal);
      setPreviewLocal("");
      setCatatanBukti("");
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      setAksiErr(apiErr.message || "Gagal mengirim foto dokumentasi.");
    } finally {
      setKirimLoading(false);
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
    } catch (err) {
      setAksiErr(err instanceof ApiError ? err.message : "Gagal memverifikasi peserta");
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
  const persen = program && program.target_peserta
    ? Math.min(100, Math.round((program.jumlah_peserta / program.target_peserta) * 100))
    : 0;

  return (
    <AppShell noFab>
      <Link href="/program" className="tiny row gap-6 mb-16" style={{ textDecoration: "none" }}>
        <Icon name="chevron-left" size={16} /> Kembali ke Daftar Tantangan
      </Link>

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {program && st ? (
        <>
          <div className="card">
            <div className="row-between mb-8" style={{ gap: 8, alignItems: "flex-start" }}>
              <div>
                <div className="row gap-8 wrap mb-6">
                  <Badge tone="primary">{LABEL_JENIS[program.jenis] || program.jenis}</Badge>
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

              {pSaya?.bukti_foto_url ? (
                <div className="mt-12">
                  <div className="tiny mb-6 fw-600">Dokumentasi Terunggah Saat Ini:</div>
                  <BuktiFotoThumb
                    url={pSaya.bukti_foto_url}
                    alt="Foto bukti penyelesaian misi"
                    onPreview={(src) => setFotoModal(src)}
                  />
                  {pSaya.catatan_bukti ? <p className="tiny mt-6">Catatan Anda: “{pSaya.catatan_bukti}”</p> : null}
                </div>
              ) : null}

              {statusSaya !== "selesai" ? (
                <form onSubmit={kirimDokumentasi} className="mt-16" style={{ display: "grid", gap: 12 }}>
                  <div className="field">
                    <label className="label" htmlFor="foto-bukti">
                      {pSaya?.bukti_foto_url ? "Unggah Ulang Foto Dokumentasi" : "Pilih Foto Dokumentasi"}{" "}
                      <span className="req">*</span>
                    </label>
                    <input
                      id="foto-bukti"
                      className="input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={pilihFile}
                    />
                    <div className="hint">Format JPG, PNG, atau WebP (maks. 5 MB).</div>
                  </div>

                  {previewLocal ? (
                    <div>
                      <div className="tiny mb-4 fw-600">Pratinjau Foto:</div>
                      <img
                        src={previewLocal}
                        alt="Pratinjau foto dokumentasi"
                        style={{
                          maxWidth: 260,
                          maxHeight: 180,
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          objectFit: "cover",
                        }}
                      />
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

                  <Button type="submit" icon="upload" loading={kirimLoading}>
                    {pSaya?.bukti_foto_url ? "Perbarui & Kirim Dokumentasi" : "Kirim Dokumentasi Misi"}
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
                <p className="tiny center">Memuat peserta…</p>
              ) : peserta.length === 0 ? (
                <p className="tiny center" style={{ padding: "12px 0" }}>
                  Belum ada peserta terdaftar.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {peserta.map((p) => {
                    const selesai = p.status === "selesai";
                    const stP = p.status as StatusPeserta;
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

                        {p.bukti_foto_url ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            <BuktiFotoThumb
                              url={p.bukti_foto_url}
                              alt={`Dokumentasi ${p.name}`}
                              onPreview={(src) => setFotoModal(src)}
                            />
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
                                variant="outline"
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
    </AppShell>
  );
}

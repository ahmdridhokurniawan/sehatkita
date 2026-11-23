"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { edukasiApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { angka, tanggal } from "@/lib/format";
import type {
  EdukasiItem,
  EdukasiKategori,
  RingkasanProgresEdukasi,
  Wilayah,
} from "@/types";

const LABEL_KATEGORI: Record<EdukasiKategori, string> = {
  hipertensi: "Hipertensi",
  diabetes: "Diabetes & Gula Darah",
  gizi_imt: "Gizi & Berat Ideal",
  aktivitas_fisik: "Aktivitas Fisik",
  gaya_hidup: "Gaya Hidup Sehat",
  rujukan: "Alur Rujukan",
  umum: "Umum",
};

const ROLE_PETUGAS = ["kader", "admin_kelurahan", "super_admin"];

export default function EdukasiPage() {
  const toast = useToast();
  const { user } = useUser();
  const isWarga = user?.role === "user";
  const bisaKelola = ROLE_PETUGAS.includes(user?.role || "");

  const [items, setItems] = useState<EdukasiItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanProgresEdukasi | null>(null);
  const [page, setPage] = useState(1);
  const [kategori, setKategori] = useState<string>("");
  const [statusBaca, setStatusBaca] = useState<string>("");
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");

  // Modal baca & catat progres pribadi
  const [bacaItem, setBacaItem] = useState<EdukasiItem | null>(null);
  const [progPersen, setProgPersen] = useState(0);
  const [progSelesai, setProgSelesai] = useState(false);
  const [progCatatan, setProgCatatan] = useState("");
  const [simpanProg, setSimpanProg] = useState(false);

  // Modal CRUD materi petugas
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<EdukasiItem | null>(null);
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [fJudul, setFJudul] = useState("");
  const [fKategori, setFKategori] = useState<EdukasiKategori>("umum");
  const [fRingkasan, setFRingkasan] = useState("");
  const [fKonten, setFKonten] = useState("");
  const [fMenit, setFMenit] = useState("5");
  const [fWilayahId, setFWilayahId] = useState("");
  const [fAktif, setFAktif] = useState(true);
  const [fVideoUrl, setFVideoUrl] = useState("");
  const [fFotoFile, setFFotoFile] = useState<File | null>(null);
  const [fVideoFile, setFVideoFile] = useState<File | null>(null);
  const [savingCrud, setSavingCrud] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [hapusTarget, setHapusTarget] = useState<EdukasiItem | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await edukasiApi.listPaged({
        page,
        per_page: 9,
        kategori: kategori || undefined,
        status_baca: isWarga && statusBaca ? statusBaca : undefined,
        search: cari.trim() || undefined,
      });
      setItems(res.data);
      setMeta(res.meta);
      setRingkasan(res.ringkasan_progres);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat materi edukasi");
    } finally {
      setLoading(false);
    }
  }, [page, kategori, statusBaca, cari, isWarga]);

  useEffect(() => {
    if (!user) return;
    let aktif = true;
    edukasiApi
      .listPaged({
        page,
        per_page: 9,
        kategori: kategori || undefined,
        status_baca: isWarga && statusBaca ? statusBaca : undefined,
        search: cari.trim() || undefined,
      })
      .then((res) => {
        if (!aktif) return;
        setItems(res.data);
        setMeta(res.meta);
        setRingkasan(res.ringkasan_progres);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat materi edukasi");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [user, page, kategori, statusBaca, cari, isWarga]);

  useEffect(() => {
    if (user?.role !== "super_admin") return;
    wilayahApi
      .list({ tipe: "kelurahan" })
      .then((rows) => setWilayahList(rows))
      .catch(() => setWilayahList([]));
  }, [user?.role]);

  function bukaBaca(item: EdukasiItem) {
    setBacaItem(item);
    setProgPersen(item.progres_saya?.progres_persen ?? 0);
    setProgSelesai(Boolean(item.progres_saya?.sudah_dibaca));
    setProgCatatan(item.progres_saya?.catatan_pribadi ?? "");
  }

  async function kirimProgres(tandaiSelesai?: boolean) {
    if (!bacaItem) return;
    const selesai = tandaiSelesai !== undefined ? tandaiSelesai : progSelesai || progPersen >= 100;
    const persen = selesai ? 100 : progPersen;
    setSimpanProg(true);
    try {
      const res = await edukasiApi.simpanProgres(bacaItem.id, {
        progres_persen: persen,
        sudah_dibaca: selesai,
        catatan_pribadi: progCatatan.trim() || null,
      });
      toast.success(
        selesai
          ? "Materi selesai dipahami & tersimpan ke progres Anda."
          : "Progres belajar pribadi disimpan.",
      );
      if (res.badge_baru && res.badge_baru.length > 0) {
        toast.success(`Lencana keaktifan terbuka: ${res.badge_baru.join(", ")}`, {
          title: "Achievement Baru!",
        });
      }
      setBacaItem((prev) =>
        prev
          ? {
              ...prev,
              progres_saya: {
                progres_persen: res.progres_persen,
                sudah_dibaca: res.sudah_dibaca,
                catatan_pribadi: res.catatan_pribadi,
                selesai_pada: res.selesai_pada,
                updated_at: new Date().toISOString(),
              },
            }
          : null,
      );
      setProgPersen(res.progres_persen);
      setProgSelesai(res.sudah_dibaca);
      await muat();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menyimpan progres belajar.");
    } finally {
      setSimpanProg(false);
    }
  }

  function bukaTambah() {
    setEditItem(null);
    setFJudul("");
    setFKategori("umum");
    setFRingkasan("");
    setFKonten("");
    setFMenit("5");
    setFWilayahId("");
    setFAktif(true);
    setFVideoUrl("");
    setFFotoFile(null);
    setFVideoFile(null);
    setFormErr("");
    setFormOpen(true);
  }

  function bukaEdit(item: EdukasiItem) {
    setEditItem(item);
    setFJudul(item.judul);
    setFKategori(item.kategori);
    setFRingkasan(item.ringkasan);
    setFKonten(item.konten);
    setFMenit(String(item.estimasi_menit || 5));
    setFWilayahId(item.wilayah_id ? String(item.wilayah_id) : "");
    setFAktif(item.aktif);
    setFVideoUrl(item.media_video_url || "");
    setFFotoFile(null);
    setFVideoFile(null);
    setFormErr("");
    setFormOpen(true);
  }

  async function simpanMateri() {
    setFormErr("");
    if (!fJudul.trim() || !fRingkasan.trim() || !fKonten.trim()) {
      setFormErr("Judul, ringkasan, dan isi materi wajib diisi.");
      return;
    }

    const formData = new FormData();
    formData.append("judul", fJudul.trim());
    formData.append("ringkasan", fRingkasan.trim());
    formData.append("konten", fKonten.trim());
    formData.append("kategori", fKategori);
    formData.append("estimasi_menit", String(Math.max(1, Number(fMenit) || 5)));
    formData.append("aktif", fAktif ? "1" : "0");
    if (user?.role === "super_admin") {
      formData.append("wilayah_id", fWilayahId ? String(Number(fWilayahId)) : "");
    }
    if (fVideoUrl.trim()) {
      formData.append("media_video_url", fVideoUrl.trim());
    }
    if (fFotoFile) {
      formData.append("foto", fFotoFile);
    }
    if (fVideoFile) {
      formData.append("video", fVideoFile);
    }

    setSavingCrud(true);
    try {
      if (editItem) {
        await edukasiApi.ubah(editItem.id, formData);
        toast.success("Materi edukasi diperbarui.");
      } else {
        await edukasiApi.buat(formData);
        toast.success("Materi edukasi baru diterbitkan.");
      }
      setFormOpen(false);
      await muat();
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Gagal menyimpan materi.");
    } finally {
      setSavingCrud(false);
    }
  }

  async function konfirmasiHapus() {
    if (!hapusTarget) return;
    try {
      await edukasiApi.hapus(hapusTarget.id);
      toast.success("Materi edukasi dihapus.");
      setHapusTarget(null);
      await muat();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus materi.");
    }
  }

  function bolehUbahItem(item: EdukasiItem): boolean {
    if (!bisaKelola || !user) return false;
    if (user.role === "super_admin") return true;
    return item.wilayah_id === user.wilayah_id;
  }

  return (
    <AppShell greet="Edukasi Kesehatan" noFab>
      <div className="row-between wrap gap-12 mb-16">
        <div>
          <h1 className="h3">Edukasi &amp; Literasi PTM</h1>
          <p className="tiny">
            Materi pembelajaran mandiri yang terpisah dari{" "}
            <Link href="/program" className="text-primary fw-600">
              Program Tantangan
            </Link>
            . Catat progres pemahaman Anda di sini.
          </p>
        </div>
        {bisaKelola ? (
          <Button icon="plus" onClick={bukaTambah}>
            Tambah Materi
          </Button>
        ) : null}
      </div>

      {isWarga && ringkasan ? (
        <div className="summary-strip mb-12" style={{ justifyContent: "space-between" }}>
          <span className="summary-strip-item">
            Progres Belajar{" "}
            <strong>
              {angka(ringkasan.selesai)}/{angka(ringkasan.total_materi)}
            </strong>{" "}
            materi
            {ringkasan.berjalan > 0 ? ` · ${angka(ringkasan.berjalan)} sedang dibaca` : ""}
          </span>
          <div className="row items-center gap-10" style={{ flex: "1 1 220px", justifyContent: "flex-end" }}>
            <div className="progress" style={{ flex: "1 1 160px", maxWidth: 260, height: 6 }}>
              <i style={{ width: `${ringkasan.persen_keseluruhan}%`, background: "var(--primary)" }} />
            </div>
            <Badge tone={ringkasan.persen_keseluruhan >= 75 ? "safe" : "primary"}>
              {ringkasan.persen_keseluruhan}% tuntas
            </Badge>
          </div>
        </div>
      ) : null}

      <div
        className="mb-16"
        style={{
          display: "grid",
          gridTemplateColumns: isWarga ? "minmax(220px, 1fr) minmax(170px, 210px) minmax(170px, 210px)" : "minmax(220px, 1fr) minmax(180px, 220px)",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div className="input-icon" style={{ width: "100%" }}>
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Cari judul atau topik edukasi…"
            value={cari}
            onChange={(e) => {
              setCari(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="select"
          style={{ width: "100%" }}
          aria-label="Filter kategori edukasi"
          value={kategori}
          onChange={(e) => {
            setKategori(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Kategori</option>
          {(Object.keys(LABEL_KATEGORI) as EdukasiKategori[]).map((k) => (
            <option key={k} value={k}>
              {LABEL_KATEGORI[k]}
            </option>
          ))}
        </select>
        {isWarga ? (
          <select
            className="select"
            style={{ width: "100%" }}
            aria-label="Filter status baca"
            value={statusBaca}
            onChange={(e) => {
              setStatusBaca(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Status</option>
            <option value="belum">Belum dibaca</option>
            <option value="berjalan">Sedang dipelajari</option>
            <option value="selesai">Sudah selesai</option>
          </select>
        ) : null}
      </div>

      {tampilLoading ? (
        <Loading variant="cards" text="Memuat materi edukasi…" />
      ) : error ? (
        <ErrorState message={error} onRetry={muat} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="Belum ada materi edukasi"
          desc="Materi edukasi belum tersedia atau tidak cocok dengan filter Anda."
        />
      ) : (
        <div className="card card-list">
          {items.map((item) => {
            const prog = item.progres_saya;
            return (
              <article
                key={item.id}
                className="li"
                style={{
                  padding: "16px 20px",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                <div className="li-main">
                  <div className="row items-center wrap gap-8">
                    <Badge tone="info">{LABEL_KATEGORI[item.kategori] || item.kategori}</Badge>
                    <span className="tiny row gap-4 items-center">
                      <Icon name="clock" size={12} /> {item.estimasi_menit} mnt
                    </span>
                  </div>
                  <h2 className="h4" style={{ margin: "6px 0 4px" }}>
                    {item.judul}
                  </h2>
                  <p className="tiny" style={{ color: "var(--text-2)", lineHeight: 1.5 }}>
                    {item.ringkasan}
                  </p>
                  {isWarga ? (
                    <div className="row items-center gap-10 mt-8" style={{ maxWidth: 320 }}>
                      <div className="progress" style={{ flex: 1, maxWidth: 240, height: 5 }}>
                        <i
                          style={{
                            width: `${prog?.progres_persen ?? 0}%`,
                            background: prog?.sudah_dibaca ? "var(--safe)" : "var(--primary)",
                          }}
                        />
                      </div>
                      <span className="tiny">
                        {prog?.sudah_dibaca ? "Selesai dipahami" : "Progres saya"}{" "}
                        <strong>{prog?.progres_persen ?? 0}%</strong>
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="row gap-6 items-center" style={{ flexShrink: 0 }}>
                  <Button variant="outline" size="sm" icon="book-open" onClick={() => bukaBaca(item)}>
                    {isWarga ? (prog?.sudah_dibaca ? "Baca Ulang" : "Baca & Catat") : "Baca Materi"}
                  </Button>
                  {bolehUbahItem(item) ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => bukaEdit(item)}>
                        <Icon name="pencil" size={14} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setHapusTarget(item)}>
                        <Icon name="trash" size={14} />
                      </Button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!tampilLoading && !error && meta ? <Pagination meta={meta} onPage={setPage} /> : null}

      {/* Modal baca materi & catat progres pribadi */}
      <Modal
        open={!!bacaItem}
        onClose={() => setBacaItem(null)}
        title={bacaItem?.judul || "Materi Edukasi"}
        size="lg"
      >
        {bacaItem ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div className="row gap-8 wrap">
              <Badge tone="info">{LABEL_KATEGORI[bacaItem.kategori] || bacaItem.kategori}</Badge>
              <span className="tiny">Estimasi baca {bacaItem.estimasi_menit} menit</span>
              {bacaItem.pembuat ? <span className="tiny">· Oleh {bacaItem.pembuat.name}</span> : null}
              {bacaItem.created_at ? <span className="tiny">· {tanggal(bacaItem.created_at, "short")}</span> : null}
            </div>

            {bacaItem.media_foto_url ? (
              <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bacaItem.media_foto_url}
                  alt={bacaItem.judul}
                  style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
                />
              </div>
            ) : null}

            {bacaItem.media_video_file_url ? (
              <video
                src={bacaItem.media_video_file_url}
                controls
                style={{ width: "100%", maxHeight: 340, borderRadius: 12, background: "#000" }}
              />
            ) : bacaItem.media_video_url ? (
              <div className="alert alert-info">
                <Icon name="video" size={16} />
                <a
                  href={bacaItem.media_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm fw-600"
                  style={{ textDecoration: "underline" }}
                >
                  Tonton Video Materi Edukasi
                </a>
              </div>
            ) : null}

            <div className="flat-sub" style={{ whiteSpace: "pre-line", lineHeight: 1.65 }}>
              {bacaItem.konten}
            </div>

            {isWarga ? (
              <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
                <div className="row-between wrap gap-8">
                  <strong className="text-sm">Catatan Progres Belajar Pribadi</strong>
                  <Badge tone={progSelesai ? "safe" : "primary"}>{progPersen}%</Badge>
                </div>

                <div>
                  <label className="label" htmlFor="edu-prog-range">
                    Persentase Pemahaman ({progPersen}%)
                  </label>
                  <input
                    id="edu-prog-range"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={progPersen}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setProgPersen(v);
                      setProgSelesai(v >= 100);
                    }}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="edu-foto">Foto materi (opsional, maks 5MB)</label>
              <input
                id="edu-foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="input"
                onChange={(e) => setFFotoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="edu-video">Video materi (opsional, MP4/WebM maks 50MB)</label>
              <input
                id="edu-video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="input"
                onChange={(e) => setFVideoFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="edu-video-url">Tautan video YouTube / eksternal (opsional)</label>
            <input
              id="edu-video-url"
              type="url"
              className="input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={fVideoUrl}
              onChange={(e) => setFVideoUrl(e.target.value)}
            />
          </div>
          <label className="check">
                  <input
                    type="checkbox"
                    checked={progSelesai}
                    onChange={(e) => {
                      const ok = e.target.checked;
                      setProgSelesai(ok);
                      if (ok) setProgPersen(100);
                    }}
                  />
                  <span className="tiny">Saya sudah membaca dan memahami materi ini</span>
                </label>

                <div className="field">
                  <label className="label" htmlFor="edu-catatan-pribadi">
                    Catatan Pribadi / Rencana Tindak Lanjut <span className="opt">(opsional)</span>
                  </label>
                  <textarea
                    id="edu-catatan-pribadi"
                    className="textarea"
                    rows={2}
                    maxLength={1000}
                    placeholder="Contoh: Akan mengurangi garam dan cek tensi rutin setiap minggu..."
                    value={progCatatan}
                    onChange={(e) => setProgCatatan(e.target.value)}
                  />
                </div>

                <div className="row gap-8 wrap" style={{ justifyContent: "flex-end" }}>
                  <Button variant="outline" size="sm" onClick={() => void kirimProgres()} loading={simpanProg}>
                    Simpan Progres
                  </Button>
                  {!progSelesai ? (
                    <Button variant="primary" size="sm" icon="check" onClick={() => void kirimProgres(true)} loading={simpanProg}>
                      Tandai Selesai 100%
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Modal tambah / edit materi petugas */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? "Ubah Materi Edukasi" : "Tambah Materi Edukasi"}
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <Button onClick={simpanMateri} loading={savingCrud}>
              Simpan Materi
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          {formErr ? <div className="alert alert-danger">{formErr}</div> : null}
          <Input
            label="Judul materi"
            value={fJudul}
            onChange={(e) => setFJudul(e.target.value)}
            required
          />
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="edu-kat">Kategori</label>
              <select
                id="edu-kat"
                className="select"
                value={fKategori}
                onChange={(e) => setFKategori(e.target.value as EdukasiKategori)}
              >
                {(Object.keys(LABEL_KATEGORI) as EdukasiKategori[]).map((k) => (
                  <option key={k} value={k}>
                    {LABEL_KATEGORI[k]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Estimasi baca (menit)"
              type="number"
              min={1}
              max={120}
              value={fMenit}
              onChange={(e) => setFMenit(e.target.value)}
            />
          </div>
          {user?.role === "super_admin" ? (
            <div className="field">
              <label className="label" htmlFor="edu-wilayah">Lingkup Wilayah</label>
              <select
                id="edu-wilayah"
                className="select"
                value={fWilayahId}
                onChange={(e) => setFWilayahId(e.target.value)}
              >
                <option value="">Se-Kota Banjarbaru (Umum)</option>
                {wilayahList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field">
            <label className="label" htmlFor="edu-ringkasan">Ringkasan singkat</label>
            <textarea
              id="edu-ringkasan"
              className="textarea"
              rows={2}
              maxLength={500}
              value={fRingkasan}
              onChange={(e) => setFRingkasan(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="edu-konten">Isi lengkap materi</label>
            <textarea
              id="edu-konten"
              className="textarea"
              rows={6}
              maxLength={10000}
              value={fKonten}
              onChange={(e) => setFKonten(e.target.value)}
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="edu-foto">Foto materi (opsional, maks 5MB)</label>
              <input
                id="edu-foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="input"
                onChange={(e) => setFFotoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="edu-video">Video materi (opsional, MP4/WebM maks 50MB)</label>
              <input
                id="edu-video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="input"
                onChange={(e) => setFVideoFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="edu-video-url">Tautan video YouTube / eksternal (opsional)</label>
            <input
              id="edu-video-url"
              type="url"
              className="input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={fVideoUrl}
              onChange={(e) => setFVideoUrl(e.target.value)}
            />
          </div>
          <label className="check">
            <input type="checkbox" checked={fAktif} onChange={(e) => setFAktif(e.target.checked)} />
            <span className="tiny">Tampilkan ke warga (aktif)</span>
          </label>
        </div>
      </Modal>

      {/* Modal konfirmasi hapus */}
      <Modal
        open={!!hapusTarget}
        onClose={() => setHapusTarget(null)}
        title="Hapus Materi Edukasi"
        footer={
          <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={() => setHapusTarget(null)}>
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={konfirmasiHapus}>
              Ya, Hapus
            </button>
          </div>
        }
      >
        <p className="tiny">
          Hapus materi <b>{hapusTarget?.judul}</b>? Progres baca terkait juga akan dihapus.
        </p>
      </Modal>
    </AppShell>
  );
}

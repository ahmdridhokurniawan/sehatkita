"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BrandLockup } from "@/components/ui/BrandLogo";
import Modal from "@/components/ui/Modal";
import Segmented from "@/components/ui/Segmented";
import PilihWarga from "@/components/warga/PilihWarga";
import { EmptyState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { LABEL_STATUS_RUJUKAN } from "@/lib/labels";
import { tanggal } from "@/lib/format";
import { rujukan as rujukanApi, faskes as faskesApi, ApiError } from "@/lib/api";
import type { Faskes, Rujukan, SuratRujukan, WargaCari } from "@/types";
import type { StatusRujukan } from "@/lib/enums";

/* ------------------------------------------------------------------
   Rujukan — §11.1–11.3.
   - user: melihat daftar rujukan miliknya.
   - kader / super_admin: melihat rujukan binaan/sistem, membuat rujukan, & ubah status.
   ------------------------------------------------------------------ */

type Tone = "info" | "peringatan" | "sukses" | "bahaya";

const TONE_STATUS: Record<StatusRujukan, Tone> = {
  baru: "info",
  dihubungi: "peringatan",
  selesai: "sukses",
  ditolak: "bahaya",
};

const URUTAN_STATUS: StatusRujukan[] = ["baru", "dihubungi", "selesai", "ditolak"];

function opsiStatusBerikutnya(saatIni: StatusRujukan): StatusRujukan[] {
  if (saatIni === "baru") return ["dihubungi", "selesai", "ditolak"];
  if (saatIni === "dihubungi") return ["selesai", "ditolak"];
  return [];
}

function LembarSuratRujukan({
  surat,
  sheetRef,
}: {
  surat: SuratRujukan;
  sheetRef?: RefObject<HTMLDivElement | null>;
}) {
  const jkLabel =
    surat.pasien.jenis_kelamin === "L"
      ? "Laki-laki"
      : surat.pasien.jenis_kelamin === "P"
        ? "Perempuan"
        : "-";
  const usiaLabel = surat.pasien.usia !== null && surat.pasien.usia !== undefined ? `${surat.pasien.usia} tahun` : "-";
  const pembuatLabel = surat.dibuat_oleh?.name || "Sistem Skrining Otomatis SehatKita";

  return (
    <div className="surat-sheet" ref={sheetRef}>
      <div className="surat-head">
        <div className="surat-brand">
          <BrandLockup variant="sm" />
          <div>
            <p className="surat-instansi">PEMERINTAH KOTA BANJARBARU · DINAS KESEHATAN</p>
            <h3>SURAT PENGANTAR RUJUKAN POSBINDU</h3>
            <p>Program Pengendalian Penyakit Tidak Menular (PTM) — SehatKita</p>
          </div>
        </div>
        <div className="surat-num">
          <strong>{surat.nomor_surat}</strong>
          <span>Tanggal Rujukan: {tanggal(surat.tanggal_rujukan, "day")}</span>
          <span>Dicetak: {tanggal(surat.tanggal_cetak, "day")}</span>
        </div>
      </div>

      <p className="surat-sec-title">Identitas Warga / Pasien</p>
      <table className="surat-table">
        <tbody>
          <tr>
            <th>Nama Lengkap</th>
            <td>{surat.pasien.name || "-"}</td>
          </tr>
          <tr>
            <th>NIK</th>
            <td>{surat.pasien.nik || "-"}</td>
          </tr>
          <tr>
            <th>Tanggal Lahir</th>
            <td>{surat.pasien.tgl_lahir ? tanggal(surat.pasien.tgl_lahir, "day") : "-"}</td>
          </tr>
          <tr>
            <th>Jenis Kelamin / Usia</th>
            <td>
              {jkLabel} / {usiaLabel}
            </td>
          </tr>
          <tr>
            <th>Wilayah Domisili</th>
            <td>{surat.pasien.wilayah || "-"}</td>
          </tr>
        </tbody>
      </table>

      <p className="surat-sec-title">Fasilitas Kesehatan Tujuan</p>
      <table className="surat-table">
        <tbody>
          <tr>
            <th>Nama Faskes</th>
            <td>{surat.faskes.nama || "-"}</td>
          </tr>
          <tr>
            <th>Jenis Faskes</th>
            <td>{(surat.faskes.jenis || "-").replace(/_/g, " ")}</td>
          </tr>
          <tr>
            <th>Alamat</th>
            <td>{surat.faskes.alamat || "-"}</td>
          </tr>
          <tr>
            <th>Telepon</th>
            <td>{surat.faskes.telepon || "-"}</td>
          </tr>
        </tbody>
      </table>

      <p className="surat-sec-title">Keterangan Rujukan</p>
      <table className="surat-table">
        <tbody>
          <tr>
            <th>Alasan Rujukan</th>
            <td>{surat.alasan}</td>
          </tr>
          {surat.indikator ? (
            <tr>
              <th>Indikator Pemicu</th>
              <td>{surat.indikator.toUpperCase()}</td>
            </tr>
          ) : null}
          <tr>
            <th>Status Tindak Lanjut</th>
            <td>{LABEL_STATUS_RUJUKAN[surat.status] || surat.status}</td>
          </tr>
          {surat.catatan ? (
            <tr>
              <th>Catatan Petugas</th>
              <td>{surat.catatan}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="surat-sign">
        <div className="surat-sign-box">
          <span>Diterbitkan oleh,</span>
          <div className="surat-sign-space" />
          <strong>{pembuatLabel}</strong>
        </div>
        <div className="surat-sign-box" style={{ textAlign: "right" }}>
          <span>Pemegang Surat / Warga,</span>
          <div className="surat-sign-space" />
          <strong>{surat.pasien.name || "-"}</strong>
        </div>
      </div>

      <div className="surat-note">{surat.disclaimer}</div>
    </div>
  );
}

const CSS_CETAK_SURAT = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #182015;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .surat-sheet { background: #fff; color: #182015; }
  .surat-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 14px;
    margin-bottom: 16px;
    border-bottom: 2.5px solid #1f3319;
  }
  .surat-brand { display: flex; align-items: center; gap: 12px; }
  .brand-logos { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .brand-city { display: block; object-fit: contain; }
  .brand-mark { display: inline-flex; align-items: center; }
  .surat-instansi {
    margin: 0 0 2px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    color: #3d5333;
  }
  .surat-head h3 { margin: 0; font-size: 16px; color: #1f3319; }
  .surat-head p { margin: 3px 0 0; font-size: 11.5px; color: #4e5846; }
  .surat-num { text-align: right; font-size: 11px; color: #4e5846; white-space: nowrap; }
  .surat-num strong { display: block; color: #182015; font-size: 13px; margin-bottom: 3px; }
  .surat-num span { display: block; line-height: 1.45; }
  .surat-sec-title {
    margin: 16px 0 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: #3d5333;
  }
  .surat-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .surat-table th, .surat-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #e2e8dd;
    text-align: left;
    vertical-align: top;
  }
  .surat-table th { width: 180px; color: #4e5846; font-weight: 600; }
  .surat-sign {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-top: 28px;
    font-size: 12px;
  }
  .surat-sign-box span { display: block; color: #4e5846; }
  .surat-sign-space { height: 48px; }
  .surat-note {
    margin-top: 20px;
    padding: 10px 12px;
    border-left: 3.5px solid #638b3f;
    background: #f4f7f0;
    font-size: 11px;
    line-height: 1.45;
    color: #3a4533;
  }
`;

export default function RujukanPage() {
  const toast = useToast();
  const { user } = useUser();
  const bisaBuat = user?.role === "kader" || user?.role === "super_admin";
  const bisaUbahStatus =
    user?.role === "kader" || user?.role === "admin_kelurahan" || user?.role === "super_admin";
  const bisaCetakSurat = user?.role !== "admin_kelurahan";

  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [daftarRujukan, setDaftarRujukan] = useState<Rujukan[]>([]);
  const [daftarFaskes, setDaftarFaskes] = useState<Faskes[]>([]);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string>("");

  // Modal buat rujukan manual
  const [buatOpen, setBuatOpen] = useState(false);
  const [fWarga, setFWarga] = useState<WargaCari | null>(null);
  const [fFaskesId, setFFaskesId] = useState("");
  const [fAlasan, setFAlasan] = useState("");
  const [fErr, setFErr] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  // Modal ubah status rujukan
  const [ubahSasaran, setUbahSasaran] = useState<Rujukan | null>(null);
  const [nextStatus, setNextStatus] = useState<StatusRujukan>("dihubungi");
  const [nextCatatan, setNextCatatan] = useState("");
  const [ubahErr, setUbahErr] = useState("");
  const [memperbarui, setMemperbarui] = useState(false);

  // Modal pratinjau & cetak PDF surat pengantar rujukan
  const [suratAktif, setSuratAktif] = useState<SuratRujukan | null>(null);
  const [muatSuratId, setMuatSuratId] = useState<number | null>(null);
  const suratSheetRef = useRef<HTMLDivElement | null>(null);

  const muat = useCallback(async () => {
    try {
      const res = await rujukanApi.list({ per_page: 100 });
      setDaftarRujukan(res);
      setError("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal muat rujukan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    rujukanApi
      .list({ per_page: 100 })
      .then((res) => {
        if (!aktif) return;
        setDaftarRujukan(res);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal muat rujukan");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  useEffect(() => {
    if (!bisaBuat) return;
    let aktif = true;
    faskesApi
      .list()
      .then((rows) => {
        if (!aktif) return;
        setDaftarFaskes(rows);
        if (rows.length) setFFaskesId((kini) => kini || String(rows[0].id));
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          const uid = Number(sp.get("rujuk_user_id") || "");
          const namaWarga = sp.get("rujuk_nama") || "";
          if (uid > 0 && namaWarga) {
            setFWarga({
              id: uid,
              name: namaWarga,
              nik: sp.get("rujuk_nik") || null,
              wilayah_id: null,
              wilayah: sp.get("rujuk_wilayah") || null,
            });
            setFAlasan(sp.get("rujuk_alasan") || "");
            setFErr("");
            setBuatOpen(true);
            window.history.replaceState({}, "", "/rujukan");
          }
        }
      })
      .catch(() => {
        if (aktif) setDaftarFaskes([]);
      });
    return () => {
      aktif = false;
    };
  }, [bisaBuat]);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return daftarRujukan.filter((r) => {
      const cocokStatus = filter === "semua" || r.status === filter;
      const cocokCari =
        q === "" ||
        r.faskes?.nama?.toLowerCase().includes(q) ||
        r.alasan?.toLowerCase().includes(q) ||
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.nik?.toLowerCase().includes(q);
      return cocokStatus && cocokCari;
    });
  }, [filter, cari, daftarRujukan]);

  const hitung = (s: StatusRujukan) => daftarRujukan.filter((r) => r.status === s).length;

  async function kirimRujukanBaru() {
    setFErr("");
    if (!fWarga) {
      setFErr("Pilih warga terlebih dahulu.");
      return;
    }
    if (!fFaskesId) {
      setFErr("Pilih fasilitas kesehatan tujuan.");
      return;
    }
    if (!fAlasan.trim()) {
      setFErr("Alasan rujukan wajib diisi.");
      return;
    }
    setMenyimpan(true);
    try {
      await rujukanApi.create({
        user_id: fWarga.id,
        faskes_id: Number(fFaskesId),
        alasan: fAlasan.trim(),
      });
      toast.success("Rujukan dibuat.", { title: "Berhasil" });
      setBuatOpen(false);
      setFWarga(null);
      setFAlasan("");
      await muat();
    } catch (err) {
      setFErr(err instanceof ApiError ? err.message : "Gagal membuat rujukan");
    } finally {
      setMenyimpan(false);
    }
  }

  function bukaUbahStatus(r: Rujukan) {
    const opsi = opsiStatusBerikutnya(r.status);
    if (!opsi.length) return;
    setUbahSasaran(r);
    setNextStatus(opsi[0]);
    setNextCatatan("");
    setUbahErr("");
  }

  async function simpanStatusBaru() {
    if (!ubahSasaran) return;
    setUbahErr("");
    if (nextStatus === "ditolak" && !nextCatatan.trim()) {
      setUbahErr("Catatan alasan penolakan wajib diisi.");
      return;
    }
    setMemperbarui(true);
    try {
      await rujukanApi.updateStatus(ubahSasaran.id, {
        status: nextStatus,
        catatan: nextCatatan.trim() || undefined,
      });
      toast.success("Status rujukan diperbarui.", { title: "Berhasil" });
      setUbahSasaran(null);
      await muat();
    } catch (err) {
      setUbahErr(err instanceof ApiError ? err.message : "Gagal memperbarui status");
    } finally {
      setMemperbarui(false);
    }
  }

  async function bukaSuratRujukan(r: Rujukan) {
    setMuatSuratId(r.id);
    try {
      const dataSurat = await rujukanApi.surat(r.id);
      setSuratAktif(dataSurat);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal memuat surat rujukan");
    } finally {
      setMuatSuratId(null);
    }
  }

  function cetakSuratPdf() {
    if (!suratAktif || !suratSheetRef.current) return;

    const clone = suratSheetRef.current.cloneNode(true) as HTMLElement;
    // Pastikan gambar logo berpath relatif ikut resolve terhadap origin web saat masuk iframe
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src && src.startsWith("/")) {
        img.setAttribute("src", `${window.location.origin}${src}`);
      }
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      toast.error("Browser tidak mendukung pencetakan terisolasi.");
      return;
    }

    const judulAman = suratAktif.nomor_surat.replace(/[<>&"]/g, "");
    doc.open();
    doc.write(
      `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Surat Pengantar Rujukan - ${judulAman}</title><style>${CSS_CETAK_SURAT}</style></head><body>${clone.outerHTML}</body></html>`
    );
    doc.close();

    const imgs = Array.from(doc.images);
    const tungguGambar = Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
            setTimeout(() => resolve(), 600);
          })
      )
    );

    tungguGambar.then(() => {
      const hapus = () => {
        setTimeout(() => iframe.remove(), 300);
      };
      win.addEventListener("afterprint", hapus, { once: true });
      win.focus();
      win.print();
      setTimeout(hapus, 60000);
    });
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="h3">Rujukan</h1>
          <p className="tiny">Daftar rujukan ke fasilitas kesehatan.</p>
        </div>
        {bisaBuat ? (
          <Button
            icon="plus"
            onClick={() => {
              setFWarga(null);
              setFAlasan("");
              setFErr("");
              setBuatOpen(true);
            }}
          >
            Buat Rujukan
          </Button>
        ) : null}
      </div>

      {error && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="row gap-10 items-center">
            <span className="text-danger">
              <Icon name="alert-circle" size={18} />
            </span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {tampilLoading ? (
        <Loading variant="cards" text="Memuat data rujukan…" />
      ) : (
        <>
          <Segmented
            items={[
              { value: "semua", label: `Semua (${daftarRujukan.length})` },
              ...URUTAN_STATUS.map((s) => ({
                value: s,
                label: `${LABEL_STATUS_RUJUKAN[s]} (${hitung(s)})`,
              })),
            ]}
            value={filter}
            onChange={setFilter}
          />

          <div className="input-icon mt-12">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari rujukan (nama pasien, NIK, faskes, alasan)…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div className="mt-12">
            {daftar.length === 0 ? (
              <EmptyState icon="hospital" title="Tidak ada rujukan" desc="Tidak ada rujukan dengan status ini." />
            ) : (
              <div className="card card-list">
                {daftar.map((r) => {
                  const opsiNext = opsiStatusBerikutnya(r.status);
                  return (
                    <div className="li" key={r.id} style={{ alignItems: "flex-start" }}>
                      <span className="li-ico">
                        <Icon name="send" size={18} />
                      </span>
                      <div className="li-main">
                        <div className="row-between" style={{ gap: 8, alignItems: "center" }}>
                          <strong style={{ margin: 0 }}>
                            {r.user?.name ? `${r.user.name} · ` : ""}
                            {r.faskes?.nama || "Fasilitas Kesehatan"}
                          </strong>
                          <Badge tone={TONE_STATUS[r.status]}>{LABEL_STATUS_RUJUKAN[r.status]}</Badge>
                        </div>
                        {r.user?.nik ? <span style={{ display: "block", marginTop: 2 }}>NIK: {r.user.nik}</span> : null}
                        {r.alasan ? <span style={{ display: "block", marginTop: 4 }}>{r.alasan}</span> : null}
                        {r.catatan ? <span style={{ display: "block", marginTop: 2 }}>Catatan: {r.catatan}</span> : null}
                        <div className="row-between mt-8" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span className="tiny">
                            <Icon name="calendar" size={12} /> Dibuat {tanggal(r.created_at, "day")}
                          </span>
                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            {bisaCetakSurat ? (
                              <Button
                                variant="outline"
                                size="sm"
                                icon="download"
                                loading={muatSuratId === r.id}
                                onClick={() => bukaSuratRujukan(r)}
                              >
                                Surat / PDF
                              </Button>
                            ) : null}
                            {bisaUbahStatus && opsiNext.length > 0 ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => bukaUbahStatus(r)}
                              >
                                Ubah status
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Rujukan ini saran sistem, bukan diagnosis medis.
          </p>
        </>
      )}

      {/* Modal Buat Rujukan */}
      <Modal
        open={buatOpen}
        onClose={() => setBuatOpen(false)}
        title="Buat Rujukan Baru"
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setBuatOpen(false)}>
              Batal
            </button>
            <Button onClick={kirimRujukanBaru} loading={menyimpan}>
              Simpan Rujukan
            </Button>
          </div>
        }
      >
        <div className="mt-8">
          <PilihWarga
            value={fWarga}
            onChange={setFWarga}
            id="rujukan-warga"
            label="Warga"
            wilayahId={user?.role === "kader" ? user.wilayah_id : null}
          />
        </div>
        <div className="mt-12">
          <label className="label" htmlFor="rujukan-faskes">
            Fasilitas kesehatan tujuan
          </label>
          <select
            id="rujukan-faskes"
            className="select"
            value={fFaskesId}
            onChange={(e) => setFFaskesId(e.target.value)}
          >
            {daftarFaskes.length ? null : <option value="">Pilih faskes…</option>}
            {daftarFaskes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nama}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-12">
          <label className="label" htmlFor="rujukan-alasan">
            Alasan rujukan
          </label>
          <textarea
            id="rujukan-alasan"
            className="input"
            rows={3}
            maxLength={255}
            placeholder="Jelaskan hasil pemeriksaan atau kondisi yang perlu dirujuk…"
            value={fAlasan}
            onChange={(e) => setFAlasan(e.target.value)}
          />
        </div>
        {fErr ? <div className="err-msg show mt-8">{fErr}</div> : null}
      </Modal>

      {/* Modal Ubah Status Rujukan */}
      <Modal
        open={ubahSasaran !== null}
        onClose={() => setUbahSasaran(null)}
        title="Ubah Status Rujukan"
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setUbahSasaran(null)}>
              Batal
            </button>
            <Button onClick={simpanStatusBaru} loading={memperbarui}>
              Simpan Status
            </Button>
          </div>
        }
      >
        {ubahSasaran ? (
          <>
            <p className="tiny mb-12">
              {ubahSasaran.user?.name ? `${ubahSasaran.user.name} · ` : ""}
              {ubahSasaran.faskes?.nama || "Faskes"}
            </p>
            <div>
              <label className="label" htmlFor="ubah-status-select">
                Status baru
              </label>
              <select
                id="ubah-status-select"
                className="select"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as StatusRujukan)}
              >
                {opsiStatusBerikutnya(ubahSasaran.status).map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATUS_RUJUKAN[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-12">
              <label className="label" htmlFor="ubah-status-catatan">
                Catatan {nextStatus === "ditolak" ? "(wajib saat menolak)" : "(opsional)"}
              </label>
              <textarea
                id="ubah-status-catatan"
                className="input"
                rows={3}
                maxLength={500}
                placeholder="Tambahkan tindak lanjut atau alasan penolakan…"
                value={nextCatatan}
                onChange={(e) => setNextCatatan(e.target.value)}
              />
            </div>
            {ubahErr ? <div className="err-msg show mt-8">{ubahErr}</div> : null}
          </>
        ) : null}
      </Modal>

      {/* Modal Pratinjau & Cetak PDF Surat Pengantar Rujukan */}
      <Modal
        open={suratAktif !== null}
        onClose={() => setSuratAktif(null)}
        size="lg"
        title="Surat Pengantar Rujukan"
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setSuratAktif(null)}>
              Tutup
            </button>
            <Button icon="download" onClick={cetakSuratPdf}>
              Cetak / Simpan PDF
            </Button>
          </div>
        }
      >
        {suratAktif ? <LembarSuratRujukan surat={suratAktif} sheetRef={suratSheetRef} /> : null}
      </Modal>
    </AppShell>
  );
}

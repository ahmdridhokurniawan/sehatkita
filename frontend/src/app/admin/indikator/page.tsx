"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import TombolKembaliAdmin from "@/components/admin/TombolKembaliAdmin";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import { EmptyState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { admin as adminApi, ApiError } from "@/lib/api";
import { useMinLoading } from "@/hooks/useMinLoading";
import { LABEL_JENIS_GULA_DARAH, LABEL_STATUS_KESEHATAN } from "@/lib/labels";
import type { StatusKesehatan } from "@/lib/enums";
import type { AmbangKategori, Indikator } from "@/types";

type FormIndikator = {
  kode: string;
  nama: string;
  satuan: string;
  kelompok: string;
  interval_skrining_hari: string;
};

const IND_KOSONG: FormIndikator = {
  kode: "",
  nama: "",
  satuan: "",
  kelompok: "",
  interval_skrining_hari: "",
};

type FormAmbang = {
  indikator_id: string;
  jenis_gula_darah: string;
  batas_min: string;
  batas_max: string;
  kategori: string;
  status: StatusKesehatan;
  skor: string;
  memicu_rujukan: boolean;
};

const AMB_KOSONG: FormAmbang = {
  indikator_id: "",
  jenis_gula_darah: "",
  batas_min: "",
  batas_max: "",
  kategori: "",
  status: "normal",
  skor: "0",
  memicu_rujukan: false,
};

const STATUS_OPSI: StatusKesehatan[] = ["normal", "perlu_perhatian", "berisiko"];
const STATUS_TONE: Record<string, "safe" | "warning" | "danger"> = {
  normal: "safe",
  perlu_perhatian: "warning",
  berisiko: "danger",
};

export default function AdminIndikatorPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"indikator" | "ambang">("indikator");
  const [cari, setCari] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [indikator, setIndikator] = useState<Indikator[]>([]);
  const [indMeta, setIndMeta] = useState<Meta | null>(null);
  const [semuaIndikator, setSemuaIndikator] = useState<Indikator[]>([]);

  const [ambang, setAmbang] = useState<AmbangKategori[]>([]);
  const [ambMeta, setAmbMeta] = useState<Meta | null>(null);

  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string>("");

  // Modal Indikator
  const [indModal, setIndModal] = useState(false);
  const [indEdit, setIndEdit] = useState<Indikator | null>(null);
  const [indForm, setIndForm] = useState<FormIndikator>(IND_KOSONG);
  const [indErr, setIndErr] = useState<Record<string, string>>({});
  const [indSaving, setIndSaving] = useState(false);
  const [indHapus, setIndHapus] = useState<Indikator | null>(null);

  // Modal Ambang
  const [ambModal, setAmbModal] = useState(false);
  const [ambEdit, setAmbEdit] = useState<AmbangKategori | null>(null);
  const [ambForm, setAmbForm] = useState<FormAmbang>(AMB_KOSONG);
  const [ambErr, setAmbErr] = useState<Record<string, string>>({});
  const [ambSaving, setAmbSaving] = useState(false);
  const [ambHapus, setAmbHapus] = useState<AmbangKategori | null>(null);

  const [deleting, setDeleting] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const q = cari.trim() || undefined;
      const [indRes, ambRes, allIndRes] = await Promise.all([
        adminApi.indikator.listPaged({ page: tab === "indikator" ? page : 1, per_page: perPage, search: tab === "indikator" ? q : undefined }),
        adminApi.ambangKategori.listPaged({ page: tab === "ambang" ? page : 1, per_page: perPage, search: tab === "ambang" ? q : undefined }),
        adminApi.indikator.list({ per_page: 100 }),
      ]);
      setIndikator(indRes.data || []);
      setIndMeta(indRes.meta ?? null);
      setAmbang(ambRes.data || []);
      setAmbMeta(ambRes.meta ?? null);
      setSemuaIndikator(allIndRes || []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal muat indikator");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, tab, cari]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void muat();
    }, cari ? 250 : 0);
    return () => clearTimeout(timer);
  }, [muat, cari]);

  function bukaTambah() {
    if (tab === "indikator") {
      setIndEdit(null);
      setIndForm(IND_KOSONG);
      setIndErr({});
      setIndModal(true);
    } else {
      setAmbEdit(null);
      setAmbForm({
        ...AMB_KOSONG,
        indikator_id: semuaIndikator[0] ? String(semuaIndikator[0].id) : "",
      });
      setAmbErr({});
      setAmbModal(true);
    }
  }

  function bukaEditIndikator(ind: Indikator) {
    setIndEdit(ind);
    setIndForm({
      kode: ind.kode || "",
      nama: ind.nama || "",
      satuan: ind.satuan || "",
      kelompok: ind.kelompok || "",
      interval_skrining_hari: ind.interval_skrining_hari != null ? String(ind.interval_skrining_hari) : "",
    });
    setIndErr({});
    setIndModal(true);
  }

  function bukaEditAmbang(amb: AmbangKategori) {
    const matchedInd =
      amb.indikator_id ?? semuaIndikator.find((i) => i.kode === amb.indikator?.kode)?.id;
    setAmbEdit(amb);
    setAmbForm({
      indikator_id: matchedInd ? String(matchedInd) : "",
      jenis_gula_darah: amb.jenis_gula_darah || "",
      batas_min: String(amb.batas_min),
      batas_max: amb.batas_max === null ? "" : String(amb.batas_max),
      kategori: amb.kategori || "",
      status: amb.status,
      skor: String(amb.skor ?? 0),
      memicu_rujukan: Boolean(amb.memicu_rujukan),
    });
    setAmbErr({});
    setAmbModal(true);
  }

  async function simpanIndikator() {
    const e: Record<string, string> = {};
    if (!indForm.kode.trim()) e.kode = "Kode wajib diisi.";
    if (!indForm.nama.trim()) e.nama = "Nama indikator wajib diisi.";
    const intv = indForm.interval_skrining_hari.trim();
    if (intv !== "" && (!Number.isInteger(Number(intv)) || Number(intv) < 1 || Number(intv) > 365)) {
      e.interval_skrining_hari = "Interval harus 1–365 hari.";
    }
    setIndErr(e);
    if (Object.keys(e).length > 0) return;

    const payload: Partial<Indikator> = {
      kode: indForm.kode.trim(),
      nama: indForm.nama.trim(),
      satuan: indForm.satuan.trim() || null,
      kelompok: indForm.kelompok.trim() || null,
      interval_skrining_hari: intv === "" ? null : Number(intv),
    };

    setIndSaving(true);
    try {
      if (indEdit) {
        await adminApi.indikator.update(indEdit.id, payload);
        toast.success("Indikator diperbarui.", { title: "Berhasil" });
      } else {
        await adminApi.indikator.create(payload);
        toast.success("Indikator ditambahkan.", { title: "Berhasil" });
      }
      setIndModal(false);
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.errors)) map[k] = v[0] ?? "Tidak valid";
        setIndErr(map);
      }
      toast.warning(apiErr.message || "Gagal menyimpan indikator.");
    } finally {
      setIndSaving(false);
    }
  }

  async function simpanAmbang() {
    const e: Record<string, string> = {};
    if (!ambForm.indikator_id) e.indikator_id = "Indikator wajib dipilih.";
    if (ambForm.batas_min.trim() === "" || !Number.isFinite(Number(ambForm.batas_min))) {
      e.batas_min = "Batas minimum wajib diisi angka.";
    }
    if (ambForm.batas_max.trim() !== "") {
      const max = Number(ambForm.batas_max);
      if (!Number.isFinite(max)) e.batas_max = "Batas maksimum tidak valid.";
      else if (Number.isFinite(Number(ambForm.batas_min)) && max < Number(ambForm.batas_min)) {
        e.batas_max = "Batas maksimum harus >= batas minimum.";
      }
    }
    if (!ambForm.kategori.trim()) e.kategori = "Kategori wajib diisi.";
    const skorNum = ambForm.skor.trim() === "" ? 0 : Number(ambForm.skor);
    if (!Number.isInteger(skorNum) || skorNum < 0 || skorNum > 255) {
      e.skor = "Skor harus bilangan bulat 0–255.";
    }
    setAmbErr(e);
    if (Object.keys(e).length > 0) return;

    const payload: Partial<AmbangKategori> = {
      indikator_id: Number(ambForm.indikator_id),
      jenis_gula_darah: ambForm.jenis_gula_darah
        ? (ambForm.jenis_gula_darah as "puasa" | "sewaktu" | "2jam_pp" | "hba1c")
        : null,
      batas_min: Number(ambForm.batas_min),
      batas_max: ambForm.batas_max.trim() === "" ? null : Number(ambForm.batas_max),
      kategori: ambForm.kategori.trim(),
      status: ambForm.status,
      skor: skorNum,
      memicu_rujukan: ambForm.memicu_rujukan,
    };

    setAmbSaving(true);
    try {
      if (ambEdit) {
        await adminApi.ambangKategori.update(ambEdit.id, payload);
        toast.success("Ambang kategori diperbarui.", { title: "Berhasil" });
      } else {
        await adminApi.ambangKategori.create(payload);
        toast.success("Ambang kategori ditambahkan.", { title: "Berhasil" });
      }
      setAmbModal(false);
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.errors)) map[k] = v[0] ?? "Tidak valid";
        setAmbErr(map);
      }
      toast.warning(apiErr.message || "Gagal menyimpan ambang.");
    } finally {
      setAmbSaving(false);
    }
  }

  async function konfirmasiHapus() {
    setDeleting(true);
    try {
      if (indHapus) {
        await adminApi.indikator.hapus(indHapus.id);
        toast.success(`Indikator ${indHapus.nama} dihapus.`, { title: "Berhasil" });
        setIndHapus(null);
        if (indikator.length === 1 && page > 1) setPage((p) => p - 1);
        else await muat();
      } else if (ambHapus) {
        await adminApi.ambangKategori.hapus(ambHapus.id);
        toast.success(`Ambang "${ambHapus.kategori}" dihapus.`, { title: "Berhasil" });
        setAmbHapus(null);
        if (ambang.length === 1 && page > 1) setPage((p) => p - 1);
        else await muat();
      }
    } catch (err) {
      toast.warning((err as ApiError).message || "Gagal menghapus data.");
    } finally {
      setDeleting(false);
    }
  }

  const activeMeta = tab === "indikator" ? indMeta : ambMeta;
  const totalIndikator = indMeta?.total ?? indikator.length;
  const totalAmbang = ambMeta?.total ?? ambang.length;

  return (
    <AppShell noFab roles={["super_admin"]}>
      <TombolKembaliAdmin />
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Indikator & Ambang</h1>
          <p className="tiny">Atur indikator kesehatan & kategori batas penilaian.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={bukaTambah}>
          <Icon name="plus" size={16} /> {tab === "indikator" ? "Tambah Indikator" : "Tambah Ambang"}
        </button>
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

      <div className="segment mb-12">
        <button
          type="button"
          className={tab === "indikator" ? "active" : undefined}
          onClick={() => {
            setTab("indikator");
            setPage(1);
          }}
        >
          Indikator ({totalIndikator})
        </button>
        <button
          type="button"
          className={tab === "ambang" ? "active" : undefined}
          onClick={() => {
            setTab("ambang");
            setPage(1);
          }}
        >
          Ambang ({totalAmbang})
        </button>
      </div>

      <div className="input-icon mb-12">
        <Icon name="search" size={18} />
        <input
          className="input"
          type="search"
          placeholder={tab === "indikator" ? "Cari indikator (kode/nama)…" : "Cari ambang (kategori)…"}
          value={cari}
          onChange={(e) => {
            setCari(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {tampilLoading ? (
        <Loading variant="list" text="Memuat indikator…" />
      ) : (
        <>
          <div className="mt-12">
            {tab === "indikator" &&
              (indikator.length === 0 ? (
                <EmptyState
                  title={cari ? "Indikator tidak ditemukan" : "Tidak ada indikator"}
                  desc={cari ? `Tidak ada yang cocok dengan “${cari}”.` : "Belum ada indikator kesehatan."}
                />
              ) : (
                <div className="card card-list">
                  {indikator.map((ind) => (
                    <div className="li" key={ind.id} style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <span className="li-ico">
                        <Icon name="activity" size={18} />
                      </span>
                      <div className="li-main" style={{ flex: "1 1 220px" }}>
                        <div className="row-between" style={{ gap: 8, alignItems: "center" }}>
                          <strong style={{ margin: 0 }}>{ind.nama}</strong>
                          <Badge tone="info">{ind.kode}</Badge>
                        </div>
                        <span style={{ display: "block", marginTop: 2 }}>
                          Satuan: {ind.satuan || "—"} · Kelompok: {ind.kelompok || "—"}
                          {ind.interval_skrining_hari ? ` · Skrining tiap ${ind.interval_skrining_hari} hari` : ""}
                        </span>
                      </div>
                      <div className="row gap-8 wrap" style={{ alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => bukaEditIndikator(ind)}
                        >
                          <Icon name="pencil" size={14} /> Ubah
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setIndHapus(ind)}
                          aria-label="Hapus indikator"
                        >
                          <Icon name="trash" size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {tab === "ambang" &&
              (ambang.length === 0 ? (
                <EmptyState
                  title={cari ? "Ambang tidak ditemukan" : "Tidak ada ambang"}
                  desc={cari ? `Tidak ada yang cocok dengan “${cari}”.` : "Belum ada ambang batas kategori."}
                />
              ) : (
                <div className="card card-list">
                  {ambang.map((amb) => (
                    <div className="li" key={amb.id} style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <span className="li-ico">
                        <Icon name="trending-up" size={18} />
                      </span>
                      <div className="li-main" style={{ flex: "1 1 240px" }}>
                        <div className="row-between gap-8" style={{ alignItems: "center" }}>
                          <strong style={{ margin: 0 }}>
                            {amb.indikator?.nama || "—"}
                            {amb.jenis_gula_darah
                              ? ` (${LABEL_JENIS_GULA_DARAH[amb.jenis_gula_darah] || amb.jenis_gula_darah})`
                              : ""}
                          </strong>
                          <div className="row gap-6 wrap">
                            {amb.memicu_rujukan ? <Badge tone="danger">Pemicu Rujukan</Badge> : null}
                            <Badge tone={STATUS_TONE[amb.status] || "warning"}>{amb.kategori}</Badge>
                          </div>
                        </div>
                        <span style={{ display: "block", marginTop: 2 }}>
                          Batas: {amb.batas_min} — {amb.batas_max ?? "∞"} {amb.indikator?.satuan || ""} · Status:{" "}
                          {LABEL_STATUS_KESEHATAN[amb.status as keyof typeof LABEL_STATUS_KESEHATAN] || amb.status} (Skor{" "}
                          {amb.skor})
                        </span>
                      </div>
                      <div className="row gap-8 wrap" style={{ alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => bukaEditAmbang(amb)}
                        >
                          <Icon name="pencil" size={14} /> Ubah
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setAmbHapus(amb)}
                          aria-label="Hapus ambang"
                        >
                          <Icon name="trash" size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>

          {activeMeta && (
            <Pagination
              meta={activeMeta}
              onPage={setPage}
              perPage={perPage}
              onPerPage={(n) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          )}

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Ambang menentukan kategori yang dipakai saat menilai catatan baru.
          </p>
        </>
      )}

      {/* Modal Tambah/Edit Indikator */}
      <Modal
        open={indModal}
        onClose={() => setIndModal(false)}
        title={indEdit ? "Edit Indikator" : "Tambah Indikator"}
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setIndModal(false)}>
              Batal
            </button>
            <button type="button" className="btn btn-primary" onClick={simpanIndikator} disabled={indSaving}>
              {indSaving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Input
            label="Kode indikator"
            placeholder="cth: sistol"
            value={indForm.kode}
            onChange={(e) => setIndForm((p) => ({ ...p, kode: e.target.value }))}
            error={indErr.kode}
            required
          />
          <Input
            label="Nama indikator"
            placeholder="cth: Tekanan Darah Sistol"
            value={indForm.nama}
            onChange={(e) => setIndForm((p) => ({ ...p, nama: e.target.value }))}
            error={indErr.nama}
            required
          />
          <div className="grid grid-2" style={{ gap: 12 }}>
            <Input
              label="Satuan"
              placeholder="cth: mmHg"
              value={indForm.satuan}
              onChange={(e) => setIndForm((p) => ({ ...p, satuan: e.target.value }))}
              error={indErr.satuan}
              optional
            />
            <Input
              label="Kelompok"
              placeholder="cth: vital"
              value={indForm.kelompok}
              onChange={(e) => setIndForm((p) => ({ ...p, kelompok: e.target.value }))}
              error={indErr.kelompok}
              optional
            />
          </div>
          <Input
            label="Interval skrining (hari)"
            type="number"
            min={1}
            max={365}
            placeholder="cth: 30"
            value={indForm.interval_skrining_hari}
            onChange={(e) => setIndForm((p) => ({ ...p, interval_skrining_hari: e.target.value }))}
            error={indErr.interval_skrining_hari}
            optional
          />
        </div>
      </Modal>

      {/* Modal Tambah/Edit Ambang */}
      <Modal
        open={ambModal}
        onClose={() => setAmbModal(false)}
        title={ambEdit ? "Edit Ambang Kategori" : "Tambah Ambang Kategori"}
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setAmbModal(false)}>
              Batal
            </button>
            <button type="button" className="btn btn-primary" onClick={simpanAmbang} disabled={ambSaving}>
              {ambSaving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div className="field">
            <label className="label" htmlFor="amb-ind">
              Indikator <span className="req">*</span>
            </label>
            <select
              id="amb-ind"
              className={"select" + (ambErr.indikator_id ? " is-error" : "")}
              value={ambForm.indikator_id}
              onChange={(e) => setAmbForm((p) => ({ ...p, indikator_id: e.target.value }))}
            >
              <option value="">Pilih indikator…</option>
              {semuaIndikator.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nama} ({i.kode})
                </option>
              ))}
            </select>
            {ambErr.indikator_id ? <div className="err-msg show">{ambErr.indikator_id}</div> : null}
          </div>

          <div className="field">
            <label className="label" htmlFor="amb-gula">
              Jenis Pemeriksaan Gula Darah <span className="opt">(khusus indikator gula darah)</span>
            </label>
            <select
              id="amb-gula"
              className="select"
              value={ambForm.jenis_gula_darah}
              onChange={(e) => setAmbForm((p) => ({ ...p, jenis_gula_darah: e.target.value }))}
            >
              <option value="">— Tidak berlaku / umum —</option>
              <option value="puasa">Gula Darah Puasa</option>
              <option value="sewaktu">Gula Darah Sewaktu</option>
              <option value="2jam_pp">2 Jam Setelah Makan</option>
              <option value="hba1c">HbA1c (%)</option>
            </select>
          </div>

          <div className="grid grid-2" style={{ gap: 12 }}>
            <Input
              label="Batas minimum"
              type="number"
              step="any"
              value={ambForm.batas_min}
              onChange={(e) => setAmbForm((p) => ({ ...p, batas_min: e.target.value }))}
              error={ambErr.batas_min}
              required
            />
            <Input
              label="Batas maksimum"
              type="number"
              step="any"
              placeholder="Kosong = tak terhingga"
              value={ambForm.batas_max}
              onChange={(e) => setAmbForm((p) => ({ ...p, batas_max: e.target.value }))}
              error={ambErr.batas_max}
              optional
            />
          </div>

          <Input
            label="Nama kategori"
            placeholder="cth: Hipertensi Tingkat 1"
            value={ambForm.kategori}
            onChange={(e) => setAmbForm((p) => ({ ...p, kategori: e.target.value }))}
            error={ambErr.kategori}
            required
          />

          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="amb-status">Status kesehatan</label>
              <select
                id="amb-status"
                className="select"
                value={ambForm.status}
                onChange={(e) => setAmbForm((p) => ({ ...p, status: e.target.value as StatusKesehatan }))}
              >
                {STATUS_OPSI.map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATUS_KESEHATAN[s]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Skor risiko (0–255)"
              type="number"
              min={0}
              max={255}
              value={ambForm.skor}
              onChange={(e) => setAmbForm((p) => ({ ...p, skor: e.target.value }))}
              error={ambErr.skor}
            />
          </div>

          <label className="label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={ambForm.memicu_rujukan}
              onChange={(e) => setAmbForm((p) => ({ ...p, memicu_rujukan: e.target.checked }))}
            />
            Memicu saran rujukan otomatis
          </label>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        open={indHapus !== null || ambHapus !== null}
        onClose={() => {
          setIndHapus(null);
          setAmbHapus(null);
        }}
        title={indHapus ? "Hapus Indikator" : "Hapus Ambang Kategori"}
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setIndHapus(null);
                setAmbHapus(null);
              }}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={konfirmasiHapus}
              disabled={deleting}
            >
              {deleting ? "Menghapus…" : "Hapus"}
            </button>
          </div>
        }
      >
        <p className="text-sm">
          Yakin ingin menghapus{" "}
          <strong>{indHapus ? indHapus.nama : ambHapus?.kategori}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </AppShell>
  );
}

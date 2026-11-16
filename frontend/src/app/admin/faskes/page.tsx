"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import TombolKembaliAdmin from "@/components/admin/TombolKembaliAdmin";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, Loading } from "@/components/ui/Empty";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import { admin as adminApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { useMinLoading } from "@/hooks/useMinLoading";
import type { Faskes, Wilayah } from "@/types";

const FILTER = [
  { value: "semua", label: "Semua" },
  { value: "puskesmas", label: "Puskesmas" },
  { value: "rumah_sakit", label: "Rumah Sakit" },
  { value: "klinik", label: "Klinik" },
  { value: "lainnya", label: "Lainnya" },
];

const LABEL_JENIS_FASKES: Record<string, string> = {
  puskesmas: "Puskesmas",
  rumah_sakit: "Rumah Sakit",
  klinik: "Klinik",
  lainnya: "Lainnya",
};
const JENIS_BADGE: Record<string, "info" | "danger" | "warning" | "default"> = {
  puskesmas: "info",
  rumah_sakit: "danger",
  klinik: "warning",
  lainnya: "default",
};

const FORM_KOSONG = {
  nama: "",
  jenis: "puskesmas",
  alamat: "",
  telepon: "",
  wilayah_id: "",
  lat: "",
  lng: "",
};

type FormState = typeof FORM_KOSONG;
type ErrForm = Partial<Record<keyof FormState, string>>;

export default function AdminFaskesPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [daftar, setDaftar] = useState<Faskes[]>([]);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string>("");

  const [kelurahan, setKelurahan] = useState<Wilayah[]>([]);
  const [formBuka, setFormBuka] = useState(false);
  const [sunting, setSunting] = useState<Faskes | null>(null);
  const [form, setForm] = useState<FormState>(FORM_KOSONG);
  const [errForm, setErrForm] = useState<ErrForm>({});
  const [simpan, setSimpan] = useState(false);
  const [sasaran, setSasaran] = useState<Faskes | null>(null);
  const [memproses, setMemproses] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.faskes.listPaged({
        page,
        per_page: 20,
        jenis: filter !== "semua" ? filter : undefined,
        search: cari.trim() || undefined,
      });
      setDaftar(res.data || []);
      setMeta(res.meta ?? null);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal muat faskes");
    } finally {
      setLoading(false);
    }
  }, [page, filter, cari]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void muat();
    }, cari ? 250 : 0);
    return () => clearTimeout(timer);
  }, [muat, cari]);

  useEffect(() => {
    (async () => {
      try {
        const res = await wilayahApi.list();
        setKelurahan((res || []).filter((w) => w.tipe === "kelurahan"));
      } catch {
        setKelurahan([]);
      }
    })();
  }, []);

  function bukaTambah() {
    setSunting(null);
    setForm(FORM_KOSONG);
    setErrForm({});
    setFormBuka(true);
  }

  function bukaSunting(f: Faskes) {
    setSunting(f);
    setForm({
      nama: f.nama,
      jenis: f.jenis,
      alamat: f.alamat || "",
      telepon: f.telepon || "",
      wilayah_id: f.wilayah_id ? String(f.wilayah_id) : "",
      lat: f.lat != null ? String(f.lat) : "",
      lng: f.lng != null ? String(f.lng) : "",
    });
    setErrForm({});
    setFormBuka(true);
  }

  function ubah<K extends keyof FormState>(kunci: K, nilai: FormState[K]) {
    setForm((p) => ({ ...p, [kunci]: nilai }));
    setErrForm((p) => ({ ...p, [kunci]: "" }));
  }

  async function simpanForm() {
    const e: ErrForm = {};
    if (form.nama.trim() === "") e.nama = "Nama wajib diisi.";
    if (form.wilayah_id === "") e.wilayah_id = "Wilayah wajib dipilih.";
    const latStr = form.lat.trim();
    const lngStr = form.lng.trim();
    if (latStr !== "") {
      const latNum = Number(latStr);
      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        e.lat = "Latitude harus antara -90 hingga 90.";
      }
    }
    if (lngStr !== "") {
      const lngNum = Number(lngStr);
      if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
        e.lng = "Longitude harus antara -180 hingga 180.";
      }
    }
    setErrForm(e);
    if (Object.keys(e).length > 0) {
      toast.warning("Periksa kembali field yang ditandai.");
      return;
    }

    const payload: Partial<Faskes> = {
      nama: form.nama.trim(),
      jenis: form.jenis,
      alamat: form.alamat.trim(),
      telepon: form.telepon.trim(),
      wilayah_id: Number(form.wilayah_id),
      lat: latStr === "" ? null : Number(latStr),
      lng: lngStr === "" ? null : Number(lngStr),
    };

    setSimpan(true);
    try {
      if (sunting) {
        await adminApi.faskes.update(sunting.id, payload);
        toast.success("Data faskes diperbarui.", { title: "Berhasil" });
      } else {
        await adminApi.faskes.create(payload);
        toast.success("Faskes ditambahkan.", { title: "Berhasil" });
      }
      setFormBuka(false);
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: ErrForm = {};
        if (apiErr.errors.nama) map.nama = apiErr.errors.nama[0];
        if (apiErr.errors.jenis) map.jenis = apiErr.errors.jenis[0];
        if (apiErr.errors.wilayah_id) map.wilayah_id = apiErr.errors.wilayah_id[0];
        if (apiErr.errors.lat) map.lat = apiErr.errors.lat[0];
        if (apiErr.errors.lng) map.lng = apiErr.errors.lng[0];
        setErrForm(map);
      }
      toast.warning(apiErr.message || "Gagal menyimpan faskes.");
    } finally {
      setSimpan(false);
    }
  }

  async function hapusFaskes() {
    if (!sasaran) return;
    setMemproses(true);
    try {
      await adminApi.faskes.hapus(sasaran.id);
      toast.success(`${sasaran.nama} dihapus.`, { title: "Berhasil" });
      setSasaran(null);
      if (daftar.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await muat();
      }
    } catch (err) {
      toast.warning((err as ApiError).message || "Gagal menghapus faskes.");
    } finally {
      setMemproses(false);
    }
  }

  return (
    <AppShell noFab roles={["super_admin"]}>
      <TombolKembaliAdmin />
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Kelola Faskes</h1>
          <p className="tiny">Tambah, ubah, dan hapus fasilitas kesehatan & rujukan.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={bukaTambah}>
          <Icon name="plus" size={16} /> Tambah Faskes
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

      {tampilLoading ? (
        <Loading variant="list" text="Memuat faskes…" />
      ) : (
        <>
          <div className="summary-strip mb-12">
            <span className="summary-strip-item">
              Total Fasilitas Kesehatan: <strong>{meta?.total ?? daftar.length}</strong>
            </span>
          </div>

          <Segmented
            items={FILTER}
            value={filter}
            onChange={(val) => {
              setFilter(val);
              setPage(1);
            }}
          />

          <div className="input-icon mt-12">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari faskes…"
              value={cari}
              onChange={(e) => {
                setCari(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="mt-12">
            {daftar.length === 0 ? (
              <EmptyState icon="hospital" title="Tidak ada faskes" desc="Tidak ada faskes dengan filter ini." />
            ) : (
              <div className="card card-list">
                {daftar.map((f) => (
                  <div className="li" key={f.id} style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <span className="li-ico">
                      <Icon name="hospital" size={18} />
                    </span>
                    <div className="li-main" style={{ flex: "1 1 240px" }}>
                      <div className="row-between" style={{ gap: 8, alignItems: "center" }}>
                        <strong style={{ margin: 0 }}>{f.nama}</strong>
                        <Badge tone={JENIS_BADGE[f.jenis] || "default"}>
                          {LABEL_JENIS_FASKES[f.jenis] || f.jenis}
                        </Badge>
                      </div>
                      <span style={{ display: "block", marginTop: 2 }}>{f.alamat || "Alamat belum diisi"}</span>
                      <span style={{ display: "block", marginTop: 2 }}>
                        Wilayah: {kelurahan.find((w) => w.id === f.wilayah_id)?.nama || "—"}
                        {f.telepon ? ` · ${f.telepon}` : ""}
                        {f.lat != null && f.lng != null ? ` · (${f.lat}, ${f.lng})` : ""}
                      </span>
                    </div>
                    <div className="row gap-8 wrap" style={{ alignItems: "center" }}>
                      <button className="btn btn-sm btn-outline" onClick={() => bukaSunting(f)}>
                        <Icon name="pencil" size={14} /> Ubah
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setSasaran(f)}
                        aria-label="Hapus faskes"
                      >
                        <Icon name="trash" size={14} /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {meta && <Pagination meta={meta} onPage={setPage} />}
        </>
      )}

      <Modal
        open={formBuka}
        onClose={() => setFormBuka(false)}
        title={sunting ? "Edit Faskes" : "Tambah Faskes"}
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button className="btn btn-outline" onClick={() => setFormBuka(false)} type="button">
              Batal
            </button>
            <button className="btn btn-primary" onClick={simpanForm} disabled={simpan} type="button">
              {simpan ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        }
      >
        <Input
          label="Nama faskes"
          placeholder="Puskesmas Kecamatan Banjarmasin Timur"
          value={form.nama}
          onChange={(e) => ubah("nama", e.target.value)}
          error={errForm.nama}
          required
        />
        <div className="mt-12">
          <label className="label">Jenis</label>
          <select
            className="select"
            value={form.jenis}
            onChange={(e) => ubah("jenis", e.target.value)}
          >
            {Object.entries(LABEL_JENIS_FASKES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-12">
          <label className="label">Kelurahan</label>
          <select
            className="select"
            value={form.wilayah_id}
            onChange={(e) => ubah("wilayah_id", e.target.value)}
          >
            <option value="">Pilih kelurahan…</option>
            {kelurahan.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nama}
              </option>
            ))}
          </select>
          {errForm.wilayah_id && <span className="err-text">{errForm.wilayah_id}</span>}
        </div>
        <div className="mt-12">
          <Input
            label="Alamat"
            placeholder="Jl. …"
            value={form.alamat}
            onChange={(e) => ubah("alamat", e.target.value)}
          />
        </div>
        <div className="mt-12">
          <Input
            label="Telepon"
            placeholder="0812…"
            value={form.telepon}
            onChange={(e) => ubah("telepon", e.target.value)}
          />
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <Input
            label="Latitude"
            type="number"
            step="any"
            placeholder="-3.3186"
            value={form.lat}
            onChange={(e) => ubah("lat", e.target.value)}
            error={errForm.lat}
            optional
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            placeholder="114.5944"
            value={form.lng}
            onChange={(e) => ubah("lng", e.target.value)}
            error={errForm.lng}
            optional
          />
        </div>
      </Modal>

      <Modal
        open={!!sasaran}
        onClose={() => setSasaran(null)}
        title="Hapus Faskes"
      >
        <p className="text-sm">
          Yakin ingin menghapus <strong>{sasaran?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="row-between mt-16">
          <button type="button" className="btn btn-outline" onClick={() => setSasaran(null)}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={hapusFaskes}
            disabled={memproses}
          >
            {memproses ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}

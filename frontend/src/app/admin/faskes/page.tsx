"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/Empty";
import { admin as adminApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import type { Faskes, Wilayah } from "@/types";

const FILTER = [
  { value: "semua", label: "Semua" },
  { value: "puskesmas", label: "Puskesmas" },
  { value: "rumah_sakit", label: "Rumah Sakit" },
  { value: "klinik", label: "Klinik" },
];

const LABEL_JENIS_FASKES: Record<string, string> = {
  puskesmas: "Puskesmas",
  rumah_sakit: "Rumah Sakit",
  klinik: "Klinik",
};
const JENIS_BADGE: Record<string, string> = {
  puskesmas: "info",
  rumah_sakit: "danger",
  klinik: "warning",
};

const FORM_KOSONG = {
  nama: "",
  jenis: "puskesmas",
  alamat: "",
  telepon: "",
  wilayah_id: "",
};

type FormState = typeof FORM_KOSONG;
type ErrForm = Partial<Record<keyof FormState, string>>;

export default function AdminFaskesPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [daftar, setDaftar] = useState<Faskes[]>([]);
  const [loading, setLoading] = useState(true);
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
      const res = await adminApi.faskes.list();
      setDaftar(res || []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal muat faskes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

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

  const filtered = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const namaWilayah = (id?: number) =>
      kelurahan.find((w) => w.id === id)?.nama?.toLowerCase() ?? "";
    return daftar.filter((f) => {
      const cocokJenis = filter === "semua" || f.jenis === filter;
      const cocokCari =
        q === "" ||
        f.nama?.toLowerCase().includes(q) ||
        f.alamat?.toLowerCase().includes(q) ||
        namaWilayah(f.wilayah_id).includes(q);
      return cocokJenis && cocokCari;
    });
  }, [filter, cari, daftar, kelurahan]);

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
      await muat();
    } catch (err) {
      toast.warning((err as ApiError).message || "Gagal menghapus faskes.");
    } finally {
      setMemproses(false);
    }
  }

  return (
    <AppShell noFab roles={["super_admin"]}>
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

      {loading ? (
        <div className="card">
          <p className="tiny center">Memuat…</p>
        </div>
      ) : (
        <>
          <div className="metric mb-12">
            <span className="metric-val">{daftar.length}</span>
            <span className="tiny">Total Faskes</span>
          </div>

          <Segmented items={FILTER} value={filter} onChange={setFilter} />

          <div className="input-icon mt-12">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari faskes…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Tidak ada faskes" desc="Tidak ada faskes dengan filter ini." />
              </div>
            ) : (
              filtered.map((f) => (
                <div className="card card-flat" key={f.id}>
                  <div className="row items-start gap-10">
                    <span className="li-ico">
                      <Icon name="hospital" size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="row-between">
                        <strong className="text-sm">{f.nama}</strong>
                        <Badge tone={(JENIS_BADGE[f.jenis] as any) || "muted"}>
                          {LABEL_JENIS_FASKES[f.jenis] || f.jenis}
                        </Badge>
                      </div>
                      <p className="tiny mt-4">{f.alamat}</p>
                      <p className="tiny mt-2">
                        Wilayah: {kelurahan.find((w) => w.id === f.wilayah_id)?.nama || "—"}
                      </p>
                      {f.telepon && <p className="tiny mt-2">📞 {f.telepon}</p>}
                      <div className="row gap-8 mt-12">
                        <button className="btn btn-sm btn-outline" onClick={() => bukaSunting(f)}>
                          <Icon name="pencil" size={15} /> Edit
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: "var(--danger)" }}
                          onClick={() => setSasaran(f)}
                        >
                          <Icon name="trash" size={15} /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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

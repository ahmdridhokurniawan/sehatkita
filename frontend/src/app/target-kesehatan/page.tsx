"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/Empty";
import { targetKesehatan, ApiError } from "@/lib/api";
import { LABEL_JENIS_TARGET } from "@/lib/labels";
import { tanggal } from "@/lib/format";
import type { TargetKesehatan, TargetKesehatanInput, JenisTarget } from "@/types";

const JENIS_OPTIONS = Object.keys(LABEL_JENIS_TARGET);

const FORM_KOSONG: TargetKesehatanInput = {
  judul: "",
  jenis_target: "lainnya",
  nilai_awal: null,
  nilai_target: 0,
  satuan: "",
  tenggat_waktu: null,
  catatan_motivasi: null,
};

type ErrForm = Partial<Record<keyof TargetKesehatanInput, string>>;

export default function TargetKesehatanPage() {
  const toast = useToast();
  const [daftar, setDaftar] = useState<TargetKesehatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formBuka, setFormBuka] = useState(false);
  const [sunting, setSunting] = useState<TargetKesehatan | null>(null);
  const [form, setForm] = useState<TargetKesehatanInput>(FORM_KOSONG);
  const [errForm, setErrForm] = useState<ErrForm>({});
  const [simpan, setSimpan] = useState(false);
  const [sasaran, setSasaran] = useState<TargetKesehatan | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<TargetKesehatan | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await targetKesehatan.list();
      setDaftar(res || []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat target");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const tercapai = useMemo(() => daftar.filter((t) => t.tercapai).length, [daftar]);
  const berjalan = useMemo(() => daftar.filter((t) => !t.tercapai).length, [daftar]);

  function bukaTambah() {
    setSunting(null);
    setForm(FORM_KOSONG);
    setErrForm({});
    setFormBuka(true);
  }

  function bukaSunting(t: TargetKesehatan) {
    setSunting(t);
    setForm({
      judul: t.judul,
      jenis_target: t.jenis_target,
      nilai_awal: t.nilai_awal,
      nilai_target: t.nilai_target,
      satuan: t.satuan,
      tenggat_waktu: t.tenggat_waktu,
      catatan_motivasi: t.catatan_motivasi,
    });
    setErrForm({});
    setFormBuka(true);
  }

  function ubah<K extends keyof TargetKesehatanInput>(kunci: K, nilai: TargetKesehatanInput[K]) {
    setForm((p) => ({ ...p, [kunci]: nilai }));
    setErrForm((p) => ({ ...p, [kunci]: "" }));
  }

  async function simpanForm() {
    const e: ErrForm = {};
    if (form.judul.trim() === "") e.judul = "Judul wajib diisi.";
    if (!form.nilai_target || Number(form.nilai_target) <= 0)
      e.nilai_target = "Nilai target wajib lebih dari 0.";
    if (form.satuan.trim() === "") e.satuan = "Satuan wajib diisi.";
    setErrForm(e);
    if (Object.keys(e).length > 0) {
      toast.warning("Periksa kembali field yang ditandai.");
      return;
    }

    const payload: TargetKesehatanInput = {
      judul: form.judul.trim(),
      jenis_target: form.jenis_target as JenisTarget,
      nilai_awal: form.nilai_awal ? Number(form.nilai_awal) : null,
      nilai_target: Number(form.nilai_target),
      satuan: form.satuan.trim(),
      tenggat_waktu: form.tenggat_waktu || null,
      catatan_motivasi: form.catatan_motivasi?.trim() || null,
    };

    setSimpan(true);
    try {
      if (sunting) {
        await targetKesehatan.ubah(sunting.id, payload);
        toast.success("Target diperbarui.", { title: "Berhasil" });
      } else {
        await targetKesehatan.buat(payload);
        toast.success("Target baru dibuat.", { title: "Berhasil" });
      }
      setFormBuka(false);
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: ErrForm = {};
        if (apiErr.errors.judul) map.judul = apiErr.errors.judul[0];
        if (apiErr.errors.nilai_target) map.nilai_target = apiErr.errors.nilai_target[0];
        if (apiErr.errors.satuan) map.satuan = apiErr.errors.satuan[0];
        setErrForm(map);
      }
      toast.warning(apiErr.message || "Gagal menyimpan target.");
    } finally {
      setSimpan(false);
    }
  }

  async function tandai(tercapai: boolean) {
    if (!sasaran) return;
    setMemproses(true);
    try {
      await targetKesehatan.capai(sasaran.id, tercapai);
      toast.success(tercapai ? "Target tercapai. Hebat!" : "Target dibuka kembali.", {
        title: "Berhasil",
      });
      setSasaran(null);
      await muat();
    } catch (err) {
      toast.warning((err as ApiError).message || "Gagal memperbarui status.");
    } finally {
      setMemproses(false);
    }
  }

  async function hapusTargetSubmit() {
    if (!hapusTarget) return;
    setMemproses(true);
    try {
      await targetKesehatan.hapus(hapusTarget.id);
      toast.success("Target dihapus.", { title: "Berhasil" });
      setHapusTarget(null);
      await muat();
    } catch (err) {
      toast.warning((err as ApiError).message || "Gagal menghapus target.");
    } finally {
      setMemproses(false);
    }
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Target Kesehatan</h1>
          <p className="tiny">Pantau target BB, tensi, air minum, dan lainnya.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={bukaTambah}>
          <Icon name="plus" size={16} /> Target baru
        </button>
      </div>

      <div className="grid grid-2 mb-12" style={{ gap: 12 }}>
        <div className="card card-flat">
          <div className="tiny">Sedang berjalan</div>
          <div className="metric-val">{berjalan}</div>
        </div>
        <div className="card card-flat">
          <div className="tiny">Tercapai</div>
          <div className="metric-val">{tercapai}</div>
        </div>
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
      ) : daftar.length === 0 ? (
        <div className="card card-flat">
          <EmptyState title="Belum ada target" desc="Buat target kesehatan pertamamu." />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {daftar.map((t) => (
            <div className="card card-flat" key={t.id}>
              <div className="row-between" style={{ alignItems: "flex-start", gap: 12 }}>
                <div className="flex-1">
                  <div className="row-between">
                    <strong className="text-sm">{t.judul}</strong>
                    <Badge tone={t.tercapai ? "safe" : "warning"}>
                      {t.tercapai ? "Tercapai" : "Berjalan"}
                    </Badge>
                  </div>
                  <div className="tiny mt-4">{LABEL_JENIS_TARGET[t.jenis_target] || t.jenis_target}</div>
                  <p className="text-sm mt-8">
                    {t.nilai_awal != null ? `${t.nilai_awal} → ` : ""}
                    {t.nilai_target} {t.satuan}
                  </p>
                  {t.tenggat_waktu ? (
                    <p className="tiny mt-4">Tenggat: {tanggal(t.tenggat_waktu, "day")}</p>
                  ) : null}
                  {t.catatan_motivasi ? (
                    <p className="tiny mt-8" style={{ fontStyle: "italic" }}>
                      {t.catatan_motivasi}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="row gap-8 mt-12">
                {!t.tercapai ? (
                  <button className="btn btn-sm btn-primary" onClick={() => setSasaran(t)}>
                    <Icon name="check" size={15} /> Tandai tercapai
                  </button>
                ) : (
                  <button className="btn btn-sm btn-outline" onClick={() => setSasaran(t)}>
                    <Icon name="refresh" size={15} /> Buka lagi
                  </button>
                )}
                <button className="btn btn-sm btn-outline" onClick={() => bukaSunting(t)}>
                  <Icon name="pencil" size={15} /> Edit
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ color: "var(--danger)" }}
                  onClick={() => setHapusTarget(t)}
                >
                  <Icon name="trash" size={15} /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formBuka}
        onClose={() => setFormBuka(false)}
        title={sunting ? "Edit Target" : "Target Baru"}
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
          label="Judul target"
          placeholder="Turunkan berat badan ke 70 kg"
          value={form.judul}
          onChange={(e) => ubah("judul", e.target.value)}
          error={errForm.judul}
          required
        />
        <div className="mt-12">
          <label className="label">Jenis</label>
          <select
            className="select"
            value={form.jenis_target}
            onChange={(e) => ubah("jenis_target", e.target.value as JenisTarget)}
          >
            {JENIS_OPTIONS.map((j) => (
              <option key={j} value={j}>
                {LABEL_JENIS_TARGET[j]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <Input
            label="Nilai awal (opsional)"
            type="number"
            placeholder="75"
            value={form.nilai_awal == null ? "" : String(form.nilai_awal)}
            onChange={(e) => ubah("nilai_awal", e.target.value === "" ? null : Number(e.target.value))}
          />
          <Input
            label="Nilai target"
            type="number"
            placeholder="70"
            value={form.nilai_target === 0 ? "" : String(form.nilai_target)}
            onChange={(e) => ubah("nilai_target", Number(e.target.value))}
            error={errForm.nilai_target}
            required
          />
        </div>
        <div className="mt-12">
          <Input
            label="Satuan"
            placeholder="kg"
            value={form.satuan}
            onChange={(e) => ubah("satuan", e.target.value)}
            error={errForm.satuan}
            required
          />
        </div>
        <div className="mt-12">
          <Input
            label="Tenggat waktu (opsional)"
            type="date"
            value={form.tenggat_waktu ?? ""}
            onChange={(e) => ubah("tenggat_waktu", e.target.value || null)}
          />
        </div>
        <div className="mt-12">
          <Input
            label="Catatan motivasi (opsional)"
            placeholder="Semangat, pasti bisa!"
            value={form.catatan_motivasi ?? ""}
            onChange={(e) => ubah("catatan_motivasi", e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={!!sasaran}
        onClose={() => setSasaran(null)}
        title={sasaran?.tercapai ? "Buka Kembali Target" : "Tandai Tercapai"}
      >
        {sasaran?.tercapai ? (
          <p className="text-sm">
            Buka kembali target <strong>{sasaran.judul}</strong>? Akan kembali ke status berjalan.
          </p>
        ) : (
          <p className="text-sm">
            Tandai <strong>{sasaran?.judul}</strong> sebagai tercapai?
          </p>
        )}
        <div className="row-between mt-16">
          <button type="button" className="btn btn-outline" onClick={() => setSasaran(null)}>
            Batal
          </button>
          <button
            type="button"
            className={sasaran?.tercapai ? "btn btn-outline" : "btn btn-primary"}
            onClick={() => tandai(!sasaran?.tercapai)}
            disabled={memproses}
          >
            {memproses
              ? "Memproses…"
              : sasaran?.tercapai
                ? "Buka Kembali"
                : "Tandai Tercapai"}
          </button>
        </div>
      </Modal>

      <Modal open={!!hapusTarget} onClose={() => setHapusTarget(null)} title="Hapus Target">
        <p className="text-sm">
          Yakin ingin menghapus target <strong>{hapusTarget?.judul}</strong>? Tindakan ini tidak
          dapat dibatalkan.
        </p>
        <div className="row-between mt-16">
          <button type="button" className="btn btn-outline" onClick={() => setHapusTarget(null)}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={hapusTargetSubmit}
            disabled={memproses}
          >
            {memproses ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}

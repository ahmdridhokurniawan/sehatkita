"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, Loading } from "@/components/ui/Empty";
import { targetKesehatan, ApiError } from "@/lib/api";
import { useMinLoading } from "@/hooks/useMinLoading";
import { LABEL_JENIS_TARGET, SATUAN_JENIS_TARGET, labelJenisTarget } from "@/lib/labels";
import { statusTenggatTarget, tanggal } from "@/lib/format";
import type { TargetKesehatan, TargetKesehatanInput, JenisTarget } from "@/types";
import Fireworks, { playCelebrationSound } from "@/components/ui/Fireworks";

const JENIS_OPTIONS = Object.keys(LABEL_JENIS_TARGET);

const FORM_KOSONG: TargetKesehatanInput = {
  judul: "",
  jenis_target: "berat_badan",
  nilai_awal: null,
  nilai_target: 0,
  satuan: SATUAN_JENIS_TARGET.berat_badan,
  tenggat_waktu: null,
  catatan_motivasi: null,
};

type ErrForm = Partial<Record<keyof TargetKesehatanInput, string>>;

export default function TargetKesehatanPage() {
  const toast = useToast();
  const [daftar, setDaftar] = useState<TargetKesehatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const tampilLoading = useMinLoading(loading);
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
    let aktif = true;
    targetKesehatan
      .list()
      .then((res) => {
        if (!aktif) return;
        setDaftar(res || []);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat target");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  const tercapai = useMemo(() => daftar.filter((t) => t.tercapai).length, [daftar]);
  const lewatTenggat = useMemo(
    () => daftar.filter((t) => statusTenggatTarget(t.tenggat_waktu, t.tercapai).status === "lewat").length,
    [daftar],
  );
  const berjalan = useMemo(
    () => daftar.filter((t) => !t.tercapai).length,
    [daftar],
  );

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
      tenggat_waktu: t.tenggat_waktu ? t.tenggat_waktu.slice(0, 10) : null,
      catatan_motivasi: t.catatan_motivasi,
    });
    setErrForm({});
    setFormBuka(true);
  }

  function ubah<K extends keyof TargetKesehatanInput>(kunci: K, nilai: TargetKesehatanInput[K]) {
    setForm((p) => ({ ...p, [kunci]: nilai }));
    setErrForm((p) => ({ ...p, [kunci]: "" }));
  }

  function ubahJenisTarget(jenisBaru: string) {
    const satuanOtomatis =
      jenisBaru === "lainnya" ? "" : (SATUAN_JENIS_TARGET[jenisBaru] ?? "");
    setForm((p) => ({
      ...p,
      jenis_target: jenisBaru as JenisTarget,
      satuan: satuanOtomatis,
    }));
    setErrForm((p) => ({ ...p, jenis_target: "", satuan: "" }));
  }

  const jenisDiDaftar = JENIS_OPTIONS.includes(form.jenis_target);
  const bisaKetikSatuan = form.jenis_target === "lainnya" || !jenisDiDaftar;

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
      nilai_awal:
        form.nilai_awal !== null && form.nilai_awal !== undefined && String(form.nilai_awal).trim() !== ""
          ? Number(form.nilai_awal)
          : null,
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
      if (tercapai) {
        setCelebrate(true);
        playCelebrationSound();
      }
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
    <AppShell noFab roles={["user"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Target Kesehatan</h1>
          <p className="tiny">Pantau target BB, tensi, air minum, dan lainnya.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={bukaTambah}>
          <Icon name="plus" size={16} /> Target baru
        </button>
      </div>

      <div className="summary-strip mb-12">
        <span className="summary-strip-item">
          Sedang berjalan: <strong>{berjalan}</strong>
        </span>
        <span className="summary-strip-item">
          Lewat tenggat:{" "}
          <strong style={lewatTenggat > 0 ? { color: "var(--danger)" } : undefined}>{lewatTenggat}</strong>
        </span>
        <span className="summary-strip-item">
          Tercapai: <strong className="text-safe">{tercapai}</strong>
        </span>
      </div>

      {error && (
        <div className="err-msg show mb-12">{error}</div>
      )}

      {tampilLoading ? (
        <Loading variant="list" text="Memuat target kesehatan…" />
      ) : daftar.length === 0 ? (
        <EmptyState icon="target" title="Belum ada target" desc="Buat target kesehatan pertamamu." />
      ) : (
        <div className="card card-list">
          {daftar.map((t) => {
            const st = statusTenggatTarget(t.tenggat_waktu, t.tercapai);
            const lewat = st.status === "lewat";
            const hariIni = st.status === "hari_ini";
            return (
              <div
                className="li"
                key={t.id}
                style={{
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                  borderLeft: lewat ? "3px solid var(--danger)" : "3px solid transparent",
                }}
              >
                <span className="li-ico">
                  <Icon name="target" size={18} />
                </span>
                <div className="li-main" style={{ flex: "1 1 240px" }}>
                  <div className="row gap-8 wrap" style={{ alignItems: "center" }}>
                    <strong style={{ margin: 0 }}>{t.judul}</strong>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="tiny mt-4">
                    {labelJenisTarget(t.jenis_target)} ·{" "}
                    <strong style={{ display: "inline", fontSize: "inherit", color: "var(--text)" }}>
                      {t.nilai_awal != null ? `${t.nilai_awal} → ` : ""}
                      {t.nilai_target} {t.satuan}
                    </strong>
                  </div>
                  {t.tenggat_waktu ? (
                    <div
                      className="tiny mt-2"
                      style={
                        lewat
                          ? { color: "var(--danger)", fontWeight: 600 }
                          : hariIni
                            ? { color: "var(--warning)", fontWeight: 600 }
                            : undefined
                      }
                    >
                      Tenggat: {tanggal(t.tenggat_waktu, "day")}
                      {st.catatan ? ` · ${st.catatan}` : ""}
                    </div>
                  ) : null}
                  {t.catatan_motivasi ? (
                    <div className="tiny mt-4" style={{ fontStyle: "italic" }}>
                      {t.catatan_motivasi}
                    </div>
                  ) : null}
                </div>
                <div className="row gap-8 wrap" style={{ alignItems: "center" }}>
                  {!t.tercapai ? (
                    <button className="btn btn-sm btn-primary" onClick={() => setSasaran(t)}>
                      <Icon name="check" size={14} /> Tercapai
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-outline" onClick={() => setSasaran(t)}>
                      <Icon name="refresh" size={14} /> Buka lagi
                    </button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => bukaSunting(t)}>
                    <Icon name="pencil" size={14} /> Ubah
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setHapusTarget(t)}
                    aria-label="Hapus target"
                  >
                    <Icon name="trash" size={14} /> Hapus
                  </button>
                </div>
              </div>
            );
          })}
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
        <div style={{ display: "grid", gap: 14 }}>
          <Input
            label="Judul target"
            placeholder="Turunkan berat badan ke 70 kg"
            value={form.judul}
            onChange={(e) => ubah("judul", e.target.value)}
            error={errForm.judul}
            required
          />
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label">Jenis target</label>
              <select
                className="select"
                value={form.jenis_target}
                onChange={(e) => ubahJenisTarget(e.target.value)}
              >
                {!jenisDiDaftar && form.jenis_target ? (
                  <option value={form.jenis_target}>{labelJenisTarget(form.jenis_target)}</option>
                ) : null}
                {JENIS_OPTIONS.map((j) => (
                  <option key={j} value={j}>
                    {LABEL_JENIS_TARGET[j]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Satuan"
              placeholder={bisaKetikSatuan ? "Ketik satuan, mis. mmHg, mg/dL…" : "Otomatis"}
              hint={bisaKetikSatuan ? "Isi manual sesuai target Anda" : "Mengikuti jenis target"}
              value={form.satuan}
              readOnly={!bisaKetikSatuan}
              style={!bisaKetikSatuan ? { background: "var(--surface-2)", cursor: "not-allowed" } : undefined}
              onChange={(e) => ubah("satuan", e.target.value)}
              error={errForm.satuan}
              required
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
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
          <div className="grid grid-2" style={{ gap: 12 }}>
            <Input
              label="Tenggat waktu (opsional)"
              type="date"
              value={form.tenggat_waktu ?? ""}
              onChange={(e) => ubah("tenggat_waktu", e.target.value || null)}
            />
            <Input
              label="Catatan motivasi (opsional)"
              placeholder="Semangat, pasti bisa!"
              value={form.catatan_motivasi ?? ""}
              onChange={(e) => ubah("catatan_motivasi", e.target.value)}
            />
          </div>
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

            <Modal
              open={celebrate}
              onClose={() => setCelebrate(false)}
              size="sm"
              className="modal-logout"
              backdropContent={<Fireworks aktif={celebrate} />}
              title={
                <span className="logout-modal-heading">
                  <span className="celebration-icon"><Icon name="check-circle" size={22} /></span>
                  <span className="celebration-title">Target Tercapai!</span>
                </span>
              }
              footer={
                <button type="button" className="btn btn-primary" onClick={() => setCelebrate(false)}>
                  Tutup
                </button>
              }
            >
              <div className="celebration-copy">
                <p>
                  Hebat, <strong>{sasaran?.judul ?? "Target"}</strong> tercapai. Keren!
                </p>
                <p className="tiny text-2">Pantang sembuh, tetap sembuh semangat.</p>
              </div>
            </Modal>
          </AppShell>
  );
}

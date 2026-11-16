"use client";

import { useEffect, useState, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { targetKesehatan, ApiError } from "@/lib/api";
import { statusTenggatTarget, tanggal } from "@/lib/format";
import { SATUAN_JENIS_TARGET, labelJenisTarget } from "@/lib/labels";
import type { TargetKesehatan, TargetKesehatanInput, JenisTarget } from "@/types";

const JENIS: { kode: JenisTarget; label: string; ikon: string }[] = [
  { kode: "berat_badan", label: "Berat badan", ikon: "scale" },
  { kode: "tinggi_badan", label: "Tinggi badan", ikon: "activity" },
  { kode: "massa_otot", label: "Massa otot", ikon: "activity" },
  { kode: "lingkar_perut", label: "Lingkar perut", ikon: "activity" },
  { kode: "air_minum", label: "Air minum", ikon: "droplet" },
  { kode: "aktivitas", label: "Aktivitas", ikon: "heart-pulse" },
  { kode: "lainnya", label: "Lainnya", ikon: "target" },
];

function LabelJenis({ jenis }: { jenis: string }) {
  return <>{labelJenisTarget(jenis)}</>;
}

export default function TargetBaru() {
  const toast = useToast();
  const [daftar, setDaftar] = useState<TargetKesehatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalBuka, setModalBuka] = useState(false);
  const [sunting, setSunting] = useState<TargetKesehatan | null>(null);
  const [hapusId, setHapusId] = useState<number | null>(null);

  const muat = useCallback(async () => {
    try {
      const data = await targetKesehatan.list();
      setDaftar(data);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memuat target");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    targetKesehatan
      .list()
      .then((data) => {
        if (!aktif) return;
        setDaftar(data);
        setError("");
      })
      .catch((e) => {
        if (aktif) setError(e instanceof ApiError ? e.message : "Gagal memuat target");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  const bukaTambah = () => {
    setSunting(null);
    setModalBuka(true);
  };
  const bukaSunting = (t: TargetKesehatan) => {
    setSunting(t);
    setModalBuka(true);
  };

  const toggleCapai = async (t: TargetKesehatan) => {
    try {
      const res = await targetKesehatan.capai(t.id, !t.tercapai);
      toast.success(res.tercapai ? "Target tercapai! 🎉" : "Target dikembalikan aktif");
      muat();
    } catch (e) {
      toast.warning(e instanceof ApiError ? e.message : "Gagal ubah status");
    }
  };

  const konfirmasiHapus = async () => {
    if (!hapusId) return;
    try {
      await targetKesehatan.hapus(hapusId);
      toast.success("Target dihapus");
      setHapusId(null);
      muat();
    } catch (e) {
      toast.warning(e instanceof ApiError ? e.message : "Gagal hapus");
    }
  };

  if (loading) {
    return (
      <div className="card mt-12">
        <p className="tiny center">Memuat target…</p>
      </div>
    );
  }

  return (
    <>
      <div className="card mt-12">
        <div className="row-between mb-8" style={{ gap: 10, flexWrap: "wrap" }}>
          <div>
            <strong className="text-sm">Daftar Target</strong>
            <div className="tiny mt-4">
              {daftar.length} target · {daftar.filter((t) => t.tercapai).length} tercapai
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={bukaTambah}>
            <Icon name="plus" size={15} /> Tambah target
          </button>
        </div>

        {error ? (
          <p className="tiny text-danger">{error}</p>
        ) : daftar.length === 0 ? (
          <div className="tiny center" style={{ padding: "16px 0" }}>
            Belum ada target. Tambahkan target kesehatanmu di atas.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {daftar.map((t) => (
              <div
                key={t.id}
                className="li"
                style={{ opacity: t.tercapai ? 0.7 : 1 }}
              >
                <button
                  type="button"
                  aria-label={t.tercapai ? "Batalkan tercapai" : "Tandai tercapai"}
                  title={t.tercapai ? "Batalkan" : "Tandai tercapai"}
                  onClick={() => toggleCapai(t)}
                  style={{
                    border: t.tercapai ? "2px solid var(--primary)" : "2px solid var(--border-strong)",
                    background: t.tercapai ? "var(--primary)" : "transparent",
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    flex: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.tercapai ? (
                    <span style={{ color: "var(--on-primary)", display: "inline-flex" }}>
                      <Icon name="check" size={14} />
                    </span>
                  ) : null}
                </button>
                <div className="li-main">
                  {(() => {
                    const st = statusTenggatTarget(t.tenggat_waktu, t.tercapai);
                    return (
                      <>
                        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <strong className="text-sm">{t.judul}</strong>
                          {t.tercapai ? <Badge tone="safe">Tercapai 🎉</Badge> : null}
                          {!t.tercapai && st.status === "lewat" ? (
                            <Badge tone="danger">
                              {st.label}
                              {st.catatan ? ` · ${st.catatan}` : ""}
                            </Badge>
                          ) : null}
                          {!t.tercapai && st.status === "hari_ini" ? (
                            <Badge tone="warning">{st.label}</Badge>
                          ) : null}
                        </div>
                        <span className="tiny">
                          <LabelJenis jenis={t.jenis_target} /> · {t.nilai_awal != null ? `${t.nilai_awal} → ` : ""}
                          {t.nilai_target} {t.satuan}
                          {t.tenggat_waktu ? ` · tenggat ${tanggal(t.tenggat_waktu, "short")}` : ""}
                        </span>
                      </>
                    );
                  })()}
                  {t.catatan_motivasi ? (
                    <span className="tiny" style={{ display: "block", marginTop: 4, fontStyle: "italic" }}>
                      &ldquo;{t.catatan_motivasi}&rdquo;
                    </span>
                  ) : null}
                  {t.tercapai ? (
                    <div
                      className="mt-6"
                      style={{
                        background: "var(--safe-bg)",
                        padding: "5px 10px",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--safe)",
                        fontSize: "0.75rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 600,
                      }}
                    >
                      <Icon name="award" size={14} />
                      <span>Hebat! Target ini tercapai. Pertahankan pola hidup sehatmu!</span>
                    </div>
                  ) : null}
                </div>
                <div className="li-side row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label="Sunting"
                    onClick={() => bukaSunting(t)}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    aria-label="Hapus"
                    onClick={() => setHapusId(t.id)}
                  >
                    <Icon name="trash" size={14} /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalBuka ? (
        <TargetForm
          sunting={sunting}
          onClose={() => setModalBuka(false)}
          onSaved={() => {
            setModalBuka(false);
            muat();
          }}
        />
      ) : null}

      <Modal
        open={hapusId !== null}
        onClose={() => setHapusId(null)}
        title={<h3 className="h3">Hapus Target</h3>}
        footer={
          <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={() => setHapusId(null)}>
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={konfirmasiHapus}>
              Hapus
            </button>
          </div>
        }
      >
        <p className="tiny">Yakin ingin menghapus target ini? Tindakan tidak dapat dibatalkan.</p>
      </Modal>
    </>
  );
}

/* ------------------------- Form tambah/sunting ------------------------- */

function TargetForm({
  sunting,
  onClose,
  onSaved,
}: {
  sunting: TargetKesehatan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    judul: sunting?.judul || "",
    jenis_target: sunting?.jenis_target || ("berat_badan" as JenisTarget | string),
    nilai_target: sunting ? String(sunting.nilai_target) : "",
    satuan:
      sunting?.satuan ??
      SATUAN_JENIS_TARGET[(sunting?.jenis_target as string) || "berat_badan"] ??
      "",
    nilai_awal: sunting?.nilai_awal != null ? String(sunting.nilai_awal) : "",
    tenggat_waktu: sunting?.tenggat_waktu ? sunting.tenggat_waktu.slice(0, 10) : "",
    catatan_motivasi: sunting?.catatan_motivasi || "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [simpan, setSimpan] = useState(false);

  const ubah = (kunci: string, nilai: string) => {
    setForm((p) => ({ ...p, [kunci]: nilai }));
    setErr((p) => ({ ...p, [kunci]: "" }));
  };

  const ubahJenisTarget = (jenisBaru: string) => {
    const satuanOtomatis =
      jenisBaru === "lainnya" ? "" : (SATUAN_JENIS_TARGET[jenisBaru] ?? "");
    setForm((p) => ({ ...p, jenis_target: jenisBaru, satuan: satuanOtomatis }));
    setErr((p) => ({ ...p, jenis_target: "", satuan: "" }));
  };

  const jenisDiDaftar = JENIS.some((j) => j.kode === form.jenis_target);
  const bisaKetikSatuan = form.jenis_target === "lainnya" || !jenisDiDaftar;

  const kirim = async () => {
    const e: Record<string, string> = {};
    if (!form.judul.trim()) e.judul = "Judul wajib diisi.";
    if (!form.nilai_target.trim()) e.nilai_target = "Nilai target wajib diisi.";
    else if (Number.isNaN(Number(form.nilai_target)) || Number(form.nilai_target) <= 0)
      e.nilai_target = "Nilai target wajib lebih dari 0.";
    if (!form.satuan.trim()) e.satuan = "Satuan wajib diisi.";
    setErr(e);
    if (Object.keys(e).length > 0) return;

    const payload: TargetKesehatanInput = {
      judul: form.judul.trim(),
      jenis_target: form.jenis_target,
      nilai_target: Number(form.nilai_target),
      satuan: form.satuan.trim(),
      nilai_awal: form.nilai_awal.trim() !== "" ? Number(form.nilai_awal) : null,
      tenggat_waktu: form.tenggat_waktu || null,
      catatan_motivasi: form.catatan_motivasi.trim() || null,
    };

    setSimpan(true);
    try {
      if (sunting) {
        await targetKesehatan.ubah(sunting.id, payload);
        toast.success("Target diperbarui");
      } else {
        await targetKesehatan.buat(payload);
        toast.success("Target ditambahkan");
      }
      onSaved();
    } catch (eApi) {
      const apiErr = eApi as ApiError;
      const map: Record<string, string> = {};
      if (apiErr.errors?.judul) map.judul = apiErr.errors.judul[0];
      if (apiErr.errors?.nilai_target) map.nilai_target = apiErr.errors.nilai_target[0];
      if (apiErr.errors?.satuan) map.satuan = apiErr.errors.satuan[0];
      setErr(map);
      toast.warning(apiErr.message || "Gagal menyimpan target");
    } finally {
      setSimpan(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <div>
          <h3 className="h3">{sunting ? "Sunting Target" : "Tambah Target"}</h3>
          <p className="tiny" style={{ marginTop: 4 }}>
            Target apa pun: berat badan, tinggi, massa otot, dan lainnya.
          </p>
        </div>
      }
      footer={
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={kirim} disabled={simpan}>
            {simpan ? "Menyimpan…" : sunting ? "Simpan Perubahan" : "Tambah"}
          </button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div className="field">
          <label className="label" htmlFor="judul">Judul target</label>
          <input
            id="judul"
            className={"input" + (err.judul ? " is-error" : "")}
            placeholder="misalnya Berat badan ideal"
            value={form.judul}
            onChange={(e) => ubah("judul", e.target.value)}
          />
          {err.judul ? <div className="err-msg show">{err.judul}</div> : null}
        </div>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label className="label" htmlFor="jenis_target">Jenis target</label>
            <select
              id="jenis_target"
              className="select"
              value={form.jenis_target}
              onChange={(e) => ubahJenisTarget(e.target.value)}
            >
              {!jenisDiDaftar && form.jenis_target ? (
                <option value={form.jenis_target}>{labelJenisTarget(form.jenis_target)}</option>
              ) : null}
              {JENIS.map((j) => (
                <option key={j.kode} value={j.kode}>{j.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="satuan">Satuan</label>
            <input
              id="satuan"
              className={"input" + (err.satuan ? " is-error" : "")}
              placeholder={bisaKetikSatuan ? "Ketik satuan, mis. mmHg, mg/dL…" : "Otomatis"}
              value={form.satuan}
              readOnly={!bisaKetikSatuan}
              style={!bisaKetikSatuan ? { background: "var(--surface-2)", cursor: "not-allowed" } : undefined}
              onChange={(e) => ubah("satuan", e.target.value)}
            />
            <div className="hint">
              {bisaKetikSatuan ? "Isi manual sesuai target Anda" : "Mengikuti jenis target"}
            </div>
            {err.satuan ? <div className="err-msg show">{err.satuan}</div> : null}
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label className="label" htmlFor="nilai_awal">Nilai awal (opsional)</label>
            <input
              id="nilai_awal"
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="misalnya 75"
              value={form.nilai_awal}
              onChange={(e) => ubah("nilai_awal", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="nilai_target">Nilai target</label>
            <input
              id="nilai_target"
              className={"input" + (err.nilai_target ? " is-error" : "")}
              type="number"
              inputMode="decimal"
              placeholder="misalnya 70"
              value={form.nilai_target}
              onChange={(e) => ubah("nilai_target", e.target.value)}
            />
            {err.nilai_target ? <div className="err-msg show">{err.nilai_target}</div> : null}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="tenggat_waktu">Tenggat (opsional)</label>
          <input
            id="tenggat_waktu"
            className="input"
            type="date"
            value={form.tenggat_waktu}
            onChange={(e) => ubah("tenggat_waktu", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="catatan_motivasi">Catatan motivasi (opsional)</label>
          <textarea
            id="catatan_motivasi"
            className="textarea"
            rows={2}
            placeholder="misalnya Terus semangat, kamu bisa!"
            value={form.catatan_motivasi}
            onChange={(e) => ubah("catatan_motivasi", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { admin as adminApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import type { Role } from "@/lib/enums";
import type { AdminPengguna, AdminPenggunaInput, Wilayah } from "@/types";

const FILTER = [
  { value: "semua", label: "Semua" },
  { value: "user", label: "User" },
  { value: "kader", label: "Kader" },
  { value: "admin_kelurahan", label: "Admin Kelurahan" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_BADGE: Record<Role, string> = {
  user: "muted",
  kader: "info",
  admin_kelurahan: "warning",
  super_admin: "danger",
};

const ROLE_LABEL: Record<Role, string> = {
  user: "User",
  kader: "Kader",
  admin_kelurahan: "Admin Kelurahan",
  super_admin: "Super Admin",
};

const ROLE_OPSI = (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({
  value: r,
  label: ROLE_LABEL[r],
}));

/* ------------------------------------------------------------------
   CRUD akun untuk super_admin (termasuk membuat akun admin kelurahan & kader).

   Endpoint (backend/routes/api.php §Modul Master Admin, khusus super_admin):
     GET    /admin/pengguna
     POST   /admin/pengguna            name, email, password(min 8), role, wilayah_id
     PUT    /admin/pengguna/{id}       semua field "sometimes"; password opsional
     DELETE /admin/pengguna/{id}       bukan hapus baris — set aktif = false

   Catatan:
   - DELETE bersifat nonaktifkan. Akun bisa diaktifkan lagi lewat Ubah.
   - Ganti password / nonaktifkan akun mencabut semua token (backend yang urus).
   - wilayah_id nullable di backend tetapi wajib secara praktik untuk
     admin_kelurahan dan kader.
   ------------------------------------------------------------------ */

type FormState = {
  name: string;
  nik: string;
  email: string;
  password: string;
  role: Role;
  wilayah_id: string;
  aktif: boolean;
};

const FORM_KOSONG: FormState = {
  name: "",
  nik: "",
  email: "",
  password: "",
  role: "kader",
  wilayah_id: "",
  aktif: true,
};

type ErrForm = Partial<Record<keyof FormState, string>>;

export default function AdminPenggunaPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [daftar, setDaftar] = useState<AdminPengguna[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [kelurahan, setKelurahan] = useState<Wilayah[]>([]);

  const [formBuka, setFormBuka] = useState(false);
  const [sunting, setSunting] = useState<AdminPengguna | null>(null);
  const [form, setForm] = useState<FormState>(FORM_KOSONG);
  const [errForm, setErrForm] = useState<ErrForm>({});
  const [simpan, setSimpan] = useState(false);

  const [sasaran, setSasaran] = useState<AdminPengguna | null>(null);
  const [memproses, setMemproses] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.pengguna.list();
      setDaftar(res || []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal muat pengguna");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  // Dropdown wilayah. Gagal memuat wilayah tidak boleh memblokir halaman.
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
    return daftar.filter((p) => {
      const cocokRole = filter === "semua" || p.role === filter;
      const cocokCari =
        q === "" ||
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.wilayah?.nama?.toLowerCase().includes(q);
      return cocokRole && cocokCari;
    });
  }, [filter, cari, daftar]);

  const jumlahNonaktif = useMemo(() => daftar.filter((p) => p.aktif === false).length, [daftar]);

  function bukaTambah() {
    setSunting(null);
    setForm(FORM_KOSONG);
    setErrForm({});
    setFormBuka(true);
  }

  function bukaSunting(p: AdminPengguna) {
    setSunting(p);
    setForm({
      name: p.name,
      nik: p.nik ?? "",
      email: p.email,
      password: "",
      role: p.role,
      wilayah_id: p.wilayah_id ? String(p.wilayah_id) : "",
      aktif: p.aktif !== false,
    });
    setErrForm({});
    setFormBuka(true);
  }

  function ubah<K extends keyof FormState>(kunci: K, nilai: FormState[K]) {
    setForm((p) => ({ ...p, [kunci]: nilai }));
    setErrForm((p) => ({ ...p, [kunci]: "" }));
  }

  async function kirimForm() {
    const e: ErrForm = {};
    const nama = form.name.trim();
    const email = form.email.trim();

    if (nama === "") e.name = "Nama wajib diisi.";
    if (email === "") e.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Format email tidak valid.";

    // Password wajib untuk akun baru, opsional saat mengubah (kosong = tidak diubah).
    if (!sunting && form.password === "") e.password = "Password wajib diisi untuk akun baru.";
    if (form.password !== "" && form.password.length < 8) e.password = "Password minimal 8 karakter.";

    if ((form.role === "kader" || form.role === "admin_kelurahan") && form.wilayah_id === "") {
      e.wilayah_id = `Wilayah wajib dipilih untuk role ${ROLE_LABEL[form.role]}.`;
    }

    // NIK: 16 digit angka bila diisi
    const nik = form.nik.trim();
    if (nik !== "" && !/^\d{16}$/.test(nik)) e.nik = "NIK harus 16 digit angka.";

    setErrForm(e);
    if (Object.keys(e).length > 0) {
      toast.warning("Periksa kembali field yang ditandai.");
      return;
    }

    const payload: Partial<AdminPenggunaInput> & { aktif?: boolean } = {
      name: nama,
      email,
      role: form.role,
    };
    if (form.wilayah_id !== "") payload.wilayah_id = Number(form.wilayah_id);
    if (form.password !== "") payload.password = form.password;
    if (nik !== "") payload.nik = nik;
    if (sunting) payload.aktif = form.aktif;

    setSimpan(true);
    try {
      if (sunting) {
        await adminApi.pengguna.update(sunting.id, payload as Partial<AdminPenggunaInput>);
        toast.success("Data pengguna diperbarui.", { title: "Berhasil" });
      } else {
        await adminApi.pengguna.create(payload as AdminPenggunaInput);
        toast.success("Akun pengguna dibuat.", { title: "Berhasil" });
      }
      setFormBuka(false);
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: ErrForm = {};
        if (apiErr.errors.name) map.name = apiErr.errors.name[0];
        if (apiErr.errors.email) map.email = apiErr.errors.email[0];
        if (apiErr.errors.password) map.password = apiErr.errors.password[0];
        if (apiErr.errors.role) map.role = apiErr.errors.role[0];
        if (apiErr.errors.wilayah_id) map.wilayah_id = apiErr.errors.wilayah_id[0];
        if (apiErr.errors.nik) map.nik = apiErr.errors.nik[0];
        setErrForm(map);
      }
      toast.warning(apiErr.message || "Gagal menyimpan pengguna.");
    } finally {
      setSimpan(false);
    }
  }

  async function nonaktifkan() {
    if (!sasaran) return;
    setMemproses(true);
    try {
      await adminApi.pengguna.hapus(sasaran.id);
      toast.success(`${sasaran.name} dinonaktifkan.`, { title: "Berhasil" });
      setSasaran(null);
      await muat();
    } catch (err) {
      toast.warning((err as ApiError).message || "Gagal menonaktifkan akun.");
    } finally {
      setMemproses(false);
    }
  }

  return (
    <AppShell noFab roles={["super_admin"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Kelola Pengguna</h1>
          <p className="tiny">Tambah, ubah, dan nonaktifkan akun admin kelurahan maupun kader.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={bukaTambah}>
          <Icon name="user-plus" size={16} /> Tambah Pengguna
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
          <div className="grid grid-2 mb-12" style={{ gap: 12 }}>
            <div className="metric">
              <span className="metric-val">{daftar.length}</span>
              <span className="tiny">Total Pengguna</span>
            </div>
            <div className="metric">
              <span className="metric-val">{jumlahNonaktif}</span>
              <span className="tiny">Nonaktif</span>
            </div>
          </div>

          <Segmented items={FILTER} value={filter} onChange={setFilter} />

          <div className="input-icon mt-12">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari nama, email, atau wilayah…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Tidak ada pengguna" desc="Tidak ada pengguna dengan filter ini." />
              </div>
            ) : (
              filtered.map((p) => (
                <div className="card card-flat" key={p.id}>
                  <div className="row items-start gap-10">
                    <span className="li-ico">
                      <Icon name="user" size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="row-between">
                        <strong className="text-sm">
                          {p.name}
                          {p.aktif === false ? (
                            <span className="tiny" style={{ marginLeft: 6 }}>
                              (nonaktif)
                            </span>
                          ) : null}
                        </strong>
                        <Badge tone={ROLE_BADGE[p.role] as any}>{ROLE_LABEL[p.role]}</Badge>
                      </div>
                      <p className="tiny mt-4">{p.email}</p>
                      <p className="tiny mt-2">Wilayah: {p.wilayah?.nama || "—"}</p>
                    </div>
                  </div>
                  <div className="row mt-12" style={{ gap: 8, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => bukaSunting(p)}
                    >
                      <Icon name="pencil" size={14} /> Ubah
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={p.aktif === false}
                      onClick={() => setSasaran(p)}
                    >
                      <Icon name="x" size={14} /> Nonaktifkan
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Menonaktifkan akun tidak menghapus datanya; akun langsung
            ter-logout dan bisa diaktifkan lagi lewat tombol Ubah.
          </p>
        </>
      )}

      {/* ---------- Modal tambah / ubah ---------- */}
      <Modal
        open={formBuka}
        onClose={() => setFormBuka(false)}
        title={<h3 className="h3">{sunting ? "Ubah Pengguna" : "Tambah Pengguna"}</h3>}
        footer={
          <div className="row" style={{ gap: 10, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setFormBuka(false)}>
              Batal
            </button>
            <button type="button" className="btn btn-primary" onClick={kirimForm} disabled={simpan}>
              {simpan ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        }
      >
        <div className="field">
          <label className="label" htmlFor="name">
            Nama lengkap <span className="req">*</span>
          </label>
          <input
            className={"input" + (errForm.name ? " is-error" : "")}
            id="name"
            value={form.name}
            onChange={(e) => ubah("name", e.target.value)}
          />
          {errForm.name ? <div className="err-msg show">{errForm.name}</div> : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="nik">
            NIK <span className="opt">(opsional)</span>
          </label>
          <input
            className={"input" + (errForm.nik ? " is-error" : "")}
            id="nik"
            inputMode="numeric"
            maxLength={16}
            autoComplete="off"
            placeholder="16 digit — dipakai untuk pencarian warga di Posbindu"
            value={form.nik}
            onChange={(e) => ubah("nik", e.target.value.replace(/\D/g, ""))}
          />
          {errForm.nik ? (
            <div className="err-msg show">{errForm.nik}</div>
          ) : (
            <div className="hint">Warga tanpa NIK tidak bisa dicari kader di form Posbindu.</div>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="email">
            Email <span className="req">*</span>
          </label>
          <input
            className={"input" + (errForm.email ? " is-error" : "")}
            id="email"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => ubah("email", e.target.value)}
          />
          {errForm.email ? <div className="err-msg show">{errForm.email}</div> : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password {sunting ? null : <span className="req">*</span>}
          </label>
          <input
            className={"input" + (errForm.password ? " is-error" : "")}
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={sunting ? "Kosongkan bila tidak diubah" : "Minimal 8 karakter"}
            value={form.password}
            onChange={(e) => ubah("password", e.target.value)}
          />
          {errForm.password ? (
            <div className="err-msg show">{errForm.password}</div>
          ) : (
            <div className="hint">
              {sunting
                ? "Mengisi password baru akan mengeluarkan pengguna dari semua sesi."
                : "Minimal 8 karakter."}
            </div>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="role">
            Role <span className="req">*</span>
          </label>
          <select
            className={"select" + (errForm.role ? " is-error" : "")}
            id="role"
            value={form.role}
            onChange={(e) => ubah("role", e.target.value as Role)}
          >
            {ROLE_OPSI.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errForm.role ? <div className="err-msg show">{errForm.role}</div> : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="wilayah_id">
            Wilayah (kelurahan)
          </label>
          <select
            className={"select" + (errForm.wilayah_id ? " is-error" : "")}
            id="wilayah_id"
            value={form.wilayah_id}
            onChange={(e) => ubah("wilayah_id", e.target.value)}
          >
            <option value="">— Tanpa wilayah —</option>
            {kelurahan.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nama}
              </option>
            ))}
          </select>
          {errForm.wilayah_id ? (
            <div className="err-msg show">{errForm.wilayah_id}</div>
          ) : (
            <div className="hint">Wajib untuk role Admin Kelurahan dan Kader.</div>
          )}
        </div>

        {sunting ? (
          <div className="field">
            <label className="label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => ubah("aktif", e.target.checked)}
              />
              Akun aktif (bisa masuk)
            </label>
            {sunting.aktif === false && !form.aktif ? null : (
              <div className="hint">Menonaktifkan akun mencabut semua sesi yang sedang berjalan.</div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ---------- Konfirmasi nonaktifkan ---------- */}
      <Modal
        open={sasaran !== null}
        onClose={() => setSasaran(null)}
        title={<h3 className="h3">Nonaktifkan akun?</h3>}
        footer={
          <div className="row" style={{ gap: 10, justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setSasaran(null)}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={nonaktifkan}
              disabled={memproses}
            >
              {memproses ? "Memproses…" : "Ya, nonaktifkan"}
            </button>
          </div>
        }
      >
        <p className="text-sm">
          <strong>{sasaran?.name}</strong> ({sasaran?.email}) tidak akan bisa masuk lagi dan semua
          sesinya dicabut. Data tetap tersimpan dan akun bisa diaktifkan kembali lewat tombol Ubah.
        </p>
      </Modal>
    </AppShell>
  );
}

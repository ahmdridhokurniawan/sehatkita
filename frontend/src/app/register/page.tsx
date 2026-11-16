"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AuthAside from "@/components/auth/AuthAside";
import LegalInfoModal, { type LegalTopic } from "@/components/landing/LegalInfoModal";
import { auth, setToken, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { clearUserCache } from "@/hooks/useUser";
import type { Wilayah } from "@/types";

type Err = Record<string, string>;
type WilayahItem = Wilayah & { parent_nama?: string };

export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [wilayahId, setWilayahId] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [lihatPw, setLihatPw] = useState(false);
  const [lihatKonf, setLihatKonf] = useState(false);
  const [setuju, setSetuju] = useState(false);
  const [errors, setErrors] = useState<Err>({});
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);
  const [legalTopic, setLegalTopic] = useState<LegalTopic | null>(null);

  // §6.1 — daftar wilayah dari backend (publik)
  const [wilayahList, setWilayahList] = useState<WilayahItem[]>([]);
  const [wilayahGagal, setWilayahGagal] = useState(false);
  const [filterKec, setFilterKec] = useState("");
  const [kelQuery, setKelQuery] = useState("");
  const [kelOpen, setKelOpen] = useState(false);
  const [kelHighlight, setKelHighlight] = useState(0);
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [kecamatan, kelurahan] = await Promise.all([
          wilayahApi.list({ tipe: "kecamatan" }),
          wilayahApi.list({ tipe: "kelurahan" }),
        ]);
        const namaKec = new Map(kecamatan.map((k) => [k.id, k.nama]));
        setWilayahList(
          kelurahan.map((k) => ({ ...k, parent_nama: namaKec.get(k.parent_id ?? -1) }))
        );
      } catch {
        setWilayahGagal(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!kelOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setKelOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [kelOpen]);

  const kecamatanList = useMemo(() => {
    const set = new Set<string>();
    for (const w of wilayahList) {
      set.add(w.parent_nama || "Lainnya");
    }
    return Array.from(set).sort();
  }, [wilayahList]);

  const selectedWilayah = useMemo(
    () => wilayahList.find((w) => String(w.id) === wilayahId) ?? null,
    [wilayahList, wilayahId],
  );

  const effectiveQuery =
    selectedWilayah && kelQuery === selectedWilayah.nama ? "" : kelQuery;

  const wilayahTersaring = useMemo(() => {
    const q = effectiveQuery.trim().toLowerCase();
    return wilayahList.filter((w) => {
      const kec = w.parent_nama || "Lainnya";
      if (filterKec && kec !== filterKec) return false;
      if (q && !w.nama.toLowerCase().includes(q) && !kec.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [wilayahList, filterKec, effectiveQuery]);

  // Kelompokkan wilayah per kecamatan sekaligus simpan indeks datarnya untuk navigasi keyboard
  const groupedKelurahan = useMemo(() => {
    const groups: { kec: string; items: { item: WilayahItem; flatIndex: number }[] }[] = [];
    const byKec = new Map<string, { item: WilayahItem; flatIndex: number }[]>();
    wilayahTersaring.forEach((item, flatIndex) => {
      const kec = item.parent_nama || "Lainnya";
      let list = byKec.get(kec);
      if (!list) {
        list = [];
        byKec.set(kec, list);
        groups.push({ kec, items: list });
      }
      list.push({ item, flatIndex });
    });
    return groups;
  }, [wilayahTersaring]);

  const activeIndex = Math.min(kelHighlight, Math.max(wilayahTersaring.length - 1, 0));

  function pilihKelurahan(w: WilayahItem) {
    setWilayahId(String(w.id));
    setKelQuery(w.nama);
    setKelOpen(false);
    setErrors((prev) => (prev.wilayah_id ? { ...prev, wilayah_id: "" } : prev));
  }

  function hapusKelurahan() {
    setWilayahId("");
    setKelQuery("");
    setKelHighlight(0);
    setKelOpen(true);
  }

  const aturanPassword = useMemo(
    () => [
      { ok: password.length >= 8, label: "Min. 8 karakter" },
      { ok: /[A-Z]/.test(password), label: "1 Huruf Kapital (A-Z)" },
      { ok: /[0-9]/.test(password), label: "1 Angka (0-9)" },
      { ok: /[^a-zA-Z0-9\s]/.test(password), label: "1 Simbol (!@#...)" },
    ],
    [password],
  );

  function validasi(): boolean {
    const err: Err = {};
    if (!nama) err.name = "Nama wajib diisi.";
    if (!nik) err.nik = "NIK wajib diisi.";
    else if (!/^\d{16}$/.test(nik)) err.nik = "NIK harus 16 digit angka.";
    if (!email) err.email = "Email wajib diisi.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) err.email = "Format email tidak valid.";
    if (!wilayahId) err.wilayah_id = "Pilih kelurahan Anda.";
    if (!password || password.length < 8) {
      err.password = "Password minimal 8 karakter.";
    } else if (!aturanPassword.every((a) => a.ok)) {
      err.password = "Password harus mengandung minimal 1 huruf kapital, 1 angka, dan 1 simbol.";
    }
    if (password !== konfirmasi) err.password_confirmation = "Konfirmasi tidak sama.";
    if (!setuju) err.setuju = "Anda harus menyetujui kebijakan penggunaan data.";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setAlert("");
    if (!validasi()) return;

    setLoading(true);
    try {
      const res = await auth.register({
        name: nama,
        nik,
        email,
        password,
        password_confirmation: konfirmasi,
        wilayah_id: parseInt(wilayahId, 10),
      });

      setToken(res.token, true);
      clearUserCache();

      // User baru (consent_at null) → redirect ke onboarding (kontrak §26)
      if (res.user.consent_at === null) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setLoading(false);
      const apiErr = err instanceof ApiError ? err : new ApiError("Registrasi gagal. Coba lagi.", 0);
      if (apiErr.status === 422 && apiErr.errors) {
        const errMap: Err = {};
        for (const [key, msgs] of Object.entries(apiErr.errors)) {
          errMap[key] = msgs[0] || "Validasi gagal";
        }
        setErrors(errMap);
        setAlert(apiErr.message || "Validasi gagal.");
      } else {
        setAlert(apiErr.message || "Registrasi gagal. Coba lagi.");
      }
    }
  }

  return (
    <div className="auth-wrap">
      <AuthAside
        judul="Pantau Kesehatan Anda dan Keluarga Mulai Hari Ini."
        teks="Gratis untuk seluruh warga. Catatan tersimpan rapi, mudah dibagikan saat ke posbindu atau puskesmas."
        fitur={[
          {
            icon: "check-circle",
            tag: "Daftar Cepat",
            title: "Pendaftaran cepat dalam 1 menit",
            desc: "Cukup nama, email, NIK, dan kelurahan untuk langsung mulai memantau.",
          },
          {
            icon: "map-pin",
            tag: "Dukungan Wilayah",
            title: "Terhubung dengan kader Posbindu kelurahan",
            desc: "Data siap dicatat dan didampingi petugas kesehatan wilayah Anda.",
          },
          {
            icon: "lock",
            tag: "Kendali Data",
            title: "Privasi & hak kontrol data di tangan Anda",
            desc: "Anda bebas mengelola catatan maupun menarik persetujuan kapan saja.",
          },
        ]}
      />

      <main className="auth-main">
        <div className="auth-card auth-card-wide">
          <div className="auth-topbar">
            <Link href="/" className="btn btn-sm btn-outline auth-back-btn">
              <Icon name="arrow-left" size={16} /> Kembali
            </Link>
            <ThemeToggle />
          </div>

          <Link href="/" className="auth-mobile-brand" aria-label="Beranda SehatKita">
            <BrandLockup variant="sm" />
            <div className="txt">
              SehatKita
              <small>Kota Banjarbaru</small>
            </div>
          </Link>

          <div className="auth-head">
            <span className="auth-aside-badge">
              <Icon name="user-plus" size={13} /> Pendaftaran Warga
            </span>
            <h1 className="h2">Buat akun baru</h1>
            <p className="tiny mt-4">Isi data akun &amp; wilayah tempat tinggal Anda.</p>
          </div>

          {alert ? (
            <div className="alert alert-danger mb-16" role="alert">
              <Icon name="alert-circle" />
              <div>{alert}</div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-grid-2 mb-16">
              <div className="field">
                <label className="label" htmlFor="name">
                  Nama lengkap <span className="req">*</span>
                </label>
                <div className="input-icon">
                  <Icon name="user" size={18} />
                  <input
                    className={`input ${errors.name ? "is-error" : ""}`}
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Nama sesuai identitas"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                  />
                </div>
                <div className={`err-msg ${errors.name ? "show" : ""}`}>{errors.name}</div>
              </div>

              <div className="field">
                <label className="label" htmlFor="email">
                  Email <span className="req">*</span>
                </label>
                <div className="input-icon">
                  <Icon name="mail" size={18} />
                  <input
                    className={`input ${errors.email ? "is-error" : ""}`}
                    type="email"
                    id="email"
                    name="email"
                    inputMode="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className={`err-msg ${errors.email ? "show" : ""}`}>{errors.email}</div>
              </div>
            </div>

            <div className="field mb-16">
              <div className="row-between mb-6">
                <label className="label" htmlFor="nik" style={{ marginBottom: 0 }}>
                  NIK <span className="req">*</span>
                </label>
                <span className="tiny text-2">{nik.length}/16 digit</span>
              </div>
              <div className="input-icon">
                <Icon name="user-check" size={18} />
                <input
                  className={`input ${errors.nik ? "is-error" : ""}`}
                  type="text"
                  id="nik"
                  name="nik"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={16}
                  placeholder="16 digit angka sesuai KTP"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
                />
              </div>
              <div className="hint">Dipakai kader Posbindu untuk mencari data Anda saat pemeriksaan.</div>
              <div className={`err-msg ${errors.nik ? "show" : ""}`}>{errors.nik}</div>
            </div>

            <div className="field auth-region-box" ref={regionRef}>
              <div className="row-between mb-8">
                <label className="label" htmlFor="wilayah_id" style={{ marginBottom: 0 }}>
                  Kelurahan <span className="req">*</span>
                </label>
                <span className="tiny text-2">
                  {wilayahTersaring.length} dari {wilayahList.length} kelurahan
                </span>
              </div>

              <div className="auth-region-controls">
                <select
                  className="select"
                  aria-label="Filter kecamatan"
                  value={filterKec}
                  onChange={(e) => {
                    const nextKec = e.target.value;
                    setFilterKec(nextKec);
                    setKelHighlight(0);
                    if (
                      selectedWilayah &&
                      nextKec &&
                      (selectedWilayah.parent_nama || "Lainnya") !== nextKec
                    ) {
                      setWilayahId("");
                      setKelQuery("");
                    }
                    setKelOpen(true);
                  }}
                >
                  <option value="">Semua Kecamatan</option>
                  {kecamatanList.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>

                <div className="region-combo">
                  <div className="input-icon has-end">
                    <Icon name="search" size={16} />
                    <input
                      className={`input ${errors.wilayah_id ? "is-error" : ""}`}
                      id="wilayah_id"
                      type="text"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={kelOpen}
                      aria-controls="kelurahan-listbox"
                      aria-activedescendant={
                        kelOpen && wilayahTersaring[activeIndex]
                          ? `kel-opt-${wilayahTersaring[activeIndex].id}`
                          : undefined
                      }
                      autoComplete="off"
                      placeholder="Ketik atau pilih kelurahan…"
                      value={kelQuery}
                      onFocus={() => setKelOpen(true)}
                      onClick={() => setKelOpen(true)}
                      onChange={(e) => {
                        const next = e.target.value;
                        setKelQuery(next);
                        setKelHighlight(0);
                        setKelOpen(true);
                        if (selectedWilayah && next !== selectedWilayah.nama) {
                          setWilayahId("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          if (!kelOpen) {
                            setKelOpen(true);
                          } else if (wilayahTersaring.length > 0) {
                            setKelHighlight((i) =>
                              Math.min(i + 1, wilayahTersaring.length - 1),
                            );
                          }
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setKelHighlight((i) => Math.max(i - 1, 0));
                        } else if (e.key === "Enter" && kelOpen && wilayahTersaring[activeIndex]) {
                          e.preventDefault();
                          pilihKelurahan(wilayahTersaring[activeIndex]);
                        } else if (e.key === "Escape") {
                          setKelOpen(false);
                        }
                      }}
                    />
                    {kelQuery || wilayahId ? (
                      <button
                        type="button"
                        className="input-end-btn"
                        aria-label="Hapus pilihan kelurahan"
                        onClick={hapusKelurahan}
                      >
                        <Icon name="x" size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="input-end-btn"
                        aria-label={
                          kelOpen ? "Tutup daftar kelurahan" : "Buka daftar kelurahan"
                        }
                        onClick={() => setKelOpen((v) => !v)}
                      >
                        <Icon name={kelOpen ? "chevron-up" : "chevron-down"} size={16} />
                      </button>
                    )}
                  </div>

                  {kelOpen ? (
                    <div
                      id="kelurahan-listbox"
                      className="region-dropdown"
                      role="listbox"
                      aria-label="Daftar kelurahan"
                    >
                      {wilayahGagal ? (
                        <div className="region-empty">
                          Gagal memuat wilayah. Muat ulang halaman.
                        </div>
                      ) : groupedKelurahan.length === 0 ? (
                        <div className="region-empty">
                          <span>Tidak ada kelurahan yang cocok.</span>
                          {filterKec || kelQuery ? (
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => {
                                setFilterKec("");
                                hapusKelurahan();
                              }}
                            >
                              Reset filter
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        groupedKelurahan.map((group) => (
                          <div className="region-group" key={group.kec}>
                            <div className="region-group-label">{group.kec}</div>
                            {group.items.map(({ item, flatIndex }) => {
                              const isSelected = String(item.id) === wilayahId;
                              const isActive = flatIndex === activeIndex;
                              return (
                                <button
                                  key={item.id}
                                  id={`kel-opt-${item.id}`}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  className={`region-opt ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""}`}
                                  onMouseEnter={() => setKelHighlight(flatIndex)}
                                  onClick={() => pilihKelurahan(item)}
                                >
                                  <span>{item.nama}</span>
                                  {isSelected ? <Icon name="check" size={15} /> : null}
                                </button>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="hint">
                {wilayahGagal
                  ? "Gagal memuat wilayah. Muat ulang halaman."
                  : selectedWilayah
                    ? `Terpilih: Kel. ${selectedWilayah.nama} · Kec. ${selectedWilayah.parent_nama || "Lainnya"}`
                    : "Ketik nama kelurahan lalu pilih langsung dari daftar yang muncul."}
              </div>
              <div className={`err-msg ${errors.wilayah_id ? "show" : ""}`}>{errors.wilayah_id}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">
                Password <span className="req">*</span>
              </label>
              <div className="input-icon has-end">
                <Icon name="lock" size={18} />
                <input
                  className={`input ${errors.password ? "is-error" : ""}`}
                  type={lihatPw ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 karakter (Kapital, Angka, Simbol)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="input-end-btn"
                  aria-label={lihatPw ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={lihatPw}
                  onClick={() => setLihatPw((v) => !v)}
                >
                  <Icon name={lihatPw ? "eye-off" : "eye"} size={18} />
                </button>
              </div>
              <div className="pw-rules" aria-label="Syarat keamanan password">
                {aturanPassword.map((a) => (
                  <span
                    key={a.label}
                    className={`badge ${a.ok ? "badge-safe" : ""}`}
                  >
                    <Icon name={a.ok ? "check" : "circle-dot"} size={12} /> {a.label}
                  </span>
                ))}
              </div>
              <div className={`err-msg ${errors.password ? "show" : ""}`}>{errors.password}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password_confirmation">
                Konfirmasi Password <span className="req">*</span>
              </label>
              <div className="input-icon has-end">
                <Icon name="lock" size={18} />
                <input
                  className={`input ${errors.password_confirmation ? "is-error" : ""}`}
                  type={lihatKonf ? "text" : "password"}
                  id="password_confirmation"
                  name="password_confirmation"
                  autoComplete="new-password"
                  placeholder="Ulangi password"
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                />
                <button
                  type="button"
                  className="input-end-btn"
                  aria-label={lihatKonf ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                  aria-pressed={lihatKonf}
                  onClick={() => setLihatKonf((v) => !v)}
                >
                  <Icon name={lihatKonf ? "eye-off" : "eye"} size={18} />
                </button>
              </div>
              <div className={`err-msg ${errors.password_confirmation ? "show" : ""}`}>
                {errors.password_confirmation}
              </div>
            </div>

            <label className="check mt-16">
              <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
              <span className="tiny">
                Saya menyetujui{" "}
                <button type="button" className="auth-inline-link" onClick={() => setLegalTopic("privasi")}>
                  Kebijakan Privasi
                </button>{" "}
                dan{" "}
                <button type="button" className="auth-inline-link" onClick={() => setLegalTopic("syarat")}>
                  Syarat &amp; Ketentuan
                </button>{" "}
                SehatKita.
              </span>
            </label>
            <div className={`err-msg ${errors.setuju ? "show" : ""}`}>{errors.setuju}</div>

            <button type="submit" className="btn btn-primary btn-lg btn-block mt-20" disabled={loading}>
              {loading ? "Mendaftar…" : "Daftar"}
            </button>
          </form>

          <p className="center tiny mt-20 auth-foot-note">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary fw-700">
              Masuk di sini
            </Link>
          </p>

          <div className="auth-legal-links" aria-label="Informasi hukum dan bantuan">
            <button type="button" className="auth-legal-btn" onClick={() => setLegalTopic("medis")}>
              Catatan Penting
            </button>
            <button type="button" className="auth-legal-btn" onClick={() => setLegalTopic("kontak")}>
              Kontak Resmi
            </button>
          </div>
        </div>
      </main>

      <LegalInfoModal
        topic={legalTopic}
        onChangeTopic={setLegalTopic}
        onClose={() => setLegalTopic(null)}
      />
    </div>
  );
}

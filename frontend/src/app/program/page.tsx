"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { tanggal, angka } from "@/lib/format";

const PROGRAM_DEMO = [
  {
    id: 1,
    nama: "Program Ibu Hamil",
    deskripsi: "Pemeriksaan rutin & edukasi gizi untuk ibu hamil",
    peserta: 28,
    mulai: "2026-01-01",
    status: "berjalan",
    kader: { id: 5, name: "Kader A" },
  },
  {
    id: 2,
    nama: "Program Balita Sehat",
    deskripsi: "Penimbangan & pencatatan tumbuh kembang balita",
    peserta: 45,
    mulai: "2026-02-15",
    status: "berjalan",
    kader: { id: 5, name: "Kader A" },
  },
  {
    id: 3,
    nama: "Program Lansia Hipertensi",
    deskripsi: "Monitor tekanan darah & edukasi gaya hidup",
    peserta: 32,
    mulai: "2026-03-01",
    status: "berjalan",
    kader: { id: 6, name: "Kader B" },
  },
  {
    id: 4,
    nama: "Program Deteksi Dini Penyakit",
    deskripsi: "Skrining PTM untuk masyarakat dewasa",
    peserta: 0,
    mulai: "2026-11-01",
    status: "akan_datang",
    kader: null,
  },
];

const LABEL_STATUS: Record<string, string> = {
  berjalan: "Berjalan",
  selesai: "Selesai",
  akan_datang: "Akan datang",
};

const STATUS_TONE: Record<string, "safe" | "warning" | "danger"> = {
  berjalan: "safe",
  selesai: "warning",
  akan_datang: "danger",
};

export default function ProgramPage() {
  const user = useUser();
  const isAdmin = user?.role === "admin_kelurahan";
  const isKader = user?.role === "kader";
  const isUser = user?.role === "user";
  
  const [program, setProgram] = useState(PROGRAM_DEMO);
  const [showForm, setShowForm] = useState(false);
  const [joined, setJoined] = useState<number[]>([1, 2]); // demo: user sudah ikut program 1 & 2
  const [detail, setDetail] = useState<typeof PROGRAM_DEMO[0] | null>(null);

  const toggle = (id: number) => {
    if (joined.includes(id)) {
      setJoined(joined.filter((p) => p !== id));
    } else {
      setJoined([...joined, id]);
    }
  };

  const isJoined = (id: number) => joined.includes(id);
  const progBerjalan = program.filter((p) => p.status === "berjalan");
  const progIkut = program.filter((p) => isJoined(p.id) && p.status === "berjalan");
  const totalPeserta = progBerjalan.reduce((sum, p) => sum + p.peserta, 0);

  // ========== UI TIER 1 (USER) ==========
  if (isUser) {
    return (
      <AppShell noFab>
        <div className="row-between mb-16">
          <div>
            <h1 className="h3">Program</h1>
            <p className="tiny">Daftar program kesehatan yang bisa kamu ikuti.</p>
          </div>
        </div>

        {/* Ringkasan */}
        <div className="grid grid-2 mb-12" style={{ gap: 12 }}>
          <div className="card card-flat">
            <div className="tiny">Program Tersedia</div>
            <div className="metric-val">{progBerjalan.length}</div>
          </div>
          <div className="card card-flat">
            <div className="tiny">Program Diikuti</div>
            <div className="metric-val">{progIkut.length}</div>
          </div>
        </div>

        {/* Daftar program */}
        <div className="app-section-title">
          <h2>Program Aktif</h2>
        </div>

        {progBerjalan.length === 0 ? (
          <div className="card card-flat mt-12">
            <EmptyState title="Tidak ada program" desc="Belum ada program aktif saat ini." />
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {progBerjalan.map((p) => {
              const persen = Math.round((p.peserta / 50) * 100); // assume target 50
              const ikut = isJoined(p.id);
              return (
                <div className="card card-flat" key={p.id}>
                  <div className="row-between mb-12">
                    <div>
                      <strong className="text-sm">{p.nama}</strong>
                      <p className="tiny mt-4">{p.deskripsi}</p>
                    </div>
                    <Badge tone={ikut ? "safe" : "warning"}>{ikut ? "Diikuti" : "Tersedia"}</Badge>
                  </div>

                  <div className="grid grid-2 mb-12" style={{ gap: 12 }}>
                    <div className="tiny">
                      <span>PJ</span>
                      <div className="text-sm fw-600 mt-4">{p.kader?.name || "—"}</div>
                    </div>
                    <div className="tiny">
                      <span>Peserta</span>
                      <div className="text-sm fw-600 mt-4">{p.peserta}</div>
                    </div>
                  </div>

                  <div className="row gap-8">
                    <Button
                      variant={ikut ? "secondary" : "primary"}
                      style={{ flex: 1 }}
                      onClick={() => toggle(p.id)}
                    >
                      <Icon name={ikut ? "check" : "plus"} size={15} /> {ikut ? "Berhenti" : "Ikuti"}
                    </Button>
                    <Button variant="ghost" style={{ flex: 1 }} onClick={() => setDetail(p)}>
                      <Icon name="info" size={15} /> Info
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Program akan datang */}
        {program.filter((p) => p.status === "akan_datang").length > 0 && (
          <>
            <div className="app-section-title mt-20">
              <h2>Akan Datang</h2>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {program.filter((p) => p.status === "akan_datang").map((p) => (
                <div className="card card-flat" key={p.id} style={{ opacity: 0.7 }}>
                  <div className="row-between mb-12">
                    <div>
                      <strong className="text-sm">{p.nama}</strong>
                      <p className="tiny mt-4">{p.deskripsi}</p>
                    </div>
                    <Badge tone="warning">Akan Datang</Badge>
                  </div>
                  <div className="tiny">
                    Mulai: <strong>{tanggal(p.mulai, "short")}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="tiny center mt-16 mb-16">
          <Icon name="info" size={13} /> Program dinamis — data diperbarui dari server.
        </p>

        {/* Modal detail program */}
        <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.nama}>
          {detail && (
            <>
              <p className="tiny mb-12">{detail.deskripsi}</p>
              <dl className="dl">
                <div>
                  <dt>Penanggung Jawab</dt>
                  <dd>{detail.kader?.name || "—"}</dd>
                </div>
                <div>
                  <dt>Peserta Terdaftar</dt>
                  <dd>{detail.peserta}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Badge tone={detail.status === "berjalan" ? "safe" : "warning"}>
                      {detail.status === "berjalan" ? "Berjalan" : "Akan Datang"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </>
          )}
        </Modal>
      </AppShell>
    );
  }

  // ========== UI ADMIN/KADER (TIER 3+) ==========
  return (
    <AppShell greet="Manajemen Program Posbindu">
      <section>
        <div className="app-section-title">
          <h2>Program Kelurahan</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={14} /> Buat Program
          </Button>
        </div>

        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="card card-metric">
            <div className="tiny">Program Berjalan</div>
            <div className="metric-val">{program.filter((p) => p.status === "berjalan").length}</div>
          </div>
          <div className="card card-metric">
            <div className="tiny">Total Peserta</div>
            <div className="metric-val">{angka(totalPeserta)}</div>
          </div>
        </div>
      </section>

      {/* Form buat program */}
      {showForm && (
        <section>
          <div className="card">
            <h3 className="text-lg fw-600 mb-12">Buat Program Baru</h3>
            <div className="form-group">
              <label className="form-label">Nama Program</label>
              <input type="text" className="input" placeholder="Contoh: Program Ibu Hamil" />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="input" placeholder="Tujuan & aktivitas program..." style={{ minHeight: 80 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Penanggung Jawab (Kader)</label>
              <select className="input">
                <option>Pilih kader...</option>
                <option>Kader A</option>
                <option>Kader B</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Mulai</label>
              <input type="date" className="input" />
            </div>
            <div className="form-group row-end" style={{ gap: 8 }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button>Buat Program</Button>
            </div>
          </div>
        </section>
      )}

      {/* Daftar program */}
      <section>
        <div className="app-section-title">
          <h2>Daftar Program</h2>
        </div>
        <div className="card mt-12">
          {program.map((p) => (
            <Link href={`/program/${p.id}`} key={p.id} className="li li-hover" style={{ textDecoration: "none", color: "inherit" }}>
              <span
                className="li-ico"
                style={{
                  background: p.status === "berjalan" ? "var(--success-bg)" : p.status === "akan_datang" ? "var(--warning-bg)" : "var(--muted-bg)",
                  color: p.status === "berjalan" ? "var(--success)" : p.status === "akan_datang" ? "var(--warning)" : "var(--muted)",
                }}
              >
                <Icon name="flag" size={18} />
              </span>
              <div className="li-main">
                <strong>{p.nama}</strong>
                <span className="tiny">{p.deskripsi}</span>
                <span className="tiny">
                  {p.kader ? `PJ: ${p.kader.name}` : "PJ: belum ditentukan"} • Dimulai: {tanggal(p.mulai, "short")}
                </span>
              </div>
              <div className="row-end" style={{ gap: 8, alignItems: "center" }}>
                <div className="text-right">
                  <div className="tiny fw-600">{angka(p.peserta)}</div>
                  <div className="tiny">peserta</div>
                </div>
                <Badge tone={STATUS_TONE[p.status] || "primary"}>{LABEL_STATUS[p.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Statistik */}
      <section>
        <div className="app-section-title">
          <h2>Ringkasan Status</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          {[
            { status: "berjalan", label: "Berjalan", count: program.filter((p) => p.status === "berjalan").length },
            { status: "selesai", label: "Selesai", count: program.filter((p) => p.status === "selesai").length },
            { status: "akan_datang", label: "Akan datang", count: program.filter((p) => p.status === "akan_datang").length },
          ].map((s) => (
            <div className="card card-flat" key={s.status}>
              <div className="row-between">
                <span className="tiny fw-600">{s.label}</span>
                <strong>{s.count}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Program dikelola oleh kader & dimonitor oleh admin kelurahan.
      </p>
    </AppShell>
  );
}

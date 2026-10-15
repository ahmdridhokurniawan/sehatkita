"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Line from "@/components/charts/Line";
import { EmptyState } from "@/components/ui/Empty";
import { DASHBOARD_PRIBADI_DEMO, SERI_BB_DEMO, hariLalu } from "@/lib/demo";
import { tanggal, relatif, angka, desimal } from "@/lib/format";
import { LABEL_STATUS_RUJUKAN } from "@/lib/labels";

const HERO_CLS: Record<string, string> = { baik: "baik", waspada: "waspada", perlu_perhatian: "bahaya" };
const LABEL_STATUS: Record<string, string> = {
  baik: "Kondisi Baik",
  waspada: "Perlu Diwaspadai",
  perlu_perhatian: "Perlu Perhatian",
};

/** Warna badge kategori indikator (mengikuti heuristik prototype). */
function toneKategori(kategori = ""): "safe" | "warning" | "danger" {
  if (/berat|diabetes|obesitas|tinggi|berisiko|hipertensi derajat 2/i.test(kategori)) return "danger";
  if (/hipertensi|prediabetes|batas|gemuk|prehipertensi|derajat 1/i.test(kategori)) return "warning";
  return "safe";
}

export default function BerandaPage() {
  const router = useRouter();
  const d = DASHBOARD_PRIBADI_DEMO;
  const target = d.target;
  const reward = d.reward;
  const unread = d.next_notifications.filter((n) => !n.dibaca).length;

  // Visual progres BB (porting dari beranda.js)
  const bbNow = target.bb_saat_ini || 0;
  const bbTarget = target.bb_target_kg || 0;
  const bbAwal = bbNow + 8;
  const progBB =
    bbTarget && bbNow
      ? Math.max(4, Math.min(100, Math.round(((bbAwal - bbNow) / Math.max(1, bbAwal - bbTarget)) * 100)))
      : 0;

  return (
    <AppShell greet="Halo" unread={unread} onFab={() => router.push("/catatan-kesehatan")}>
      {/* Status kesehatan */}
      <section className={`health-hero ${HERO_CLS[d.status_kesehatan] || "baik"}`}>
        <span className="pill">
          <Icon name="heart-pulse" size={14} /> Status kesehatan Anda
        </span>
        <div className="row-between items-end mt-8">
          <div>
            <h2>{LABEL_STATUS[d.status_kesehatan] || "Kondisi"}</h2>
            <div className="sub mt-4">Diperbarui {relatif(d.indikator_terkini[0]?.tanggal)}</div>
          </div>
          <div className="center">
            <div className="score">{d.skor_risiko}</div>
            <div className="sub">skor risiko</div>
          </div>
        </div>
        <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
          <span className="badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "none" }}>
            <Icon name={d.perbandingan.bb_selisih <= 0 ? "trending-down" : "trending-up"} size={13} /> BB{" "}
            {d.perbandingan.bb_selisih <= 0 ? "turun" : "naik"} {Math.abs(d.perbandingan.bb_selisih)} kg /{" "}
            {d.perbandingan.periode}
          </span>
        </div>
      </section>

      {/* Indikator terkini */}
      <section>
        <div className="app-section-title">
          <h2>Indikator Terkini</h2>
          <Link href="/tren">Lihat semua</Link>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          {d.indikator_terkini.map((ind) => (
            <div className="metric" key={ind.nama}>
              <span className="metric-name">
                <Icon name="activity" size={14} /> {ind.nama}
              </span>
              <span className="metric-val">
                {ind.nilai} <small>{ind.satuan || ""}</small>
              </span>
              <div className="row-between">
                <Badge tone={toneKategori(ind.kategori)}>{ind.kategori}</Badge>
                <span className="tiny">{tanggal(ind.tanggal, "short")}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="tiny mt-8">
          <Icon name="info" size={12} /> Tanggal pengukuran tiap indikator dapat berbeda.
        </p>
      </section>

      {/* Insight */}
      <section>
        <div className="app-section-title">
          <h2>Insight Kesehatan</h2>
          <Link href="/insight">Selengkapnya</Link>
        </div>
        <div className="card card-flat mt-12" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="row items-start gap-10">
            <span className="text-danger">
              <Icon name="alert-triangle" size={20} />
            </span>
            <div>
              <strong className="text-sm">Tekanan darah tinggi berulang</strong>
              <p className="tiny mt-4">
                Tiga pengukuran terakhir menunjukkan sistol ≥ 140 mmHg. Segera periksakan diri ke fasilitas kesehatan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grafik perkembangan */}
      <section>
        <div className="app-section-title">
          <h2>Perkembangan</h2>
          <Link href="/tren">Detail grafik</Link>
        </div>
        <div className="card mt-12">
          <div className="row-between mb-12">
            <strong className="text-sm">Berat Badan</strong>
            <span className="tiny">kg</span>
          </div>
          <Line
            labels={SERI_BB_DEMO.map((p) => tanggal(p.tanggal, "short"))}
            series={[{ name: "Berat Badan", data: SERI_BB_DEMO.map((p) => p.nilai) }]}
            unit="kg"
            height={150}
          />
        </div>
      </section>

      {/* Target */}
      <section>
        <div className="app-section-title">
          <h2>Target Kesehatan</h2>
          <Link href="/profil">Atur target</Link>
        </div>
        <div className="card mt-12">
          <div className="row-between mb-8">
            <span className="text-sm fw-600">Berat badan</span>
            <span className="tiny">
              <b className="text-primary">{bbNow}</b> / {bbTarget} kg
            </span>
          </div>
          <div className="progress">
            <i style={{ width: `${progBB}%` }} />
          </div>
          <div className="row gap-16 mt-16" style={{ flexWrap: "wrap" }}>
            <div className="row gap-8">
              <span className="li-ico" style={{ width: 34, height: 34 }}>
                <Icon name="activity" size={16} />
              </span>
              <div>
                <div className="tiny">Aktivitas</div>
                <strong className="text-sm">{target.target_aktivitas_per_minggu}×/minggu</strong>
              </div>
            </div>
            <div className="row gap-8">
              <span className="li-ico" style={{ width: 34, height: 34 }}>
                <Icon name="droplet" size={16} />
              </span>
              <div>
                <div className="tiny">Air minum</div>
                <strong className="text-sm">{angka(target.target_air_ml)} ml</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jadwal skrining */}
      {d.jadwal_skrining_berikutnya ? (
        <section>
          <div className="app-section-title">
            <h2>Jadwal Skrining</h2>
          </div>
          <div className="card mt-12 row gap-12 items-center">
            <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
              <Icon name="calendar-check" size={20} />
            </span>
            <div className="flex-1">
              <strong className="text-sm">{tanggal(d.jadwal_skrining_berikutnya.tanggal, "day")}</strong>
              <div className="tiny">{d.jadwal_skrining_berikutnya.lokasi}</div>
            </div>
            <span className="badge badge-primary">
              <Icon name="clock" size={13} /> {relatif(d.jadwal_skrining_berikutnya.tanggal).replace("lalu", "")}
            </span>
          </div>
        </section>
      ) : null}

      {/* Rujukan aktif */}
      <section>
        <div className="app-section-title">
          <h2>Rujukan Aktif</h2>
          <Link href="/rujukan">Semua rujukan</Link>
        </div>
        {d.rujukan_aktif.length ? (
          d.rujukan_aktif.map((r) => (
            <div className="card card-flat mt-12 row gap-12 items-center" key={r.id}>
              <span className="li-ico">
                <Icon name="send" size={18} />
              </span>
              <div className="flex-1">
                <strong className="text-sm">{r.faskes}</strong>
                <div className="tiny">{r.alasan}</div>
              </div>
              <Badge tone={r.status === "baru" ? "primary" : "warning"}>{LABEL_STATUS_RUJUKAN[r.status]}</Badge>
            </div>
          ))
        ) : (
          <div className="card card-flat mt-12">
            <EmptyState title="Tidak ada rujukan aktif" desc="Rujukan akan muncul di sini bila diperlukan tindak lanjut." />
          </div>
        )}
      </section>

      {/* Tantangan & reward */}
      <section>
        <div className="app-section-title">
          <h2>Tantangan &amp; Reward</h2>
          <Link href="/program">Semua tantangan</Link>
        </div>
        <div className="card mt-12">
          <div className="row gap-10">
            <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Icon name="flame" size={18} />
            </span>
            <div>
              <strong className="text-sm">
                Level {reward.level} · {reward.level_nama}
              </strong>
              <div className="tiny">
                {angka(reward.exp)} EXP · peringkat #{reward.rank_kelurahan} kelurahan
              </div>
            </div>
          </div>
          <div className="progress sm mt-12">
            <i style={{ width: `${Math.min(100, (reward.exp % 200) / 2)}%` }} />
          </div>
          <div className="row gap-6 mt-12" style={{ flexWrap: "wrap" }}>
            {reward.badge.length ? (
              reward.badge.map((b) => (
                <span className="badge badge-primary" key={b}>
                  <Icon name="award" size={13} /> {b}
                </span>
              ))
            ) : (
              <span className="tiny">Belum ada badge</span>
            )}
          </div>
        </div>
      </section>

      {/* Notifikasi */}
      <section>
        <div className="app-section-title">
          <h2>Notifikasi Terbaru</h2>
          <Link href="/notifikasi">Semua</Link>
        </div>
        <div className="card mt-12">
          {d.next_notifications.length ? (
            d.next_notifications.map((n) => (
              <div className="li" key={n.id}>
                <span className="li-ico">
                  <Icon name="bell" size={18} />
                </span>
                <div className="li-main">
                  <strong>{n.judul}</strong>
                  <span>{n.pesan}</span>
                </div>
                <div className="li-side">
                  <span className="tiny">{relatif(n.dibuat_pada)}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Tidak ada notifikasi baru" />
          )}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="shield" size={13} /> SehatKita bukan alat diagnosis medis dan tidak menggantikan pemeriksaan tenaga
        kesehatan.
      </p>
    </AppShell>
  );
}

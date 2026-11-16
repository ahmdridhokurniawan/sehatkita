"use client";

import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";

export type LegalTopic = "privasi" | "syarat" | "medis" | "kontak";

type LegalItem = {
  id: LegalTopic;
  tabLabel: string;
  icon: "shield-check" | "file-text" | "heart-pulse" | "mail";
  title: string;
  lead: string;
  points: { label: string; text: string }[];
  note?: string;
};

const LEGAL_CONTENT: Record<LegalTopic, LegalItem> = {
  privasi: {
    id: "privasi",
    tabLabel: "Privasi",
    icon: "shield-check",
    title: "Kebijakan Privasi",
    lead: "Data pribadi dan catatan kesehatan Anda dijaga ketat dan hanya dipakai untuk membantu pemantauan kondisi tubuh.",
    points: [
      {
        label: "Data yang disimpan",
        text: "Nama, email, kelurahan domisili di Banjarbaru, serta catatan pemeriksaan seperti berat badan, tensi, gula darah, dan kolesterol.",
      },
      {
        label: "Kegunaan data",
        text: "Menampilkan riwayat dan analisis kondisi tubuh, membantu pendampingan kader Posbindu, serta tindak lanjut rujukan ke Puskesmas.",
      },
      {
        label: "Siapa yang bisa melihat",
        text: "Catatan pribadi hanya dapat dibuka oleh Anda dan petugas wilayah yang berwenang. Laporan wilayah hanya menampilkan statistik keseluruhan warga tanpa nama pribadi (minimal 5 peserta).",
      },
      {
        label: "Kendali penuh Anda",
        text: "Tidak pernah dijual untuk iklan. Anda bebas menghapus catatan yang salah ketik atau menarik persetujuan kapan saja di Setelan Privasi.",
      },
    ],
  },
  syarat: {
    id: "syarat",
    tabLabel: "Syarat & Ketentuan",
    icon: "file-text",
    title: "Syarat dan Ketentuan",
    lead: "Aturan dasar penggunaan aplikasi agar layanan tetap aman, jujur, dan bermanfaat bagi seluruh warga.",
    points: [
      {
        label: "Pendaftaran akun",
        text: "Gunakan nama, email aktif, dan kelurahan tempat tinggal yang benar. Jangan meminjamkan akun kepada orang lain agar catatan kesehatan tidak tertukar.",
      },
      {
        label: "Kejujuran data & kegiatan",
        text: "Isi angka pemeriksaan dan foto bukti tantangan sehat secara nyata agar kader dapat memeriksa dengan tepat.",
      },
      {
        label: "Hal yang dilarang",
        text: "Dilarang mengisi data palsu, mengakali poin tantangan, atau mencoba membuka data pengguna lain tanpa izin.",
      },
    ],
    note: "Pengelola berhak menonaktifkan akun yang terbukti melanggar ketentuan atau menyalahgunakan data warga.",
  },
  medis: {
    id: "medis",
    tabLabel: "Catatan Penting",
    icon: "heart-pulse",
    title: "Catatan Penting Penggunaan",
    lead: "SehatKita adalah alat bantu pantau kesehatan sehari-hari, bukan pengganti pemeriksaan dokter atau layanan darurat.",
    points: [
      {
        label: "Bukan diagnosis medis",
        text: "Angka kalkulator dan warna status dihitung sebagai gambaran awal saja, bukan resep atau keputusan dokter.",
      },
      {
        label: "Arti warna status",
        text: "Hijau berarti kondisi terjaga, kuning berarti perlu perhatian dan cek berkala, merah berarti sebaiknya segera periksa ke Puskesmas atau dokter.",
      },
      {
        label: "Segera ke dokter atau IGD",
        text: "Jika muncul nyeri dada, sesak napas mendadak, pusing berat berputar, lemas satu sisi tubuh, atau pingsan, segera pergi ke IGD atau Puskesmas terdekat.",
      },
    ],
    note: "Jika Anda sedang mengonsumsi obat rutin dari dokter, tetap patuhi anjuran dokter meski catatan harian mulai membaik.",
  },
  kontak: {
    id: "kontak",
    tabLabel: "Kontak Resmi",
    icon: "mail",
    title: "Kontak Resmi",
    lead: "Saluran bantuan resmi untuk kendala akun, perbaikan data kelurahan, atau informasi kegiatan Posbindu Banjarbaru.",
    points: [
      {
        label: "Email dukungan pengguna",
        text: "Kirim pertanyaan ke halo@sehatkita.id (layanan Senin–Jumat, 08.00–16.00 WITA; balasan maksimal 1–2 hari kerja).",
      },
      {
        label: "Kader Posbindu & Puskesmas",
        text: "Untuk jadwal cek kesehatan langsung atau tindak lanjut rujukan, silakan datangi Posbindu atau Puskesmas sesuai kelurahan Anda.",
      },
      {
        label: "Pengaduan dari dalam akun",
        text: "Pengguna yang sudah masuk akun dapat langsung mengirim laporan kendala melalui menu Pengaduan di dalam dashboard.",
      },
    ],
    note: "Bukan saluran gawat darurat medis. Pada keadaan darurat, langsung hubungi atau datangi IGD / Puskesmas terdekat.",
  },
};

const TOPIC_ORDER: LegalTopic[] = ["privasi", "syarat", "medis", "kontak"];

type LegalInfoModalProps = {
  topic: LegalTopic | null;
  onChangeTopic: (topic: LegalTopic) => void;
  onClose: () => void;
};

/** Kartu pop-up modern & editorial untuk Privasi, Syarat & Ketentuan, Batasan Medis, dan Kontak. */
export default function LegalInfoModal({ topic, onChangeTopic, onClose }: LegalInfoModalProps) {
  const item = topic ? LEGAL_CONTENT[topic] : null;

  return (
    <Modal
      open={topic !== null}
      onClose={onClose}
      size="legal"
      title={
        item ? (
          <div className="legal-modal-head">
            <span className="legal-modal-emblem" aria-hidden="true">
              <Icon name={item.icon} size={18} />
            </span>
            <div>
              <span className="legal-modal-title">{item.title}</span>
              <p className="legal-modal-sub">{item.lead}</p>
            </div>
          </div>
        ) : (
          "Informasi Layanan"
        )
      }
      footer={
        <div className="legal-modal-foot">
          <span className="tiny">SehatKita · Kota Banjarbaru</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Mengerti
          </button>
        </div>
      }
    >
      {item ? (
        <div className="legal-modal-wrap">
          <div className="legal-modal-tabs" role="tablist" aria-label="Pilih informasi layanan">
            {TOPIC_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={topic === id}
                className={`legal-modal-tab ${topic === id ? "active" : ""}`}
                onClick={() => onChangeTopic(id)}
              >
                {LEGAL_CONTENT[id].tabLabel}
              </button>
            ))}
          </div>

          <ol className="legal-modal-points" key={item.id}>
            {item.points.map((pt, idx) => (
              <li key={pt.label} className="legal-modal-point">
                <span className="legal-modal-num">{String(idx + 1).padStart(2, "0")}</span>
                <div className="legal-modal-pt-body">
                  <strong>{pt.label}</strong>
                  <span>{pt.text}</span>
                </div>
              </li>
            ))}
          </ol>

          {item.note ? (
            <div className="legal-modal-note">
              <Icon name={item.id === "medis" || item.id === "kontak" ? "alert-circle" : "info"} size={16} />
              <span>{item.note}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

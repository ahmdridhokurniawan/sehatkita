"use client";

import { useRef, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type UploadState = "idle" | "uploading" | "success" | "error";

const TEMPLATE_CSV = `tanggal,indikator,nilai,satuan,catatan
2026-10-19,Berat Badan,65,kg,Pengukuran pagi hari
2026-10-19,Tekanan Darah,120/80,mmHg,Normal
2026-10-18,Gula Darah Puasa,110,mg/dL,Sedikit tinggi
`;

export default function RekamMedisImportPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setError("");

    // Validasi file type
    const validTypes = ["text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!validTypes.includes(f.type)) {
      setError("Format file tidak didukung. Gunakan CSV, PDF, atau Excel.");
      return;
    }

    // Validasi ukuran (max 5MB)
    if (f.size > 5 * 1024 * 1024) {
      setError("Ukuran file terlalu besar (max 5 MB).");
      return;
    }

    setFile(f);

    // Preview data (simulasi parsing CSV)
    if (f.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").slice(1, 6); // Header + 5 rows
        const data = lines.map((line) => {
          const [tanggal, indikator, nilai, satuan, catatan] = line.split(",");
          return { tanggal, indikator, nilai, satuan, catatan: catatan?.trim() };
        });
        setPreview(data.filter((d) => d.tanggal));
      };
      reader.readAsText(f);
    }
  }

  function upload() {
    if (!file) return;

    setState("uploading");
    // Simulasi API upload
    setTimeout(() => {
      setState("success");
      setTimeout(() => {
        setState("idle");
        setFile(null);
        setPreview([]);
        if (fileInput.current) fileInput.current.value = "";
      }, 3000);
    }, 1500);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_rekam_medis.csv";
    a.click();
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Impor Rekam Medis</h1>
          <p className="tiny">Upload file catatan kesehatan lama kamu (CSV, PDF, atau Excel).</p>
        </div>
      </div>

      {/* Info box */}
      <div className="card card-flat mb-12" style={{ background: "var(--primary-050)", borderLeft: "4px solid var(--primary)" }}>
        <div className="row gap-10 items-start">
          <span style={{ color: "var(--primary)", minWidth: 18 }}>
            <Icon name="info" size={18} />
          </span>
          <div>
            <strong className="text-sm">Tips Impor</strong>
            <div className="tiny mt-4">
              Siapkan file dalam format CSV dengan kolom: tanggal, indikator, nilai, satuan, catatan. Download template di bawah.
            </div>
          </div>
        </div>
      </div>

      {state === "success" && (
        <div className="card card-flat mb-12" style={{ background: "var(--success-050)", borderLeft: "4px solid var(--success)" }}>
          <div className="row gap-10 items-center">
            <span style={{ color: "var(--success)" }}>
              <Icon name="check-circle" size={18} />
            </span>
            <div>
              <strong className="text-sm">Impor Berhasil</strong>
              <div className="tiny mt-4">{preview.length} data rekam medis berhasil ditambahkan.</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card card-flat mb-12" style={{ background: "var(--danger-050)", borderLeft: "4px solid var(--danger)" }}>
          <div className="row gap-10 items-center">
            <span style={{ color: "var(--danger)" }}>
              <Icon name="alert-circle" size={18} />
            </span>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div className="card mb-16">
        <div className="app-section-title mb-12">
          <h2>Upload File</h2>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".csv,.pdf,.xlsx"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div
          onClick={() => fileInput.current?.click()}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: 8,
            padding: 32,
            textAlign: "center",
            cursor: "pointer",
            background: file ? "var(--primary-050)" : "transparent",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!file) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            if (!file) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          }}
        >
          {file ? (
            <div>
              <span style={{ color: "var(--primary)", display: "block", marginBottom: 12 }}>
                <Icon name="file-check" size={32} />
              </span>
              <div className="text-sm fw-600">{file.name}</div>
              <div className="tiny mt-4">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          ) : (
            <div>
              <span style={{ color: "var(--muted-foreground)", display: "block", marginBottom: 12 }}>
                <Icon name="cloud-upload" size={32} />
              </span>
              <div className="text-sm fw-600">Pilih file atau drag & drop</div>
              <div className="tiny mt-4">Ukuran max 5 MB (CSV, PDF, Excel)</div>
            </div>
          )}
        </div>

        {file && preview.length > 0 && (
          <div className="mt-16">
            <div className="app-section-title mb-12">
              <h2>Preview Data ({preview.length} baris)</h2>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: 8, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Tanggal</th>
                    <th style={{ padding: 8, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Indikator</th>
                    <th style={{ padding: 8, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Nilai</th>
                    <th style={{ padding: 8, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Satuan</th>
                    <th style={{ padding: 8, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: 8, fontSize: 12 }}>{row.tanggal}</td>
                      <td style={{ padding: 8, fontSize: 12 }}>{row.indikator}</td>
                      <td style={{ padding: 8, fontSize: 12, fontWeight: 600 }}>{row.nilai}</td>
                      <td style={{ padding: 8, fontSize: 12 }}>{row.satuan}</td>
                      <td style={{ padding: 8, fontSize: 12, color: "var(--muted-foreground)" }}>{row.catatan || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Template & action */}
      <div className="card mb-16">
        <div className="app-section-title mb-12">
          <h2>Template File</h2>
        </div>

        <p className="text-sm mb-12">Download template CSV untuk memastikan format file kamu benar.</p>

        <Button type="button" variant="outline" icon="download" onClick={downloadTemplate}>
          Download Template CSV
        </Button>
      </div>

      {/* Action buttons */}
      <div className="row gap-8">
        {file && (
          <>
            <Button
              type="button"
              icon={state === "uploading" ? "loader" : "upload"}
              disabled={state === "uploading" || state === "success"}
              onClick={upload}
            >
              {state === "uploading" ? "Mengupload..." : "Impor Data"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreview([]);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              Batal
            </Button>
          </>
        )}
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Data akan disimpan ke rekam medis kamu secara aman.
      </p>
    </AppShell>
  );
}

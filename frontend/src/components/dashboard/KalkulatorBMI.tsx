import { useState } from "react";
import Icon from "@/components/ui/Icon";

function kategoriIMT(imt: number): { label: string; tone: string } {
  if (imt < 18.5) return { label: "Berat badan kurang", tone: "warning" };
  if (imt < 23) return { label: "Normal", tone: "safe" };
  if (imt < 25) return { label: "Berat badan berlebih", tone: "warning" };
  if (imt < 30) return { label: "Obesitas I", tone: "danger" };
  return { label: "Obesitas II", tone: "danger" };
}

export default function KalkulatorBMI() {
  const [tinggi, setTinggi] = useState("");
  const [berat, setBerat] = useState("");
  const [hasil, setHasil] = useState<{ imt: number; label: string; tone: string } | null>(null);

  function hitung() {
    const t = parseFloat(tinggi);
    const b = parseFloat(berat);
    if (!t || !b || t <= 0 || b <= 0) return;
    const meter = t / 100;
    const imt = b / (meter * meter);
    setHasil({ imt, ...kategoriIMT(imt) });
  }

  return (
    <div className="card mt-12">
      <div className="row-between mb-12">
        <strong className="text-sm">Kalkulator IMT</strong>
        <Icon name="activity" size={16} />
      </div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <label className="field">
          <span className="tiny">Tinggi badan (cm)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="cth: 165"
            value={tinggi}
            onChange={(e) => setTinggi(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="tiny">Berat badan (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="cth: 58"
            value={berat}
            onChange={(e) => setBerat(e.target.value)}
          />
        </label>
      </div>
      <button type="button" className="btn btn-primary btn-sm mt-12" onClick={hitung} disabled={!tinggi || !berat}>
        Hitung IMT
      </button>

      {hasil && (
        <div className={`alert alert-${hasil.tone} mt-12`}>
          <div className="row-between">
            <div>
              <strong>{hasil.label}</strong>
              <div className="tiny mt-4">
                IMT Anda {hasil.imt.toFixed(1)} kg/m²
              </div>
            </div>
            <div className="score" style={{ fontSize: 28 }}>
              {hasil.imt.toFixed(1)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

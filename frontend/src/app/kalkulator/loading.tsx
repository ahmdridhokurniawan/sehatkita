export default function KalkulatorLoading() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ padding: 24, display: "grid", gap: 12 }}>
        <div className="skeleton" style={{ width: 180, height: 24, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: "65%", height: 14, borderRadius: 6 }} />
      </div>
      <div className="grid col-2 gap-16">
        <div className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
          <div className="skeleton" style={{ width: 120, height: 18, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: "100%", height: 42, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: "100%", height: 42, borderRadius: 8 }} />
        </div>
        <div className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
          <div className="skeleton" style={{ width: 120, height: 18, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: "100%", height: 120, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}

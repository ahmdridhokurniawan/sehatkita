import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { BrandLockup } from "@/components/ui/BrandLogo";

export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
        background: "var(--bg)",
      }}
    >
      <div className="card" style={{ maxWidth: 460, width: "100%", textAlign: "center", padding: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <BrandLockup variant="sm" />
        </div>
        <span className="badge badge-primary">404 · Tidak Ditemukan</span>
        <h1 className="h2 mt-12">Halaman Tidak Ditemukan</h1>
        <p className="tiny mt-8">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="row justify-center gap-10 mt-20 wrap">
          <Link href="/dashboard" className="btn btn-primary">
            <Icon name="home" size={16} /> Ke Dashboard
          </Link>
          <Link href="/" className="btn btn-outline">
            <Icon name="arrow-left" size={16} /> Halaman Depan
          </Link>
        </div>
      </div>
    </main>
  );
}

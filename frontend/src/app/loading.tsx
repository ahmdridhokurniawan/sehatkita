"use client";

import { usePathname } from "next/navigation";

const RUTE_APP_PREFIX = [
  "/dashboard",
  "/rekam-medis",
  "/target-kesehatan",
  "/program",
  "/peringkat",
  "/insight",
  "/pengaduan",
  "/laporan",
  "/posbindu",
  "/rujukan",
  "/profil",
  "/setelan",
  "/admin",
  "/unauthorized",
];

function isAppRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return RUTE_APP_PREFIX.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function GlobalLoading() {
  const pathname = usePathname();

  if (isAppRoute(pathname) || pathname === "/kalkulator") {
    return <div aria-hidden="true" />;
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="gv-agenda" style={{ width: "min(460px, 100%)" }}>
        <div className="skeleton" style={{ width: "42%", height: 22 }} />
        <div className="skeleton" style={{ width: "86%", height: 14 }} />
        <div className="skeleton" style={{ width: "100%", height: 96, borderRadius: 14 }} />
        <div className="skeleton skel-pill" style={{ width: "46%", height: 36 }} />
      </div>
    </main>
  );
}

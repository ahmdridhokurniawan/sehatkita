"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <AppShell greet="Akses Ditolak">
      <section>
        <div className="card mt-12" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <Icon name="lock" size={48} />
          </div>
          <h2 className="text-lg fw-600 mb-8">Anda tidak memiliki akses ke halaman ini</h2>
          <p className="text-sm text-muted mb-16">
            Role Anda tidak memiliki izin untuk mengakses resource ini. Hubungi administrator jika merasa ini adalah kesalahan.
          </p>
          <Link href="/dashboard">
            <Button variant="primary">Kembali ke Dashboard</Button>
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

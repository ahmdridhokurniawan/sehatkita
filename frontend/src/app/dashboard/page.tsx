"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import AppShell from "@/components/app/AppShell";
import { EmptyState, Loading } from "@/components/ui/Empty";
import DashboardUser from "@/components/dashboard/DashboardUser";
import DashboardKader from "@/components/dashboard/DashboardKader";
import DashboardAdminKelurahan from "@/components/dashboard/DashboardAdminKelurahan";
import DashboardSuperAdmin from "@/components/dashboard/DashboardSuperAdmin";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    // Belum login / token tidak valid
    if (!user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Masih memuat data user — sidebar tetap tampil, loading skeleton di area konten AppShell
  if (loading || !user) {
    return (
      <AppShell noFab>
        <Loading variant="cards" text="Memuat dashboard…" />
      </AppShell>
    );
  }

  // Render dashboard sesuai role
  switch (user.role) {
    case "user":
      return <DashboardUser user={user} />;
    case "kader":
      return <DashboardKader user={user} />;
    case "admin_kelurahan":
      return <DashboardAdminKelurahan user={user} />;
    case "super_admin":
      return <DashboardSuperAdmin user={user} />;
    default:
      return <EmptyState title="Role tidak dikenali" desc={`Role: ${user.role}`} />;
  }
}

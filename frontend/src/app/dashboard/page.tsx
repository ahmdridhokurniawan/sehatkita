"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { EmptyState } from "@/components/ui/Empty";
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
      return;
    }
    // Belum menyetujui kebijakan data → wajib onboarding dulu
    if (!user.consent_at) {
      router.push("/onboarding");
    }
  }, [user, loading, router]);

  // Masih memuat data user
  if (loading || !user) {
    return <EmptyState title="Memuat..." desc="Mohon tunggu..." />;
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

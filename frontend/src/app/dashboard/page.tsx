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
  const user = useUser();

  useEffect(() => {
    // Redirect ke login jika belum login
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  // Belum ada user data
  if (!user) {
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

import { NextRequest, NextResponse } from "next/server";

// Role permission matrix — route → required role(s)
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["super_admin"],
  "/admin/pengguna": ["super_admin"],
  "/admin/faskes": ["super_admin"],
  "/admin/indikator": ["super_admin"],
  "/admin/log-audit": ["super_admin"],
  "/pengaturan": ["super_admin"],
  "/pengaturan/wilayah": ["super_admin"],
  "/pengaturan/faskes": ["super_admin"],
  "/pengaturan/pengguna": ["super_admin"],
  "/pengaturan/indikator": ["super_admin"],
  "/pengaturan/ambang": ["super_admin"],
  "/laporan": ["admin_kelurahan"],
  "/program": ["admin_kelurahan", "kader"], // kader bisa buat program
  "/rujukan/kelurahan": ["admin_kelurahan"],
  "/dashboard/kelurahan": ["admin_kelurahan"],
};

// Helper: extract role dari JWT token
function extractUserRole(request: NextRequest): string | null {
  // Try to get token dari cookie auth_token
  const token = request.cookies.get("auth_token")?.value;
  
  if (!token) {
    // Fallback: check demo role cookie
    return request.cookies.get("demo_user_role")?.value || null;
  }

  try {
    // Decode JWT: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (base64url → JSON)
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    // Extract role dari JWT
    return payload.role || payload.user_role || null;
  } catch (err) {
    console.error("JWT decode error:", err);
    return null;
  }
}

// Helper: check if route requires permission
function isProtectedRoute(pathname: string): { protected: boolean; requiredRoles?: string[] } {
  // Check exact match
  if (ROUTE_PERMISSIONS[pathname]) {
    return { protected: true, requiredRoles: ROUTE_PERMISSIONS[pathname] };
  }

  // Check prefix match (e.g., /pengaturan/*)
  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route + "/")) {
      return { protected: true, requiredRoles: roles };
    }
  }

  return { protected: false };
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip public routes & API routes
  if (pathname.startsWith("/_") || pathname.startsWith("/api") || pathname === "/login" || pathname === "/register" || pathname === "/") {
    return NextResponse.next();
  }

  // Check if route is protected
  const { protected: isProtected, requiredRoles } = isProtectedRoute(pathname);

  if (!isProtected) {
    // Route tidak perlu guard → lanjut
    return NextResponse.next();
  }

  // Route terlindungi — cek role
  const userRole = extractUserRole(request);

  if (!userRole) {
    // Tidak ada role (belum login) → redirect ke login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (requiredRoles && !requiredRoles.includes(userRole)) {
    // Role tidak cocok → redirect ke unauthorized
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match semua request path kecuali:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/actions/auth.action";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;

  // For all admin routes, require authentication
  if (!adminSession) {
    redirect("/admin-login");
  }

  // Verify admin session
  const result = await verifyAdminSession(adminSession);
  if (!result.success) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <span className="text-sm text-gray-600">
                Welcome, {result.admin?.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/admin/templates"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Templates
              </a>
              <a
                href="/admin/sessions"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sessions
              </a>
              <form action="/api/admin/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

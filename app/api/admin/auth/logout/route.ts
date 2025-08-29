import { NextRequest, NextResponse } from "next/server";
import { adminSignOut } from "@/lib/actions/auth.action";

export async function POST(request: NextRequest) {
  try {
    const adminSession = request.cookies.get("admin_session")?.value;

    if (adminSession) {
      await adminSignOut(adminSession);
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    // Clear admin session cookie
    response.cookies.delete("admin_session");

    return response;
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

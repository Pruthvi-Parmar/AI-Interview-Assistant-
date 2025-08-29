import { NextRequest, NextResponse } from "next/server";
import { getInterviewSessions } from "@/lib/actions/admin.action";
import { verifyAdminSession } from "@/lib/actions/auth.action";

// Middleware to verify admin session
async function verifyAdmin(request: NextRequest) {
  const adminSession = request.cookies.get("admin_session")?.value;
  
  if (!adminSession) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  const result = await verifyAdminSession(adminSession);
  if (!result.success) {
    return { success: false, error: "Invalid session", status: 401 };
  }

  return { success: true, admin: result.admin };
}

// GET /api/admin/sessions - List interview sessions
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || undefined;
    const templateId = searchParams.get("templateId") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const result = await getInterviewSessions(page, limit, {
      status,
      templateId,
      userId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

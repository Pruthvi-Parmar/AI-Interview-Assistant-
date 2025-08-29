import { NextRequest, NextResponse } from "next/server";
import { 
  createInterviewTemplate, 
  getInterviewTemplates,
  getInterviewTemplateById 
} from "@/lib/actions/admin.action";
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

// GET /api/admin/templates - List templates
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
    const industry = searchParams.get("industry") || undefined;
    const experienceLevel = searchParams.get("experienceLevel") || undefined;
    const isActive = searchParams.get("isActive") !== null 
      ? searchParams.get("isActive") === "true" 
      : undefined;

    const result = await getInterviewTemplates(page, limit, {
      industry,
      experienceLevel,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const templateData = await request.json();
    const result = await createInterviewTemplate(templateData, authResult.admin?.id || "");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

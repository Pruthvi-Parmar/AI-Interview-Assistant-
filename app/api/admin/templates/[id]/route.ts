import { NextRequest, NextResponse } from "next/server";
import { 
  getInterviewTemplateById,
  updateInterviewTemplate,
  deleteInterviewTemplate 
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

// GET /api/admin/templates/[id] - Get specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const result = await getInterviewTemplateById(params.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const updateData = await request.json();
    const result = await updateInterviewTemplate(params.id, updateData, authResult.admin?.id || "");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const result = await deleteInterviewTemplate(params.id, authResult.admin?.id || "");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

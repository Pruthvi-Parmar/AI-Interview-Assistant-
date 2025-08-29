import { NextRequest, NextResponse } from "next/server";
import { generateSystemPrompt } from "@/lib/actions/admin.action";
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

// POST /api/admin/templates/generate-prompt - Generate system prompt
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
    
    // Extract the configuration needed for system prompt generation
    const config = {
      industry: templateData.industry,
      experienceLevel: templateData.experienceLevel,
      questionCount: templateData.questionCount,
      questionTypes: templateData.questionTypes,
      difficultyLevel: templateData.difficultyLevel,
      duration: templateData.duration,
      customInstructions: templateData.customInstructions,
    };

    const systemPrompt = await generateSystemPrompt(config);

    return NextResponse.json(
      { success: true, data: systemPrompt },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating system prompt:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

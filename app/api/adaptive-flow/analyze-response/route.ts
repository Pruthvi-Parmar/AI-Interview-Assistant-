import { NextRequest, NextResponse } from "next/server";
import { analyzeUserResponse } from "@/lib/adaptive-flow";

export async function POST(request: NextRequest) {
  try {
    const { userResponse, currentQuestion, role, techStack, currentDifficulty } = await request.json();

    // Validate required parameters
    if (!userResponse || !currentQuestion || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Analyze the user response
    const analysis = await analyzeUserResponse(
      userResponse,
      currentQuestion,
      role,
      Array.isArray(techStack) ? techStack : [techStack] || [],
      currentDifficulty || 5
    );

    return NextResponse.json({
      success: true,
      analysis,
      message: "Response analyzed successfully"
    });

  } catch (error) {
    console.error("Error analyzing response:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze response" },
      { status: 500 }
    );
  }
}

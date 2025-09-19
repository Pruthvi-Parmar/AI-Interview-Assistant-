import { NextRequest, NextResponse } from "next/server";
import { initializeFlowState, generateInitialQuestions } from "@/lib/adaptive-flow";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, role, techStack, baseDifficulty, totalQuestions } = await request.json();

    // Validate required parameters
    if (!sessionId || !role || !techStack || baseDifficulty === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Initialize adaptive flow state
    const flowState = await initializeFlowState(
      sessionId,
      role,
      Array.isArray(techStack) ? techStack : [techStack],
      baseDifficulty,
      totalQuestions || 10
    );

    // Generate initial questions
    const initialQuestions = await generateInitialQuestions(
      role,
      Array.isArray(techStack) ? techStack : [techStack],
      baseDifficulty
    );

    return NextResponse.json({
      success: true,
      flowState,
      initialQuestions,
      message: "Adaptive flow initialized successfully"
    });

  } catch (error) {
    console.error("Error initializing adaptive flow:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize adaptive flow" },
      { status: 500 }
    );
  }
}

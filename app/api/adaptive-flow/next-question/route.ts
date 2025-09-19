import { NextRequest, NextResponse } from "next/server";
import { getFlowState, generateNextQuestion, shouldContinueInterview, generateInterviewSummary, QuestionGenerationRequest } from "@/lib/adaptive-flow";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userResponse, currentQuestion } = await request.json();

    // Validate required parameters
    if (!sessionId || !userResponse || !currentQuestion) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get current flow state
    const flowState = await getFlowState(sessionId);
    if (!flowState) {
      return NextResponse.json(
        { success: false, error: "Flow state not found. Please initialize first." },
        { status: 404 }
      );
    }

    // Check if interview should continue
    if (!(await shouldContinueInterview(flowState))) {
      return NextResponse.json({
        success: true,
        shouldContinue: false,
        message: "Interview completed",
        summary: await generateInterviewSummary(flowState)
      });
    }

    // Generate next question
    const questionRequest: QuestionGenerationRequest = {
      sessionId,
      userResponse,
      currentQuestion,
      flowState
    };

    const nextQuestion = await generateNextQuestion(questionRequest);

    // Get updated flow state
    const updatedFlowState = await getFlowState(sessionId);

    return NextResponse.json({
      success: true,
      nextQuestion,
      flowState: updatedFlowState,
      shouldContinue: true,
      questionsRemaining: (updatedFlowState?.totalQuestions || 0) - (updatedFlowState?.questionsAsked || 0)
    });

  } catch (error) {
    console.error("Error generating next question:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate next question" },
      { status: 500 }
    );
  }
}

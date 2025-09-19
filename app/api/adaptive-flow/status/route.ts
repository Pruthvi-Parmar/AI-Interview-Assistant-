import { NextRequest, NextResponse } from "next/server";
import { getFlowState, shouldContinueInterview, generateInterviewSummary } from "@/lib/adaptive-flow";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const flowState = await getFlowState(sessionId);

    if (!flowState) {
      return NextResponse.json(
        { success: false, error: "Flow state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      flowState,
      shouldContinue: await shouldContinueInterview(flowState),
      summary: await generateInterviewSummary(flowState),
    });

  } catch (error) {
    console.error("Error getting adaptive flow status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get flow status" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Clean up adaptive flow state (for testing/cleanup purposes)
    const { db } = await import("@/firebase/admin");
    await db.collection("adaptive_flow_states").doc(sessionId).delete();

    return NextResponse.json({
      success: true,
      message: "Adaptive flow state cleaned up successfully",
    });

  } catch (error) {
    console.error("Error cleaning up adaptive flow state:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cleanup flow state" },
      { status: 500 }
    );
  }
}

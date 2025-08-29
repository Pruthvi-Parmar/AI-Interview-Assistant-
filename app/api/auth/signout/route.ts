import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });

    // Clear session cookie
    response.cookies.delete("session", {
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error signing out:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign out" },
      { status: 500 }
    );
  }
}

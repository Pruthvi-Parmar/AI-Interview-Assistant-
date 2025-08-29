import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    console.log("Clearing sample interview data");

    // Get all sample interviews (from sample users and Frontend Developer interviews)
    const sampleInterviews = await db
      .collection("interviews")
      .where("userId", "in", ["sample-user-1", "sample-user-2", "sample-user-3"])
      .get();

    // Also get Frontend Developer interviews (our sample for real users)
    const frontendInterviews = await db
      .collection("interviews")
      .where("role", "==", "Frontend Developer")
      .where("type", "==", "Technical")
      .get();

    const allDocsToDelete = [...sampleInterviews.docs, ...frontendInterviews.docs];

    if (allDocsToDelete.length === 0) {
      console.log("No sample data to clear");
      const url = new URL("/", request.url);
      return NextResponse.redirect(url);
    }

    // Delete all sample interviews
    const deletePromises = allDocsToDelete.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    console.log(`Cleared ${allDocsToDelete.length} sample interviews`);

    // Redirect back to home page
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Error clearing sample data:", error);
    return Response.json({ error: "Failed to clear sample data" }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log("Creating sample interview for user:", userId);

    // Check if user already has a sample interview
    const existingInterviews = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .where("role", "==", "Frontend Developer")
      .limit(1)
      .get();

    if (!existingInterviews.empty) {
      console.log("Sample interview already exists for this user");
      const url = new URL("/", request.url);
      return NextResponse.redirect(url);
    }

    const sampleInterview = {
      role: "Frontend Developer",
      type: "Technical",
      level: "Junior",
      techstack: ["React", "TypeScript", "Next.js"],
      questions: [
        "What is React and how does it work?",
        "Explain the difference between props and state",
        "What are React hooks?"
      ],
      userId: userId,
      finalized: true,
      coverImage: "/covers/react.png",
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(sampleInterview);
    console.log("Sample interview created with ID:", docRef.id);

    // Redirect back to home page using NextResponse
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Error creating sample interview:", error);
    return Response.json({ error: "Failed to create sample interview" }, { status: 500 });
  }
} 
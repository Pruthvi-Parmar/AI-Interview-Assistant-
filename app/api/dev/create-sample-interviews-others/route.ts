import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    console.log("Creating sample interviews from other users");

    // Check if sample interviews from other users already exist
    const existingSampleInterviews = await db
      .collection("interviews")
      .where("userId", "in", ["sample-user-1", "sample-user-2", "sample-user-3"])
      .limit(1)
      .get();

    if (!existingSampleInterviews.empty) {
      console.log("Sample interviews from other users already exist");
      const url = new URL("/", request.url);
      return NextResponse.redirect(url);
    }

    const sampleInterviews = [
      {
        role: "Backend Developer",
        type: "Technical",
        level: "Senior",
        techstack: ["Node.js", "Express", "MongoDB"],
        questions: [
          "Explain RESTful APIs",
          "What is middleware in Express?",
          "How do you handle database connections?"
        ],
        userId: "sample-user-1",
        finalized: true,
        coverImage: "/covers/nodejs.png",
        createdAt: new Date().toISOString(),
      },
      {
        role: "Full Stack Developer",
        type: "Mixed",
        level: "Mid",
        techstack: ["React", "Node.js", "PostgreSQL"],
        questions: [
          "Describe your development process",
          "How do you handle state management?",
          "What's your approach to testing?"
        ],
        userId: "sample-user-2",
        finalized: true,
        coverImage: "/covers/fullstack.png",
        createdAt: new Date().toISOString(),
      },
      {
        role: "Data Scientist",
        type: "Technical",
        level: "Senior",
        techstack: ["Python", "TensorFlow", "Pandas"],
        questions: [
          "Explain machine learning algorithms",
          "How do you handle data preprocessing?",
          "What's your approach to model validation?"
        ],
        userId: "sample-user-3",
        finalized: true,
        coverImage: "/covers/python.png",
        createdAt: new Date().toISOString(),
      }
    ];

    const promises = sampleInterviews.map(interview => 
      db.collection("interviews").add(interview)
    );
    
    const results = await Promise.all(promises);
    console.log("Sample interviews created with IDs:", results.map(r => r.id));

    // Redirect back to home page using NextResponse
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Error creating sample interviews:", error);
    return Response.json({ error: "Failed to create sample interviews" }, { status: 500 });
  }
} 
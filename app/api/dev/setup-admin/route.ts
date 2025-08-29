import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { createAdminUser } from "@/lib/actions/auth.action";
import { createInterviewTemplate } from "@/lib/actions/admin.action";

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    console.log("Setting up admin user and sample templates...");

    // Create admin user
    const adminResult = await createAdminUser({
      email: "admin@interviewpro.com",
      name: "Admin User",
      role: "super_admin",
      password: "admin123456",
    });

    if (!adminResult.success || !adminResult.adminId) {
      return Response.json({ error: "Failed to create admin user" }, { status: 500 });
    }

    const adminId = adminResult.adminId;

    // Create sample templates
    const sampleTemplates = [
      {
        title: "Senior Frontend Developer",
        description: "Comprehensive interview for senior frontend developers covering React, TypeScript, and modern web development practices.",
        industry: "Software Engineering",
        experienceLevel: "Senior" as const,
        questionCount: 15,
        questionTypes: [
          { type: "technical" as const, percentage: 70 },
          { type: "behavioral" as const, percentage: 30 },
        ],
        difficultyLevel: "Hard" as const,
        duration: 45,
        customInstructions: "Focus on advanced React patterns, performance optimization, and system design. Ask about leadership experience and mentoring junior developers.",
        tags: ["React", "TypeScript", "Frontend", "Senior"],
        estimatedSalary: {
          min: 120000,
          max: 180000,
          currency: "USD",
        },
      },
      {
        title: "Junior Data Scientist",
        description: "Entry-level data science interview covering Python, statistics, and machine learning fundamentals.",
        industry: "Data Science",
        experienceLevel: "Junior" as const,
        questionCount: 12,
        questionTypes: [
          { type: "technical" as const, percentage: 60 },
          { type: "behavioral" as const, percentage: 40 },
        ],
        difficultyLevel: "Easy" as const,
        duration: 30,
        customInstructions: "Focus on Python programming, basic statistics, and machine learning concepts. Be encouraging and help candidates feel comfortable.",
        tags: ["Python", "Machine Learning", "Statistics", "Junior"],
        estimatedSalary: {
          min: 70000,
          max: 90000,
          currency: "USD",
        },
      },
      {
        title: "Product Manager",
        description: "Product management interview covering strategy, user research, and cross-functional collaboration.",
        industry: "Product Management",
        experienceLevel: "Mid-level" as const,
        questionCount: 10,
        questionTypes: [
          { type: "behavioral" as const, percentage: 50 },
          { type: "situational" as const, percentage: 30 },
          { type: "technical" as const, percentage: 20 },
        ],
        difficultyLevel: "Medium" as const,
        duration: 40,
        customInstructions: "Focus on product strategy, user-centered design, and stakeholder management. Ask about past product launches and metrics.",
        tags: ["Product Management", "Strategy", "User Research", "Mid-level"],
        estimatedSalary: {
          min: 90000,
          max: 130000,
          currency: "USD",
        },
      },
    ];

    const createdTemplates = [];

    for (const templateData of sampleTemplates) {
      const result = await createInterviewTemplate(templateData, adminId);
      if (result.success) {
        createdTemplates.push(result.data);
      }
    }

    console.log(`Created ${createdTemplates.length} sample templates`);

    return Response.json({
      success: true,
      message: "Admin setup completed successfully",
      adminId,
      templatesCreated: createdTemplates.length,
    }, { status: 200 });
  } catch (error) {
    console.error("Error setting up admin:", error);
    return Response.json({ error: "Failed to setup admin" }, { status: 500 });
  }
}

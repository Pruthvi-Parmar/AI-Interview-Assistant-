"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { z } from "zod";

// Validation schemas
const questionTypeSchema = z.object({
  type: z.enum(["technical", "behavioral", "situational", "mixed"]),
  percentage: z.number().min(0).max(100),
});

const createInterviewTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  industry: z.string().min(1, "Industry is required"),
  experienceLevel: z.enum(["Junior", "Mid-level", "Senior"]),
  questionCount: z.number().min(1).max(50),
  questionTypes: z.array(questionTypeSchema),
  difficultyLevel: z.enum(["Easy", "Medium", "Hard", "Custom"]),
  customDifficulty: z.number().min(1).max(10).optional(),
  duration: z.number().min(5).max(180),
  customInstructions: z.string(),
  tags: z.array(z.string()),
  estimatedSalary: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default("USD"),
  }),
});

// System Prompt Generation Service
export async function generateSystemPrompt(config: SystemPromptConfig): Promise<string> {
  const { industry, experienceLevel, questionCount, questionTypes, difficultyLevel, duration, customInstructions } = config;

  const questionTypeText = questionTypes
    .map(qt => `${qt.type} (${qt.percentage}%)`)
    .join(", ");

  const basePrompt = `You are an AI interviewer for a ${industry} position at ${experienceLevel} level.

Interview Parameters:
- Number of questions: ${questionCount}
- Question types: ${questionTypeText}
- Difficulty: ${difficultyLevel}
- Duration: ${duration} minutes

Instructions:
- ${customInstructions}
- Ask questions one at a time
- Provide follow-up questions based on candidate responses
- Maintain professional tone
- Adapt question difficulty based on candidate performance
- Keep responses concise and natural for voice interaction
- Provide constructive feedback when appropriate
- End the interview gracefully when time is up or all questions are covered`;

  return basePrompt;
}

// Interview Template Management
export async function createInterviewTemplate(
  templateData: CreateInterviewTemplateForm,
  adminId: string
): Promise<AdminApiResponse<InterviewTemplate>> {
  try {
    // Validate input
    const validatedData = createInterviewTemplateSchema.parse(templateData);

    // Generate system prompt
    const systemPrompt = await generateSystemPrompt({
      industry: validatedData.industry,
      experienceLevel: validatedData.experienceLevel,
      questionCount: validatedData.questionCount,
      questionTypes: validatedData.questionTypes,
      difficultyLevel: validatedData.difficultyLevel,
      duration: validatedData.duration,
      customInstructions: validatedData.customInstructions,
    });

    const template = {
      ...validatedData,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      systemPrompt,
    };

    const docRef = await db.collection("interview_templates").add(template);

    // Log admin action
    await db.collection("admin_actions").add({
      adminId,
      action: "create",
      resource: "interview_template",
      resourceId: docRef.id,
      details: `Created interview template: ${validatedData.title}`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: { id: docRef.id, ...template },
    };
  } catch (error) {
    console.error("Error creating interview template:", error);
    return {
      success: false,
      error: error instanceof z.ZodError ? error.errors[0].message : "Failed to create template",
    };
  }
}

export async function updateInterviewTemplate(
  templateId: string,
  updateData: UpdateInterviewTemplateForm,
  adminId: string
): Promise<AdminApiResponse<InterviewTemplate>> {
  try {
    // Check if template exists
    const templateDoc = await db.collection("interview_templates").doc(templateId).get();
    if (!templateDoc.exists) {
      return { success: false, error: "Template not found" };
    }

    const existingData = templateDoc.data() as InterviewTemplate;
    const mergedData: any = { ...existingData, ...updateData, updatedAt: new Date().toISOString() };

    // Regenerate system prompt if relevant fields changed
    if (updateData.industry || updateData.experienceLevel || updateData.questionCount || 
        updateData.questionTypes || updateData.difficultyLevel || updateData.duration || 
        updateData.customInstructions) {
      mergedData.systemPrompt = await generateSystemPrompt({
        industry: mergedData.industry,
        experienceLevel: mergedData.experienceLevel,
        questionCount: mergedData.questionCount,
        questionTypes: mergedData.questionTypes,
        difficultyLevel: mergedData.difficultyLevel,
        duration: mergedData.duration,
        customInstructions: mergedData.customInstructions,
      });
    }

    await db.collection("interview_templates").doc(templateId).update(mergedData);

    // Log admin action
    await db.collection("admin_actions").add({
      adminId,
      action: "update",
      resource: "interview_template",
      resourceId: templateId,
      details: `Updated interview template: ${mergedData.title}`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: { ...mergedData, id: templateId },
    };
  } catch (error) {
    console.error("Error updating interview template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteInterviewTemplate(
  templateId: string,
  adminId: string
): Promise<AdminApiResponse> {
  try {
    // Check if template exists
    const templateDoc = await db.collection("interview_templates").doc(templateId).get();
    if (!templateDoc.exists) {
      return { success: false, error: "Template not found" };
    }

    const templateData = templateDoc.data() as InterviewTemplate;

    // Check if template is being used in active sessions
    const activeSessions = await db
      .collection("interview_sessions")
      .where("templateId", "==", templateId)
      .where("status", "in", ["pending", "in_progress"])
      .limit(1)
      .get();

    if (!activeSessions.empty) {
      return { success: false, error: "Cannot delete template with active sessions" };
    }

    await db.collection("interview_templates").doc(templateId).delete();

    // Log admin action
    await db.collection("admin_actions").add({
      adminId,
      action: "delete",
      resource: "interview_template",
      resourceId: templateId,
      details: `Deleted interview template: ${templateData.title}`,
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: "Template deleted successfully" };
  } catch (error) {
    console.error("Error deleting interview template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

export async function getInterviewTemplates(
  page: number = 1,
  limit: number = 10,
  filters?: {
    industry?: string;
    experienceLevel?: string;
    isActive?: boolean;
  }
): Promise<AdminApiResponse<PaginatedResponse<InterviewTemplate>>> {
  try {
    let query: any = db.collection("interview_templates");

    // Apply filters
    if (filters?.industry) {
      query = query.where("industry", "==", filters.industry);
    }
    if (filters?.experienceLevel) {
      query = query.where("experienceLevel", "==", filters.experienceLevel);
    }
    if (filters?.isActive !== undefined) {
      query = query.where("isActive", "==", filters.isActive);
    }

    // Get total count
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    const snapshot = await query
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const templates = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as InterviewTemplate[];

    return {
      success: true,
      data: {
        data: templates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching interview templates:", error);
    return { success: false, error: "Failed to fetch templates" };
  }
}

export async function getInterviewTemplateById(
  templateId: string
): Promise<AdminApiResponse<InterviewTemplate>> {
  try {
    const templateDoc = await db.collection("interview_templates").doc(templateId).get();

    if (!templateDoc.exists) {
      return { success: false, error: "Template not found" };
    }

    const template = {
      id: templateDoc.id,
      ...templateDoc.data(),
    } as InterviewTemplate;

    return { success: true, data: template };
  } catch (error) {
    console.error("Error fetching interview template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

// Dashboard Statistics
export async function getDashboardStats(): Promise<AdminApiResponse<DashboardStats>> {
  try {
    // Get template statistics
    const templatesSnapshot = await db.collection("interview_templates").get();
    const totalTemplates = templatesSnapshot.size;
    const activeTemplates = templatesSnapshot.docs.filter(doc => doc.data().isActive).length;

    // Get session statistics
    const sessionsSnapshot = await db.collection("interview_sessions").get();
    const totalSessions = sessionsSnapshot.size;
    const completedSessions = sessionsSnapshot.docs.filter(doc => doc.data().status === "completed").length;

    // Calculate average session duration
    const completedSessionsData = sessionsSnapshot.docs
      .filter(doc => doc.data().status === "completed" && doc.data().duration)
      .map(doc => doc.data().duration);
    
    const averageSessionDuration = completedSessionsData.length > 0
      ? completedSessionsData.reduce((sum, duration) => sum + duration, 0) / completedSessionsData.length
      : 0;

    // Get popular industries
    const industryCounts: Record<string, number> = {};
    templatesSnapshot.docs.forEach(doc => {
      const industry = doc.data().industry;
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    });

    const popularIndustries = Object.entries(industryCounts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent admin activity
    const recentActivitySnapshot = await db
      .collection("admin_actions")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const recentActivity = recentActivitySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as AdminAction[];

    return {
      success: true,
      data: {
        totalTemplates,
        activeTemplates,
        totalSessions,
        completedSessions,
        averageSessionDuration,
        popularIndustries,
        recentActivity,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { success: false, error: "Failed to fetch dashboard statistics" };
  }
}

// Interview Session Management
export async function getInterviewSessions(
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    templateId?: string;
    userId?: string;
  }
): Promise<AdminApiResponse<PaginatedResponse<InterviewSession>>> {
  try {
    let query: any = db.collection("interview_sessions");

    // Apply filters
    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }
    if (filters?.templateId) {
      query = query.where("templateId", "==", filters.templateId);
    }
    if (filters?.userId) {
      query = query.where("userId", "==", filters.userId);
    }

    // Get total count
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    const snapshot = await query
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const sessions = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as InterviewSession[];

    return {
      success: true,
      data: {
        data: sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching interview sessions:", error);
    return { success: false, error: "Failed to fetch sessions" };
  }
}

// Generate questions for a template
export async function generateQuestionsForTemplate(
  templateId: string
): Promise<AdminApiResponse<string[]>> {
  try {
    const templateDoc = await db.collection("interview_templates").doc(templateId).get();
    if (!templateDoc.exists) {
      return { success: false, error: "Template not found" };
    }

    const template = templateDoc.data() as InterviewTemplate;
    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Generate ${template.questionCount} interview questions for a ${template.industry} position at ${template.experienceLevel} level.

Template Configuration:
- Question types: ${template.questionTypes.map((qt: any) => `${qt.type} (${qt.percentage}%)`).join(", ")}
- Difficulty level: ${template.difficultyLevel}
- Duration: ${template.duration} minutes
- Custom instructions: ${template.customInstructions}

Requirements:
- Questions should be appropriate for voice interaction (no special characters)
- Mix of question types according to the specified percentages
- Questions should match the difficulty level
- Return only the questions in JSON array format: ["Question 1", "Question 2", ...]`,
    });

    const parsedQuestions = JSON.parse(questions);
    return { success: true, data: parsedQuestions };
  } catch (error) {
    console.error("Error generating questions:", error);
    return { success: false, error: "Failed to generate questions" };
  }
}

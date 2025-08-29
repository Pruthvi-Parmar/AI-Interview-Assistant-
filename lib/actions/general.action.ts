"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  // Validate required parameters
  if (!interviewId) {
    console.error("createFeedback: interviewId is required");
    return { success: false, error: "Interview ID is required" };
  }

  if (!userId) {
    console.error("createFeedback: userId is required");
    return { success: false, error: "User ID is required" };
  }

  try {
    // Get interview details from interview_sessions collection
    const interviewDoc = await db.collection("interview_sessions").doc(interviewId).get();
    const interview = interviewDoc.exists ? interviewDoc.data() : null;

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    // Create enhanced prompt with interview context
    const enhancedPrompt = `
      You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
      
      Interview Context:
      ${interview ? `
      - Role: ${interview.role}
      - Level: ${interview.level}
      - Type: ${interview.type}
      - Tech Stack: ${interview.techstack?.join(", ") || "N/A"}
      ` : ""}
      
      Transcript:
      ${formattedTranscript}

      Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
      - **Communication Skills**: Clarity, articulation, structured responses.
      - **Technical Knowledge**: Understanding of key concepts for the role.
      - **Problem-Solving**: Ability to analyze problems and propose solutions.
      - **Cultural & Role Fit**: Alignment with company values and job role.
      - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
    `;

    const { text } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `${enhancedPrompt}

CRITICAL: Return ONLY valid JSON in this EXACT format (no markdown, no explanations):
{
  "totalScore": 75,
  "categoryScores": [
    {"name": "Communication Skills", "score": 80, "comment": "Clear communication"},
    {"name": "Technical Knowledge", "score": 70, "comment": "Good technical understanding"},
    {"name": "Problem Solving", "score": 75, "comment": "Solid problem-solving approach"},
    {"name": "Cultural Fit", "score": 80, "comment": "Good cultural alignment"},
    {"name": "Confidence and Clarity", "score": 70, "comment": "Confident responses"}
  ],
  "strengths": ["Strong communication", "Good technical knowledge"],
  "areasForImprovement": ["More specific examples", "Deeper technical details"],
  "finalAssessment": "Overall good performance with room for improvement in specific areas."
}`,
    });

    console.log("Raw feedback response:", text);

    let object;
    try {
      // Clean the response
      let cleanedText = text.trim();
      
      // Remove any markdown formatting
      if (cleanedText.includes("```json")) {
        cleanedText = cleanedText.replace(/```json\s*/, "").replace(/\s*```/, "");
      }
      if (cleanedText.includes("```")) {
        cleanedText = cleanedText.replace(/```\s*/, "").replace(/\s*```/, "");
      }
      
      // Parse JSON
      object = JSON.parse(cleanedText);
      
      // Validate the structure
      if (!object.totalScore || !object.categoryScores || !Array.isArray(object.categoryScores)) {
        throw new Error("Invalid feedback structure");
      }
      
      console.log("Successfully parsed feedback:", object);
    } catch (parseError) {
      console.error("Error parsing feedback JSON:", parseError);
      console.error("Raw text:", text);
      
      // Fallback feedback
      object = {
        totalScore: 65,
        categoryScores: [
          {"name": "Communication Skills", "score": 65, "comment": "Feedback generation encountered an error. Manual review recommended."},
          {"name": "Technical Knowledge", "score": 65, "comment": "Feedback generation encountered an error. Manual review recommended."},
          {"name": "Problem Solving", "score": 65, "comment": "Feedback generation encountered an error. Manual review recommended."},
          {"name": "Cultural Fit", "score": 65, "comment": "Feedback generation encountered an error. Manual review recommended."},
          {"name": "Confidence and Clarity", "score": 65, "comment": "Feedback generation encountered an error. Manual review recommended."}
        ],
        strengths: ["Interview completed"],
        areasForImprovement: ["Feedback generation needs manual review"],
        finalAssessment: "Technical issue occurred during feedback generation. Manual review of transcript recommended."
      };
    }

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      transcript: transcript, // Store the full transcript
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    // Update interview session status to completed
    const sessionQuery = await db
      .collection("interview_sessions")
      .where("interviewId", "==", interviewId)
      .limit(1)
      .get();

    if (!sessionQuery.empty) {
      const sessionDoc = sessionQuery.docs[0];
      await sessionDoc.ref.update({
        status: "completed",
        endTime: new Date().toISOString(),
        transcript: transcript,
        feedbackId: feedbackRef.id,
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  if (!interview.exists) {
    return null;
  }

  return {
    id: interview.id,
    ...interview.data(),
  } as Interview;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  // Use only a single where clause to avoid composite index requirement
  const interviews = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .get();

  const interviewData = interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];

  // Filter out current user's interviews and sort by createdAt in memory
  return interviewData
    .filter((interview) => interview.userId !== userId)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .get();

  const interviewData = interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];

  // Sort by createdAt in descending order (newest first) in memory
  return interviewData.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

// New function to get interview templates for users
export async function getActiveInterviewTemplates(): Promise<any[]> {
  try {
    // First get all templates, then filter in memory to avoid composite index requirement
    const templatesSnapshot = await db
      .collection("interview_templates")
      .get();

    const templates = templatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter active templates and sort by createdAt in memory
    return templates
      .filter(template => template.isActive === true)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
  } catch (error) {
    console.error("Error fetching interview templates:", error);
    return [];
  }
}

// New function to get interview session with transcript
export async function getInterviewSession(sessionId: string): Promise<any | null> {
  try {
    const sessionDoc = await db.collection("interview_sessions").doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return null;
    }

    return {
      id: sessionDoc.id,
      ...sessionDoc.data(),
    };
  } catch (error) {
    console.error("Error fetching interview session:", error);
    return null;
  }
}

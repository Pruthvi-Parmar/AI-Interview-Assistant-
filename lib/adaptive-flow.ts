"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";

export interface AdaptiveFlowState {
  sessionId: string;
  currentDifficulty: number; // 1-10 scale
  baseDifficulty: number; // Original admin-set difficulty
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  totalQuestions: number;
  questionsAsked: number;
  mvpKeywords: string[];
  role: string;
  techStack: string[];
  questionHistory: QuestionRecord[];
  lastAnalysis?: ResponseAnalysis;
}

export interface QuestionRecord {
  question: string;
  timestamp: string;
  difficulty: number;
  category: string;
}

export interface ResponseAnalysis {
  mvpKeywords: string[];
  confidence: number; // 1-10 scale
  technicalAccuracy: number; // 1-10 scale
  completeness: number; // 1-10 scale
  overallScore: number; // 1-10 scale
  suggestedNextDifficulty: number;
  reasoning: string;
}

export interface QuestionGenerationRequest {
  sessionId: string;
  userResponse: string;
  currentQuestion: string;
  flowState: AdaptiveFlowState;
}
/**
 * Initialize adaptive flow state for a new interview session
 */
export async function initializeFlowState(
  sessionId: string,
  role: string,
  techStack: string[],
  baseDifficulty: number,
  totalQuestions: number = 10
): Promise<AdaptiveFlowState> {
  const flowState: AdaptiveFlowState = {
    sessionId,
    currentDifficulty: baseDifficulty,
    baseDifficulty,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    totalQuestions,
    questionsAsked: 0,
    mvpKeywords: [],
    role,
    techStack,
    questionHistory: [],
  };

  // Store in database
  await db.collection("adaptive_flow_states").doc(sessionId).set(flowState);
  return flowState;
}

/**
 * Generate initial questions (2-3) to start the interview
 */
export async function generateInitialQuestions(
  role: string,
  techStack: string[],
  difficulty: number
): Promise<string[]> {
  const { text: questionsResponse } = await generateText({
    model: google("gemini-2.0-flash-001"),
    prompt: `Generate exactly 3 initial interview questions for a ${role} position.

Technical Stack: ${techStack.join(", ")}
Difficulty Level: ${difficulty}/10 (where 1 is beginner, 10 is expert)

Requirements:
- Start with 1 role-specific question
- Include 1 technical question related to the tech stack
- Add 1 general problem-solving question
- Questions should be appropriate for voice interaction (no special characters)
- Match the specified difficulty level
- Keep questions concise and clear
- Return ONLY a JSON array: ["Question 1", "Question 2", "Question 3"]

Generate the questions now:`,
  });

  try {
    const questions = JSON.parse(questionsResponse.trim());
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error("Error parsing initial questions:", error);
    return [
      `Tell me about your experience with ${role} positions.`,
      `How would you approach a challenging problem in ${techStack[0] || "your tech stack"}?`,
      "Describe a time when you had to learn a new technology quickly."
    ];
  }
}

/**
 * Extract MVP keywords and analyze user response
 */
export async function analyzeUserResponse(
  userResponse: string,
  currentQuestion: string,
  role: string,
  techStack: string[],
  currentDifficulty: number
): Promise<ResponseAnalysis> {
  const { text: analysisResponse } = await generateText({
    model: google("gemini-2.0-flash-001"),
    prompt: `Analyze this interview response for an ${role} position:

QUESTION: "${currentQuestion}"
USER RESPONSE: "${userResponse}"

Context:
- Role: ${role}
- Tech Stack: ${techStack.join(", ")}
- Current Difficulty: ${currentDifficulty}/10

Please analyze and return ONLY a JSON object with this exact structure:
{
  "mvpKeywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 7,
  "technicalAccuracy": 8,
  "completeness": 6,
  "overallScore": 7,
  "suggestedNextDifficulty": 8,
  "reasoning": "Brief explanation of the assessment"
}

Analysis criteria:
- mvpKeywords: Extract 3-5 key technical terms, skills, or concepts mentioned
- confidence: How confident the candidate sounds (1-10)
- technicalAccuracy: Correctness of technical information (1-10)
- completeness: How thoroughly they answered (1-10)
- overallScore: Overall quality of response (1-10)
- suggestedNextDifficulty: Recommended difficulty for next question (1-10)
- reasoning: 1-2 sentences explaining the scores

Analyze now:`,
  });

  try {
    const analysis = JSON.parse(analysisResponse.trim());
    return analysis;
  } catch (error) {
    console.error("Error parsing response analysis:", error);
    // Return default analysis
    return {
      mvpKeywords: [],
      confidence: 5,
      technicalAccuracy: 5,
      completeness: 5,
      overallScore: 5,
      suggestedNextDifficulty: currentDifficulty,
      reasoning: "Unable to analyze response properly"
    };
  }
}

/**
 * Update flow state based on response analysis
 */
export async function updateFlowState(
  flowState: AdaptiveFlowState,
  analysis: ResponseAnalysis
): Promise<AdaptiveFlowState> {
  const updatedState = { ...flowState };
  
  // Update MVP keywords (keep unique keywords)
  const newKeywords = analysis.mvpKeywords.filter(
    keyword => !updatedState.mvpKeywords.includes(keyword)
  );
  updatedState.mvpKeywords = [...updatedState.mvpKeywords, ...newKeywords];

  // Update consecutive counters based on overall score
  if (analysis.overallScore >= 7) {
    updatedState.consecutiveCorrect += 1;
    updatedState.consecutiveIncorrect = 0;
  } else if (analysis.overallScore <= 4) {
    updatedState.consecutiveIncorrect += 1;
    updatedState.consecutiveCorrect = 0;
  } else {
    // Neutral response, don't reset counters but don't increment either
  }

  // Adjust difficulty based on performance
  let newDifficulty = updatedState.currentDifficulty;

  // Increase difficulty if 3 consecutive correct answers
  if (updatedState.consecutiveCorrect >= 3) {
    newDifficulty = Math.min(10, updatedState.currentDifficulty + 1);
    updatedState.consecutiveCorrect = 0; // Reset counter
  }
  // Decrease difficulty if 2 consecutive poor answers
  else if (updatedState.consecutiveIncorrect >= 2) {
    newDifficulty = Math.max(1, updatedState.currentDifficulty - 1);
    updatedState.consecutiveIncorrect = 0; // Reset counter
  }
  // Also consider AI suggestion, but weight it less
  else {
    const suggestionWeight = 0.3;
    const currentWeight = 0.7;
    newDifficulty = Math.round(
      currentWeight * updatedState.currentDifficulty + 
      suggestionWeight * analysis.suggestedNextDifficulty
    );
  }

  // Keep difficulty within bounds and not too far from base
  const maxDeviation = 3;
  newDifficulty = Math.max(
    updatedState.baseDifficulty - maxDeviation,
    Math.min(updatedState.baseDifficulty + maxDeviation, newDifficulty)
  );

  updatedState.currentDifficulty = newDifficulty;
  updatedState.questionsAsked += 1;
  updatedState.lastAnalysis = analysis;

  return updatedState;
}

/**
 * Generate next question based on current state and user response
 */
export async function generateNextQuestion(
  request: QuestionGenerationRequest
): Promise<string> {
  const { userResponse, currentQuestion, flowState } = request;

  // Analyze the user's response first
  const analysis = await analyzeUserResponse(
    userResponse,
    currentQuestion,
    flowState.role,
    flowState.techStack,
    flowState.currentDifficulty
  );

  // Update flow state
  const updatedState = await updateFlowState(flowState, analysis);

  // Save updated state to database
  await db.collection("adaptive_flow_states").doc(flowState.sessionId).set(updatedState);

  // Generate next question based on updated state
  const { text: nextQuestion } = await generateText({
    model: google("gemini-2.0-flash-001"),
    prompt: `Generate the next interview question based on this context:

ROLE: ${updatedState.role}
TECH STACK: ${updatedState.techStack.join(", ")}
CURRENT DIFFICULTY: ${updatedState.currentDifficulty}/10
QUESTIONS ASKED: ${updatedState.questionsAsked}/${updatedState.totalQuestions}

PREVIOUS QUESTION: "${currentQuestion}"
USER'S RESPONSE: "${userResponse}"
MVP KEYWORDS EXTRACTED: ${updatedState.mvpKeywords.join(", ")}

RESPONSE ANALYSIS:
- Overall Score: ${analysis.overallScore}/10
- Technical Accuracy: ${analysis.technicalAccuracy}/10
- Confidence: ${analysis.confidence}/10
- Reasoning: ${analysis.reasoning}

QUESTION HISTORY:
${updatedState.questionHistory.map(q => `- ${q.question} (Difficulty: ${q.difficulty})`).join("\n")}

Requirements:
- Generate 1 follow-up question that builds on their response
- Maintain difficulty level ${updatedState.currentDifficulty}/10
- Incorporate some of the MVP keywords they mentioned: ${analysis.mvpKeywords.join(", ")}
- Stay relevant to ${updatedState.role} role and ${updatedState.techStack.join("/")} stack
- Keep it conversational and suitable for voice interaction
- Don't repeat previous questions
- If they struggled, ask a clarifying or slightly easier related question
- If they did well, dive deeper or ask about related concepts

Return ONLY the next question as plain text (no JSON, no quotes):`,
  });

  const question = nextQuestion.trim().replace(/^["']|["']$/g, '');
  
  // Add to question history
  updatedState.questionHistory.push({
    question,
    timestamp: new Date().toISOString(),
    difficulty: updatedState.currentDifficulty,
    category: "adaptive"
  });

  // Save final state
  await db.collection("adaptive_flow_states").doc(flowState.sessionId).set(updatedState);

  return question;
}

/**
 * Get current flow state from database
 */
export async function getFlowState(sessionId: string): Promise<AdaptiveFlowState | null> {
  try {
    const doc = await db.collection("adaptive_flow_states").doc(sessionId).get();
    return doc.exists ? doc.data() as AdaptiveFlowState : null;
  } catch (error) {
    console.error("Error getting flow state:", error);
    return null;
  }
}

/**
 * Check if interview should continue
 */
export async function shouldContinueInterview(flowState: AdaptiveFlowState): Promise<boolean> {
  return flowState.questionsAsked < flowState.totalQuestions;
}

/**
 * Generate interview summary for feedback
 */
export async function generateInterviewSummary(flowState: AdaptiveFlowState): Promise<string> {
  const difficultyProgression = flowState.questionHistory
    .map(q => q.difficulty)
    .join(" → ");

  return `Interview Summary:
- Questions Asked: ${flowState.questionsAsked}/${flowState.totalQuestions}
- Difficulty Progression: ${difficultyProgression}
- Final Difficulty: ${flowState.currentDifficulty}/10 (Started at ${flowState.baseDifficulty}/10)
- Key Topics Covered: ${flowState.mvpKeywords.join(", ")}
- Consecutive Correct Streak: ${flowState.consecutiveCorrect}`;
}

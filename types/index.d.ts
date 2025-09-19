export interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  name: string;
  email: string;
  id: string;
}

interface InterviewCardProps {
  interviewId?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
  templateId?: string;
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

// Admin Panel Types
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "super_admin";
  createdAt: string;
  lastLogin: string;
}

interface InterviewTemplate {
  id: string;
  title: string;
  description: string;
  industry: string;
  experienceLevel: "Junior" | "Mid-level" | "Senior";
  questionCount: number;
  questionTypes: QuestionType[];
  difficultyLevel: "Easy" | "Medium" | "Hard" | "Custom";
  customDifficulty?: number; // 1-10 scale for custom difficulty
  duration: number; // in minutes
  customInstructions: string;
  isActive: boolean;
  createdBy: string; // admin user ID
  createdAt: string;
  updatedAt: string;
  tags: string[];
  estimatedSalary: {
    min: number;
    max: number;
    currency: string;
  };
}

interface QuestionType {
  type: "technical" | "behavioral" | "situational" | "mixed";
  percentage: number; // percentage of questions of this type
}

interface InterviewSession {
  id: string;
  templateId: string;
  userId: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  startTime?: string;
  endTime?: string;
  duration: number;
  questions: string[];
  transcript: TranscriptEntry[];
  feedback?: Feedback;
  createdAt: string;
  updatedAt: string;
}

interface TranscriptEntry {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

interface SystemPromptConfig {
  industry: string;
  experienceLevel: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficultyLevel: string;
  duration: number;
  customInstructions: string;
}

interface AdminAction {
  id: string;
  adminId: string;
  action: "create" | "update" | "delete" | "login" | "logout";
  resource: "interview_template" | "admin_user" | "interview_session";
  resourceId?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

// Admin Panel Form Types
interface CreateInterviewTemplateForm {
  title: string;
  description: string;
  industry: string;
  experienceLevel: "Junior" | "Mid-level" | "Senior";
  questionCount: number;
  questionTypes: QuestionType[];
  difficultyLevel: "Easy" | "Medium" | "Hard" | "Custom";
  customDifficulty?: number;
  duration: number;
  customInstructions: string;
  tags: string[];
  estimatedSalary: {
    min: number;
    max: number;
    currency: string;
  };
}

interface UpdateInterviewTemplateForm extends Partial<CreateInterviewTemplateForm> {
  id: string;
  isActive?: boolean;
}

// API Response Types
interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard Statistics
interface DashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  totalSessions: number;
  completedSessions: number;
  averageSessionDuration: number;
  popularIndustries: Array<{
    industry: string;
    count: number;
  }>;
  recentActivity: AdminAction[];
}

// Adaptive Flow Types
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

interface QuestionGenerationRequest {
  sessionId: string;
  userResponse: string;
  currentQuestion: string;
  flowState: AdaptiveFlowState;
}

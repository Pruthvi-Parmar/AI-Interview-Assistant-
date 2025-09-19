"use client";

import { AdaptiveFlowState } from "@/types/index";

export interface AdaptiveVapiConfig {
  sessionId: string;
  useAdaptiveFlow: boolean;
  currentQuestion?: string;
  questionIndex: number;
  adaptiveFlowState?: AdaptiveFlowState;
}

export class AdaptiveVapiHandler {
  private config: AdaptiveVapiConfig;
  private pendingUserResponse: string = "";
  private isProcessingAdaptiveFlow: boolean = false;

  constructor(config: AdaptiveVapiConfig) {
    this.config = config;
  }

  /**
   * Handle VAPI messages and process adaptive flow
   */
  async handleMessage(message: any, onNextQuestion?: (question: string) => void): Promise<void> {
    // Only process if adaptive flow is enabled
    if (!this.config.useAdaptiveFlow) {
      return;
    }

    // Handle final transcripts from user
    if (message.type === "transcript" && 
        message.transcriptType === "final" && 
        message.role === "user" &&
        !this.isProcessingAdaptiveFlow) {
      
      this.pendingUserResponse = message.transcript;
      console.log("🎯 Adaptive Flow: User response received:", this.pendingUserResponse);
      
      // Process adaptive flow after user completes their response
      await this.processAdaptiveFlow(onNextQuestion);
    }

    // Handle AI speech end - this indicates AI finished asking a question
    if (message.type === "speech-end" && message.role === "assistant") {
      console.log("🤖 AI finished speaking, ready for user response");
      this.isProcessingAdaptiveFlow = false;
    }
  }

  /**
   * Process adaptive flow by calling the next-question API
   */
  private async processAdaptiveFlow(onNextQuestion?: (question: string) => void): Promise<void> {
    if (this.isProcessingAdaptiveFlow || !this.pendingUserResponse || !this.config.currentQuestion) {
      return;
    }

    this.isProcessingAdaptiveFlow = true;

    try {
      console.log("🔄 Processing adaptive flow...");
      
      const response = await fetch("/api/adaptive-flow/next-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.config.sessionId,
          userResponse: this.pendingUserResponse,
          currentQuestion: this.config.currentQuestion,
        }),
      });

      const result = await response.json();
      console.log("📝 Adaptive flow response:", result);

      if (result.success && result.shouldContinue) {
        // Update current question and flow state
        this.config.currentQuestion = result.nextQuestion;
        this.config.adaptiveFlowState = result.flowState;
        this.config.questionIndex += 1;

        console.log(`✅ Next adaptive question (${this.config.questionIndex}): ${result.nextQuestion}`);
        
        // Notify the component about the new question
        if (onNextQuestion) {
          onNextQuestion(result.nextQuestion);
        }

        // Clear the pending response
        this.pendingUserResponse = "";
      } else if (!result.shouldContinue) {
        console.log("🎉 Adaptive interview completed!");
        console.log("📊 Interview summary:", result.summary);
        
        // Notify about completion
        if (onNextQuestion) {
          onNextQuestion("Thank you for completing the interview! Your responses have been analyzed and feedback will be generated shortly.");
        }
      } else {
        console.error("❌ Failed to get next question:", result.error);
      }
    } catch (error) {
      console.error("💥 Error processing adaptive flow:", error);
    } finally {
      this.isProcessingAdaptiveFlow = false;
    }
  }

  /**
   * Update the current question (called when AI asks a new question)
   */
  updateCurrentQuestion(question: string): void {
    this.config.currentQuestion = question;
    console.log("📝 Current question updated:", question);
  }

  /**
   * Get current adaptive flow state
   */
  getFlowState(): AdaptiveFlowState | undefined {
    return this.config.adaptiveFlowState;
  }

  /**
   * Check if adaptive flow is active
   */
  isAdaptiveFlowActive(): boolean {
    return this.config.useAdaptiveFlow;
  }

  /**
   * Get current question index
   */
  getCurrentQuestionIndex(): number {
    return this.config.questionIndex;
  }

  /**
   * Get questions remaining (if flow state is available)
   */
  getQuestionsRemaining(): number {
    if (!this.config.adaptiveFlowState) return 0;
    return this.config.adaptiveFlowState.totalQuestions - this.config.adaptiveFlowState.questionsAsked;
  }

  /**
   * Get current difficulty level
   */
  getCurrentDifficulty(): number {
    return this.config.adaptiveFlowState?.currentDifficulty || 5;
  }

  /**
   * Get MVP keywords extracted so far
   */
  getMVPKeywords(): string[] {
    return this.config.adaptiveFlowState?.mvpKeywords || [];
  }
}

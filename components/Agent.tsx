"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";
import { 
  InterruptionHandler, 
  createInterruptionAwareMessageHandler,
  createOptimizedAssistant 
} from "@/lib/interruption-handler";
import { AdaptiveVapiHandler, AdaptiveVapiConfig } from "@/lib/adaptive-vapi-handler";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  templateId,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [interruptionCount, setInterruptionCount] = useState(0);
  const [speechLatency, setSpeechLatency] = useState<number>(0);
  const [generatedInterviewId, setGeneratedInterviewId] = useState<string | null>(null);
  
  // Adaptive flow state
  const [adaptiveHandler, setAdaptiveHandler] = useState<AdaptiveVapiHandler | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [useAdaptiveFlow, setUseAdaptiveFlow] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Initialize interruption handler
  const [interruptionHandler] = useState(() => new InterruptionHandler({
    enableLogging: true,
    enableMetrics: true,
    maxInterruptionDelay: 150, // Target: under 150ms for ultra-responsive interruption
  }));

  useEffect(() => {
    let speechStartTime: number | null = null;

    const onCallStart = () => {
      console.log("🎯 Call started - Interruption handling active");
      setCallStatus(CallStatus.ACTIVE);
      setIsListening(true);
    };

    const onCallEnd = () => {
      console.log("📞 Call ended");
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
      setIsListening(false);
      setIsUserSpeaking(false);
    };

    const onMessage = (message: Message) => {
      console.log("📨 Message received:", message.type, message);
      
      // Handle adaptive flow messages first
      if (adaptiveHandler) {
        adaptiveHandler.handleMessage(message, (nextQuestion: string) => {
          console.log("🔄 Adaptive flow generated next question:", nextQuestion);
          setCurrentQuestion(nextQuestion);
          setQuestionIndex(prev => prev + 1);
        });
      }
      
      // Handle transcript messages
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
        
        // Track user speech patterns
        if (message.role === "user") {
          setIsUserSpeaking(false);
          console.log("✅ User finished speaking:", message.transcript);
        }
        
        // Update adaptive handler with AI questions
        if (message.role === "assistant" && adaptiveHandler) {
          adaptiveHandler.updateCurrentQuestion(message.transcript);
          setCurrentQuestion(message.transcript);
        }
      }
      
      // Handle partial transcripts for real-time interruption detection
      if (message.type === "transcript" && message.transcriptType === "partial" && message.role === "user") {
        // Detect user starting to speak (partial transcript)
        if (!isUserSpeaking && message.transcript.trim().length > 0) {
          console.log("🎤 User started speaking (partial):", message.transcript);
          handleUserInterruption();
        }
      }
      
      // Use the enhanced interruption handler
      const interruptionAwareHandler = createInterruptionAwareMessageHandler(
        interruptionHandler,
        () => {
          console.log("🚨 Interruption detected by handler!");
          handleUserInterruption();
          setInterruptionCount(prev => prev + 1);
        },
        () => {
          console.log("🤖 AI speech start detected by handler");
        },
        () => {
          console.log("🤖 AI speech end detected by handler");
        }
      );
      
      // Process message through interruption handler
      interruptionAwareHandler(message);
    };

    const onSpeechStart = () => {
      speechStartTime = Date.now();
      console.log("🤖 AI started speaking");
      setIsSpeaking(true);
      setIsListening(false); // AI is speaking, not listening
    };

    const onSpeechEnd = () => {
      if (speechStartTime) {
        const latency = Date.now() - speechStartTime;
        setSpeechLatency(latency);
        console.log(`🤖 AI finished speaking (${latency}ms)`);
      }
      setIsSpeaking(false);
      setIsListening(true); // Ready to listen again
    };

    const handleUserInterruption = () => {
      if (isSpeaking) {
        console.log("🛑 INTERRUPTION: Stopping AI speech immediately");
        
        // Immediately update UI state
        setIsSpeaking(false);
        setIsUserSpeaking(true);
        setIsListening(true);
        
        // Cancel any ongoing TTS if possible
        try {
          // VAPI handles TTS cancellation internally when user speaks
          // But we can send a message to ensure it stops
          vapi.send({
            type: "add-message",
            message: {
              role: "system",
              content: "User is speaking - stop current response immediately"
            }
          });
        } catch (error) {
          console.warn("Could not send interruption message:", error);
        }
      }
    };

    const onError = (error: any) => {
      console.error("❌ VAPI Error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Handle specific error types
      if (error?.message?.includes("Meeting has ended") || error?.message?.includes("Meeting ended in error")) {
        console.log("🔄 Meeting connection error - attempting graceful recovery");
        
        // Clean up state
        setCallStatus(CallStatus.FINISHED);
        setIsSpeaking(false);
        setIsListening(false);
        setIsUserSpeaking(false);
        
        // Try to clean up VAPI connection
        try {
          vapi.stop();
        } catch (stopError) {
          console.warn("Could not stop VAPI cleanly:", stopError);
        }
        
        return;
      }
      
      // Handle other errors
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
      setIsListening(false);
      setIsUserSpeaking(false);
    };

    // Enhanced event listeners for better interruption handling
    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, [isSpeaking, isUserSpeaking]);

  // Cleanup effect for component unmounting
  useEffect(() => {
    return () => {
      console.log("🧹 Agent component unmounting - cleaning up VAPI connection");
      try {
        if (callStatus === CallStatus.ACTIVE) {
          vapi.stop();
        }
      } catch (error) {
        console.warn("Could not clean up VAPI on unmount:", error);
      }
    };
  }, [callStatus]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback");

      // Use generated interview ID for template-based interviews, otherwise use the prop
      const currentInterviewId = type === "generate" ? generatedInterviewId : interviewId;
      
      console.log("Debug feedback generation:", {
        type,
        generatedInterviewId,
        interviewId,
        currentInterviewId,
        userId,
        messagesLength: messages.length
      });

      if (!currentInterviewId) {
        console.error("No interview ID available for feedback generation");
        router.push("/");
        return;
      }

      if (!userId) {
        console.error("No user ID available for feedback generation");
        router.push("/");
        return;
      }

      const { success, feedbackId: id } = await createFeedback({
        interviewId: currentInterviewId,
        userId: userId,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${currentInterviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        // For template-based interviews, generate feedback
        handleGenerateFeedback(messages);
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, generatedInterviewId, router, type, userId]);

  const handleCall = async () => {
    console.log("🎯 Starting VAPI call...");
    setCallStatus(CallStatus.CONNECTING);
    
    // Ensure any previous connection is cleaned up
    try {
      if (vapi) {
        await vapi.stop();
        console.log("🧹 Cleaned up any existing VAPI connection");
      }
    } catch (cleanupError) {
      console.warn("Could not clean up existing connection:", cleanupError);
    }

    // Check if VAPI token is available
    if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
      console.error("NEXT_PUBLIC_VAPI_WEB_TOKEN is not set");
      setCallStatus(CallStatus.INACTIVE);
      return;
    }

    try {
      console.log("VAPI Token:", process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ? "Set" : "Not set");
      console.log("Template ID:", templateId);
      
      if (type === "generate") {
        // Create interview session using template
        console.log("Creating interview session with template:", templateId);
        
        const response = await fetch("/api/vapi/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId: templateId,
            userid: userId,
            type: "generate",
            useAdaptiveFlow: true, // Enable adaptive flow for new interviews
          }),
        });

        const result = await response.json();
        console.log("Generate API response:", result);

        if (!result.success) {
          console.error("Failed to create interview session:", result.error);
          setCallStatus(CallStatus.INACTIVE);
          return;
        }

        // Store the interview ID for feedback generation
        const interviewId = result.interviewId;
        setGeneratedInterviewId(interviewId);
        
        // Initialize adaptive flow if enabled
        if (result.adaptiveFlow && result.sessionId) {
          console.log("🎯 Initializing adaptive flow for session:", result.sessionId);
          setUseAdaptiveFlow(true);
          setSessionId(result.sessionId);
          
          const adaptiveConfig: AdaptiveVapiConfig = {
            sessionId: result.sessionId,
            useAdaptiveFlow: true,
            currentQuestion: result.questions?.[0] || "",
            questionIndex: 0,
            adaptiveFlowState: result.adaptiveFlowState,
          };
          
          const handler = new AdaptiveVapiHandler(adaptiveConfig);
          setAdaptiveHandler(handler);
          setCurrentQuestion(result.questions?.[0] || "");
          
          console.log("✅ Adaptive flow initialized");
        }
        
        // Use the interviewer template with custom variables for template-based interviews
        console.log("Starting VAPI call with template-based interviewer for interview ID:", interviewId);
        console.log("System prompt:", result.systemPrompt);
        
        // Format questions for the interviewer
        const formattedQuestions = result.questions
          ? result.questions.map((q: string, index: number) => `${index + 1}. ${q}`).join("\n")
          : "";

        // Create enhanced system prompt with template data
        let enhancedSystemPrompt;
        
        if (result.adaptiveFlow) {
          // Use adaptive flow system prompt (already configured in the API)
          enhancedSystemPrompt = result.systemPrompt;
        } else {
          // Use traditional system prompt with all questions
          enhancedSystemPrompt = `${result.systemPrompt}

INTERVIEW QUESTIONS TO ASK:
${formattedQuestions}

🚨 CRITICAL VOICE INTERACTION RULES - FOLLOW EXACTLY:
- STOP SPEAKING IMMEDIATELY when user starts talking
- Keep ALL responses ULTRA SHORT (max 10-15 words)
- Use ONLY simple, direct language
- Ask ONE question, then STOP and WAIT
- Never give explanations or context - just ask the question
- If interrupted, say "Go ahead" or "I'm listening" immediately
- No pleasantries, no "that's interesting" - just next question
- Be like a speed interviewer - quick, direct, efficient

RESPONSE EXAMPLES:
✅ "Tell me about your React experience."
✅ "Any specific challenges?"
✅ "Next question - describe your debugging process."
❌ "That's really interesting, can you elaborate more on that particular aspect?"
❌ "Thank you for sharing that detailed response about your experience..."

INTERRUPTION RESPONSES:
- User interrupts → "Go ahead"
- User pauses → Ask next question immediately
- Keep it FAST and SNAPPY`;
        }

        // Use enhanced interviewer configuration with interruption optimizations
        console.log("🚀 Starting interview with interruption-optimized configuration");
        
        // Add connection timeout to prevent hanging
        const connectionTimeout = setTimeout(() => {
          console.warn("⏰ VAPI connection timeout - stopping attempt");
          setCallStatus(CallStatus.INACTIVE);
          try {
            vapi.stop();
          } catch (e) {
            console.warn("Could not stop timed out connection:", e);
          }
        }, 30000); // 30 second timeout
        
        try {
          await vapi.start(interviewer, {
            variableValues: {
              questions: enhancedSystemPrompt,
            },
          });
          
          // Clear timeout if connection succeeds
          clearTimeout(connectionTimeout);
          console.log("✅ VAPI connection established successfully");
          
        } catch (startError) {
          clearTimeout(connectionTimeout);
          console.error("❌ VAPI start failed:", startError);
          throw startError;
        }
      } else {
        let formattedQuestions = "";
        if (questions) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\n");
        }

        console.log("🚀 Starting interview with standard configuration");
        
        // Add connection timeout for fallback case too
        const fallbackTimeout = setTimeout(() => {
          console.warn("⏰ VAPI fallback connection timeout - stopping attempt");
          setCallStatus(CallStatus.INACTIVE);
          try {
            vapi.stop();
          } catch (e) {
            console.warn("Could not stop timed out fallback connection:", e);
          }
        }, 30000); // 30 second timeout
        
        try {
          await vapi.start(interviewer, {
            variableValues: {
              questions: formattedQuestions,
            },
          });
          
          // Clear timeout if connection succeeds
          clearTimeout(fallbackTimeout);
          console.log("✅ VAPI fallback connection established successfully");
          
        } catch (fallbackError) {
          clearTimeout(fallbackTimeout);
          console.error("❌ VAPI fallback start failed:", fallbackError);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error("Error starting VAPI call:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error
      });
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = async () => {
    console.log("🔌 Disconnecting VAPI call...");
    
    try {
      // Update UI state immediately
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
      setIsListening(false);
      setIsUserSpeaking(false);
      
      // Stop VAPI connection gracefully
      await vapi.stop();
      
      console.log("✅ VAPI call disconnected successfully");
    } catch (error) {
      console.error("❌ Error during disconnect:", error);
      // Force state update even if disconnect fails
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
      setIsListening(false);
      setIsUserSpeaking(false);
    }
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className={cn(
                "object-cover transition-all duration-200",
                isSpeaking && "ring-2 ring-red-500 ring-opacity-75",
                isUserSpeaking && "opacity-50"
              )}
            />
            {isSpeaking && <span className="animate-speak" />}
            {isUserSpeaking && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse flex items-center justify-center">
                <span className="text-white text-xs">🎤</span>
              </span>
            )}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {/* Interruption Performance Monitor */}
      {callStatus === "ACTIVE" && (
        <div className="bg-gray-50 p-4 rounded-lg border text-sm mx-4 mb-4">
          <h4 className="font-semibold mb-2 text-gray-700 flex items-center">
            🎯 Real-time Interruption Monitor
            <span className={`ml-2 w-2 h-2 rounded-full ${isUserSpeaking ? 'bg-blue-500 animate-pulse' : isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-600">Interruptions:</span>
              <span className="ml-2 font-semibold text-blue-600">{interruptionCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Response Time:</span>
              <span className="ml-2 font-semibold text-green-600">{speechLatency}ms</span>
            </div>
            <div>
              <span className="text-gray-600">Avg Interrupt:</span>
              <span className="ml-2 font-semibold text-orange-600">
                {Math.round(interruptionHandler.getMetrics().averageInterruptionDelay) || 0}ms
              </span>
            </div>
            <div>
              <span className="text-gray-600">Performance:</span>
              <span className={`ml-2 font-semibold ${
                interruptionHandler.getMetrics().averageInterruptionDelay <= 150 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {interruptionHandler.getMetrics().averageInterruptionDelay <= 150 ? '✅ Excellent' : '⚠️ Needs Work'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Connection:</span>
              <span className={`ml-2 font-semibold ${
                callStatus === "ACTIVE" ? 'text-green-600' : 
                callStatus === "CONNECTING" ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {callStatus === "ACTIVE" ? '🔗 Connected' : 
                 callStatus === "CONNECTING" ? '🔄 Connecting' : '📱 Ready'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">AI State:</span>
              <span className={`ml-2 font-semibold ${isSpeaking ? 'text-red-600' : 'text-green-600'}`}>
                {isSpeaking ? '🗣️ Speaking' : '👂 Ready'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">User State:</span>
              <span className={`ml-2 font-semibold ${isUserSpeaking ? 'text-blue-600' : 'text-gray-600'}`}>
                {isUserSpeaking ? '🎤 Speaking' : '🤫 Silent'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Adaptive Flow Monitor */}
      {callStatus === "ACTIVE" && useAdaptiveFlow && adaptiveHandler && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm mx-4 mb-4">
          <h4 className="font-semibold mb-2 text-blue-700 flex items-center">
            🎯 Adaptive Interview Flow
            <span className="ml-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-blue-600">Current Question:</span>
              <span className="ml-2 font-semibold text-gray-800">{questionIndex + 1}</span>
            </div>
            <div>
              <span className="text-blue-600">Difficulty Level:</span>
              <span className="ml-2 font-semibold text-orange-600">
                {adaptiveHandler.getCurrentDifficulty()}/10
              </span>
            </div>
            <div>
              <span className="text-blue-600">Questions Left:</span>
              <span className="ml-2 font-semibold text-green-600">
                {adaptiveHandler.getQuestionsRemaining()}
              </span>
            </div>
            <div>
              <span className="text-blue-600">MVP Keywords:</span>
              <span className="ml-2 font-semibold text-purple-600">
                {adaptiveHandler.getMVPKeywords().length}
              </span>
            </div>
          </div>
          {currentQuestion && (
            <div className="mt-3 p-2 bg-white rounded border">
              <span className="text-xs text-gray-500">Current Question:</span>
              <p className="text-sm text-gray-800 mt-1">{currentQuestion}</p>
            </div>
          )}
          {adaptiveHandler.getMVPKeywords().length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Extracted Keywords:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {adaptiveHandler.getMVPKeywords().slice(-5).map((keyword, index) => (
                  <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;

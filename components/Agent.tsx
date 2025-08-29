"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

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
  const [lastMessage, setLastMessage] = useState<string>("");
  const [generatedInterviewId, setGeneratedInterviewId] = useState<string | null>(null);

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      console.log("Call ended");
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: any) => {
      console.error("VAPI Error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setCallStatus(CallStatus.FINISHED);
    };

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
  }, []);

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
    setCallStatus(CallStatus.CONNECTING);

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
        
        // Use the interviewer template with custom variables for template-based interviews
        console.log("Starting VAPI call with template-based interviewer for interview ID:", interviewId);
        console.log("System prompt:", result.systemPrompt);
        
        // Format questions for the interviewer
        const formattedQuestions = result.questions
          ? result.questions.map((q: string, index: number) => `${index + 1}. ${q}`).join("\n")
          : "";

        // Create enhanced system prompt with template data
        const enhancedSystemPrompt = `${result.systemPrompt}

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

        // Use the interviewer configuration with enhanced questions
        await vapi.start(interviewer, {
          variableValues: {
            questions: enhancedSystemPrompt,
          },
        });
      } else {
        let formattedQuestions = "";
        if (questions) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\n");
        }

        console.log("Starting interview call with interviewer config");
        await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
          },
        });
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

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
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
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
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

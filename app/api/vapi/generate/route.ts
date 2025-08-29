import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid, templateId } =
    await request.json();

  try {
    let systemPrompt = "";
    let questions = [];

    // If templateId is provided, use the template
    if (templateId) {
      console.log("inside template ", templateId);
      
      const templateDoc = await db
        .collection("interview_templates")
        .doc(templateId)
        .get();

      if (templateDoc.exists) {
        const template = templateDoc.data();
        if (template) {
          systemPrompt = template.systemPrompt || "";

          // Generate questions based on template configuration
          const { text: generatedQuestions } = await generateText({
            model: google("gemini-2.0-flash-001"),
            prompt: `Generate exactly ${
              template.questionCount
            } interview questions for a ${template.industry} position at ${
              template.experienceLevel
            } level.

Template Configuration:
- Question types: ${
              template.questionTypes
                ?.map((qt: any) => `${qt.type} (${qt.percentage}%)`)
                .join(", ") || ""
            }
- Difficulty level: ${template.difficultyLevel}
- Duration: ${template.duration} minutes
- Custom instructions: ${template.customInstructions}

Requirements:
- Questions should be appropriate for voice interaction (no special characters)
- Mix of question types according to the specified percentages
- Questions should match the difficulty level
- Return ONLY a valid JSON array with no additional text or formatting
- Example format: ["Question 1", "Question 2", "Question 3"]

Generate the questions now:`,
          });

          console.log("Generated questions text:", generatedQuestions);

          try {
            // Clean the response to extract just the JSON array
            let cleanedResponse = generatedQuestions.trim();

            // Remove markdown formatting if present
            if (cleanedResponse.includes("```json")) {
              cleanedResponse = cleanedResponse
                .replace(/```json\s*/, "")
                .replace(/\s*```/, "");
            }
            if (cleanedResponse.includes("```")) {
              cleanedResponse = cleanedResponse
                .replace(/```\s*/, "")
                .replace(/\s*```/, "");
            }

            // Try to parse the cleaned response
            questions = JSON.parse(cleanedResponse);

            // Validate that it's an array
            if (!Array.isArray(questions)) {
              throw new Error("Generated response is not an array");
            }

            console.log("Successfully parsed questions:", questions.length);
          } catch (parseError) {
            console.error("Error parsing generated questions:", parseError);
            console.error("Raw generated text:", generatedQuestions);
            // Fallback to basic questions
            questions = [
              "Tell me about your experience in this field.",
              "What are your strengths and weaknesses?",
              "Why are you interested in this position?",
              "Describe a challenging project you worked on.",
              "Where do you see yourself in 5 years?",
            ];
          }
        }
      } else {
        return Response.json(
          { success: false, error: "Template not found" },
          { status: 404 }
        );
      }
    } else {
      // Fallback to original logic for backward compatibility
      const { text: generatedQuestions } = await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt: `Prepare questions for a job interview.
          The job role is ${role}.
          The job experience level is ${level}.
          The tech stack used in the job is: ${techstack}.
          The focus between behavioural and technical questions should lean towards: ${type}.
          The amount of questions required is: ${amount}.
          Please return only the questions, without any additional text.
          The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
          Return the questions formatted like this:
          ["Question 1", "Question 2", "Question 3"]
          
          Thank you! <3
      `,
      });

      questions = JSON.parse(generatedQuestions);

      // Generate basic system prompt for backward compatibility
      systemPrompt = `You are an AI interviewer for a ${role} position at ${level} level.

Interview Parameters:
- Number of questions: ${amount}
- Question types: ${type}
- Duration: 30 minutes

Instructions:
- Ask questions one at a time
- Provide follow-up questions based on candidate responses
- Maintain professional tone
- Keep responses concise and natural for voice interaction
- End the interview gracefully when time is up or all questions are covered`;
    }

    const interview = {
      role: role || "Interview",
      type: type || "Mixed",
      level: level || "Mid-level",
      techstack: techstack ? techstack.split(",") : [],
      questions: questions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
      templateId: templateId || null,
      systemPrompt: systemPrompt,
    };

    const interviewRef = await db.collection("interviews").add(interview);

    // Create interview session for tracking
    const session = {
      templateId: templateId || null,
      userId: userid,
      status: "pending",
      duration: 30, // Default duration
      questions: questions,
      transcript: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("interview_sessions").add(session);

         return Response.json(
       {
         success: true,
         interviewId: interviewRef.id,
         systemPrompt: systemPrompt,
         questions: questions,
       },
       { status: 200 }
     );
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}

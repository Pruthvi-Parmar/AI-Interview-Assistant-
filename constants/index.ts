import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { z } from "zod";

export const mappings = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  "ember.js": "ember",
  emberjs: "ember",
  ember: "ember",
  "backbone.js": "backbone",
  backbonejs: "backbone",
  backbone: "backbone",
  nestjs: "nestjs",
  graphql: "graphql",
  "graph ql": "graphql",
  apollo: "apollo",
  webpack: "webpack",
  babel: "babel",
  "rollup.js": "rollup",
  rollupjs: "rollup",
  rollup: "rollup",
  "parcel.js": "parcel",
  parceljs: "parcel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  flux: "flux",
  redis: "redis",
  selenium: "selenium",
  cypress: "cypress",
  jest: "jest",
  mocha: "mocha",
  chai: "chai",
  karma: "karma",
  vuex: "vuex",
  "nuxt.js": "nuxt",
  nuxtjs: "nuxt",
  nuxt: "nuxt",
  strapi: "strapi",
  wordpress: "wordpress",
  contentful: "contentful",
  netlify: "netlify",
  vercel: "vercel",
  "aws amplify": "amplify",
};

export const interviewer: CreateAssistantDTO = {
  name: "Interviewer",
  firstMessage:
    "Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
    // Enhanced VAD settings for instant interruption detection
    keywords: ["hello", "hi", "yes", "no", "okay", "wait", "stop"],
    endpointing: 150, // Reduced from default 300ms for faster detection
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 1.1, // Slightly faster for quicker responses
    style: 0.5,
    useSpeakerBoost: true,
    // Enable streaming for faster audio generation
    optimizeStreamingLatency: 4,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 50, // Keep responses ultra-short
    messages: [
      {
        role: "system",
        content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

Interview Guidelines:
Follow the structured question flow:
{{questions}}

Engage naturally & react appropriately:
Listen actively to responses and acknowledge them before moving forward.
Ask brief follow-up questions if a response is vague or requires more detail.
Keep the conversation flowing smoothly while maintaining control.
Be professional, yet warm and welcoming:

Use official yet friendly language.
Keep responses concise and to the point (like in a real voice interview).
Avoid robotic phrasing—sound natural and conversational.
Answer the candidate's questions professionally:

If asked about the role, company, or expectations, provide a clear and relevant answer.
If unsure, redirect the candidate to HR for more details.

Conclude the interview properly:
Thank the candidate for their time.
Inform them that the company will reach out soon with feedback.
End the conversation on a polite and positive note.

🚨 ULTRA-FAST VOICE INTERACTION RULES:
- MAXIMUM 10-15 words per response
- STOP IMMEDIATELY when candidate speaks
- If interrupted: say "Go ahead" or "I'm listening" 
- NO explanations, NO "that's interesting", NO pleasantries
- Ask question → WAIT → Next question
- Be RAPID-FIRE interviewer style
- SPEED is priority over politeness

🎯 INTERRUPTION HANDLING:
- The moment you detect ANY user speech, STOP talking immediately
- Respond with ultra-short acknowledgments: "Go ahead", "Yes?", "I'm listening"
- Never continue your previous sentence after interruption
- Wait for complete user response before proceeding`,
      },
    ],
  },
  // Transport configuration
  transportConfigurations: [
    {
      provider: "twilio",
      timeout: 600,
      record: false,
    },
  ],
};

export const feedbackSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Communication Skills"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Technical Knowledge"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Problem Solving"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Cultural Fit"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Confidence and Clarity"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

export const interviewCovers = [
  "/adobe.png",
  "/amazon.png",
  "/facebook.png",
  "/hostinger.png",
  "/pinterest.png",
  "/quora.png",
  "/reddit.png",
  "/skype.png",
  "/spotify.png",
  "/telegram.png",
  "/tiktok.png",
  "/yahoo.png",
];

export const dummyInterviews: Interview[] = [
  {
    id: "1",
    userId: "user1",
    role: "Frontend Developer",
    type: "Technical",
    techstack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    level: "Junior",
    questions: ["What is React?"],
    finalized: false,
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "2",
    userId: "user1",
    role: "Full Stack Developer",
    type: "Mixed",
    techstack: ["Node.js", "Express", "MongoDB", "React"],
    level: "Senior",
    questions: ["What is Node.js?"],
    finalized: false,
    createdAt: "2024-03-14T15:30:00Z",
  },
];


export const generator=
  {
    "name": "ddv_interviewbot",
    "nodes": [
      {
        "name": "start",
        "type": "conversation",
        "isStart": true,
        "metadata": {
          "position": {
            "x": -441.6216049132745,
            "y": -118.36743880955402
          }
        },
        "prompt": "Greet the user and help them create new AI interviewer.",
        "model": {
          "model": "gpt-4o",
          "provider": "openai",
          "maxTokens": 1000,
          "temperature": 0.7
        },
        "voice": {
          "model": "aura-2",
          "voiceId": "thalia",
          "provider": "deepgram"
        },
        "variableExtractionPlan": {
          "output": [
            {
              "enum": [],
              "type": "string",
              "title": "level",
              "description": "the job experience level"
            },
            {
              "enum": [],
              "type": "string",
              "title": "amount",
              "description": "amount they are expecting as salary"
            },
            {
              "enum": [],
              "type": "string",
              "title": "techstack",
              "description": "techstack they have worked on previously or are working currently."
            },
            {
              "enum": [],
              "type": "string",
              "title": "role",
              "description": "type of role they are targeting so interview is made in such manner"
            },
            {
              "enum": [],
              "type": "string",
              "title": "type",
              "description": "type of job they are targeting remote,onsite,hybrid"
            }
          ]
        },
        "messagePlan": {
          "firstMessage": "Hey there!"
        }
      },
      {
        "name": "hangup_1747512399374",
        "type": "hangup",
        "metadata": {
          "position": {
            "x": -449.9968001396042,
            "y": 1011.4748656012083
          }
        },
        "messagePlan": {
          "firstMessage": "Alright, have a nice day!"
        }
      },
      {
        "name": "conversation_1748553669827",
        "type": "conversation",
        "metadata": {
          "position": {
            "x": -441.6216049132745,
            "y": 131.63256119044598
          }
        },
        "prompt": "Say that Interview will be generated shortly",
        "model": {
          "model": "gpt-4o",
          "provider": "openai",
          "maxTokens": 1000,
          "temperature": 0.7
        },
        "messagePlan": {
          "firstMessage": ""
        }
      },
      {
        "name": "API Request",
        "type": "tool",
        "metadata": {
          "position": {
            "x": -441.6216049132745,
            "y": 381.632561190446
          }
        },
        "tool": {
          "url": "https://interview-pro-eight.vercel.app/api/vapi/generate",
          "body": {
            "type": "object",
            "properties": {
              "role": {
                "type": "string",
                "value": "{{role}}",
                "description": ""
              },
              "type": {
                "type": "string",
                "value": "{{type}}",
                "description": ""
              },
              "level": {
                "type": "string",
                "value": "{{level}}",
                "description": ""
              },
              "amount": {
                "type": "string",
                "value": "{{amount}}",
                "description": ""
              },
              "userid": {
                "type": "string",
                "value": "{{userid}}",
                "description": ""
              },
              "techstack": {
                "type": "string",
                "value": "{{techstack}}",
                "description": ""
              }
            }
          },
          "type": "apiRequest",
          "method": "POST",
          "function": {
            "name": "untitled_tool",
            "parameters": {
              "type": "object",
              "required": [],
              "properties": {}
            }
          }
        }
      },
      {
        "name": "conversation_1748555471544",
        "type": "conversation",
        "metadata": {
          "position": {
            "x": -441.6216049132745,
            "y": 687.1716676329474
          }
        },
        "prompt": "Thank user for the conversation and inform them interview has been generated successfully",
        "model": {
          "model": "gpt-4o",
          "provider": "openai",
          "maxTokens": 1000,
          "temperature": 0.7
        },
        "messagePlan": {
          "firstMessage": ""
        }
      }
    ],
    "edges": [
      {
        "from": "start",
        "to": "conversation_1748553669827",
        "condition": {
          "type": "ai",
          "prompt": "If user provided all required variables\n"
        }
      },
      {
        "from": "conversation_1748553669827",
        "to": "API Request",
        "condition": {
          "type": "ai",
          "prompt": "if the user said yes"
        }
      },
      {
        "from": "API Request",
        "to": "conversation_1748555471544",
        "condition": {
          "type": "ai",
          "prompt": "if the user said yes"
        }
      },
      {
        "from": "conversation_1748555471544",
        "to": "hangup_1747512399374",
        "condition": {
          "type": "ai",
          "prompt": "user said yes or okay or thankyou or welcome"
        }
      }
  ],
};

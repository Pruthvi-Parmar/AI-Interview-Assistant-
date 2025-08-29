import Vapi from "@vapi-ai/web";

const vapiToken = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

if (!vapiToken) {
  console.error("VAPI Web Token is not set in environment variables");
}

console.log("Initializing VAPI SDK with token:", vapiToken ? "Token present" : "No token");

export const vapi = new Vapi(vapiToken!);

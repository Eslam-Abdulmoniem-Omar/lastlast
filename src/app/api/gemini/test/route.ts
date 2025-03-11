import { NextResponse } from "next/server";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

export async function GET() {
  // Get the API key from environment variables
  const geminiApiKey = process.env.GEMINI_API_KEY || "";

  // Check if the API key is configured
  const isConfigured = !!geminiApiKey;

  // Return the status without exposing the actual key
  return NextResponse.json({
    apiKeyConfigured: isConfigured,
    apiKeyLength: geminiApiKey.length,
    firstFiveChars: geminiApiKey.substring(0, 5),
    lastFiveChars: geminiApiKey.substring(geminiApiKey.length - 5),
    envVars: Object.keys(process.env).filter(
      (key) => key.includes("GEMINI") || key.includes("NEXT_PUBLIC")
    ),
  });
}

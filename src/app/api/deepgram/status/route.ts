import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Helper function to check if a URL is accessible (for diagnostics)
const isUrlAccessible = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`Error accessing ${url}:`, error);
    return false;
  }
};

// Check API key validity by testing a minimal request
const testApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const client = createClient(apiKey);

    // We attempt to load the list of models, which requires a valid API key
    // but doesn't consume any usage credits
    await client.manage.getProjects();

    return true;
  } catch (error) {
    console.error("Error testing Deepgram API key:", error);
    return false;
  }
};

export async function GET() {
  try {
    // Get the Deepgram API key from environment variables
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // Check if API key exists
    const apiKeyExists = !!apiKey && apiKey.length > 10;

    // Check connectivity to Deepgram API
    const canAccessDeepgram = await isUrlAccessible("https://api.deepgram.com");

    // If we have an API key, test if it's valid
    let isApiKeyValid = false;
    if (apiKeyExists && canAccessDeepgram) {
      isApiKeyValid = await testApiKey(apiKey);
    }

    // Return the status
    return NextResponse.json({
      status: "ok",
      deepgram: {
        apiKeyExists,
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiKeyFirstFourChars: apiKey ? apiKey.substring(0, 4) : null,
        canAccessDeepgram,
        isApiKeyValid,
        usingFallbackTranscription: !isApiKeyValid || !canAccessDeepgram,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking Deepgram status:", error);

    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

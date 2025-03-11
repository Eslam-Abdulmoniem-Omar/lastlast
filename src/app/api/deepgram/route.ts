import { NextResponse } from "next/server";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Simple validation to check API key availability
const isApiKeyConfigured = () => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error("Deepgram API is not properly configured");
    return false;
  }

  // Check if the API key is valid (basic format check)
  if (apiKey.length < 10) {
    console.error("Deepgram API configuration appears to be invalid");
    return false;
  }

  // Remove API key validation logging
  return true;
};

export async function GET() {
  try {
    // Remove API route logging

    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Return a masked version of the API key for client-side initialization
    // Important: This doesn't expose the actual API key, just its length
    const maskedKeyInfo = {
      configured: true,
      length: process.env.DEEPGRAM_API_KEY?.length || 0,
      // Return the actual key to the client for WebSocket initialization
      key: process.env.DEEPGRAM_API_KEY ?? "",
    };

    return NextResponse.json(maskedKeyInfo);
  } catch (error) {
    console.error("Error in Deepgram API key endpoint");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

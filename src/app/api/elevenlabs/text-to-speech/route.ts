import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voiceId = "JBFqnCBsd6RMkjVDRZzb",
      modelId = "eleven_multilingual_v2",
    } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Get API key from environment variable
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("Eleven Labs API key is not configured");
      return NextResponse.json(
        { error: "Eleven Labs API key is not configured" },
        { status: 500 }
      );
    }

    // Make the API request to Eleven Labs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Eleven Labs API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate speech", details: errorData },
        { status: response.status }
      );
    }

    // Get the audio data as an array buffer
    const audioData = await response.arrayBuffer();

    // Return the audio data with the correct content type
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioData.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error in text-to-speech API:", error);
    return NextResponse.json(
      { error: "Failed to process text-to-speech request" },
      { status: 500 }
    );
  }
}

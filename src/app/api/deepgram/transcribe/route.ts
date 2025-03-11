import { NextRequest, NextResponse } from "next/server";
import * as deepgram from "@deepgram/sdk";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Configure the API to handle larger file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
    responseLimit: false,
  },
};

// Return a secure transcription response
const getSecureFallbackResponse = (
  error = "Transcription service unavailable"
) => {
  return NextResponse.json(
    {
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: "Transcription service unavailable.",
              },
            ],
          },
        ],
      },
      error,
    },
    { status: 500 }
  );
};

export async function POST(req: NextRequest) {
  try {
    // Remove API route logging

    // Get the Deepgram API key from environment variables
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // Check if API key is defined
    if (!apiKey) {
      return getSecureFallbackResponse("API configuration error");
    }

    // Clone the request to handle it as a blob
    const clonedReq = req.clone();
    const audioBlob = await clonedReq.blob();

    // Create the Deepgram client and configure options
    const deepgramClient = new deepgram.Deepgram(apiKey);
    const transcriptionOptions = {
      smart_format: true,
      model: "nova-2",
      language: "en-US",
    };

    try {
      // Convert blob to ArrayBuffer for Deepgram
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Create the source from buffer
      const source = {
        buffer: Buffer.from(arrayBuffer),
        mimetype: audioBlob.type || "audio/webm",
      };

      // Send to Deepgram for transcription
      const result = await deepgramClient.transcription.preRecorded(
        source,
        transcriptionOptions
      );

      // Return the transcription results
      return NextResponse.json(result);
    } catch (transcriptionError) {
      console.error("Transcription error");
      return getSecureFallbackResponse("Failed to process audio");
    }
  } catch (error) {
    console.error("Error in transcription endpoint");
    return getSecureFallbackResponse();
  }
}

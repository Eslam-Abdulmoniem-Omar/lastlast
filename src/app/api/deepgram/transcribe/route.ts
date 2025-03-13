import { NextResponse } from "next/server";

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

// Simple validation to check API key availability
const isApiKeyConfigured = () => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error(
      "DEEPGRAM_API_KEY is not configured in environment variables"
    );
    return false;
  }
  return true;
};

export async function POST(request: Request) {
  try {
    console.log("Transcribe API called");

    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        {
          error: "Deepgram API key is not configured",
        },
        { status: 500 }
      );
    }

    // Get the API key
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // Parse the multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      console.error("No audio file provided or invalid format");
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log("Audio file received:", audioFile.size, "bytes");

    // Convert the blob to an array buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Send the audio to Deepgram for transcription with optimized parameters
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&punctuate=true&smart_format=true&diarize=false&filler_words=false&utterances=false&detect_language=false",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/webm",
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Deepgram API error: ${response.status} ${response.statusText}`,
        errorText
      );
      return NextResponse.json(
        {
          error: `Deepgram API error: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract the transcript from the response
    const transcript =
      data.results?.channels[0]?.alternatives[0]?.transcript || "";
    console.log("Transcription result:", transcript || "No transcript");

    if (!transcript || transcript.trim() === "") {
      console.warn("Empty transcript returned from Deepgram");
      return NextResponse.json({ transcript: "" });
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Error in Deepgram transcribe API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: `Failed to transcribe audio: ${errorMessage}` },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Configure for handling audio files
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max duration

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    try {
      // Create a temporary file path
      const tmpFilePath = join(
        tmpdir(),
        `${uuidv4()}-${audioFile.name || "audio.webm"}`
      );

      // Convert the file to buffer and save to tmp file
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      await writeFile(tmpFilePath, buffer);

      // Create a read stream from the temp file
      const fileStream = createReadStream(tmpFilePath);

      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: "en",
        response_format: "json",
      });

      // Return the transcription
      return NextResponse.json({ text: transcription.text });
    } catch (error) {
      console.error("Error processing audio with Whisper:", error);
      return NextResponse.json(
        {
          error: "Failed to transcribe audio",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Whisper API route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

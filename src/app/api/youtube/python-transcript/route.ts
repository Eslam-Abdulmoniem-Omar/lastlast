import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execPromise = promisify(exec);

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  if (!url) return null;

  // Regular expressions for different YouTube URL formats
  const regexPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/e\/|youtube\.com\/user\/.+\/\w+\/|youtube\.com\/\w+\/\w+\/|youtube\.com\/shorts\/)([^#\&\?]*).*/,
    /(?:youtube\.com\/shorts\/)([^#\&\?]*).*/,
  ];

  for (const regex of regexPatterns) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Function to run the Python script and get the transcript
async function getPythonTranscript(videoId: string): Promise<any> {
  try {
    console.log(`Running Python script for video ID: ${videoId}`);

    // Get the absolute path to the Python script
    const scriptPath = path.resolve(
      process.cwd(),
      "src/scripts/youtube_transcript.py"
    );

    // Run the Python script with the video ID as an argument
    const { stdout, stderr } = await execPromise(
      `python ${scriptPath} ${videoId}`
    );

    if (stderr) {
      console.error(`Python script error: ${stderr}`);
      throw new Error(`Python script error: ${stderr}`);
    }

    // Parse the JSON output from the Python script
    const result = JSON.parse(stdout);

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Error running Python script:", error);
    throw error;
  }
}

// Add IDs to the segments
function addIdsToSegments(segments: any[]): DialogueSegment[] {
  return segments.map((segment) => ({
    ...segment,
    id: uuidv4(),
  }));
}

export async function GET(request: Request) {
  // Get the YouTube URL from the query parameters
  const { searchParams } = new URL(request.url);
  const youtubeUrl = searchParams.get("url");

  if (!youtubeUrl) {
    return NextResponse.json(
      { error: "YouTube URL is required" },
      { status: 400 }
    );
  }

  try {
    // Extract the video ID from the URL
    const videoId = extractVideoId(youtubeUrl);

    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Get the transcript using the Python script
    const result = await getPythonTranscript(videoId);

    // Add IDs to the segments
    const segments = addIdsToSegments(result.segments);

    // Return the segments
    return NextResponse.json({
      data: {
        segments,
        source: "python-transcript-api",
      },
    });
  } catch (error: any) {
    console.error("Error in Python transcript API:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch transcript",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// Function to extract video ID from YouTube URL
export function extractVideoId(url: string): string | null {
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

// Function to create static dialogue segments
function createStaticSegments(): DialogueSegment[] {
  const segments: DialogueSegment[] = [
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "Hello! How are you doing today?",
      startTime: 0,
      endTime: 5,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "I'm doing well, thank you. How about you?",
      startTime: 5,
      endTime: 10,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "I'm great! I've been learning English for a few months now.",
      startTime: 10,
      endTime: 15,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "That's wonderful! Your English sounds very good already.",
      startTime: 15,
      endTime: 20,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "Thank you! I practice every day. It's challenging but rewarding.",
      startTime: 20,
      endTime: 25,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "Consistency is key when learning a new language. What resources do you use?",
      startTime: 25,
      endTime: 30,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "I use apps, watch videos, and try to speak with native speakers whenever possible.",
      startTime: 30,
      endTime: 35,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "That's a great approach. Immersion is one of the best ways to learn quickly.",
      startTime: 35,
      endTime: 40,
      vocabularyItems: [],
    },
  ];

  return segments;
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

    // Get static segments
    const segments = createStaticSegments();

    // Return the segments
    return NextResponse.json({
      data: {
        segments,
        source: "static-transcript-api",
      },
    });
  } catch (error: any) {
    console.error("Error in transcript API:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch transcript",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

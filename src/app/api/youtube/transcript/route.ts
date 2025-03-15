export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// Route segment configuration
export const runtime = "edge"; // Use edge runtime for better performance
export const fetchCache = "force-no-store"; // Prevent caching
export const revalidate = 0; // Prevent static generation

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  // Extract video ID from various YouTube URL formats
  let videoId = null;

  try {
    if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(new URL(url).search);
      videoId = urlParams.get("v");
    } else if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/embed")) {
      videoId = url.split("youtube.com/embed/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/shorts")) {
      // Handle YouTube Shorts format
      videoId = url.split("youtube.com/shorts/")[1]?.split("?")[0];
    }
  } catch (error) {
    console.error("Error extracting video ID:", error);
  }

  return videoId;
}

// Create default segments for any video
function createDefaultSegments(): DialogueSegment[] {
  // Create segments with generic content
  const segments: DialogueSegment[] = [];
  const segmentDuration = 5;
  const numberOfSegments = 10;

  const sentences = [
    "Hello, welcome to this video.",
    "Today we're going to discuss an interesting topic.",
    "I hope you find this information useful.",
    "Let me know what you think in the comments.",
    "This is an important point to understand.",
    "Let's break this down step by step.",
    "First, we need to consider the context.",
    "Second, we should analyze the details.",
    "Finally, we can draw some conclusions.",
    "Thank you for watching this video.",
  ];

  for (let i = 0; i < numberOfSegments; i++) {
    const startTime = i * segmentDuration;
    const endTime = (i + 1) * segmentDuration;
    const speakerName = i % 2 === 0 ? "Speaker A" : "Speaker B";

    segments.push({
      id: uuidv4(),
      speakerName,
      text: sentences[i],
      startTime,
      endTime,
      vocabularyItems: [],
    });
  }

  return segments;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeUrl = searchParams.get("url");

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    console.log("Processing YouTube URL:", youtubeUrl);

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Could not extract video ID from URL" },
        { status: 400 }
      );
    }

    // For this simpler version, we'll just return default segments
    const segments = createDefaultSegments();

    // Return the result
    return NextResponse.json({
      data: {
        videoId,
        segments,
        transcriptSource: "default",
      },
    });
  } catch (error) {
    console.error("Error processing YouTube URL:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process YouTube URL: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}

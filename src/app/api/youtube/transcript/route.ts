export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "edge";

import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

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

export async function GET(request: Request) {
  // Move searchParams access outside the try/catch block
  const { searchParams } = new URL(request.url);
  const youtubeUrl = searchParams.get("url");

  if (!youtubeUrl) {
    return NextResponse.json(
      { error: "YouTube URL is required" },
      { status: 400 }
    );
  }

  console.log("Processing YouTube URL:", youtubeUrl);

  try {
    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Could not extract video ID from URL" },
        { status: 400 }
      );
    }

    // Return empty segments instead of default ones
    return NextResponse.json({
      data: {
        videoId,
        segments: [],
        transcriptSource: "unavailable",
      },
    });
  } catch (error) {
    console.error("Error processing YouTube URL:", error);

    // Re-throw the error for Next.js to detect dynamic usage
    throw error;
  }
}

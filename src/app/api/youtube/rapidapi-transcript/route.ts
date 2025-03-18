export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "edge";

import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { getSubtitles } from "youtube-captions-scraper";

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

// Function to get YouTube transcript using youtube-captions-scraper
async function getTranscript(videoId: string): Promise<any> {
  try {
    console.log(`Getting transcript for video ID: ${videoId}`);

    const transcript = await getSubtitles({
      videoID: videoId,
      lang: "en", // Get English captions
    });

    console.log(
      `Successfully fetched transcript with ${transcript.length} entries`
    );

    // Limit the number of segments to prevent large responses
    const MAX_SEGMENTS = 100;
    const limitedTranscript = transcript.slice(0, MAX_SEGMENTS);

    return {
      result: limitedTranscript.map((entry: any) => ({
        text: entry.text,
        start: entry.start,
        duration: entry.dur,
      })),
      title: "YouTube Video", // We'll get the title from the frontend
    };
  } catch (error) {
    console.error("Error fetching transcript:", error);
    throw new Error(
      "Failed to fetch transcript. Please ensure the video has captions enabled."
    );
  }
}

export async function GET(request: Request) {
  try {
  const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
    return NextResponse.json(
        { error: "URL parameter is required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Log the request details (without exposing sensitive info)
    console.log("Processing transcript request for URL:", url);

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Get transcript data
    const data = await getTranscript(videoId);

    // Convert the transcript data to our DialogueSegment format
    const segments = data.result.map((entry: any, index: number) => ({
      id: uuidv4(),
      speakerName: `Speaker ${index % 2 === 0 ? "A" : "B"}`,
      text: entry.text,
      startTime: entry.start,
      endTime: entry.start + entry.duration,
      vocabularyItems: [],
    }));

    return NextResponse.json(
      {
        data: {
          segments,
          transcriptSource: "youtube-captions-scraper",
          title: data.title,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    console.error("Error processing transcript request:", error);
    return NextResponse.json(
      {
        error: "Error processing request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeVideoId } from "@/lib/utils/youtubeUtils";

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // First try to get transcript from YouTube API if API key is available
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (youtubeApiKey) {
      try {
        // This would use the YouTube API to fetch captions
        // Implementation would go here
        // For now, return a placeholder message
        return NextResponse.json({
          transcript:
            "This is a placeholder transcript. YouTube API implementation pending.",
        });
      } catch (error) {
        console.error("Error fetching from YouTube API:", error);
        return NextResponse.json(
          { error: "Could not fetch transcript from YouTube API" },
          { status: 500 }
        );
      }
    } else {
      // If no YouTube API key is available
      return NextResponse.json({
        transcript:
          "YouTube API key not configured. Please add a YouTube API key to your environment variables.",
      });
    }
  } catch (error) {
    console.error("Error processing transcript request:", error);
    return NextResponse.json(
      { error: "Failed to process transcript request" },
      { status: 500 }
    );
  }
}

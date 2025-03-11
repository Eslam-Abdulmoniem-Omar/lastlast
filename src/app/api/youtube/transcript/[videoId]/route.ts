import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeVideoId } from "@/lib/utils/youtubeUtils";
import { createClient } from "@deepgram/sdk";

// Initialize Deepgram client
const deepgramApiKey = process.env.DEEPGRAM_API_KEY || "";
const deepgram = createClient(deepgramApiKey);

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
        // For now, we'll skip this and go straight to Deepgram
      } catch (error) {
        console.error("Error fetching from YouTube API:", error);
        // Continue to Deepgram fallback
      }
    }

    // Fallback to Deepgram for transcription
    // For Deepgram, we need the audio URL from YouTube
    const audioUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Use Deepgram to transcribe the audio
    try {
      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        {
          url: audioUrl,
        },
        {
          smart_format: true,
          punctuate: true,
          utterances: true,
          model: "nova-2",
        }
      );

      if (error || !result) {
        throw new Error(error || "Failed to transcribe audio");
      }

      // Extract transcript from Deepgram response
      const transcript =
        result.results?.channels[0]?.alternatives[0]?.transcript || "";

      if (!transcript) {
        return NextResponse.json(
          { error: "No transcript could be generated" },
          { status: 404 }
        );
      }

      return NextResponse.json({ transcript });
    } catch (deepgramError) {
      console.error("Deepgram transcription error:", deepgramError);
      return NextResponse.json(
        { error: "Failed to transcribe video", details: deepgramError },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing transcript request:", error);
    return NextResponse.json(
      { error: "Failed to process transcript request" },
      { status: 500 }
    );
  }
}

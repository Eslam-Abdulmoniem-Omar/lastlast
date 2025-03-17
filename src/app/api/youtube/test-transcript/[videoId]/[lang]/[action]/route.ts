import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export async function GET(
  request: Request,
  { params }: { params: { videoId: string; lang: string; action: string } }
) {
  try {
    const { videoId, lang, action } = params;

    // Validate videoId
    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Get transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: lang || "en",
    });

    // Handle different actions
    switch (action) {
      case "raw":
        return NextResponse.json({ transcript });

      case "text":
        // Return only the text content
        const textOnly = transcript.map((item) => item.text).join(" ");
        return NextResponse.json({ text: textOnly });

      case "timestamps":
        // Return text with timestamps
        const withTimestamps = transcript.map((item) => ({
          text: item.text,
          start: item.start,
          duration: item.duration,
        }));
        return NextResponse.json({ timestamps: withTimestamps });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'raw', 'text', or 'timestamps'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}

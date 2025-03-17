import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export async function GET(
  request: Request,
  { params }: { params: { videoId: string; lang: string } }
) {
  try {
    const { videoId, lang } = params;

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

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string; lang: string } }
) {
  try {
    const { videoId, lang } = params;

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    console.log(
      `Fetching transcript for video ID: ${videoId} in language: ${lang}`
    );

    // Try to get the transcript using youtube-transcript package
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: lang || "en",
      });

      if (transcript && transcript.length > 0) {
        console.log(
          `Successfully fetched ${transcript.length} transcript segments`
        );

        // Transform the transcript data
        const formattedTranscript = transcript.map((item) => ({
          text: item.text,
          startTime: item.offset / 1000, // Convert to seconds
          duration: item.duration / 1000, // Convert to seconds
        }));

        return NextResponse.json({
          success: true,
          transcript: formattedTranscript,
        });
      } else {
        throw new Error("No transcript segments found");
      }
    } catch (transcriptError) {
      console.error("Error fetching transcript:", transcriptError);

      // Try alternative method for shorts
      try {
        const response = await fetch(
          `https://www.youtube.com/shorts/${videoId}`
        );
        const html = await response.text();

        // Look for transcript data in the HTML
        const captionTrackPattern = /"captionTracks":\[[\s\S]*?\]/;
        const match = html.match(captionTrackPattern);

        if (match && match[0]) {
          const captionData = match[0];
          const baseUrlPattern = /"baseUrl":"(.*?)"/;
          const baseUrlMatch = captionData.match(baseUrlPattern);

          if (baseUrlMatch && baseUrlMatch[1]) {
            const baseUrl = baseUrlMatch[1].replace(/\\u0026/g, "&");
            const transcriptResponse = await fetch(baseUrl);

            if (transcriptResponse.ok) {
              const transcriptXml = await transcriptResponse.text();
              const textSegments = transcriptXml.match(
                /<text.*?>(.*?)<\/text>/g
              );

              if (textSegments && textSegments.length > 0) {
                const formattedTranscript = textSegments
                  .map((segment) => {
                    const startMatch = segment.match(/start="(.*?)"/);
                    const durMatch = segment.match(/dur="(.*?)"/);
                    const textMatch = segment.match(/<text.*?>(.*?)<\/text>/);

                    if (startMatch && durMatch && textMatch) {
                      return {
                        text: textMatch[1]
                          .replace(/&amp;/g, "&")
                          .replace(/&lt;/g, "<")
                          .replace(/&gt;/g, ">")
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'"),
                        startTime: parseFloat(startMatch[1]),
                        duration: parseFloat(durMatch[1]),
                      };
                    }
                    return null;
                  })
                  .filter(Boolean);

                return NextResponse.json({
                  success: true,
                  transcript: formattedTranscript,
                });
              }
            }
          }
        }
        throw new Error("Could not find transcript data in shorts HTML");
      } catch (shortsError) {
        console.error("Error fetching shorts transcript:", shortsError);
        throw new Error("Failed to fetch transcript from both methods");
      }
    }
  } catch (error) {
    console.error("Error in transcript route:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

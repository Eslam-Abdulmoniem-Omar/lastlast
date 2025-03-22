export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import https from "https";

// Get API key from environment variables
const RAPIDAPI_KEY =
  process.env.RAPIDAPI_KEY ||
  "af44647a97msh6324d758a7051e7p1dfa6cjsnefffe8a57983";
const RAPIDAPI_HOST = "tiktok-video-transcript.p.rapidapi.com";

// Function to validate TikTok URL
function validateTikTokUrl(url: string): boolean {
  const tiktokRegex = /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.+$/;
  return tiktokRegex.test(url);
}

// Function to get TikTok transcript from RapidAPI
async function getTikTokTranscript(url: string, language = "EN"): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`Getting TikTok transcript from RapidAPI for URL: ${url}`);

    // Encode URL for query parameter
    const encodedUrl = encodeURIComponent(url);

    const options = {
      method: "GET",
      hostname: RAPIDAPI_HOST,
      path: `/transcribe?url=${encodedUrl}&language=${language}&timestamps=true`,
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    };

    console.log(`TikTok transcript request prepared`);

    const req = https.request(options, (res) => {
      let data = "";

      console.log(`TikTok transcript response status: ${res.statusCode}`);

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          // Avoid logging too much data in production
          const isProduction = process.env.NODE_ENV === "production";
          if (!isProduction) {
            console.log(
              `TikTok transcript raw response: ${data.substring(0, 200)}...`
            );
          }

          // Parse the JSON response
          const parsedData = JSON.parse(data);

          // Check for errors in the response
          if (parsedData.error) {
            console.error("TikTok API returned an error:", parsedData.error);
            reject(new Error(`TikTok API error: ${parsedData.error}`));
            return;
          }

          console.log("TikTok transcript retrieved successfully");
          resolve(parsedData);
        } catch (error) {
          console.error("Error parsing TikTok API response:", error);
          reject(
            new Error(`Failed to parse TikTok transcript response: ${error}`)
          );
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error in TikTok API request:", error);
      reject(error);
    });

    // Set a timeout for the request
    req.setTimeout(15000, () => {
      req.destroy();
      console.error("TikTok API request timed out after 15 seconds");
      reject(new Error("Request to TikTok API timed out"));
    });

    req.end();
  });
}

// Convert TikTok transcript to our DialogueSegment format
function convertToDialogueSegments(transcript: any): DialogueSegment[] {
  if (!transcript || !transcript.text) {
    console.error("No transcript text in response:", transcript);
    return [];
  }

  const segments: DialogueSegment[] = [];

  try {
    // If the API returned a plain text transcript without timestamps
    if (typeof transcript.text === "string") {
      console.log("Processing plain text transcript");

      // Split by sentences or periods to create segments
      const text = transcript.text;
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

      // Calculate an approximate duration for each segment
      const approximateDuration = 5; // seconds per segment

      sentences.forEach((sentence: string, index: number) => {
        if (!sentence.trim()) return;

        segments.push({
          id: uuidv4(),
          speakerName: "Speaker",
          text: sentence.trim(),
          startTime: index * approximateDuration,
          endTime: (index + 1) * approximateDuration,
          vocabularyItems: [],
        });
      });

      console.log(`Created ${segments.length} segments from plain text`);
    }
    // If it's an array with timestamps (not currently returned by the API but prepared for future updates)
    else if (Array.isArray(transcript.transcript)) {
      console.log("Processing transcript array with timestamps");

      transcript.transcript.forEach((entry: any, index: number) => {
        if (!entry.text || entry.text.trim() === "") return;

        const startTime = entry.start || entry.offset || 0;
        const duration = entry.duration || 5;
        const endTime = startTime + duration;

        segments.push({
          id: uuidv4(),
          speakerName: `Speaker ${index % 2 === 0 ? "A" : "B"}`,
          text: entry.text,
          startTime: parseFloat(startTime),
          endTime: parseFloat(endTime),
          vocabularyItems: [],
        });
      });
    }
  } catch (error) {
    console.error("Error converting TikTok transcript:", error);
  }

  console.log(`Returning ${segments.length} segments`);
  return segments;
}

export async function GET(request: Request) {
  // Get the TikTok URL from the request
  const { searchParams } = new URL(request.url);
  const tiktokUrl = searchParams.get("url");
  const language = searchParams.get("language") || "EN";

  console.log(`TikTok transcript endpoint called with URL: ${tiktokUrl}`);

  if (!tiktokUrl) {
    return NextResponse.json(
      { error: "TikTok URL is required" },
      { status: 400 }
    );
  }

  if (!validateTikTokUrl(tiktokUrl)) {
    return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 });
  }

  try {
    // Get transcript from RapidAPI
    const transcript = await getTikTokTranscript(tiktokUrl, language);

    // Convert to dialogue segments
    const segments = convertToDialogueSegments(transcript);

    console.log(`Converted transcript to ${segments.length} segments`);

    // Return the transcript data
    return NextResponse.json({
      data: {
        segments,
        transcriptSource: "tiktok-rapidapi",
        title: transcript.title || "TikTok Video",
        embedUrl: tiktokUrl,
      },
    });
  } catch (error: any) {
    console.error("Error in TikTok transcript endpoint:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch TikTok transcript",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import https from "https";

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

// Update the RapidAPI key to use environment variables
const RAPIDAPI_KEY =
  process.env.RAPIDAPI_KEY ||
  "af44647a97msh6324d758a7051e7p1dfa6cjsnefffe8a57983";
const RAPIDAPI_HOST = "youtube-transcript3.p.rapidapi.com";

// Update the function to get YouTube transcript using RapidAPI with env variables
async function getRapidAPITranscript(videoId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`Getting transcript from RapidAPI for video ID: ${videoId}`);

    const options = {
      method: "GET",
      hostname: RAPIDAPI_HOST,
      path: `/api/transcript?videoId=${videoId}`,
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    };

    console.log(`RapidAPI request prepared for video ID: ${videoId}`);

    const req = https.request(options, (res) => {
      let data = "";

      console.log(`RapidAPI response status: ${res.statusCode}`);

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          // Avoid logging too much data in production
          const isProduction = process.env.NODE_ENV === "production";
          if (!isProduction) {
            console.log(
              `RapidAPI raw response data: ${data.substring(0, 200)}...`
            );
          }

          // Check if response is valid JSON
          const parsedData = JSON.parse(data);
          console.log("RapidAPI response successfully parsed as JSON");

          // Check for specific error patterns in the response
          if (parsedData.error) {
            console.error("RapidAPI returned an error:", parsedData.error);
            reject(new Error(`RapidAPI error: ${parsedData.error}`));
            return;
          }

          if (
            !parsedData.result ||
            !Array.isArray(parsedData.result) ||
            parsedData.result.length === 0
          ) {
            console.error("RapidAPI returned no transcript data");
            reject(new Error("No transcript data available for this video"));
            return;
          }

          console.log(
            `RapidAPI returned transcript with ${parsedData.result.length} entries`
          );
          resolve(parsedData);
        } catch (error) {
          console.error("Error parsing RapidAPI response:", error);
          reject(new Error(`Failed to parse transcript response: ${error}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error in RapidAPI request:", error);
      reject(error);
    });

    // Set a timeout for the request
    req.setTimeout(15000, () => {
      req.destroy();
      console.error("RapidAPI request timed out after 15 seconds");
      reject(new Error("Request to RapidAPI timed out"));
    });

    req.end();
  });
}

// Convert RapidAPI transcript format to our DialogueSegment format
function convertToDialogueSegments(transcript: any): DialogueSegment[] {
  if (!transcript || !transcript.result) {
    return [];
  }

  const entries = transcript.result;
  const segments: DialogueSegment[] = [];

  let currentGroup: any[] = [];
  let currentStartTime = 0;
  let currentText = "";
  const MAX_GROUP_DURATION = 10; // Maximum duration for a segment in seconds

  // Process transcript entries
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const startTime = parseFloat(entry.start);
    const duration = parseFloat(entry.duration);
    const endTime = startTime + duration;

    if (i === 0) {
      currentStartTime = startTime;
      currentText = entry.text;
      currentGroup.push(entry);
      continue;
    }

    // If this entry would make the group too long, or if it's far from the previous entry,
    // finish the current group and start a new one
    if (
      currentGroup.length > 0 &&
      (endTime - currentStartTime > MAX_GROUP_DURATION ||
        startTime -
          (parseFloat(currentGroup[currentGroup.length - 1].start) +
            parseFloat(currentGroup[currentGroup.length - 1].duration)) >
          1.5)
    ) {
      const lastEntry = currentGroup[currentGroup.length - 1];
      const segment: DialogueSegment = {
        id: uuidv4(),
        speakerName: `Speaker ${segments.length % 2 === 0 ? "A" : "B"}`,
        text: currentText.trim(),
        startTime: currentStartTime,
        endTime: parseFloat(lastEntry.start) + parseFloat(lastEntry.duration),
        vocabularyItems: [],
      };

      segments.push(segment);

      // Start a new group
      currentGroup = [entry];
      currentStartTime = startTime;
      currentText = entry.text;
    } else {
      // Add to the current group
      currentGroup.push(entry);
      currentText += " " + entry.text;
    }

    // If this is the last entry, add the final group
    if (i === entries.length - 1 && currentGroup.length > 0) {
      const segment: DialogueSegment = {
        id: uuidv4(),
        speakerName: `Speaker ${segments.length % 2 === 0 ? "A" : "B"}`,
        text: currentText.trim(),
        startTime: currentStartTime,
        endTime: endTime,
        vocabularyItems: [],
      };

      segments.push(segment);
    }
  }

  return segments;
}

export async function GET(request: Request) {
  // Get the YouTube URL from the request
  const { searchParams } = new URL(request.url);
  const youtubeUrl = searchParams.get("url");

  console.log(`RapidAPI endpoint called with URL: ${youtubeUrl}`);

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
      console.error(`Invalid YouTube URL: ${youtubeUrl}`);
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    console.log(`Processing video ID: ${videoId}`);

    // Get the transcript using RapidAPI
    try {
      const transcript = await getRapidAPITranscript(videoId);
      console.log("Successfully retrieved transcript from RapidAPI");

      // Convert to dialogue segments
      const segments = convertToDialogueSegments(transcript);
      console.log(
        `Converted transcript to ${segments.length} dialogue segments`
      );

      // Return the transcript data
      return NextResponse.json({
        data: {
          segments,
          transcriptSource: "rapidapi-transcript",
          title: transcript.title || "YouTube Video",
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
        },
      });
    } catch (rapidApiError: any) {
      console.error(
        `RapidAPI transcript fetch failed: ${rapidApiError.message}`
      );
      return NextResponse.json(
        {
          error:
            rapidApiError.message || "Failed to fetch transcript from RapidAPI",
          source: "rapidapi",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in RapidAPI transcript endpoint:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch transcript",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

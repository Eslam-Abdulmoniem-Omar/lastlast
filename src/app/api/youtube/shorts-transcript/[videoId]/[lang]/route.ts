export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { extractVideoId } from "@/lib/utils/youtubeUtils";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { executePythonScript } from "@/scripts/youtube_wrapper";

// Define types for the Python script result
interface TranscriptSegment {
  text: string;
  start: number;
  duration?: number;
}

interface VideoData {
  title: string;
  duration: number;
  thumbnail: string;
  url: string;
  webpage_url: string;
  description: string;
}

interface VideoMetadata {
  title: string;
  duration: number;
  thumbnailUrl: string;
  description?: string;
}

interface PythonScriptResult {
  success: boolean;
  transcript?: TranscriptSegment[];
  language?: string;
  available_languages?: { language: string; language_code: string }[];
  note?: string;
  video_data?: VideoData;
  error?: string;
  metadata?: VideoMetadata;
}

// Verify if Python is installed and the script exists
async function verifyPythonSetup(): Promise<boolean> {
  try {
    const scriptPath = path.join(
      process.cwd(),
      "src",
      "scripts",
      "youtube_utils.py"
    );

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Script does not exist at path: ${scriptPath}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to verify Python setup:", error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string; lang: string } }
) {
  try {
    const { videoId, lang } = params;
    const url = `https://www.youtube.com/shorts/${videoId}`;
    const debug = request.nextUrl.searchParams.get("debug") === "true";

    console.log("Received shorts transcript request for videoId:", videoId);

    // Verify Python setup
    console.log("Verifying Python setup...");
    const pythonSetupOk = await verifyPythonSetup();
    if (!pythonSetupOk) {
      return NextResponse.json(
        {
          error: "Python setup is not configured correctly",
          note: "Make sure Python 3.6+ is installed and in your PATH",
        },
        { status: 500 }
      );
    }

    try {
      // Try to get transcript using the wrapper
      console.log(`Attempting to get transcript for videoId: ${videoId}`);
      const result = (await executePythonScript(
        "transcript",
        url,
        lang
      )) as PythonScriptResult;

      if (debug) {
        console.log("Python script result:", result);
      }

      // If we have a transcript, process it
      if (result.success && result.transcript) {
        console.log(`Found ${result.transcript.length} transcript segments`);

        // Process the segments into DialogueSegment format
        const processedSegments = result.transcript.map(
          (segment: TranscriptSegment, index: number) => ({
            id: uuidv4(),
            speakerName: index % 2 === 0 ? "Speaker A" : "Speaker B",
            text: segment.text,
            startTime: segment.start,
            endTime: segment.start + (segment.duration || 5),
            vocabularyItems: [],
          })
        );

        return NextResponse.json({
          data: {
            segments: processedSegments,
            source: "youtube-transcript-api",
            language: result.language || lang,
            availableLanguages: result.available_languages || [],
            notes: result.note,
            video_data: result.video_data,
          },
        });
      }

      // If we have an error message but video data, create a default transcript
      if (result.video_data) {
        console.log("Creating default transcript from video data");

        const defaultSegment = {
          id: uuidv4(),
          speakerName: "Speaker A",
          text: result.video_data.title || "No transcript available",
          startTime: 0,
          endTime: result.video_data.duration || 30,
          vocabularyItems: [],
        };

        return NextResponse.json({
          data: {
            segments: [defaultSegment],
            source: "default",
            language: lang,
            availableLanguages: [],
            notes: "Using default transcript (no transcript available)",
            video_data: result.video_data,
          },
        });
      }

      // Try to get metadata as a fallback
      console.log("Trying to get metadata as fallback");
      const metadata = (await executePythonScript(
        "metadata",
        url
      )) as PythonScriptResult;

      if (metadata.success && metadata.metadata) {
        console.log("Creating default transcript from metadata");

        const defaultSegment = {
          id: uuidv4(),
          speakerName: "Speaker A",
          text: metadata.metadata.title || "No transcript available",
          startTime: 0,
          endTime: metadata.metadata.duration || 30,
          vocabularyItems: [],
        };

        return NextResponse.json({
          data: {
            segments: [defaultSegment],
            source: "default",
            language: lang,
            availableLanguages: [],
            notes: "Using default transcript (no transcript available)",
            video_data: {
              title: metadata.metadata.title,
              duration: metadata.metadata.duration,
              thumbnail: metadata.metadata.thumbnailUrl,
              url: url,
              webpage_url: url,
              description: metadata.metadata.description || "",
            },
          },
        });
      }

      // If all else fails, return a generic error
      return NextResponse.json(
        {
          error: "Failed to fetch transcript",
          message: result.error || "Could not retrieve transcript or metadata",
          debug: debug ? { result } : undefined,
        },
        { status: 500 }
      );
    } catch (execError: any) {
      console.error("Error executing Python script:", execError);

      // Create a default segment with the video ID as title
      const defaultSegment = {
        id: uuidv4(),
        speakerName: "Speaker A",
        text: `YouTube Video (${videoId})`,
        startTime: 0,
        endTime: 30,
        vocabularyItems: [],
      };

      // Return a default segment as a last resort
      return NextResponse.json({
        data: {
          segments: [defaultSegment],
          source: "fallback",
          language: lang,
          availableLanguages: [],
          notes: "Using fallback transcript (no data available)",
          video_data: {
            title: `YouTube Video (${videoId})`,
            duration: 30,
            thumbnail: `https://img.youtube.com/vi/${videoId}/0.jpg`,
            url: url,
            webpage_url: url,
            description: "",
          },
        },
      });
    }
  } catch (error: any) {
    console.error("Error in shorts transcript API:", error);

    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

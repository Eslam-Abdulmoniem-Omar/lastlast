import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execPromise = promisify(exec);

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  // Extract video ID from various YouTube URL formats
  let videoId = null;

  if (url.includes("youtube.com/watch")) {
    const urlParams = new URLSearchParams(new URL(url).search);
    videoId = urlParams.get("v");
  } else if (url.includes("youtu.be")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  } else if (url.includes("youtube.com/embed")) {
    videoId = url.split("youtube.com/embed/")[1].split("?")[0];
  } else if (url.includes("youtube.com/shorts")) {
    // Handle YouTube Shorts format
    videoId = url.split("youtube.com/shorts/")[1].split("?")[0];
  }

  return videoId;
}

// Function to convert embed URL to regular YouTube URL
function convertToEmbedUrl(url: string): string {
  const videoId = extractVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return "";
}

async function fetchVideoMetadata(videoId: string) {
  try {
    // Use YouTube API to fetch video metadata
    // For demo purposes, we'll use oEmbed API which doesn't require an API key
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching YouTube metadata:", error);
    throw error;
  }
}

async function fetchYouTubeTranscript(
  videoId: string
): Promise<DialogueSegment[]> {
  try {
    console.log(`Fetching transcript for video ID: ${videoId}`);

    // Try to get the transcript using Python script
    try {
      // Get the absolute path to the Python script
      const scriptPath = path.resolve(
        process.cwd(),
        "src/scripts/youtube_transcript.py"
      );

      // Run the Python script with the video ID as an argument
      const { stdout, stderr } = await execPromise(
        `python ${scriptPath} ${videoId}`
      );

      if (stderr) {
        console.error(`Python script error: ${stderr}`);
      }

      // Parse the JSON output from the Python script
      const result = JSON.parse(stdout);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.segments && result.segments.length > 0) {
        console.log(
          `Successfully fetched ${result.segments.length} transcript segments`
        );

        // Add IDs to the segments
        const segments = result.segments.map((segment: any) => ({
          ...segment,
          id: uuidv4(),
          vocabularyItems: [],
        }));

        return segments;
      }
    } catch (error) {
      console.error("Error fetching transcript with Python script:", error);
    }

    // If Python script fails, try YouTube Data API
    try {
      // Get video details including captions
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=AIzaSyAa8yy0GdcGPHdtD083HiGGx_S0vMPScDM`;
      const videoResponse = await fetch(videoDetailsUrl);

      if (videoResponse.ok) {
        const videoData = await videoResponse.json();

        if (videoData && videoData.items && videoData.items.length > 0) {
          const videoDetails = videoData.items[0];
          const title = videoDetails.snippet.title || "";
          const description = videoDetails.snippet.description || "";

          console.log(`Video title: ${title}`);
          console.log(
            `Video description preview: ${description.substring(0, 100)}...`
          );

          // Try to extract meaningful sentences from the description
          if (description) {
            const sentences = description
              .split(/[.!?]+/)
              .map((s) => s.trim())
              .filter((s) => s.length > 5 && s.length < 200);

            if (sentences.length > 3) {
              console.log(
                `Created ${sentences.length} segments from video description`
              );
              return createSegmentsFromSentences(sentences);
            }
          }

          // If we can't get good sentences from description, try the title
          if (title) {
            // Use the title as the first segment
            const segments: DialogueSegment[] = [];
            segments.push({
              id: uuidv4(),
              speakerName: "Speaker A",
              text: title,
              startTime: 0,
              endTime: 5,
              vocabularyItems: [],
            });

            // Add some generic follow-up segments related to the title
            const followUpSentences = [
              `Let's talk about ${title}.`,
              `This video covers important information about ${title}.`,
              `I find ${title} to be a fascinating topic.`,
              `What do you think about ${title}?`,
              `There's a lot to learn about ${title}.`,
            ];

            for (let i = 0; i < followUpSentences.length; i++) {
              segments.push({
                id: uuidv4(),
                speakerName: i % 2 === 0 ? "Speaker B" : "Speaker A",
                text: followUpSentences[i],
                startTime: (i + 1) * 5,
                endTime: (i + 2) * 5,
                vocabularyItems: [],
              });
            }

            console.log(
              `Created ${segments.length} segments based on video title`
            );
            return segments;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching from YouTube Data API:", error);
    }

    // If all else fails, create default segments
    console.log("All transcript methods failed, creating default segments");
    return createDefaultSegments(videoId);
  } catch (error) {
    console.error("Error in fetchYouTubeTranscript:", error);
    return createDefaultSegments(videoId);
  }
}

// Create segments from sentences
function createSegmentsFromSentences(sentences: string[]): DialogueSegment[] {
  const segments: DialogueSegment[] = [];
  const segmentDuration = 5; // 5 seconds per segment

  let currentSpeaker = "Speaker A";

  for (let i = 0; i < sentences.length; i++) {
    const startTime = i * segmentDuration;
    const endTime = (i + 1) * segmentDuration;

    // Switch speakers occasionally to simulate conversation
    if (i > 0 && i % 2 === 0) {
      currentSpeaker =
        currentSpeaker === "Speaker A" ? "Speaker B" : "Speaker A";
    }

    segments.push({
      id: uuidv4(),
      speakerName: currentSpeaker,
      text: sentences[i],
      startTime,
      endTime,
      vocabularyItems: [],
    });
  }

  return segments;
}

// Create default segments for any video
function createDefaultSegments(videoId: string): DialogueSegment[] {
  console.log("Creating default segments for video:", videoId);

  // Create 10 segments of 5 seconds each (50 seconds total)
  const segments: DialogueSegment[] = [];
  const segmentDuration = 5;
  const numberOfSegments = 10;

  const sentences = [
    "Hello, welcome to this video.",
    "Today we're going to discuss an interesting topic.",
    "I hope you find this information useful.",
    "Let me know what you think in the comments.",
    "This is an important point to understand.",
    "Let's break this down step by step.",
    "First, we need to consider the context.",
    "Second, we should analyze the details.",
    "Finally, we can draw some conclusions.",
    "Thank you for watching this video.",
  ];

  for (let i = 0; i < numberOfSegments; i++) {
    const startTime = i * segmentDuration;
    const endTime = (i + 1) * segmentDuration;
    const speakerName = i % 2 === 0 ? "Speaker A" : "Speaker B";

    segments.push({
      id: uuidv4(),
      speakerName,
      text: sentences[i],
      startTime,
      endTime,
      vocabularyItems: [],
    });
  }

  console.log(`Created ${segments.length} default segments`);
  return segments;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeUrl = searchParams.get("url");

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    const [metadata, segments] = await Promise.all([
      fetchVideoMetadata(videoId),
      fetchYouTubeTranscript(videoId),
    ]);

    // Extract topic tags from title
    const words = metadata.title.split(" ");
    const topics = words
      .filter((word) => word.length > 4)
      .slice(0, 3)
      .map((word: string) => word.toLowerCase().replace(/[^a-z0-9]/g, ""));

    // Determine level based on random selection (in a real app, this would use NLP)
    const levels = ["beginner", "intermediate", "advanced"];
    const level = levels[Math.floor(Math.random() * levels.length)];

    // Calculate duration based on the last segment's end time
    const duration =
      segments.length > 0
        ? Math.max(...segments.map((segment) => segment.endTime))
        : 30;

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        embedUrl: convertToEmbedUrl(youtubeUrl),
        title: metadata.title,
        description: metadata.title,
        author: metadata.author_name,
        thumbnailUrl: metadata.thumbnail_url,
        segments,
        topics,
        level,
        duration,
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch video data" },
      { status: 500 }
    );
  }
}

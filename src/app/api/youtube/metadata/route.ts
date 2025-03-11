import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

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
    // Use YouTube oEmbed API to fetch video metadata (doesn't require API key)
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

// Create default segments for any video
function createDefaultSegments(
  videoId: string,
  title: string = ""
): DialogueSegment[] {
  console.log("Creating default segments for video:", videoId);

  // Create 10 segments of 5 seconds each (50 seconds total)
  const segments: DialogueSegment[] = [];
  const segmentDuration = 5;
  const numberOfSegments = 10;

  // Use title-based sentences if available
  let sentences = [];
  if (title) {
    sentences = [
      `Hello, welcome to this video about ${title}.`,
      `Today we're going to discuss ${title} in detail.`,
      `${title} is an interesting topic that many people find useful.`,
      `Let me know what you think about ${title} in the comments.`,
      `Understanding ${title} is important for several reasons.`,
      `Let's break down ${title} step by step.`,
      `First, we need to consider the context of ${title}.`,
      `Second, we should analyze the details of ${title}.`,
      `Finally, we can draw some conclusions about ${title}.`,
      `Thank you for watching this video about ${title}.`,
    ];
  } else {
    sentences = [
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
  }

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

    // Fetch metadata
    const metadata = await fetchVideoMetadata(videoId);

    // Create default segments based on the video title
    const segments = createDefaultSegments(videoId, metadata.title);

    // Extract topic tags from title
    const words = metadata.title.split(" ");
    const topics = words
      .filter((word) => word.length > 4)
      .slice(0, 3)
      .map((word: string) => word.toLowerCase().replace(/[^a-z0-9]/g, ""));

    // Determine level based on random selection
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

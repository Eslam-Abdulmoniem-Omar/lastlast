import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { DialogueSegment } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    // Extract the YouTube URL from the query parameters
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    // Create static mock data instead of fetching from external sources
    const mockVideoDetails = {
      title: "Learning English Conversation",
      author_name: "English Learning Channel",
      author_url: "https://www.youtube.com/channel/example",
      thumbnail_url: "https://i.ytimg.com/vi/example/hqdefault.jpg",
      embed_url: `https://www.youtube.com/embed/${
        extractVideoId(url) || "example"
      }`,
    };

    // Create static dialogue segments
    const segments = createStaticSegments();

    // Extract topic tags from the title
    const topicTags = ["English", "Conversation", "Learning"];

    // Determine a random level
    const levels = ["Beginner", "Intermediate", "Advanced"];
    const level = levels[Math.floor(Math.random() * levels.length)];

    // Calculate duration based on segments
    const duration = segments.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime);
    }, 0);

    return NextResponse.json({
      title: mockVideoDetails.title,
      author: mockVideoDetails.author_name,
      authorUrl: mockVideoDetails.author_url,
      thumbnailUrl: mockVideoDetails.thumbnail_url,
      embedUrl: mockVideoDetails.embed_url,
      segments,
      topicTags,
      level,
      duration,
    });
  } catch (error) {
    console.error("Error in YouTube metadata route:", error);
    return NextResponse.json(
      { error: "Failed to process YouTube URL" },
      { status: 500 }
    );
  }
}

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  if (!url) return null;

  // Static mock video ID
  return "dQw4w9WgXcQ";
}

// Function to create static dialogue segments
function createStaticSegments(): DialogueSegment[] {
  const segments: DialogueSegment[] = [
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "Hello! How are you doing today?",
      startTime: 0,
      endTime: 5,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "I'm doing well, thank you. How about you?",
      startTime: 5,
      endTime: 10,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "I'm great! I've been learning English for a few months now.",
      startTime: 10,
      endTime: 15,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "That's wonderful! Your English sounds very good already.",
      startTime: 15,
      endTime: 20,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "Thank you! I practice every day. It's challenging but rewarding.",
      startTime: 20,
      endTime: 25,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "Consistency is key when learning a new language. What resources do you use?",
      startTime: 25,
      endTime: 30,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker A",
      text: "I use apps, watch videos, and try to speak with native speakers whenever possible.",
      startTime: 30,
      endTime: 35,
      vocabularyItems: [],
    },
    {
      id: uuidv4(),
      speakerName: "Speaker B",
      text: "That's a great approach. Immersion is one of the best ways to learn quickly.",
      startTime: 35,
      endTime: 40,
      vocabularyItems: [],
    },
  ];

  return segments;
}

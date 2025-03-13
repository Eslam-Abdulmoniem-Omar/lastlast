// YouTube utility functions for handling validation, conversion, and transcript fetching
import { v4 as uuidv4 } from "uuid";
import { DialogueSegment } from "@/lib/types";
import { toast } from "react-hot-toast";

/**
 * Validates if a string is a valid YouTube URL (regular or shorts)
 */
export const validateYoutubeUrl = (url: string): boolean => {
  // Simple validation for YouTube URL, including Shorts format
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts)|youtu\.?be)\/.+$/;
  return youtubeRegex.test(url);
};

/**
 * Extracts a video ID from various YouTube URL formats
 */
export const extractVideoId = (url: string): string | null => {
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
    videoId = url.split("youtube.com/shorts/")[1].split("?")[0];
  }

  return videoId;
};

/**
 * Converts a regular YouTube URL to an embed URL
 */
export const convertToEmbedUrl = (url: string): string => {
  const videoId = extractVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return "";
};

/**
 * Creates default dialogue segments when a transcript is not available
 */
export const createDefaultSegments = (): DialogueSegment[] => {
  const segments: DialogueSegment[] = [];
  const segmentDuration = 5;
  const segmentTexts = [
    "Welcome to this video.",
    "Today we'll be discussing an interesting topic.",
    "I hope you find this content useful.",
    "Let me know your thoughts in the comments.",
    "Thank you for watching!",
  ];

  for (let i = 0; i < segmentTexts.length; i++) {
    segments.push({
      id: uuidv4(),
      speakerName: "",
      text: segmentTexts[i],
      startTime: i * segmentDuration,
      endTime: (i + 1) * segmentDuration,
      vocabularyItems: [],
    });
  }

  return segments;
};

/**
 * Formats time in seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/**
 * Fetches transcript data from the YouTube API
 */
export const fetchTranscript = async (
  url: string,
  callbacks: {
    onStart?: () => void;
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
  } = {}
) => {
  if (!validateYoutubeUrl(url)) {
    if (callbacks.onError) {
      callbacks.onError(new Error("Please enter a valid YouTube URL first"));
    }
    return;
  }

  try {
    if (callbacks.onStart) {
      callbacks.onStart();
    }

    toast.loading("Fetching video transcript...");
    console.log("Fetching transcript for:", url);

    // First, try to get the video metadata directly
    const metadataUrl = `/api/youtube/metadata?url=${encodeURIComponent(
      url
    )}&t=${Date.now()}`; // Add timestamp to prevent caching
    console.log("Fetching metadata from:", metadataUrl);

    const metadataResponse = await fetch(metadataUrl);

    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json();
      console.error("Metadata API error:", errorData);
      toast.dismiss();
      throw new Error(errorData.error || "Failed to fetch video data");
    }

    const metadataJson = await metadataResponse.json();
    const metaData = metadataJson.data;

    if (!metaData) {
      toast.dismiss();
      throw new Error("No metadata returned from API");
    }

    console.log("Received metadata:", metaData);

    // Process the response
    const responseData = {
      title: metaData.title || "",
      embedUrl: metaData.embedUrl || "",
      segments: metaData.segments || [],
      transcriptSource: metaData.transcriptSource || "transcript",
    };

    if (callbacks.onSuccess) {
      callbacks.onSuccess(responseData);
    }

    // Show appropriate success message based on transcript source
    toast.dismiss();
    if (metaData.transcriptSource === "transcript") {
      toast.success(
        `Video loaded with actual transcript (${metaData.segments.length} segments)`,
        { duration: 4000 }
      );
    } else if (metaData.segments && metaData.segments.length > 0) {
      toast.success(
        `Video loaded with generated segments (${metaData.segments.length} segments)`,
        { duration: 4000 }
      );
    } else {
      toast.error("No transcript available. Using generated segments instead.");
    }

    return responseData;
  } catch (error: any) {
    console.error("Error fetching YouTube data:", error);
    toast.dismiss();
    toast.error(
      "Failed to load video details. Using generated segments instead."
    );

    if (callbacks.onError) {
      callbacks.onError(error);
    }

    return null;
  } finally {
    if (callbacks.onComplete) {
      callbacks.onComplete();
    }
  }
};

/**
 * Create a temporary practice session in localStorage
 */
export const saveTemporaryPracticeData = (data: {
  id?: string;
  title: string;
  embedUrl: string;
  youtubeUrl: string;
  dialogueSegments: DialogueSegment[];
  isTemporary?: boolean;
}) => {
  const practiceData = {
    id: data.id || `temp-${uuidv4()}`,
    title: data.title || "YouTube Video",
    embedUrl: data.embedUrl,
    youtubeUrl: data.youtubeUrl,
    dialogueSegments: data.dialogueSegments,
    isTemporary: data.isTemporary !== undefined ? data.isTemporary : true,
    createdAt: new Date().toISOString(),
  };

  // Save to localStorage
  localStorage.setItem("current-practice-data", JSON.stringify(practiceData));
  console.log("Saved practice data to localStorage:", practiceData);

  return practiceData;
};

/**
 * Get transcript source information styling and message
 */
export const getTranscriptSourceInfo = (transcriptSource: string) => {
  const getColorClass = () => {
    switch (transcriptSource) {
      case "transcript":
        return "text-green-700 bg-green-50";
      case "transcript-processed":
        return "text-green-700 bg-green-50";
      case "description":
        return "text-blue-700 bg-blue-50";
      case "title":
        return "text-yellow-700 bg-yellow-50";
      default:
        return "text-gray-700 bg-gray-50";
    }
  };

  const getMessage = () => {
    switch (transcriptSource) {
      case "transcript":
        return "These segments contain the actual transcript from the video with accurate timestamps.";
      case "transcript-processed":
        return "These segments contain the actual transcript from the video, processed by AI for better sentence breaks and timestamps.";
      case "description":
        return "These segments are created from the video description since a transcript wasn't available.";
      case "title":
        return "These segments are based on the video title since a transcript wasn't available.";
      default:
        return "No transcript was available for this video, so generated segments were created.";
    }
  };

  return {
    colorClass: getColorClass(),
    message: getMessage(),
  };
};

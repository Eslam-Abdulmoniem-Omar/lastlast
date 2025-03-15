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
  // Return an empty array instead of default segments
  // This will prevent the app from showing placeholder text
  return [];

  // Old implementation commented out
  /*
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
  */
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
 * Returns appropriate info for the transcript source display
 */
export const getTranscriptSourceInfo = (source: string) => {
  switch (source) {
    case "transcript":
      return {
        message:
          "This transcript was sourced directly from YouTube captions. The segments may require some editing for accuracy.",
        colorClass: "bg-green-50 text-green-700 border border-green-200",
      };
    case "default":
      return {
        message:
          "No transcript was available for this video. Using default segments that you should edit.",
        colorClass: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      };
    case "unavailable":
      return {
        message:
          "No transcript could be found for this video. Please add dialogue segments manually.",
        colorClass: "bg-red-50 text-red-700 border border-red-200",
      };
    default:
      return {
        message: "Transcript source unknown.",
        colorClass: "bg-gray-50 text-gray-700 border border-gray-200",
      };
  }
};

/**
 * Alias for extractVideoId - used by some components
 */
export const extractYouTubeVideoId = extractVideoId;

/**
 * Generates transcript URL for YouTube videos
 */
export const generateTranscriptUrl = (videoId: string): string => {
  return `/api/youtube/metadata?url=https://www.youtube.com/watch?v=${videoId}&t=${Date.now()}`;
};

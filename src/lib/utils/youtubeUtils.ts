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
  console.log("[Utils] createDefaultSegments called - returning empty array");
  return [];
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

    console.log("[Utils] Fetching transcript for:", url);

    // Add a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log("[Utils] Aborting fetch due to timeout");
    }, 30000); // 30 second timeout

    try {
      // First, try to get the video metadata directly
      const metadataUrl = `/api/youtube/metadata?url=${encodeURIComponent(
        url
      )}&t=${Date.now()}`; // Add timestamp to prevent caching

      console.log("[Utils] Fetching metadata from:", metadataUrl);

      const metadataResponse = await fetch(metadataUrl, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      // Clear the timeout since the fetch completed
      clearTimeout(timeoutId);

      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        console.error("[Utils] Metadata API error response:", errorText);
        toast.dismiss();
        throw new Error(
          `API responded with ${metadataResponse.status}: ${errorText.substring(
            0,
            100
          )}`
        );
      }

      const metadataJson = await metadataResponse.json();
      console.log("[Utils] Metadata API response type:", typeof metadataJson);
      console.log(
        "[Utils] Metadata API response keys:",
        Object.keys(metadataJson)
      );

      const metaData = metadataJson.data;

      if (!metaData) {
        toast.dismiss();
        throw new Error("No metadata returned from API");
      }

      console.log(
        "[Utils] Received metadata:",
        JSON.stringify({
          title: metaData.title || "No title",
          segments: metaData.segments ? metaData.segments.length : 0,
          transcriptSource: metaData.transcriptSource || "unknown",
        })
      );

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
      if (
        metaData.transcriptSource === "transcript" &&
        metaData.segments &&
        metaData.segments.length > 0
      ) {
        toast.success(
          `Video loaded with transcript (${metaData.segments.length} segments)`,
          { duration: 4000 }
        );
      } else if (metaData.segments && metaData.segments.length > 0) {
        toast.success(`Video loaded (${metaData.segments.length} segments)`, {
          duration: 4000,
        });
      } else {
        toast.error(
          "No transcript available. You'll need to add segments manually."
        );
      }

      return responseData;
    } catch (fetchError) {
      // Clear the timeout if the fetch failed
      clearTimeout(timeoutId);

      console.error("[Utils] Fetch error:", fetchError);
      throw fetchError;
    }
  } catch (error: any) {
    console.error("[Utils] Error fetching YouTube data:", error);
    toast.dismiss();
    toast.error(
      `Failed to load video details: ${
        error.message?.substring(0, 100) || "Unknown error"
      }`
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

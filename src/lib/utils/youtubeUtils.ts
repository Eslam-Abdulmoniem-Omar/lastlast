// YouTube utility functions for handling validation, conversion, and transcript fetching
import { v4 as uuidv4 } from "uuid";
import { DialogueSegment } from "@/lib/types";
import { toast } from "react-hot-toast";
import axios from "axios";

// Webshare proxy configuration
const proxyConfig = {
  host: "proxy.webshare.io",
  port: 80,
  auth: {
    username: process.env.NEXT_PUBLIC_WEBSHARE_PROXY_USERNAME || "iacqerjk",
    password: process.env.NEXT_PUBLIC_WEBSHARE_PROXY_PASSWORD || "fijay69twvxo",
  },
};

// Axios client with proxy configuration
const proxyClient = axios.create({
  proxy: proxyConfig,
});

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
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  } else if (url.includes("youtube.com/embed")) {
    videoId = url.split("youtube.com/embed/")[1]?.split("?")[0];
  } else if (url.includes("youtube.com/shorts")) {
    videoId = url.split("youtube.com/shorts/")[1]?.split("?")[0];
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
 * Fetches YouTube transcript directly using axios with Webshare proxy
 */
export const fetchTranscriptWithProxy = async (
  videoId: string
): Promise<any> => {
  try {
    console.log(
      "[Utils] Fetching transcript with Webshare proxy for video ID:",
      videoId
    );

    // Try to fetch transcript via YouTube's API directly using the proxy
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // First, try to get the video page to extract transcript data
    const response = await proxyClient.get(youtubeUrl, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    console.log("[Utils] Successfully fetched YouTube page via proxy");

    // If we successfully got the page, try to fetch the transcript using the Python API
    // The Python API will handle extracting and processing the transcript
    const pythonApiUrl = `/api/youtube/python-transcript?url=${encodeURIComponent(
      youtubeUrl
    )}&t=${Date.now()}`;

    const transcriptResponse = await fetch(pythonApiUrl, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Python API responded with ${transcriptResponse.status}`);
    }

    const transcriptData = await transcriptResponse.json();

    if (
      transcriptData.data &&
      transcriptData.data.segments &&
      transcriptData.data.segments.length > 0
    ) {
      console.log(
        "[Utils] Successfully got transcript data from Python API after proxy fetch"
      );
      return transcriptData.data;
    }

    throw new Error("No transcript segments found in response");
  } catch (error) {
    console.error("[Utils] Error fetching transcript with proxy:", error);
    throw error;
  }
};

/**
 * Fetches transcript data from the YouTube API with improved error handling and retry logic
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

    // Extract video ID for better error reporting
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error("Could not extract video ID from URL");
    }

    // Implementation with retry logic
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 10000; // 10 seconds instead of 30

    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[Utils] Retry attempt ${attempt} of ${MAX_RETRIES}`);
        // Wait before retry with exponential backoff
        await new Promise((r) =>
          setTimeout(r, 1000 * Math.pow(2, attempt - 1))
        );
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.log("[Utils] Aborting fetch due to timeout");
        }, TIMEOUT_MS);

        // First try the RapidAPI-based endpoint which is more reliable
        try {
          console.log("[Utils] Trying RapidAPI transcript service first...");
          const rapidApiTranscriptUrl = `/api/youtube/rapidapi-transcript?url=${encodeURIComponent(
            url
          )}&t=${Date.now()}`;

          const rapidApiResponse = await fetch(rapidApiTranscriptUrl, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          let rapidApiErrorDetail = "";

          if (rapidApiResponse.ok) {
            const rapidApiData = await rapidApiResponse.json();

            // Check if the response contains an error
            if (rapidApiData.error) {
              rapidApiErrorDetail = rapidApiData.error;
              console.warn(
                `[Utils] RapidAPI returned error: ${rapidApiData.error}`
              );
              // Don't throw, just fall through to next method
            } else if (
              rapidApiData.data &&
              rapidApiData.data.segments &&
              rapidApiData.data.segments.length > 0
            ) {
              console.log(
                `[Utils] Successfully fetched transcript from RapidAPI service (${rapidApiData.data.segments.length} segments)`
              );

              // If the response includes a title and embed URL, use those
              if (rapidApiData.data.title) {
                // The full data already contains everything needed, return it
                clearTimeout(timeoutId);

                if (callbacks.onSuccess) {
                  callbacks.onSuccess({
                    segments: rapidApiData.data.segments,
                    transcriptSource: "rapidapi",
                    title: rapidApiData.data.title,
                    embedUrl: rapidApiData.data.embedUrl,
                    youtubeUrl: url,
                  });
                }

                if (callbacks.onComplete) {
                  callbacks.onComplete();
                }

                return;
              } else {
                // Otherwise, get metadata separately for title, etc.
                const metadataUrl = `/api/youtube/metadata?url=${encodeURIComponent(
                  url
                )}&t=${Date.now()}`;

                try {
                  const metadataResponse = await fetch(metadataUrl, {
                    signal: controller.signal,
                  });

                  if (metadataResponse.ok) {
                    const metadataData = await metadataResponse.json();

                    clearTimeout(timeoutId);

                    if (callbacks.onSuccess) {
                      callbacks.onSuccess({
                        segments: rapidApiData.data.segments,
                        transcriptSource: "rapidapi",
                        title: metadataData.title || "YouTube Video",
                        description: metadataData.description || "",
                        thumbnail: metadataData.thumbnail || "",
                        embedUrl: convertToEmbedUrl(url),
                        youtubeUrl: url,
                      });
                    }

                    if (callbacks.onComplete) {
                      callbacks.onComplete();
                    }

                    return;
                  }
                } catch (error) {
                  console.error("[Utils] Error fetching metadata:", error);
                  // Continue with fallback options
                }
              }
            } else {
              console.warn(
                "[Utils] RapidAPI returned no segments, falling back to other methods"
              );
            }
          } else {
            // Try to get more details about the error
            try {
              const errorData = await rapidApiResponse.json();
              rapidApiErrorDetail =
                errorData.error || `Status: ${rapidApiResponse.status}`;
            } catch (e) {
              rapidApiErrorDetail = `Status: ${rapidApiResponse.status}`;
            }
            console.warn(
              `[Utils] RapidAPI request failed: ${rapidApiErrorDetail}`
            );
          }

          // Log the failure but don't throw an error - just continue to the next method
          console.log(
            `[Utils] RapidAPI transcript method failed: ${
              rapidApiErrorDetail || "Unknown error"
            }. Trying next method...`
          );
        } catch (error) {
          console.error("[Utils] Error with RapidAPI transcript:", error);
          // Continue to next method if this fails
        }

        // Fall back to Python-based API if RapidAPI fails
        try {
          console.log("[Utils] Falling back to Python-based transcript API...");
          const pythonTranscriptUrl = `/api/youtube/python-transcript?url=${encodeURIComponent(
            url
          )}&t=${Date.now()}`;

          const pythonResponse = await fetch(pythonTranscriptUrl, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          if (pythonResponse.ok) {
            const pythonData = await pythonResponse.json();

            if (
              pythonData.data &&
              pythonData.data.segments &&
              pythonData.data.segments.length > 0
            ) {
              console.log(
                "[Utils] Successfully fetched transcript from Python API"
              );

              // Get metadata separately for title, etc.
              const metadataUrl = `/api/youtube/metadata?url=${encodeURIComponent(
                url
              )}&t=${Date.now()}`;

              const metadataResponse = await fetch(metadataUrl, {
                signal: controller.signal,
                headers: {
                  "Cache-Control": "no-cache",
                  Pragma: "no-cache",
                },
              });

              const metadataJson = await metadataResponse.json();

              // Combine Python segments with metadata
              const responseData = {
                title: metadataJson.data?.title || "",
                embedUrl: metadataJson.data?.embedUrl || convertToEmbedUrl(url),
                segments: pythonData.data.segments,
                transcriptSource: "python-transcript-api",
              };

              if (callbacks.onSuccess) {
                callbacks.onSuccess(responseData);
              }

              toast.dismiss();
              toast.success(
                `Video loaded with transcript (${pythonData.data.segments.length} segments)`,
                {
                  duration: 4000,
                }
              );

              clearTimeout(timeoutId);
              return;
            }
          }

          console.log(
            "[Utils] Python API failed or returned no segments, trying direct proxy approach..."
          );
        } catch (pythonError) {
          console.error(
            "[Utils] Error with Python transcript API:",
            pythonError
          );
          // Fall through to the next method
        }

        // Try using axios with direct proxy
        try {
          console.log("[Utils] Trying direct Axios with Webshare proxy...");
          const proxyData = await fetchTranscriptWithProxy(videoId);

          if (
            proxyData &&
            proxyData.segments &&
            proxyData.segments.length > 0
          ) {
            // Get metadata separately for title, etc.
            const metadataUrl = `/api/youtube/metadata?url=${encodeURIComponent(
              url
            )}&t=${Date.now()}`;

            const metadataResponse = await fetch(metadataUrl, {
              signal: controller.signal,
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            });

            const metadataJson = await metadataResponse.json();

            // Combine proxy segments with metadata
            const responseData = {
              title: metadataJson.data?.title || "",
              embedUrl: metadataJson.data?.embedUrl || convertToEmbedUrl(url),
              segments: proxyData.segments,
              transcriptSource: "proxy-transcript-api",
            };

            if (callbacks.onSuccess) {
              callbacks.onSuccess(responseData);
            }

            toast.dismiss();
            toast.success(
              `Video loaded with transcript (${proxyData.segments.length} segments)`,
              {
                duration: 4000,
              }
            );

            clearTimeout(timeoutId);
            return;
          }

          console.log(
            "[Utils] Direct proxy approach failed, trying metadata API..."
          );
        } catch (proxyError) {
          console.error(
            "[Utils] Error with direct proxy approach:",
            proxyError
          );
          // Fall through to the regular metadata API
        }

        // Add environment indicator and timestamp to help with debugging
        const metadataUrl = `/api/youtube/metadata?url=${encodeURIComponent(
          url
        )}&t=${Date.now()}`;

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
          console.error(
            `[Utils] Metadata API error response (${metadataResponse.status}):`,
            errorText
          );

          // If we get a 429 (rate limit) or 503 (service unavailable), we should retry
          if ([429, 503].includes(metadataResponse.status)) {
            lastError = new Error(
              `API rate limited: ${metadataResponse.status}`
            );
            continue; // Try next attempt
          }

          toast.dismiss();
          throw new Error(
            `API responded with ${
              metadataResponse.status
            }: ${errorText.substring(0, 100)}`
          );
        }

        const metadataJson = await metadataResponse.json();
        console.log(
          "[Utils] Metadata API response keys:",
          Object.keys(metadataJson)
        );

        // Check if the API returned an error about video length
        if (metadataJson.error && metadataJson.error.includes("too long")) {
          toast.dismiss();
          toast.error(
            "This video is too long. Please use videos under 2 minutes in length."
          );
          throw new Error("Video is too long (maximum 2 minutes allowed)");
        }

        // Check if the data includes isTooLong flag
        if (metadataJson.data && metadataJson.data.isTooLong) {
          toast.dismiss();
          toast.error(
            "This video is too long. Please use videos under 2 minutes in length."
          );
          throw new Error("Video is too long (maximum 2 minutes allowed)");
        }

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
      } catch (fetchError: any) {
        // Clear the timeout if the fetch failed
        lastError = fetchError;
        console.error(
          `[Utils] Fetch error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
          fetchError
        );

        // Only continue to retry if we haven't exceeded max retries
        if (attempt < MAX_RETRIES) {
          continue;
        }

        // If we've used all retries, throw the last error
        throw fetchError;
      }
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
    if (transcriptSource === "youtube-api" || transcriptSource === "yt-api") {
      return "text-green-600 border-green-300 bg-green-50";
    } else if (
      transcriptSource === "python-transcript-api" ||
      transcriptSource === "python"
    ) {
      return "text-blue-600 border-blue-300 bg-blue-50";
    } else if (
      transcriptSource === "rapidapi" ||
      transcriptSource === "rapidapi-transcript"
    ) {
      return "text-purple-600 border-purple-300 bg-purple-50";
    } else if (transcriptSource === "manual") {
      return "text-amber-600 border-amber-300 bg-amber-50";
    } else {
      return "text-gray-600 border-gray-300 bg-gray-50";
    }
  };

  const getMessage = () => {
    if (transcriptSource === "youtube-api" || transcriptSource === "yt-api") {
      return "Professional transcript from YouTube API";
    } else if (
      transcriptSource === "python-transcript-api" ||
      transcriptSource === "python"
    ) {
      return "Auto-generated transcript from YouTube";
    } else if (
      transcriptSource === "rapidapi" ||
      transcriptSource === "rapidapi-transcript"
    ) {
      return "Transcript fetched via RapidAPI";
    } else if (transcriptSource === "manual") {
      return "Manually entered transcript";
    } else if (transcriptSource === "default") {
      return "Default transcript template";
    } else {
      return "Transcript source unknown";
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

// Add validation function for TikTok URLs
export const validateTikTokUrl = (url: string): boolean => {
  const tiktokRegex = /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.+$/;
  return tiktokRegex.test(url);
};

// Function to fetch TikTok transcript
export const fetchTikTokTranscript = async (
  url: string,
  callbacks: {
    onStart?: () => void;
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
  } = {}
) => {
  if (!validateTikTokUrl(url)) {
    if (callbacks.onError) {
      callbacks.onError(new Error("Please enter a valid TikTok URL"));
    }
    return;
  }

  try {
    if (callbacks.onStart) {
      callbacks.onStart();
    }

    console.log("[Utils] Fetching TikTok transcript for:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log("[Utils] Aborting TikTok fetch due to timeout");
    }, 15000);

    try {
      console.log("[Utils] Calling TikTok transcript API...");
      const tiktokApiUrl = `/api/tiktok/transcript?url=${encodeURIComponent(
        url
      )}&t=${Date.now()}`;

      const response = await fetch(tiktokApiUrl, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.data && data.data.segments && data.data.segments.length > 0) {
          console.log("[Utils] Successfully fetched TikTok transcript");

          clearTimeout(timeoutId);

          if (callbacks.onSuccess) {
            callbacks.onSuccess({
              segments: data.data.segments,
              transcriptSource: "tiktok-rapidapi",
              title: data.data.title || "TikTok Video",
              embedUrl: url,
              tiktokUrl: url,
            });
          }

          if (callbacks.onComplete) {
            callbacks.onComplete();
          }

          return;
        } else if (data.error) {
          throw new Error(data.error);
        }
      } else {
        throw new Error(`API responded with ${response.status}`);
      }
    } catch (error) {
      console.error("[Utils] Error fetching TikTok transcript:", error);

      clearTimeout(timeoutId);

      if (callbacks.onError) {
        callbacks.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } finally {
      if (callbacks.onComplete) {
        callbacks.onComplete();
      }
    }
  } catch (error) {
    console.error("[Utils] Unhandled error in fetchTikTokTranscript:", error);

    if (callbacks.onError) {
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (callbacks.onComplete) {
      callbacks.onComplete();
    }
  }
};

// Function to determine if a URL is for YouTube or TikTok and fetch appropriate transcript
export const fetchVideoTranscript = async (
  url: string,
  callbacks: {
    onStart?: () => void;
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
  } = {}
) => {
  if (validateYoutubeUrl(url)) {
    return fetchTranscript(url, callbacks);
  } else if (validateTikTokUrl(url)) {
    return fetchTikTokTranscript(url, callbacks);
  } else {
    if (callbacks.onError) {
      callbacks.onError(
        new Error("Please enter a valid YouTube or TikTok URL")
      );
    }
    if (callbacks.onComplete) {
      callbacks.onComplete();
    }
  }
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "edge";

import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { YoutubeTranscript } from "youtube-transcript";
import { OpenAI } from "openai";
import axios from "axios";

// Set a longer timeout for the API function (config is handled differently in App Router)
export const maxDuration = 60; // 60 seconds maximum duration

// Check if OpenAI API key is available
const isOpenAIConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY;
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Log OpenAI status on startup
console.log(
  "[API] YouTube metadata route loaded, OpenAI API configured:",
  isOpenAIConfigured()
);

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  // Extract video ID from various YouTube URL formats
  let videoId = null;

  try {
    if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(new URL(url).search);
      videoId = urlParams.get("v");
    } else if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/embed")) {
      videoId = url.split("youtube.com/embed/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/shorts")) {
      // Handle YouTube Shorts format
      videoId = url.split("youtube.com/shorts/")[1]?.split("?")[0];
    }
  } catch (error) {
    console.error("[API] Error extracting video ID:", error);
  }

  return videoId;
}

// Function to convert URL to embed URL
function convertToEmbedUrl(url: string): string {
  const videoId = extractVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return "";
}

// Function to fetch basic video metadata
async function fetchVideoMetadata(videoId: string) {
  try {
    console.log(`[API] Fetching basic metadata for video ID: ${videoId}`);

    // Set timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      // First try to get video details including duration using YouTube API
      const apiKey =
        process.env.YOUTUBE_API_KEY ||
        "AIzaSyAa8yy0GdcGPHdtD083HiGGx_S0vMPScDM";
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

      try {
        const videoDetailsResponse = await fetch(videoDetailsUrl, {
          signal: controller.signal,
        });
        if (videoDetailsResponse.ok) {
          const videoDetails = await videoDetailsResponse.json();

          if (
            videoDetails &&
            videoDetails.items &&
            videoDetails.items.length > 0
          ) {
            // Extract duration in ISO 8601 format (PT#M#S)
            const durationISO = videoDetails.items[0].contentDetails.duration;
            // Parse duration from ISO format to seconds
            const durationSeconds = parseDuration(durationISO);

            console.log(`[API] Video duration: ${durationSeconds} seconds`);

            // Check if video is longer than 2 minutes (120 seconds)
            if (durationSeconds > 120) {
              console.log(
                `[API] Video is too long: ${durationSeconds} seconds (max 120)`
              );
              return {
                title: videoDetails.items[0].snippet.title || "Video Title",
                author_name:
                  videoDetails.items[0].snippet.channelTitle ||
                  "Unknown Creator",
                thumbnail_url:
                  videoDetails.items[0].snippet.thumbnails?.high?.url ||
                  `https://img.youtube.com/vi/${videoId}/0.jpg`,
                duration: durationSeconds,
                isTooLong: true,
              };
            }

            // Return full metadata with duration
            return {
              title: videoDetails.items[0].snippet.title || "Video Title",
              author_name:
                videoDetails.items[0].snippet.channelTitle || "Unknown Creator",
              thumbnail_url:
                videoDetails.items[0].snippet.thumbnails?.high?.url ||
                `https://img.youtube.com/vi/${videoId}/0.jpg`,
              duration: durationSeconds,
            };
          }
        }
      } catch (apiError) {
        console.error(
          "[API] Error fetching video details from YouTube API:",
          apiError
        );
        // Continue with fallback method
      }

      // If API fails, try oEmbed as fallback (note: oEmbed doesn't provide duration)
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      // Check if the response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error(
          "[API] YouTube oEmbed API returned non-JSON response:",
          contentType
        );
        return {
          title: "Video Information Unavailable",
          author_name: "Unknown Creator",
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
        };
      }

      const data = await response.json();
      console.log(
        `[API] Successfully fetched basic metadata for ${videoId}: "${data.title}"`
      );
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error("[API] Error fetching YouTube metadata:", error);
    return {
      title: "Video Information Unavailable",
      author_name: "Unknown Creator",
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
    };
  }
}

// Helper function to parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

// Process transcript with GPT
async function processTranscriptWithGPT(
  rawText: string,
  videoTitle: string,
  originalTimingData?: { text: string; startTime: number; endTime: number }[]
): Promise<DialogueSegment[]> {
  try {
    console.log("[API] Processing transcript with GPT...");

    if (!isOpenAIConfigured()) {
      console.log("[API] OpenAI API not configured, skipping GPT processing");
      return [];
    }

    // Truncate extremely long transcripts to avoid token limits
    let processableText = rawText;
    const MAX_TEXT_LENGTH = 15000; // Around 3-4k tokens, which is safe for 4k context models

    if (rawText.length > MAX_TEXT_LENGTH) {
      console.log(
        `[API] Transcript too long (${rawText.length} chars), truncating to ${MAX_TEXT_LENGTH} chars`
      );
      processableText = rawText.substring(0, MAX_TEXT_LENGTH) + "...";
    }

    // Enhanced prompt with sophisticated dialogue detection
    const prompt = `
You are an expert linguist specializing in dialogue analysis and natural conversation patterns.

TASK:
Convert this YouTube transcript into a realistic conversation with precise speaker changes.

TRANSCRIPT FROM VIDEO "${videoTitle}":
${processableText}

DIALOGUE ANALYSIS GUIDELINES:
1. Look for these KEY INDICATORS of speaker changes:
   - Questions followed by answers
   - Statements followed by reactions or contradictions
   - Shifts in perspective, opinion, or tone
   - Phrases like "I think," "but," "well," that suggest a new speaker
   - Exclamations or strong emotional statements that indicate reactions
   
2. Pay close attention to CONVERSATIONAL PATTERNS:
   - When someone asks a question, the next line is usually a different speaker
   - When someone makes a statement, and the next line contradicts or expresses surprise, it's a different speaker
   - Look for back-and-forth exchanges where speakers are responding to each other
   
3. Analyze SENTENCE STRUCTURE:
   - Short reactions like "That's crazy!" are often from a different speaker than what follows
   - When a statement is echoed with surprise ("What? That's not impressive?"), it's typically a different speaker

FORMAT YOUR RESPONSE:
Return a JSON object with a "segments" array where each segment has:
1. "speakerName": Alternate between "Speaker A" and "Speaker B" based on natural dialogue flow
2. "text": The exact text for that dialogue turn

{
  "segments": [
    {
      "speakerName": "Speaker A",
      "text": "First speaker's dialogue"
    },
    {
      "speakerName": "Speaker B",
      "text": "Second speaker's response"
    },
    ...
  ]
}

IMPORTANT:
- Start with "Speaker A" for the first segment
- Create a new speaker segment whenever there's a natural conversation turn
- Break at natural pauses in speech or when the topic or speaker changes
- Maintain the original meaning and content
- Make dialogue segments feel natural and conversational
`;

    // Set timeout for OpenAI call
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(
        () => reject(new Error("OpenAI request timed out after 20 seconds")),
        20000
      );
    });

    // Make the OpenAI API call with a timeout race
    const responsePromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert dialogue analyst who can detect subtle conversational shifts and natural speaker changes in text. You always return properly formatted JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const response = (await Promise.race([
      responsePromise,
      timeoutPromise,
    ])) as any;
    if (!response) throw new Error("Empty response from OpenAI");

    // Parse the response with better error handling
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error("[API] Empty response from GPT");
      return [];
    }

    try {
      // Ensure we're parsing valid JSON
      const parsedResponse = JSON.parse(content);

      // Validate the response format
      if (
        !parsedResponse.segments ||
        !Array.isArray(parsedResponse.segments) ||
        parsedResponse.segments.length === 0
      ) {
        console.error("[API] Invalid response format from GPT:", content);
        return [];
      }

      // Ensure each segment has the required properties
      const validSegments = parsedResponse.segments.filter(
        (segment: { speakerName: string; text: string }) =>
          segment.speakerName && segment.text
      );

      if (validSegments.length === 0) {
        console.error("[API] No valid segments found in GPT response");
        return [];
      }

      // Log success
      console.log(
        `[API] GPT created ${validSegments.length} intelligent segments`
      );

      // Map segments to timing data
      let dialogueSegments: DialogueSegment[] = [];

      if (originalTimingData && originalTimingData.length > 0) {
        console.log("[API] Using original timing data to map GPT segments");
        const videoDuration =
          originalTimingData[originalTimingData.length - 1].endTime;

        // Map segments based on text similarity
        dialogueSegments = mapGptSegmentsToTiming(
          validSegments,
          originalTimingData,
          videoDuration
        );
      } else {
        console.log(
          "[API] No original timing data available, using estimated timing"
        );
        const totalDuration = 120; // Default 2 minutes if no timing data

        // Calculate estimated durations based on text length
        const totalTextLength = validSegments.reduce(
          (sum: number, segment: { text: string }) => sum + segment.text.length,
          0
        );

        let currentTime = 0;
        dialogueSegments = validSegments.map(
          (segment: { speakerName: string; text: string }) => {
            // Estimate duration based on text length proportion with some variation
            const proportion = segment.text.length / totalTextLength;
            const estimatedDuration = totalDuration * proportion;
            const variationFactor = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
            const adjustedDuration = estimatedDuration * variationFactor;

            const startTime = currentTime;
            const endTime = currentTime + adjustedDuration;
            currentTime = endTime;

            return {
              id: uuidv4(),
              speakerName: segment.speakerName,
              text: segment.text,
              startTime,
              endTime,
              vocabularyItems: [],
            };
          }
        );
      }

      return dialogueSegments;
    } catch (parseError) {
      console.error("[API] Error parsing GPT response:", parseError);
      return [];
    }
  } catch (error) {
    console.error("[API] Error using GPT for transcript processing:", error);
    return [];
  }
}

// Map GPT segments to original timing data
function mapGptSegmentsToTiming(
  gptSegments: { speakerName: string; text: string }[],
  originalTimingData: { text: string; startTime: number; endTime: number }[],
  totalDuration: number
): DialogueSegment[] {
  // Create a single string from original transcript for alignment
  const originalFullText = originalTimingData
    .map((item) => item.text)
    .join(" ");

  // Build a mapping of text positions to timestamps
  const timeMap: Record<number, number> = {};
  let position = 0;

  originalTimingData.forEach((item) => {
    timeMap[position] = item.startTime;
    position += item.text.length + 1; // +1 for space
  });

  // Add end position
  timeMap[position] = totalDuration;

  // Map segments to timestamps
  const mappedSegments: DialogueSegment[] = [];

  gptSegments.forEach((segment, index) => {
    const segmentText = segment.text.trim();

    // Find best position in original text
    let bestPosition = -1;
    let bestMatch = 0;

    // Simple text matching algorithm
    for (let i = 0; i < originalFullText.length - 10; i++) {
      const window = Math.min(20, segmentText.length);
      if (i + window <= originalFullText.length) {
        const originalSubstring = originalFullText.substring(i, i + window);
        const segmentSubstring = segmentText.substring(0, window);

        let matches = 0;
        for (let j = 0; j < window; j++) {
          if (originalSubstring[j] === segmentSubstring[j]) matches++;
        }

        const matchRatio = matches / window;
        if (matchRatio > 0.7 && matchRatio > bestMatch) {
          bestMatch = matchRatio;
          bestPosition = i;
        }
      }
    }

    if (bestPosition >= 0) {
      // Find the closest timestamp before this position
      const timePositions = Object.keys(timeMap)
        .map(Number)
        .sort((a, b) => a - b);
      let startPos = timePositions[0];
      let endPos = timePositions[timePositions.length - 1];

      for (let i = 0; i < timePositions.length; i++) {
        if (timePositions[i] <= bestPosition) {
          startPos = timePositions[i];
        } else {
          endPos = timePositions[i];
          break;
        }
      }

      // Calculate proportional times
      const posRange = endPos - startPos;
      const timeRange = timeMap[endPos] - timeMap[startPos];
      const relativePos = (bestPosition - startPos) / posRange;

      let segmentStartTime = timeMap[startPos] + timeRange * relativePos;
      const duration = (segmentText.length / 20) * 5; // ~4 chars per second with variation
      let segmentEndTime = segmentStartTime + duration;

      // Ensure no overlap with previous segment
      if (mappedSegments.length > 0) {
        const prevSegment = mappedSegments[mappedSegments.length - 1];
        if (segmentStartTime < prevSegment.endTime) {
          segmentStartTime = prevSegment.endTime;
          segmentEndTime = segmentStartTime + duration;
        }
      }

      // Ensure we don't exceed video duration
      if (segmentEndTime > totalDuration) {
        segmentEndTime = totalDuration;
      }

      mappedSegments.push({
        id: uuidv4(),
        speakerName: segment.speakerName,
        text: segmentText,
        startTime: segmentStartTime,
        endTime: segmentEndTime,
        vocabularyItems: [],
      });
    } else {
      // Fallback for segments we couldn't map
      const prevSegmentEnd =
        mappedSegments.length > 0
          ? mappedSegments[mappedSegments.length - 1].endTime
          : 0;

      const duration = Math.max(2, segmentText.length / 20);

      mappedSegments.push({
        id: uuidv4(),
        speakerName: segment.speakerName,
        text: segmentText,
        startTime: prevSegmentEnd,
        endTime: prevSegmentEnd + duration,
        vocabularyItems: [],
      });
    }
  });

  return mappedSegments;
}

// Fetch transcript data using multiple methods with fallbacks
async function fetchYouTubeTranscript(
  videoId: string,
  videoTitle: string = ""
): Promise<{ segments: DialogueSegment[]; source: string }> {
  console.log(`[API] Fetching transcript for video ID: ${videoId}`);

  // Use AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    // Method 1: Try using Innertube API (YouTube's internal API)
    try {
      console.log("[API] Attempting to fetch transcript using Innertube API");

      const response = await axios.get(
        `https://www.youtube.com/watch?v=${videoId}&hl=en`,
        {
          timeout: 5000,
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        }
      );

      const html = response.data;
      const ytInitialDataMatch = html.match(/ytInitialData\s*=\s*({.+?});/);
      const playerResponse = html.match(
        /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/
      );

      if (ytInitialDataMatch && playerResponse) {
        const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
        const playerData = JSON.parse(playerResponse[1]);

        // Extract captions data
        if (
          playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks
        ) {
          const captionTracks =
            playerData.captions.playerCaptionsTracklistRenderer.captionTracks;
          const captionTrack =
            captionTracks.find((track: any) => track.languageCode === "en") ||
            captionTracks[0];

          if (captionTrack) {
            const transcriptResponse = await axios.get(captionTrack.baseUrl, {
              timeout: 5000,
            });
            const xmlData = transcriptResponse.data;
            const textSegments = xmlData.match(/<text.+?>.+?<\/text>/g) || [];

            if (textSegments.length > 0) {
              const rawSegments = textSegments.map((segment: string) => {
                const startMatch = segment.match(/start="([\d\.]+)"/);
                const durMatch = segment.match(/dur="([\d\.]+)"/);
                const textMatch = segment.match(/>(.+?)</);

                return {
                  text: textMatch ? decodeHTMLEntities(textMatch[1]) : "",
                  startTime: startMatch ? parseFloat(startMatch[1]) : 0,
                  duration: durMatch ? parseFloat(durMatch[1]) : 5,
                };
              });

              // If we have OpenAI, try to process with GPT
              if (isOpenAIConfigured() && rawSegments.length > 0) {
                try {
                  const combinedText = rawSegments
                    .map((seg: { text: string }) => seg.text)
                    .join(" ");
                  const originalTimingData = rawSegments.map(
                    (item: {
                      text: string;
                      startTime: number;
                      duration: number;
                    }) => ({
                      text: item.text,
                      startTime: item.startTime,
                      endTime: item.startTime + item.duration,
                    })
                  );

                  const gptSegments = await processTranscriptWithGPT(
                    combinedText,
                    videoTitle,
                    originalTimingData
                  );

                  if (gptSegments.length > 0) {
                    console.log(
                      "[API] Using GPT-processed segments from Innertube API"
                    );
                    return {
                      segments: gptSegments,
                      source: "transcript",
                    };
                  }
                } catch (gptError) {
                  console.error(
                    "[API] Error processing with GPT, falling back:",
                    gptError
                  );
                }
              }

              // Fallback to simple segmentation if GPT processing fails
              const segments = createSimpleSegments(rawSegments);
              return {
                segments,
                source: "transcript",
              };
            }
          }
        }
      }
    } catch (innertubeError) {
      console.error("[API] Innertube API fallback failed:", innertubeError);
    }

    // Method 2: Try using youtube-transcript package
    try {
      console.log(
        "[API] Attempting to fetch transcript using youtube-transcript"
      );

      let transcript: any[] = [];

      // Try different methods to get the transcript
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId);
      } catch (e) {
        try {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: "en",
          });
        } catch (e2) {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: "en",
          });
        }
      }

      if (transcript && transcript.length > 0) {
        console.log(
          `[API] Successfully fetched ${transcript.length} transcript segments`
        );

        // First create raw text for GPT processing
        const rawTranscriptText = transcript.map((item) => item.text).join(" ");

        // Create timing data for alignment
        const originalTimingData = transcript.map((item) => ({
          text: item.text,
          startTime: item.offset / 1000,
          endTime: (item.offset + item.duration) / 1000,
        }));

        // If OpenAI is configured, try to process with GPT
        if (isOpenAIConfigured()) {
          try {
            const gptSegments = await processTranscriptWithGPT(
              rawTranscriptText,
              videoTitle,
              originalTimingData
            );

            if (gptSegments.length > 0) {
              console.log("[API] Using GPT-processed segments");
              return {
                segments: gptSegments,
                source: "transcript",
              };
            }
          } catch (gptError) {
            console.error(
              "[API] Error processing with GPT, falling back:",
              gptError
            );
          }
        }

        // Fallback: Use the raw transcript with simple speaker alternation
        console.log("[API] Using raw transcript with speaker alternation");

        const segments: DialogueSegment[] = [];
        let currentSpeaker = "Speaker A";

        // Group transcript items into meaningful segments
        let currentGroup = {
          text: transcript[0].text,
          startTime: transcript[0].offset / 1000,
          endTime: (transcript[0].offset + transcript[0].duration) / 1000,
        };

        const groupedSegments = [];
        const TIME_THRESHOLD = 0.7; // seconds
        const MAX_SEGMENT_LENGTH = 150; // characters

        for (let i = 1; i < transcript.length; i++) {
          const current = transcript[i];
          const prev = transcript[i - 1];
          const timeDiff =
            (current.offset - (prev.offset + prev.duration)) / 1000;
          const wouldExceedLength =
            (currentGroup.text + " " + current.text).length >
            MAX_SEGMENT_LENGTH;

          if (timeDiff < TIME_THRESHOLD && !wouldExceedLength) {
            // Combine with current group
            currentGroup.text += " " + current.text;
            currentGroup.endTime = (current.offset + current.duration) / 1000;
          } else {
            // Add current group and start a new one
            groupedSegments.push(currentGroup);
            currentGroup = {
              text: current.text,
              startTime: current.offset / 1000,
              endTime: (current.offset + current.duration) / 1000,
            };
          }
        }

        // Add the last group
        groupedSegments.push(currentGroup);

        // Convert grouped segments to dialogue segments with alternating speakers
        groupedSegments.forEach((group, index) => {
          if (index > 0 && index % 2 === 0) {
            currentSpeaker =
              currentSpeaker === "Speaker A" ? "Speaker B" : "Speaker A";
          }

          segments.push({
            id: uuidv4(),
            speakerName: currentSpeaker,
            text: group.text,
            startTime: group.startTime,
            endTime: group.endTime,
            vocabularyItems: [],
          });
        });

        return {
          segments,
          source: "transcript",
        };
      }
    } catch (transcriptError) {
      console.error(
        "[API] Error fetching with youtube-transcript:",
        transcriptError
      );
    }

    // Method 3: Try direct scraping (if Method 1 failed)
    try {
      console.log("[API] Attempting direct HTML scraping fallback");

      const response = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        }
      );

      if (response.ok) {
        const html = await response.text();

        // Look for caption tracks in the HTML
        const captionMatch = html.match(
          /"captionTracks":\[\{"baseUrl":"([^"]+)"/
        );

        if (captionMatch && captionMatch[1]) {
          const captionUrl = captionMatch[1].replace(/\\u0026/g, "&");
          console.log("[API] Found caption URL:", captionUrl);

          // Fetch the captions
          const captionResponse = await fetch(captionUrl, {
            signal: controller.signal,
          });

          if (captionResponse.ok) {
            const captionXml = await captionResponse.text();

            // Parse the XML
            const textSegments = captionXml.match(/<text[^>]*>(.*?)<\/text>/g);

            if (textSegments && textSegments.length > 0) {
              console.log(
                `[API] Found ${textSegments.length} text segments in XML`
              );

              // Extract and create segments
              const rawSegments: Array<{
                text: string;
                startTime: number;
                duration: number;
              }> = [];

              for (let i = 0; i < textSegments.length; i++) {
                const startMatch = textSegments[i].match(/start="([\d.]+)"/);
                const durMatch = textSegments[i].match(/dur="([\d.]+)"/);
                const textMatch = textSegments[i].match(
                  /<text[^>]*>(.*?)<\/text>/
                );

                if (startMatch && durMatch && textMatch) {
                  const startTime = parseFloat(startMatch[1]);
                  const duration = parseFloat(durMatch[1]);
                  let text = textMatch[1]
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");

                  rawSegments.push({ text, startTime, duration });
                }
              }

              // If we have OpenAI, try to process with GPT
              if (isOpenAIConfigured() && rawSegments.length > 0) {
                try {
                  const combinedText = rawSegments
                    .map((seg) => seg.text)
                    .join(" ");

                  const originalTimingData = rawSegments.map((item) => ({
                    text: item.text,
                    startTime: item.startTime,
                    endTime: item.startTime + item.duration,
                  }));

                  const gptSegments = await processTranscriptWithGPT(
                    combinedText,
                    videoTitle,
                    originalTimingData
                  );

                  if (gptSegments.length > 0) {
                    console.log(
                      "[API] Using GPT-processed segments from caption XML"
                    );
                    return {
                      segments: gptSegments,
                      source: "transcript",
                    };
                  }
                } catch (gptError) {
                  console.error(
                    "[API] Error processing XML data with GPT:",
                    gptError
                  );
                }
              }

              // Group raw segments into meaningful chunks
              if (rawSegments.length > 0) {
                const groupedSegments: Array<{
                  text: string;
                  startTime: number;
                  duration: number;
                }> = [];
                let currentGroup = {
                  text: rawSegments[0].text,
                  startTime: rawSegments[0].startTime,
                  duration: rawSegments[0].duration,
                };

                const TIME_THRESHOLD = 0.7;
                const MAX_SEGMENT_LENGTH = 150;

                for (let i = 1; i < rawSegments.length; i++) {
                  const current = rawSegments[i];
                  const prev = rawSegments[i - 1];
                  const timeDiff =
                    current.startTime - (prev.startTime + prev.duration);
                  const wouldExceedLength =
                    (currentGroup.text + " " + current.text).length >
                    MAX_SEGMENT_LENGTH;

                  if (timeDiff < TIME_THRESHOLD && !wouldExceedLength) {
                    currentGroup.text += " " + current.text;
                    currentGroup.duration += current.duration;
                  } else {
                    groupedSegments.push(currentGroup);
                    currentGroup = {
                      text: current.text,
                      startTime: current.startTime,
                      duration: current.duration,
                    };
                  }
                }

                groupedSegments.push(currentGroup);

                // Create dialogue segments
                const segments: DialogueSegment[] = [];
                let currentSpeaker = "Speaker A";

                groupedSegments.forEach((group, index) => {
                  if (index > 0 && index % 2 === 0) {
                    currentSpeaker =
                      currentSpeaker === "Speaker A"
                        ? "Speaker B"
                        : "Speaker A";
                  }

                  segments.push({
                    id: uuidv4(),
                    speakerName: currentSpeaker,
                    text: group.text,
                    startTime: group.startTime,
                    endTime: group.startTime + group.duration,
                    vocabularyItems: [],
                  });
                });

                console.log(
                  `[API] Created ${segments.length} segments from direct scraping`
                );
                return {
                  segments,
                  source: "transcript",
                };
              }
            }
          }
        }
      }
    } catch (scrapingError) {
      console.error("[API] Direct scraping fallback failed:", scrapingError);
    }

    // Method 4: Try YouTube Data API for video description
    try {
      console.log("[API] Attempting description fallback");

      const apiKey =
        process.env.YOUTUBE_API_KEY ||
        "AIzaSyAa8yy0GdcGPHdtD083HiGGx_S0vMPScDM";
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

      const videoResponse = await fetch(videoDetailsUrl, {
        signal: controller.signal,
      });

      if (videoResponse.ok) {
        const videoData = await videoResponse.json();

        if (videoData && videoData.items && videoData.items.length > 0) {
          const description = videoData.items[0].snippet.description;

          if (description && description.length > 20) {
            console.log(`[API] Got description, length: ${description.length}`);

            // Create sentences from description
            const sentences = description
              .split(/[.!?]+/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 5 && s.length < 200);

            if (sentences.length > 2) {
              const segments: DialogueSegment[] = [];

              sentences.forEach((sentence: string, index: number) => {
                segments.push({
                  id: uuidv4(),
                  speakerName: index % 2 === 0 ? "Speaker A" : "Speaker B",
                  text: sentence,
                  startTime: index * 5,
                  endTime: (index + 1) * 5,
                  vocabularyItems: [],
                });
              });

              console.log(
                `[API] Created ${segments.length} segments from description`
              );
              return {
                segments,
                source: "description",
              };
            }
          }
        }
      }
    } catch (descriptionError) {
      console.error("[API] Description fallback failed:", descriptionError);
    }

    // Method 5: Fallback to oEmbed title
    try {
      console.log("[API] Attempting title fallback");

      // If all else fails, at least get the title
      if (videoTitle) {
        console.log(`[API] Failed to get transcript, returning empty segments`);
        return {
          segments: [],
          source: "unavailable",
        };
      }
    } catch (titleError) {
      console.error("[API] Title fallback failed:", titleError);
    }

    // If all methods fail, return empty segments
    console.log(
      "[API] All transcript methods failed, returning empty segments"
    );
    return {
      segments: [],
      source: "unavailable",
    };
  } catch (error) {
    console.error("[API] Critical error in fetchYouTubeTranscript:", error);
    return {
      segments: [],
      source: "unavailable",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper function to decode HTML entities
function decodeHTMLEntities(text: string): string {
  const entities = [
    ["&amp;", "&"],
    ["&lt;", "<"],
    ["&gt;", ">"],
    ["&quot;", '"'],
    ["&apos;", "'"],
    ["&#39;", "'"],
  ];
  let result = text;
  for (const [entity, char] of entities) {
    result = result.replace(new RegExp(entity, "g"), char);
  }
  return result;
}

// Helper function to create simple segments from raw transcript data
function createSimpleSegments(
  rawSegments: Array<{ text: string; startTime: number; duration: number }>
): DialogueSegment[] {
  const segments: DialogueSegment[] = [];
  let currentSpeaker = "Speaker A";

  // Group segments by time proximity and length
  const groupedSegments = [];
  let currentGroup = {
    text: rawSegments[0].text,
    startTime: rawSegments[0].startTime,
    duration: rawSegments[0].duration,
  };

  const TIME_THRESHOLD = 0.7;
  const MAX_SEGMENT_LENGTH = 150;

  for (let i = 1; i < rawSegments.length; i++) {
    const current = rawSegments[i];
    const prev = rawSegments[i - 1];
    const timeDiff = current.startTime - (prev.startTime + prev.duration);
    const wouldExceedLength =
      (currentGroup.text + " " + current.text).length > MAX_SEGMENT_LENGTH;

    if (timeDiff < TIME_THRESHOLD && !wouldExceedLength) {
      currentGroup.text += " " + current.text;
      currentGroup.duration += current.duration;
    } else {
      groupedSegments.push(currentGroup);
      currentGroup = {
        text: current.text,
        startTime: current.startTime,
        duration: current.duration,
      };
    }
  }

  groupedSegments.push(currentGroup);

  // Convert grouped segments to dialogue segments
  groupedSegments.forEach((group, index) => {
    if (index > 0 && index % 2 === 0) {
      currentSpeaker =
        currentSpeaker === "Speaker A" ? "Speaker B" : "Speaker A";
    }

    segments.push({
      id: uuidv4(),
      speakerName: currentSpeaker,
      text: group.text,
      startTime: group.startTime,
      endTime: group.startTime + group.duration,
      vocabularyItems: [],
    });
  });

  return segments;
}

// Main API route handler
export async function GET(request: Request) {
  const startTime = Date.now();

  // Move searchParams access outside the try/catch block
  const { searchParams } = new URL(request.url);
  const youtubeUrl = searchParams.get("url");
  const cacheBuster = searchParams.get("t"); // Cache buster parameter

  console.log(
    `[API] YouTube metadata request received at ${new Date().toISOString()}`
  );
  console.log(`[API] Processing URL: ${youtubeUrl}`);
  console.log(`[API] Cache buster: ${cacheBuster || "none"}`);
  console.log(
    `[API] Request headers: ${JSON.stringify(
      Object.fromEntries(request.headers),
      null,
      2
    )}`
  );

  if (!youtubeUrl) {
    const responseTime = Date.now() - startTime;
    console.log(`[API] Error: Missing URL parameter (${responseTime}ms)`);

    return new NextResponse(
      JSON.stringify({
        error: "YouTube URL is required",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }

  try {
    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      const responseTime = Date.now() - startTime;
      console.log(
        `[API] Error: Could not extract video ID (${responseTime}ms)`
      );

      return new NextResponse(
        JSON.stringify({
          error: "Could not extract video ID from URL",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    console.log(`[API] Extracted video ID: ${videoId}`);

    try {
      // Fetch basic metadata first
      const metadata = await fetchVideoMetadata(videoId);
      const embedUrl = convertToEmbedUrl(youtubeUrl);

      // Check if video is too long
      if (metadata.isTooLong) {
        const responseTime = Date.now() - startTime;
        console.log(
          `[API] Error: Video too long (${metadata.duration}s) (${responseTime}ms)`
        );

        return new NextResponse(
          JSON.stringify({
            error: "Video is too long (maximum 2 minutes allowed)",
            data: {
              videoId,
              title: metadata.title || "Video Title",
              author: metadata.author_name || "Unknown Creator",
              thumbnailUrl:
                metadata.thumbnail_url ||
                `https://img.youtube.com/vi/${videoId}/0.jpg`,
              embedUrl,
              duration: metadata.duration,
              isTooLong: true,
            },
          }),
          {
            status: 413, // Payload Too Large
            headers: {
              "Content-Type": "application/json",
              "Cache-Control":
                "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }

      // Then fetch transcript with multiple fallback methods
      const transcriptResult = await fetchYouTubeTranscript(
        videoId,
        metadata.title
      );

      const segments = transcriptResult.segments;
      const transcriptSource = transcriptResult.source;

      // Log completion information
      const responseTime = Date.now() - startTime;
      console.log(`[API] Request completed in ${responseTime}ms`);
      console.log(`[API] Transcript source: ${transcriptSource}`);
      console.log(`[API] Segments count: ${segments.length}`);

      // Return the response with appropriate headers to prevent caching
      return new NextResponse(
        JSON.stringify({
          data: {
            videoId,
            title: metadata.title || "Video Title",
            author: metadata.author_name || "Unknown Creator",
            thumbnailUrl:
              metadata.thumbnail_url ||
              `https://img.youtube.com/vi/${videoId}/0.jpg`,
            embedUrl,
            segments,
            transcriptSource,
            duration: metadata.duration || 0,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            "Surrogate-Control": "no-store",
          },
        }
      );
    } catch (processingError: any) {
      const responseTime = Date.now() - startTime;
      console.error(
        `[API] Error processing video data (${responseTime}ms):`,
        processingError
      );

      // Return minimal data when processing fails
      return new NextResponse(
        JSON.stringify({
          data: {
            videoId,
            title: "Video Information Unavailable",
            author: "Unknown Creator",
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
            embedUrl: convertToEmbedUrl(youtubeUrl),
            segments: [],
            transcriptSource: "unavailable",
            error: processingError.message || "Unknown processing error",
          },
        }),
        {
          status: 200, // Still return 200 to allow fallback behavior on client
          headers: {
            "Content-Type": "application/json",
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            "Surrogate-Control": "no-store",
          },
        }
      );
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`[API] Critical error (${responseTime}ms):`, error);

    // Re-throw the error for Next.js to detect dynamic usage
    throw error;
  }
}

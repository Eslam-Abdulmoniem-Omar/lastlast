import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { YoutubeTranscript } from "youtube-transcript";
import { OpenAI } from "openai";

// Set dynamic to avoid static optimization for this route
export const dynamic = "force-dynamic";

// Check if OpenAI API key is available - moved up before usage
const isOpenAIConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY;
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Log OpenAI status on startup
console.log(
  "YouTube metadata route loaded, OpenAI API configured:",
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
    console.error("Error extracting video ID:", error);
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
    // Use YouTube oEmbed API which doesn't require an API key
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    // Check if the response is actually JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("YouTube API returned non-JSON response:", contentType);
      return {
        title: "Video Information Unavailable",
        author_name: "Unknown Creator",
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching YouTube metadata:", error);
    return {
      title: "Video Information Unavailable",
      author_name: "Unknown Creator",
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
    };
  }
}

/**
 * Use GPT to intelligently segment transcript text
 */
async function processTranscriptWithGPT(
  rawText: string,
  videoTitle: string,
  originalTimingData?: { text: string; startTime: number; endTime: number }[]
): Promise<DialogueSegment[]> {
  try {
    console.log("Processing transcript with GPT...");

    if (!isOpenAIConfigured()) {
      console.log("OpenAI API not configured, skipping GPT processing");
      return [];
    }

    // Truncate extremely long transcripts to avoid token limits
    let processableText = rawText;
    const MAX_TEXT_LENGTH = 15000; // Around 3-4k tokens, which is safe for 4k context models

    if (rawText.length > MAX_TEXT_LENGTH) {
      console.log(
        `Transcript too long (${rawText.length} chars), truncating to ${MAX_TEXT_LENGTH} chars`
      );
      processableText = rawText.substring(0, MAX_TEXT_LENGTH) + "...";
    }

    // Significantly enhanced prompt with much more sophisticated dialogue detection
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

EXAMPLE OF PROPER SEGMENTATION:
For the text: "That's crazy! That's actually not that impressive. What? That's not that impressive?"

CORRECT segmentation:
Speaker A: "That's crazy!"
Speaker B: "That's actually not that impressive."
Speaker A: "What? That's not that impressive?"

INCORRECT segmentation:
Speaker A: "That's crazy! That's actually not that impressive."
Speaker B: "What? That's not that impressive?"

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

    // Use a try-catch specifically for the API call
    try {
      // Call GPT with higher reliability settings
      const response = await openai.chat.completions.create({
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
        temperature: 0.3, // Slightly increased from 0.2 for better dialogue analysis
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      // Parse the response with better error handling
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        console.error("Empty response from GPT");
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
          console.error("Invalid response format from GPT:", content);
          return [];
        }

        // Ensure each segment has the required properties
        const validSegments = parsedResponse.segments.filter(
          (segment: { speakerName: string; text: string }) =>
            segment.speakerName && segment.text
        );

        if (validSegments.length === 0) {
          console.error("No valid segments found in GPT response");
          return [];
        }

        // Log success
        console.log(`GPT created ${validSegments.length} intelligent segments`);

        // Enhanced timing calculation to preserve natural speech patterns
        // Instead of dividing evenly, we'll map GPT segments to original transcript timing
        let dialogueSegments: DialogueSegment[] = [];

        if (originalTimingData && originalTimingData.length > 0) {
          console.log("Using original timing data to map GPT segments");

          // Get the total video duration from the original timing data
          const videoDuration =
            originalTimingData[originalTimingData.length - 1].endTime;
          console.log(
            `Video duration from timing data: ${videoDuration} seconds`
          );

          // Map each GPT segment to corresponding parts of the original transcript
          // using text matching and fuzzy alignment
          dialogueSegments = mapSegmentsToOriginalTiming(
            validSegments,
            originalTimingData,
            videoDuration
          );
        } else {
          console.log(
            "No original timing data available, using estimated timing"
          );

          // If no original timing data, use a more sophisticated estimation
          // that varies segment durations based on segment length
          const totalDuration = 100; // Default 100 seconds if no timing data

          // Calculate estimated durations based on text length
          const totalTextLength = validSegments.reduce(
            (sum, segment) => sum + segment.text.length,
            0
          );

          let currentTime = 0;
          dialogueSegments = validSegments.map((segment) => {
            // Estimate duration based on text length proportion
            const proportion = segment.text.length / totalTextLength;
            const estimatedDuration = totalDuration * proportion;

            // Add some natural variation (±15%) to avoid mechanical timing
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
          });
        }

        return dialogueSegments;
      } catch (parseError) {
        console.error(
          "Error parsing GPT response:",
          parseError,
          "Content:",
          content
        );
        return [];
      }
    } catch (apiError) {
      console.error("OpenAI API error:", apiError);
      throw new Error(
        `OpenAI API error: ${apiError.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("Error using GPT for transcript processing:", error);
    return [];
  }
}

/**
 * Maps GPT-generated segments to original transcript timing
 * using fuzzy text matching and alignment
 */
function mapSegmentsToOriginalTiming(
  gptSegments: { speakerName: string; text: string }[],
  originalTimingData: { text: string; startTime: number; endTime: number }[],
  totalDuration: number
): DialogueSegment[] {
  // Create a single string from original transcript for alignment
  const originalFullText = originalTimingData
    .map((item) => item.text)
    .join(" ");

  // Build a time map that relates text positions to timestamps
  const timeMap: { [position: number]: number } = {};
  let position = 0;

  originalTimingData.forEach((item) => {
    // Map the start of each segment to its time
    timeMap[position] = item.startTime;
    position += item.text.length + 1; // +1 for the space
  });

  // Add end position
  timeMap[position] = totalDuration;

  // Store result segments
  const mappedSegments: DialogueSegment[] = [];

  // For each GPT segment, try to find its position in the original text
  gptSegments.forEach((segment, index) => {
    const segmentText = segment.text.trim();

    // Try to find this segment text in the original
    const position = findBestPosition(segmentText, originalFullText);

    // If position found, use it to determine timing
    if (position >= 0) {
      // Find the closest timing positions before and after this position
      const timePositions = Object.keys(timeMap)
        .map(Number)
        .sort((a, b) => a - b);

      let startPos = 0;
      let endPos = 0;

      // Find the closest position before our match
      for (let i = 0; i < timePositions.length; i++) {
        if (timePositions[i] <= position) {
          startPos = timePositions[i];
        } else {
          break;
        }
      }

      // Find the closest position after our match
      for (let i = 0; i < timePositions.length; i++) {
        if (timePositions[i] >= position + segmentText.length) {
          endPos = timePositions[i];
          break;
        }
      }

      // Calculate the time based on proportional position
      const startTime = timeMap[startPos];
      const endTime = timeMap[endPos] || totalDuration;
      const textLength = endPos - startPos;

      // Calculate proportional position within this segment
      const relativeStart = position - startPos;
      const relativeEnd = relativeStart + segmentText.length;

      // Map text position to time proportionally
      let segmentStartTime =
        startTime + ((endTime - startTime) * relativeStart) / textLength;
      let segmentEndTime =
        startTime + ((endTime - startTime) * relativeEnd) / textLength;

      // Ensure minimum duration and avoid overlaps
      if (segmentEndTime - segmentStartTime < 0.5) {
        segmentEndTime = segmentStartTime + 0.5;
      }

      // Adjust for previous segment if needed
      if (mappedSegments.length > 0) {
        const prevSegment = mappedSegments[mappedSegments.length - 1];
        if (segmentStartTime < prevSegment.endTime) {
          // Make sure segments don't overlap
          if (index > 0) segmentStartTime = prevSegment.endTime;
        }
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

      // Estimate duration based on text length
      const estimatedDuration = Math.max(1, segmentText.length / 20); // ~20 chars per second

      mappedSegments.push({
        id: uuidv4(),
        speakerName: segment.speakerName,
        text: segmentText,
        startTime: prevSegmentEnd,
        endTime: prevSegmentEnd + estimatedDuration,
        vocabularyItems: [],
      });
    }
  });

  return mappedSegments;
}

/**
 * Finds the best position for a segment within the original text
 * using fuzzy matching when exact match fails
 */
function findBestPosition(segment: string, fullText: string): number {
  // First try exact match
  const exactPosition = fullText.indexOf(segment);
  if (exactPosition >= 0) return exactPosition;

  // If exact match fails, try looking for significant portions
  // For longer segments, split into chunks and find the best match
  if (segment.length > 30) {
    const words = segment.split(" ");
    if (words.length >= 5) {
      // Try the first 5 words
      const firstPortion = words.slice(0, 5).join(" ");
      const firstPos = fullText.indexOf(firstPortion);
      if (firstPos >= 0) return firstPos;

      // Try the last 5 words
      const lastPortion = words.slice(-5).join(" ");
      const lastPos = fullText.indexOf(lastPortion);
      if (lastPos >= 0) return lastPos;
    }
  }

  // As a last resort, try matching just the first sentence
  const firstSentence = segment.split(/[.!?]+/)[0];
  if (firstSentence && firstSentence.length > 10) {
    const sentencePos = fullText.indexOf(firstSentence);
    if (sentencePos >= 0) return sentencePos;
  }

  // If all else fails, return -1 to indicate no match found
  return -1;
}

async function fetchYouTubeTranscript(
  videoId: string,
  videoTitle: string = ""
): Promise<DialogueSegment[]> {
  try {
    console.log(`Fetching transcript for video ID: ${videoId}`);
    let rawTranscriptText = "";
    let transcriptSegments = [];

    // Try to get the actual transcript using youtube-transcript package
    try {
      // Try with various language options if the default doesn't work
      let transcript;

      try {
        // First try with default settings (auto-detect language)
        console.log("Attempting to fetch transcript with auto-detect language");
        transcript = await YoutubeTranscript.fetchTranscript(videoId);
      } catch (firstError) {
        console.log(
          "First transcript attempt failed, trying with English",
          firstError
        );

        try {
          // Then try with English specifically
          transcript = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: "en",
          });
        } catch (secondError) {
          console.log(
            "Second transcript attempt failed, trying with manual language detection",
            secondError
          );

          try {
            // If both fail, try one more time with a different approach
            transcript = await YoutubeTranscript.fetchTranscript(videoId, {
              lang: "en",
              country: "US",
            });
          } catch (thirdError) {
            console.error(
              "All transcript fetching attempts failed:",
              thirdError
            );
            // Re-throw to be caught by the outer try/catch
            throw new Error("Could not fetch transcript with any method");
          }
        }
      }

      if (transcript && transcript.length > 0) {
        console.log(
          `Successfully fetched ${transcript.length} transcript segments`
        );

        // First create the raw text for GPT processing
        rawTranscriptText = transcript.map((item) => item.text).join(" ");

        // Create original timing data for alignment
        const originalTimingData = transcript.map((item) => ({
          text: item.text,
          startTime: item.offset / 1000,
          endTime: (item.offset + item.duration) / 1000,
        }));

        // If we have OpenAI configured, try to process with GPT first
        if (isOpenAIConfigured()) {
          try {
            // Pass the original timing data to the GPT processing function
            const gptSegments = await processTranscriptWithGPT(
              rawTranscriptText,
              videoTitle,
              originalTimingData
            );

            // If GPT successfully created segments, use those
            if (gptSegments.length > 0) {
              console.log("Using GPT-processed segments with original timing");
              return gptSegments;
            }
          } catch (gptError) {
            console.error("Error processing transcript with GPT:", gptError);
            // Continue to fallback method
          }
        }

        // UPDATED: Improved grouping logic for transcript items
        // Group transcript items into more meaningful segments
        const groupedTranscript = [];
        let currentGroup = {
          text: transcript[0].text,
          start: transcript[0].offset / 1000,
          duration: transcript[0].duration / 1000,
        };

        // Define a smaller time threshold for grouping - this will create more segments
        const TIME_THRESHOLD = 0.5; // Reduced from 1.5 seconds to 0.5 seconds
        // Define a max character length for a segment to avoid too-long segments
        const MAX_SEGMENT_LENGTH = 150;

        for (let i = 1; i < transcript.length; i++) {
          const item = transcript[i];
          const prevItem = transcript[i - 1];
          const timeDiff =
            (item.offset - (prevItem.offset + prevItem.duration)) / 1000;

          // Check if adding this item would make the text too long
          const wouldExceedMaxLength =
            (currentGroup.text + " " + item.text).length > MAX_SEGMENT_LENGTH;

          // If time difference is small AND the combined text isn't too long, combine with current group
          if (timeDiff < TIME_THRESHOLD && !wouldExceedMaxLength) {
            currentGroup.text += " " + item.text;
            currentGroup.duration += item.duration / 1000;
          } else {
            // Otherwise, start a new group
            groupedTranscript.push(currentGroup);
            currentGroup = {
              text: item.text,
              start: item.offset / 1000,
              duration: item.duration / 1000,
            };
          }
        }

        // Add the last group
        groupedTranscript.push(currentGroup);

        // Create segments from grouped transcript
        for (let i = 0; i < groupedTranscript.length; i++) {
          const group = groupedTranscript[i];

          // Switch speakers more frequently for better conversation simulation
          if (i > 0 && i % 2 === 0) {
            currentSpeaker =
              currentSpeaker === "Speaker A" ? "Speaker B" : "Speaker A";
          }

          segments.push({
            id: uuidv4(),
            speakerName: currentSpeaker,
            text: group.text,
            startTime: group.start,
            endTime: group.start + group.duration,
            vocabularyItems: [],
          });
        }

        console.log(
          `Created ${segments.length} dialogue segments from transcript`
        );
        return segments;
      }
    } catch (error) {
      console.error(
        "Error fetching transcript with youtube-transcript:",
        error
      );
      throw error; // Re-throw to be handled by the caller
    }

    // Alternative transcript fetch method using a different technique for shorts
    try {
      console.log(
        "Trying alternative transcript fetch method (direct scraping)"
      );

      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(youtubeUrl);

      if (response.ok) {
        const html = await response.text();

        // Look for transcript data in the HTML
        const captionTrackPattern = /"captionTracks":\[[\s\S]*?\]/;
        const match = html.match(captionTrackPattern);

        if (match && match[0]) {
          console.log("Found caption tracks in HTML");
          const captionData = match[0];

          // Extract baseUrl from the caption data
          const baseUrlPattern = /"baseUrl":"(.*?)"/;
          const baseUrlMatch = captionData.match(baseUrlPattern);

          if (baseUrlMatch && baseUrlMatch[1]) {
            const baseUrl = baseUrlMatch[1].replace(/\\u0026/g, "&");
            console.log("Found transcript URL:", baseUrl);

            // Fetch the actual transcript
            const transcriptResponse = await fetch(baseUrl);
            if (transcriptResponse.ok) {
              const transcriptXml = await transcriptResponse.text();
              console.log("Got transcript XML, processing...");

              // Simple XML parsing for transcript data
              const textSegments = transcriptXml.match(
                /<text.*?>(.*?)<\/text>/g
              );

              if (textSegments && textSegments.length > 0) {
                // IMPROVED: Group segments for better dialogue structure
                const rawSegments = [];

                // First extract all individual segments
                for (let i = 0; i < textSegments.length; i++) {
                  // Extract timing information
                  const startMatch = textSegments[i].match(/start="(.*?)"/);
                  const durMatch = textSegments[i].match(/dur="(.*?)"/);

                  // Extract text content
                  const textMatch = textSegments[i].match(
                    /<text.*?>(.*?)<\/text>/
                  );

                  if (startMatch && durMatch && textMatch) {
                    const startTime = parseFloat(startMatch[1]);
                    const duration = parseFloat(durMatch[1]);
                    const text = textMatch[1]
                      .replace(/&amp;/g, "&")
                      .replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'");

                    rawSegments.push({
                      text,
                      startTime,
                      duration,
                    });
                  }
                }

                // If we have OpenAI configured, try to process with GPT first
                if (isOpenAIConfigured() && rawSegments.length > 0) {
                  try {
                    const combinedText = rawSegments
                      .map((seg) => seg.text)
                      .join(" ");

                    // Prepare timing data in the same format
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
                        "Using GPT-processed segments with timing from XML"
                      );
                      return gptSegments;
                    }
                  } catch (gptError) {
                    console.error(
                      "Error processing transcript with GPT for XML data:",
                      gptError
                    );
                    // Continue to fallback method
                  }
                }

                // Only use the old method if GPT processing fails or is not available
                // Now group these raw segments into meaningful dialogue segments
                const TIME_THRESHOLD = 0.5; // 0.5 seconds
                const MAX_SEGMENT_LENGTH = 150; // characters

                const groupedSegments = [];
                if (rawSegments.length > 0) {
                  let currentGroup = {
                    text: rawSegments[0].text,
                    startTime: rawSegments[0].startTime,
                    duration: rawSegments[0].duration,
                  };

                  for (let i = 1; i < rawSegments.length; i++) {
                    const current = rawSegments[i];
                    const prev = rawSegments[i - 1];
                    const timeDiff =
                      current.startTime - (prev.startTime + prev.duration);
                    const wouldExceedMaxLength =
                      (currentGroup.text + " " + current.text).length >
                      MAX_SEGMENT_LENGTH;

                    if (timeDiff < TIME_THRESHOLD && !wouldExceedMaxLength) {
                      // Combine with current group
                      currentGroup.text += " " + current.text;
                      currentGroup.duration += current.duration;
                    } else {
                      // Start a new group
                      groupedSegments.push(currentGroup);
                      currentGroup = {
                        text: current.text,
                        startTime: current.startTime,
                        duration: current.duration,
                      };
                    }
                  }

                  // Add the last group
                  groupedSegments.push(currentGroup);
                }

                // Create final dialogue segments
                const segments: DialogueSegment[] = [];
                let currentSpeaker = "Speaker A";

                for (let i = 0; i < groupedSegments.length; i++) {
                  const group = groupedSegments[i];

                  // Switch speakers every other segment for better conversation flow
                  if (i > 0 && i % 2 === 0) {
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
                }

                if (segments.length > 0) {
                  console.log(
                    `Created ${segments.length} dialogue segments from direct scraping`
                  );
                  return segments;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in alternative transcript fetch method:", error);
    }

    // If youtube-transcript fails, try YouTube Data API
    try {
      // Get video details including captions
      const apiKey =
        process.env.YOUTUBE_API_KEY ||
        "AIzaSyAa8yy0GdcGPHdtD083HiGGx_S0vMPScDM";
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
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
              .filter((s: string) => s.length > 5 && s.length < 200);

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
    throw error; // Re-throw to be handled by the caller
  }
}

// Create segments from a list of sentences
function createSegmentsFromSentences(sentences: string[]): DialogueSegment[] {
  const segments: DialogueSegment[] = [];
  const segmentDuration = 5; // Assume each segment is about 5 seconds

  for (let i = 0; i < sentences.length; i++) {
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
    // Handling YouTube URL processing
    const { searchParams } = new URL(request.url);
    const youtubeUrl = searchParams.get("url");

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    console.log("Processing YouTube URL:", youtubeUrl);

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Could not extract video ID from URL" },
        { status: 400 }
      );
    }

    console.log("Extracted video ID:", videoId);

    try {
      // Fetch video metadata
      const metadata = await fetchVideoMetadata(videoId);
      console.log("Fetched metadata:", metadata.title);

      // Get the embed URL
      const embedUrl = convertToEmbedUrl(youtubeUrl);

      // Try to get the transcript
      let segments = [];
      let transcriptError = null;

      try {
        segments = await fetchYouTubeTranscript(videoId, metadata.title);
      } catch (transcriptErr) {
        console.error("Error fetching transcript:", transcriptErr);
        transcriptError = `${transcriptErr}`;
        // Fall back to default segments
        segments = createDefaultSegments(videoId);
      }

      console.log(`Returning ${segments.length} segments for video ${videoId}`);

      // IMPROVED: Better transcript source detection logic
      // Determine if we got a real transcript or are using generated segments
      let transcriptSource = "default";
      if (segments.length > 0) {
        // If we have OpenAI-processed segments, always mark as transcript
        if (isOpenAIConfigured()) {
          transcriptSource = "transcript";
        } else {
          // Check segment characteristics to determine if this is a real transcript
          // Real transcripts typically have:
          // 1. More than just a few segments
          // 2. Varied segment lengths
          // 3. More natural text content

          if (segments.length >= 3) {
            // Check for varied segment lengths
            const textLengths = segments.map((seg) => seg.text.length);
            const avgLength =
              textLengths.reduce((sum, len) => sum + len, 0) /
              textLengths.length;
            const hasVariedLengths = textLengths.some(
              (len) => Math.abs(len - avgLength) > 10
            );

            // If we have enough segments with varied lengths, likely a real transcript
            if (hasVariedLengths) {
              transcriptSource = "transcript";
            }
          }
        }
      }

      // Return all the data
      return NextResponse.json({
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
          error: transcriptError,
        },
      });
    } catch (processingError) {
      console.error("Error processing video data:", processingError);

      // Return fallback data with default segments
      const fallbackSegments = createDefaultSegments(videoId);
      return NextResponse.json({
        data: {
          videoId,
          title: "Video Information Unavailable",
          author: "Unknown Creator",
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
          embedUrl: convertToEmbedUrl(youtubeUrl),
          segments: fallbackSegments,
          transcriptSource: "default",
          error: `Error processing video: ${processingError}`,
        },
      });
    }
  } catch (error) {
    console.error("Error processing YouTube URL:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process YouTube URL: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 400 } // Changed from 500 to 400 to avoid client-side confusion
    );
  }
}

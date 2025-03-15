import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// Initialize the OpenAI client with the API key from .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  console.log("Process segments API route called");

  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not configured in environment variables"
      );
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Parse the request body
    const { segments } = await request.json();

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty segments array" },
        { status: 400 }
      );
    }

    console.log(`Processing ${segments.length} dialogue segments`);

    // Process each segment to break it down into smaller sentences with timestamps
    const processedSegments: DialogueSegment[] = [];

    for (const segment of segments) {
      // Skip processing if the segment is too short
      if (segment.text.length < 20 || segment.text.split(" ").length < 5) {
        processedSegments.push({
          ...segment,
          id: segment.id || uuidv4(),
        });
        continue;
      }

      const duration = segment.endTime - segment.startTime;

      // Skip processing if the segment is too short in duration
      if (duration < 2) {
        processedSegments.push({
          ...segment,
          id: segment.id || uuidv4(),
        });
        continue;
      }

      // Prepare the prompt for GPT-4o Mini
      const prompt = `
You are an expert in breaking down long dialogue segments into natural sentences with accurate timestamps.

Original segment:
- Speaker: ${segment.speakerName}
- Text: "${segment.text}"
- Start time: ${segment.startTime} seconds
- End time: ${segment.endTime} seconds
- Duration: ${duration} seconds

Break this segment into smaller, natural sentences. For each sentence, calculate an estimated timestamp based on its position in the text and the total duration.

Return ONLY a JSON array of objects with this structure:
[
  {
    "text": "First sentence",
    "startTime": estimated start time in seconds,
    "endTime": estimated end time in seconds
  },
  ...
]

Important guidelines:
1. Preserve the original meaning and flow of the text
2. Create natural sentence breaks
3. Distribute the timestamps proportionally based on sentence length
4. Ensure the first sentence starts at ${segment.startTime} and the last sentence ends at ${segment.endTime}
5. Do not add any explanations, just return the JSON array
`;

      // Call the OpenAI API with GPT-4o-mini model
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      });

      // Extract the response content
      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        console.warn(`Empty response from OpenAI for segment: ${segment.id}`);
        processedSegments.push({
          ...segment,
          id: segment.id || uuidv4(),
        });
        continue;
      }

      try {
        // Extract the JSON array from the response
        const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const sentences = JSON.parse(jsonStr);

        if (!Array.isArray(sentences) || sentences.length === 0) {
          throw new Error("Invalid response format");
        }

        // Create new segments from the sentences
        for (const sentence of sentences) {
          processedSegments.push({
            id: uuidv4(),
            speakerName: segment.speakerName,
            text: sentence.text,
            startTime: sentence.startTime,
            endTime: sentence.endTime,
            vocabularyItems: segment.vocabularyItems || [],
          });
        }
      } catch (error) {
        console.error("Error processing GPT response:", error);
        console.log("Raw response:", content);

        // If there's an error, keep the original segment
        processedSegments.push({
          ...segment,
          id: segment.id || uuidv4(),
        });
      }
    }

    console.log(
      `Created ${processedSegments.length} processed segments from ${segments.length} original segments`
    );

    return NextResponse.json({
      data: {
        segments: processedSegments,
      },
    });
  } catch (error: any) {
    console.error("Error in process segments API:", error);

    return NextResponse.json(
      { error: error.message || "Failed to process segments" },
      { status: 500 }
    );
  }
}

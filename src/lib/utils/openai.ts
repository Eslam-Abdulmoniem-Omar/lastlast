import { TranscriptSegment } from "@/types/transcript";

export async function processTranscriptWithOpenAI(
  segments: TranscriptSegment[]
): Promise<TranscriptSegment[]> {
  try {
    // Prepare the text for OpenAI
    const text = segments
      .map((segment) => `${segment.speaker}: ${segment.text}`)
      .join("\n");

    // Create messages array for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are a helpful assistant that processes YouTube video transcripts. 
        Your task is to improve the transcript by:
        1. Fixing any grammatical errors
        2. Improving clarity and readability
        3. Maintaining the original meaning and tone
        4. Keeping the same speaker attribution
        
        Return the processed text in the same format as the input, with each line starting with "Speaker: " followed by the improved text.`,
      },
      {
        role: "user",
        content: text,
      },
    ];

    // Call OpenAI API
    const response = await fetch("/api/openai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const processedText = data.content;

    // Parse the processed text back into segments
    const processedSegments = processedText
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const [speaker, ...textParts] = line.split(":");
        return {
          speaker: speaker.trim(),
          text: textParts.join(":").trim(),
        };
      });

    // Map the processed segments back to the original segments with timing
    return segments.map((originalSegment, index) => ({
      ...originalSegment,
      text: processedSegments[index]?.text || originalSegment.text,
    }));
  } catch (error) {
    console.error("Error processing transcript with OpenAI:", error);
    throw error;
  }
}

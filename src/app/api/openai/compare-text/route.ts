import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// This is a dynamic API endpoint
export const dynamic = "force-dynamic";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This API endpoint compares user's speech with the original sentence
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { userSpeech, originalSentence } = await req.json();

    // Validate the input
    if (!userSpeech || !originalSentence) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Remove logs that expose user data
    // console.log("Comparing texts:");
    // console.log("User speech:", userSpeech);
    // console.log("Original sentence:", originalSentence);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // console.warn("OpenAI API key not configured, using fallback comparison");

      // Simple fallback comparison if API key is not available
      const normalizedUserSpeech = userSpeech.toLowerCase().trim();
      const normalizedOriginalSentence = originalSentence.toLowerCase().trim();

      // Simple similarity calculation
      const isVerySimilar = normalizedUserSpeech === normalizedOriginalSentence;
      const containsMainWords = normalizedOriginalSentence
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
        .some((word: string) => normalizedUserSpeech.includes(word));

      return NextResponse.json({
        isCorrect: isVerySimilar || containsMainWords,
        similarity: isVerySimilar ? 0.9 : containsMainWords ? 0.6 : 0.1,
        feedback: isVerySimilar
          ? "Perfect match!"
          : containsMainWords
          ? "Good attempt, but could be improved."
          : "Try again, your answer is quite different.",
        details: [],
      });
    }

    // Use OpenAI to compare the texts with a more sophisticated prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a language learning assistant that evaluates speech recognition results. 
          
Your job is to be VERY LENIENT when comparing speech recognition results with original sentences. 
Speech recognition is imperfect, and users may have accents or speak differently.

Be extremely generous in your evaluation - if the user's speech captures the general meaning or key words, consider it a match.
Only fail the comparison if the user's speech is completely different or missing most key words.

For language learning purposes, we want to encourage users, not frustrate them.`,
        },
        {
          role: "user",
          content: `Compare these two texts and determine if they match well enough for language learning purposes:
          
Original sentence: "${originalSentence}"
User speech: "${userSpeech}"

Be VERY LENIENT in your comparison. If the user captured the general meaning or most key words, consider it a match.
Only consider it a mismatch if the user's speech is completely different or missing most key words.

Respond in JSON format with these fields:
- isMatch: boolean (true if they match well enough, false otherwise) - BE GENEROUS HERE, default to true unless completely different
- accuracy: number between 0 and 1 (be generous, use 0.7+ for anything remotely close)
- missingWords: array of up to 3 important words from the original that are missing in the user speech
- feedback: simple feedback message ("Well done!" or "Try again")

Only respond with valid JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent results
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    const result = JSON.parse(content);

    // Remove log that exposes result data
    // console.log("Comparison result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error comparing texts");
    return NextResponse.json(
      { error: "Failed to compare texts" },
      { status: 500 }
    );
  }
}

// Helper function for Levenshtein distance calculation
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}

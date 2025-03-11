import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Initialize the Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Simple validation to check API key availability
const isApiKeyConfigured = () => {
  if (!geminiApiKey) {
    console.error("GEMINI_API_KEY is not configured in environment variables");
    return false;
  }
  return true;
};

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    // Get request body
    const { prompt, role, type } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Handle different types of requests
    switch (type) {
      case "writing-feedback":
        return handleWritingFeedback(model, prompt);
      case "pronunciation-feedback":
        return handlePronunciationFeedback(model, prompt);
      case "word-translation":
        return handleWordTranslation(model, prompt);
      default:
        return NextResponse.json(
          { error: "Invalid request type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in Gemini API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to process request: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function handleWritingFeedback(model: any, prompt: string) {
  console.log("Processing writing feedback request");

  const feedbackPrompt = `
    You are an English teacher providing feedback on a student's writing.
    
    Student's writing:
    "${prompt.text}"
    
    Reference answer (for comparison):
    "${prompt.referenceAnswer}"
    
    Please provide:
    1. Grammar corrections
    2. Vocabulary suggestions
    3. Overall structure feedback
    4. Comparison with the reference answer
    
    Format your response as JSON with these fields: 
    {
      "corrections": [{"original": "text", "corrected": "text", "explanation": "explanation"}],
      "suggestions": [{"type": "vocabulary|structure", "suggestion": "text", "reason": "explanation"}],
      "overallFeedback": "text",
      "comparisonWithReference": "text"
    }
  `;

  try {
    const result = await model.generateContent(feedbackPrompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Parse the JSON response
      const jsonResponse = JSON.parse(text);
      return NextResponse.json(jsonResponse);
    } catch (e) {
      console.error("Error parsing JSON from Gemini:", e);
      // If parsing fails, return the raw text
      return NextResponse.json({
        rawResponse: text,
        parsingError: "Failed to parse JSON response from Gemini",
      });
    }
  } catch (error) {
    console.error("Error in writing feedback:", error);
    throw error;
  }
}

async function handlePronunciationFeedback(model: any, prompt: string) {
  console.log("Processing pronunciation feedback request");

  const pronunciationPrompt = `
    You are an English pronunciation coach analyzing a student's spoken response.
    
    Question from podcast: "${prompt.question}"
    Student's transcribed answer: "${prompt.transcribedAnswer}"
    
    Please evaluate:
    1. Pronunciation accuracy
    2. Fluency and pace
    3. Natural intonation
    4. Word stress patterns
    
    Format your response as JSON with these fields:
    {
      "pronunciationScore": number (1-10),
      "fluencyScore": number (1-10),
      "intonationScore": number (1-10),
      "overallScore": number (1-10),
      "specificFeedback": [{"word": "text", "issue": "description", "suggestion": "text"}],
      "generalAdvice": "text"
    }
  `;

  try {
    const result = await model.generateContent(pronunciationPrompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Parse the JSON response
      const jsonResponse = JSON.parse(text);
      return NextResponse.json(jsonResponse);
    } catch (e) {
      console.error("Error parsing JSON from Gemini:", e);
      // If parsing fails, return the raw text
      return NextResponse.json({
        rawResponse: text,
        parsingError: "Failed to parse JSON response from Gemini",
      });
    }
  } catch (error) {
    console.error("Error in pronunciation feedback:", error);
    throw error;
  }
}

async function handleWordTranslation(model: any, prompt: string) {
  console.log("Processing word translation request");

  const translationPrompt = `
    Provide a contextually accurate translation for the word "${
      prompt.word
    }" as used in this podcast context:
    "${prompt.context}"
    
    Target language: ${prompt.targetLanguage || "Chinese"}
    
    Format your response as JSON with these fields:
    {
      "originalWord": "text",
      "translation": "text",
      "contextualMeaning": "brief explanation",
      "note": "This translation is specific to the podcast context."
    }
  `;

  try {
    const result = await model.generateContent(translationPrompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Parse the JSON response
      const jsonResponse = JSON.parse(text);
      return NextResponse.json(jsonResponse);
    } catch (e) {
      console.error("Error parsing JSON from Gemini:", e);
      // If parsing fails, return the raw text
      return NextResponse.json({
        rawResponse: text,
        parsingError: "Failed to parse JSON response from Gemini",
      });
    }
  } catch (error) {
    console.error("Error in word translation:", error);
    throw error;
  }
}

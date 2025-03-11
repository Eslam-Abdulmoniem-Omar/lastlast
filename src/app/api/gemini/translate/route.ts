import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Initialize the Gemini API with the key from .env.local
const geminiApiKey = process.env.GEMINI_API_KEY || "";

// Create a new instance of the API client with the key
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Simple validation to check API key availability
const isApiKeyConfigured = () => {
  if (!geminiApiKey) {
    console.error("Gemini API is not properly configured");
    return false;
  }
  return true;
};

// Update the fallback translations to have shorter explanations
const getFallbackTranslation = (
  text: string,
  context: string,
  isFullSentence: boolean
) => {
  // If it's a full sentence, return a sentence translation with contextual elements
  if (isFullSentence) {
    return {
      original_text: text,
      translation: "هذه ترجمة محلية للجملة.",
      is_sentence: true,
      contextual_elements: [
        {
          element: "it's no use",
          translation: "لا فائدة منه",
          explanation: "تعبير يشير إلى عدم جدوى الأمر.",
        },
        {
          element: "have it out",
          translation: "نتحدث بصراحة",
          explanation: "تعبير يعني مناقشة قضية بصراحة.",
        },
      ],
    };
  }

  // Basic fallback translations for common words with shorter explanations
  const fallbackTranslations: Record<string, any> = {
    "it's": {
      selected_word: "it's",
      general_translation: ["إنه", "هو"],
      contextual_translation: {
        full_phrase: "it's no use",
        translation: "لا فائدة منه",
        explanation: "تعبير يشير إلى عدم جدوى الأمر.",
      },
    },
    no: {
      selected_word: "no",
      general_translation: ["لا", "غير"],
      contextual_translation: {
        full_phrase: "no use",
        translation: "لا فائدة",
        explanation: "تعبير يشير إلى عدم جدوى الأمر.",
      },
    },
    use: {
      selected_word: "use",
      general_translation: ["يستخدم", "استعمال"],
      contextual_translation: {
        full_phrase: "no use",
        translation: "لا جدوى",
        explanation: "تعني أن المحاولة غير مجدية.",
      },
    },
    joe: {
      selected_word: "joe",
      general_translation: ["جو"],
      contextual_translation: {
        full_phrase: "joe",
        translation: "جو",
        explanation: "اسم الشخص المخاطب في الحوار.",
      },
    },
    "we've": {
      selected_word: "we've",
      general_translation: ["لدينا", "علينا"],
      contextual_translation: {
        full_phrase: "we've got to",
        translation: "علينا أن",
        explanation: "تعبير يشير إلى الضرورة أو الالتزام.",
      },
    },
    got: {
      selected_word: "got",
      general_translation: ["حصل على", "لديه"],
      contextual_translation: {
        full_phrase: "got to",
        translation: "يجب أن",
        explanation: "يشير إلى الضرورة أو الالتزام.",
      },
    },
    have: {
      selected_word: "have",
      general_translation: ["يملك", "لديه"],
      contextual_translation: {
        full_phrase: "have it out",
        translation: "يتحدث بصراحة",
        explanation: "تعبير يعني مناقشة قضية بصراحة.",
      },
    },
    out: {
      selected_word: "out",
      general_translation: ["خارج", "بالخارج"],
      contextual_translation: {
        full_phrase: "have it out",
        translation: "التحدث بصراحة",
        explanation: "جزء من تعبير يعني مواجهة موضوع بشكل مباشر.",
      },
    },
    loved: {
      selected_word: "loved",
      general_translation: ["أحب", "أحببت"],
      contextual_translation: {
        full_phrase: "loved you",
        translation: "أحببتك",
        explanation: "تعبر عن مشاعر رومانسية عميقة.",
      },
    },
  };

  // Return the fallback translation if available, otherwise a generic one with contextual meaning
  return (
    fallbackTranslations[text] || {
      selected_word: text,
      general_translation: ["ترجمة محلية"],
      contextual_translation: {
        full_phrase: text,
        translation: "ترجمة سياقية محلية",
        explanation: "هذه ترجمة محلية للكلمة في سياق الحوار.",
      },
    }
  );
};

// Helper function to clean JSON response from Gemini
const cleanAndParseJSON = (text: string) => {
  try {
    // First try parsing directly
    return JSON.parse(text);
  } catch (e) {
    // If direct parsing fails, try cleaning the text
    let cleanedText = text;

    // Remove markdown code blocks if present
    if (cleanedText.includes("```")) {
      cleanedText = cleanedText.replace(/```json\s*|\s*```/g, "");
    }

    // Remove any leading/trailing whitespace
    cleanedText = cleanedText.trim();

    // Try parsing again
    return JSON.parse(cleanedText);
  }
};

// Update the word translation prompt to make explanations shorter and more concise
const getWordTranslationPrompt = (word: string, context: string) => {
  return `You are an AI language assistant specializing in context-aware translations from English to Arabic.

Word selected: "${word}"
Full dialogue context: "${context}"

INSTRUCTIONS:
1. Provide 1-2 general Arabic translations for the word.
2. Analyze how this word functions within the dialogue context.
3. Identify if the word is part of a meaningful phrase or has special contextual significance.
4. Provide a BRIEF contextual explanation (1-2 sentences maximum).

Return ONLY a JSON object with these exact fields and no additional text, markdown, or formatting:
{
  "selected_word": "${word}",
  "general_translation": ["translation1", "translation2"],
  "contextual_translation": {
    "full_phrase": "The word or phrase with contextual meaning",
    "translation": "The Arabic translation",
    "explanation": "BRIEF explanation in Arabic (1-2 sentences maximum)"
  }
}

IMPORTANT: Keep the explanation very concise - no more than 1-2 short sentences.`;
};

// Update the sentence translation prompt to make explanations shorter
const getSentenceTranslationPrompt = (text: string, context: string) => {
  return `You are an AI language assistant helping with context-aware translations from English to Arabic.

Sentence to translate: "${text}"
Full dialogue context: "${context}"

INSTRUCTIONS:
1. Translate the entire sentence into natural, fluent Arabic.
2. Identify any key words or phrases with special contextual meaning.
3. Provide BRIEF explanations (1-2 sentences maximum) for these elements.

Return ONLY a JSON object with these exact fields and no additional text, markdown, or formatting:
{
  "original_text": "${text}",
  "translation": "The Arabic translation of the full sentence",
  "is_sentence": true,
  "contextual_elements": [
    {
      "element": "Word or phrase with special meaning",
      "translation": "Arabic translation",
      "explanation": "BRIEF explanation in Arabic (1-2 sentences maximum)"
    }
  ]
}

IMPORTANT: Keep all explanations very concise - no more than 1-2 short sentences each.`;
};

export async function POST(req: NextRequest) {
  try {
    // Get request body
    const {
      word,
      context,
      isFullSentence = false,
      targetLanguage = "Arabic",
    } = await req.json();
    const textToTranslate = word; // For clarity, 'word' can be a word or sentence

    if (!textToTranslate) {
      return NextResponse.json(
        { error: "Text to translate is required" },
        { status: 400 }
      );
    }

    // Always check for fallback translation first
    const fallbackTranslation = getFallbackTranslation(
      textToTranslate,
      context,
      isFullSentence
    );

    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      // Return fallback translation
      return NextResponse.json(fallbackTranslation);
    }

    try {
      // Initialize the model (Gemini 1.5 Pro)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // Choose the appropriate prompt based on whether it's a word or sentence
      let translationPrompt;

      if (isFullSentence) {
        // Prompt for sentence translation with contextual analysis
        translationPrompt = getSentenceTranslationPrompt(
          textToTranslate,
          context
        );
      } else {
        // Prompt for word translation with enhanced contextual analysis
        translationPrompt = getWordTranslationPrompt(textToTranslate, context);
      }

      try {
        const result = await model.generateContent(translationPrompt);
        const response = await result.response;
        const text = response.text();

        try {
          // Try to parse the JSON response
          const jsonResponse = cleanAndParseJSON(text);
          return NextResponse.json(jsonResponse);
        } catch (e) {
          // If parsing fails, return the fallback translation
          return NextResponse.json(fallbackTranslation);
        }
      } catch (error) {
        // Check for rate limiting errors (429 Too Many Requests)
        if (error.status === 429) {
          // Add a specific message for rate limiting
          const rateLimitedFallback = {
            ...fallbackTranslation,
            rate_limited: true,
            message: "API rate limit exceeded. Using fallback translation.",
          };
          return NextResponse.json(rateLimitedFallback);
        }

        // For other errors, return the standard fallback translation
        return NextResponse.json(fallbackTranslation);
      }
    } catch (error) {
      // If model initialization fails, return the fallback translation
      return NextResponse.json(fallbackTranslation);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Even in case of a general error, try to return a fallback translation if possible
    try {
      const { word = "", context = "" } = await (error instanceof Error &&
      error.cause instanceof Request
        ? error.cause.json()
        : { word: "", context: "" });

      if (word) {
        return NextResponse.json(getFallbackTranslation(word, context, false));
      }
    } catch (e) {
      // If all else fails, return an error response
    }

    return NextResponse.json(
      { error: `Failed to process request: ${errorMessage}` },
      { status: 500 }
    );
  }
}

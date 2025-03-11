import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Initialize the OpenAI client with the API key from .env.local
const openaiApiKey = process.env.OPENAI_API_KEY || "";

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Simple validation to check API key availability
const isApiKeyConfigured = () => {
  if (!openaiApiKey) {
    console.error("OpenAI API is not properly configured");
    return false;
  }
  return true;
};

// Update the fallback translations to include just one additional example
const getFallbackTranslation = (
  text: string,
  context: string,
  isFullSentence: boolean,
  targetLanguage: string = "Arabic"
) => {
  // If it's a full sentence, return a sentence translation with contextual elements
  if (isFullSentence) {
    const fallbackTranslations: Record<string, string> = {
      Arabic: "هذه ترجمة محلية للجملة.",
      Spanish: "Esta es una traducción local de la oración.",
      French: "Ceci est une traduction locale de la phrase.",
      German: "Dies ist eine lokale Übersetzung des Satzes.",
      Chinese: "这是句子的本地翻译。",
      Japanese: "これは文の現地翻訳です。",
    };

    return {
      original_text: text,
      translation:
        fallbackTranslations[targetLanguage] || fallbackTranslations["Arabic"],
      is_sentence: true,
      contextual_elements: [
        {
          element: "it's no use",
          translation:
            targetLanguage === "Arabic"
              ? "لا فائدة منه"
              : "no use (translation)",
          explanation:
            targetLanguage === "Arabic"
              ? "تعبير يشير إلى عدم جدوى الأمر."
              : "Expression indicating futility.",
        },
      ],
    };
  }

  // Return a generic fallback for words with one additional example
  const isPhraseWord =
    context.includes(text + " on") ||
    context.includes(text + " up") ||
    context.includes("gave " + text);
  const phraseForm = isPhraseWord
    ? context.includes(text + " on")
      ? text + " on"
      : context.includes(text + " up")
      ? text + " up"
      : context.includes("gave " + text)
      ? "gave " + text
      : text
    : text;

  // Basic fallback translations for different languages
  const fallbackTranslations: Record<string, any> = {
    Arabic: {
      translation: "ذهبت",
      phrasal: "استمررت",
      meaning: `كلمة '${text}' تعني بشكل عام 'يذهب'، ولكن في عبارة '${text} on' تعني 'تستمر' أو 'تواصل'.`,
    },
    Spanish: {
      translation: "fue",
      phrasal: "continuó",
      meaning: `La palabra '${text}' generalmente significa 'ir', pero en la frase '${text} on' significa 'continuar'.`,
    },
    French: {
      translation: "allé",
      phrasal: "continué",
      meaning: `Le mot '${text}' signifie généralement 'aller', mais dans l'expression '${text} on' signifie 'continuer'.`,
    },
    German: {
      translation: "ging",
      phrasal: "machte weiter",
      meaning: `Das Wort '${text}' bedeutet im Allgemeinen 'gehen', aber in der Phrase '${text} on' bedeutet es 'weitermachen'.`,
    },
    Chinese: {
      translation: "去了",
      phrasal: "继续",
      meaning: `'${text}' 这个词通常表示"去"，但在短语 '${text} on' 中表示"继续"。`,
    },
    Japanese: {
      translation: "行った",
      phrasal: "続けた",
      meaning: `'${text}' という単語は一般的に「行く」を意味しますが、'${text} on' というフレーズでは「続ける」を意味します。`,
    },
  };

  const fallback =
    fallbackTranslations[targetLanguage] || fallbackTranslations["Arabic"];

  return {
    selected_word: text,
    base_word: text,
    general_translation: ["go", "move", "travel"].map(
      () => fallback.translation
    ),
    is_phrasal: isPhraseWord,
    phrasal_form: isPhraseWord ? phraseForm : undefined,
    contextual_translation: {
      full_phrase: isPhraseWord ? phraseForm : text,
      translation: isPhraseWord ? fallback.phrasal : fallback.translation,
    },
    meaning_comparison: fallback.meaning,
    additional_example: {
      english: isPhraseWord
        ? `Example using "${phraseForm}" in a different context: "I couldn't understand the lecture, so I ${phraseForm}."`
        : `Example using "${text}" in a different context: "Let's ${text} a cake for the party."`,
      arabic: isPhraseWord
        ? `Example using "${phraseForm}" in a different context: "I couldn't understand the lecture, so I ${fallback.phrasal}."`
        : `Example using "${text}" in a different context: "Let's ${fallback.translation} a cake for the party."`,
    },
  };
};

// Update the word translation prompt to include just one additional example
const getWordTranslationPrompt = (
  word: string,
  context: string,
  targetLanguage: string = "Arabic"
) => {
  return `
Translate this English word to ${targetLanguage}: "${word}"
Context: "${context}"

Provide a complete translation analysis for EVERY word (whether simple or phrasal):

1. First, identify if the word is part of a phrasal verb or idiomatic expression in the context.
2. ALWAYS provide the general meaning of the base word.
3. ALWAYS provide the specific contextual meaning of the word or phrase in this context.
4. For EVERY word, explain how the meaning changes in different contexts (even if it's a simple word).
5. Extract ONLY the necessary part of the sentence containing the word, not the entire sentence.
6. Give ONE clear example with a different usage of the same word (if it's a phrase like 'gave up', the example must include the full phrase).

Format your response as a JSON object with these exact fields:
{
  "selected_word": "${word}",
  "base_word": "The base form of the word (e.g., 'go' from 'go on')",
  "general_translation": ["translation1", "translation2", "translation3"],
  "is_phrasal": true/false,
  "phrasal_form": "The complete phrasal form if applicable (e.g., 'go on')",
  "contextual_translation": {
    "full_phrase": "The original English sentence that contains the word",
    "translation": "${targetLanguage} translation based on context"
  },
  "meaning_comparison": "Explanation in ${targetLanguage} of how this word's meaning can change in different contexts.",
  "additional_example": {
    "english": "Example sentence using the word in a different context. If it's a phrasal verb like 'gave up', the example must include the full phrase.",
    "arabic": "${targetLanguage} translation of this example"
  }
}

IMPORTANT:
- ALWAYS include the meaning_comparison field for EVERY word, even simple words.
- The contextual_translation must always be in ${targetLanguage}.
- Extract only the **necessary part** of the sentence for 'full_phrase' to provide better understanding.
- Make sure the meaning_comparison follows this format: In ${targetLanguage}, explain how the word's meaning changes in different contexts.
- If the word is part of a phrasal verb (like 'gave up' or 'go on'), ensure that the example uses the full phrasal verb.
`;
};

export async function POST(req: NextRequest) {
  try {
    // Extract request data
    const {
      word,
      context = "",
      isFullSentence = false,
      targetLanguage = "Arabic",
    } = await req.json();
    const textToTranslate = word?.trim();

    if (!textToTranslate) {
      return NextResponse.json(
        { error: "Text to translate is required" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        getFallbackTranslation(word, context, isFullSentence, targetLanguage)
      );
    }

    let prompt = isFullSentence
      ? `
Translate this English sentence to ${targetLanguage}: "${textToTranslate}"
Context: "${context}"

Translate sentences with full context in mind. Preserve idioms, phrasal verbs, and expressions naturally. Focus on meaning rather than word-by-word translation.

Format your response as a JSON object with these exact fields:
{
  "original_text": "${textToTranslate}",
  "translation": "${targetLanguage} translation of the full sentence",
  "is_sentence": true,
  "contextual_elements": [
    {
      "element": "Any special phrase or idiom in the sentence",
      "translation": "${targetLanguage} translation of this element",
      "explanation": "Brief explanation in ${targetLanguage} about why this translation was chosen"
    }
  ]
}
If no special contextual elements exist, return an empty array for "contextual_elements".
`
      : getWordTranslationPrompt(textToTranslate, context, targetLanguage);

    try {
      // Call OpenAI API with GPT-4o-mini
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator specializing in English to ${targetLanguage} translations, with expertise in idioms, phrases, and contextual meanings.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Keeps translations more accurate
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("⚠️ Empty response from OpenAI");
      }

      try {
        // Parse JSON response
        return NextResponse.json(JSON.parse(content));
      } catch (parseError) {
        console.error("Error parsing OpenAI response");
        return NextResponse.json(
          getFallbackTranslation(word, context, isFullSentence, targetLanguage)
        );
      }
    } catch (apiError) {
      console.error("OpenAI API call failed");
      return NextResponse.json(
        getFallbackTranslation(word, context, isFullSentence, targetLanguage)
      );
    }
  } catch (error) {
    console.error("Server error in translation endpoint");
    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

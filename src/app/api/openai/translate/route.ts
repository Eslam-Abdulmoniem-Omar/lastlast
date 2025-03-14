import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Initialize the OpenAI client with the API key from .env.local
const openaiApiKey = process.env.OPENAI_API_KEY || "";
console.log("OpenAI API key available:", openaiApiKey ? "Yes" : "No");

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Simple validation to check API key availability
const isApiKeyConfigured = () => {
  if (!openaiApiKey) {
    console.error("OPENAI_API_KEY is not configured in environment variables");
    return false;
  }
  console.log("Using OpenAI API key with length:", openaiApiKey.length);
  return true;
};

// Update the fallback translations to include just one additional example
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
  const arabicPhraseTranslation = isPhraseWord
    ? context.includes(text + " on")
      ? "استمررت"
      : context.includes(text + " up")
      ? "استسلمت"
      : context.includes("gave " + text)
      ? "تخليت عنه"
      : "ذهبت"
    : "ذهبت";
  const arabicTranslation = "نصنع";

  return {
    selected_word: text,
    base_word: text,
    general_translation: ["ذهب", "يمضي", "يتنقل"],
    is_phrasal: isPhraseWord,
    phrasal_form: isPhraseWord ? phraseForm : undefined,
    contextual_translation: {
      full_phrase: isPhraseWord ? phraseForm : text,
      translation: isPhraseWord
        ? context.includes(text + " on")
          ? "يستمر"
          : context.includes(text + " up")
          ? "يستسلم"
          : context.includes("gave " + text)
          ? "يتخلى عن"
          : "يذهب"
        : "يذهب",
    },
    meaning_comparison: isPhraseWord
      ? context.includes(text + " on")
        ? `كلمة '${text}' تعني بشكل عام 'يذهب'، ولكن في عبارة '${text} on' تعني 'تستمر' أو 'تواصل'. هذا يوضح كيف أن المعنى يتغير من الحركة الجسدية إلى الاستمرار في فعل شيء ما.`
        : context.includes(text + " up")
        ? `كلمة '${text}' تعني بشكل عام 'يذهب'، ولكن في عبارة '${text} up' تعني 'ينهض' أو 'يستسلم' حسب السياق. هذا يظهر كيف تضيف الحروف معاني مختلفة للكلمة الأساسية.`
        : context.includes("gave " + text)
        ? `كلمة '${text}' كجزء من عبارة 'gave ${text}' تعني 'تخلى عن' أو 'استسلم'، بينما '${text}' بمفردها تعني 'يذهب'. هذا مثال على كيف يمكن للأفعال أن تكتسب معاني مختلفة تماماً في العبارات الاصطلاحية.`
        : `كلمة '${text}' لها عدة معاني مختلفة حسب السياق. يمكن أن تعني 'يذهب' بمعنى الانتقال، أو تأتي في تعبيرات اصطلاحية مثل '${text} through' بمعنى 'يمر عبر'.`
      : `كلمة '${text}' يمكن أن تظهر بمفردها بمعنى 'يذهب'، أو في عبارات مثل '${text} on' (يستمر) أو '${text} up' (ينهض/يستسلم). هذا يوضح أهمية فهم السياق لتحديد المعنى الدقيق للكلمة.`,
    additional_example: {
      english: isPhraseWord
        ? `Example using "${phraseForm}" in a different context: "I couldn't understand the lecture, so I ${phraseForm}."`
        : `Example using "${text}" in a different context: "Let's ${text} a cake for the party."`,
      arabic: isPhraseWord
        ? `مثال باستخدام "${phraseForm}" في سياق مختلف: "لم أستطع فهم المحاضرة، لذلك ${arabicPhraseTranslation}."`
        : `مثال باستخدام "${text}" في سياق مختلف: "دعنا ${arabicTranslation} كعكة للحفلة."`,
    },
  };
};

// Update the word translation prompt to include just one additional example
const getWordTranslationPrompt = (word: string, context: string) => {
  return `
Translate this English word to Arabic: "${word}"
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
    "translation": "Arabic translation based on context"
  },
  "meaning_comparison": "Explanation in Arabic of how this word's meaning can change in different contexts. For example: كلمة 'go' تعني بشكل عام 'يذهب'، ولكن في عبارة 'go on' تعني 'تستمر' أو 'تواصل'. هذا يوضح كيف أن المعنى يتغير من الحركة الجسدية إلى الاستمرار في فعل شيء ما.",
  "additional_example": {
    "english": "Example sentence using the word in a different context. If it's a phrasal verb like 'gave up', the example must include the full phrase.",
    "arabic": "Arabic translation of this example"
  }
}

IMPORTANT:
- ALWAYS include the meaning_comparison field for EVERY word, even simple words.
- The contextual_translation must always be in Arabic.
- Extract only the **necessary part** of the sentence for 'full_phrase' to provide better understanding.
- Make sure the meaning_comparison follows this format: كلمة 'X' تعني... ولكن في عبارة 'X Y' تعني...
- ANY word or phrase that appears in SINGLE quotes (like 'go') or DOUBLE quotes (like "gave up") MUST REMAIN IN ENGLISH and should NOT be translated to Arabic.
- When mentioning English words or phrases in the Arabic explanation, ALWAYS keep them in their original English form.
- If the word is part of a phrasal verb (like 'gave up' or 'go on'), ensure that the example uses the full phrasal verb.
`;
};

export async function POST(req: NextRequest) {
  try {
    console.log("🔹 OpenAI Translation API route called");

    // Extract request data
    const { word, context, isFullSentence = false } = await req.json();
    const textToTranslate = word?.trim();

    if (!textToTranslate) {
      return NextResponse.json(
        { error: "Text to translate is required" },
        { status: 400 }
      );
    }

    console.log(
      `🔍 Translating ${
        isFullSentence ? "sentence" : "word"
      }: "${textToTranslate}"`
    );

    // Check API key configuration
    if (!isApiKeyConfigured()) {
      console.warn("⚠️ API key not configured, using fallback translation.");
      return NextResponse.json(
        getFallbackTranslation(textToTranslate, context, isFullSentence)
      );
    }

    let prompt = isFullSentence
      ? `
Translate this English sentence to Arabic: "${textToTranslate}"
Context: "${context}"

Translate sentences with full context in mind. Preserve idioms, phrasal verbs, and expressions naturally. Focus on meaning rather than word-by-word translation.

Format your response as a JSON object with these exact fields:
{
  "original_text": "${textToTranslate}",
  "translation": "Arabic translation of the full sentence",
  "is_sentence": true,
  "contextual_elements": [
    {
      "element": "Any special phrase or idiom in the sentence",
      "translation": "Arabic translation of this element",
      "explanation": "Brief explanation in Arabic about why this translation was chosen"
    }
  ]
}

IMPORTANT:
- If no special contextual elements exist, return an empty array for "contextual_elements".
- When providing explanations in Arabic, any English words or phrases that appear in single quotes (') or double quotes (") MUST REMAIN IN ENGLISH - do not translate these quoted terms.
- In explanations, always present English terms in their original form.
`
      : getWordTranslationPrompt(textToTranslate, context);

    try {
      // Call OpenAI API with GPT-4o-mini
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator specializing in English to Arabic translations, with expertise in idioms, phrases, and contextual meanings. IMPORTANT: When providing translations, always keep English words and phrases that appear in single quotes (') or double quotes (\") in their original English form. Never translate these quoted terms to Arabic, as they are meant to be recognized as English terms in the translation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Keeps translations more accurate
        response_format: { type: "json_object" },
      });

      console.log("✅ OpenAI Translation response received");

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("⚠️ Empty response from OpenAI");
      }

      try {
        // Parse JSON response
        return NextResponse.json(JSON.parse(content));
      } catch (parseError) {
        console.error("❌ Error parsing OpenAI response:", parseError);
        console.warn("⚠️ Falling back to manual translation.");
        return NextResponse.json(
          getFallbackTranslation(textToTranslate, context, isFullSentence)
        );
      }
    } catch (apiError) {
      console.error("❌ OpenAI API call failed:", apiError);
      console.warn("⚠️ Using fallback translation due to API failure.");
      return NextResponse.json(
        getFallbackTranslation(textToTranslate, context, isFullSentence)
      );
    }
  } catch (error) {
    console.error("❌ Unexpected server error:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

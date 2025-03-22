/**
 * Text utility functions for speech recognition and text comparison
 */

/**
 * Normalizes text by converting to lowercase, removing punctuation, and trimming whitespace
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .trim();
};

/**
 * Expands common English contractions to their full form
 */
export const expandContractions = (text: string): string => {
  const contractions: Record<string, string> = {
    "won't": "will not",
    "can't": "cannot",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "couldn't": "could not",
    "shouldn't": "should not",
    "wouldn't": "would not",
    "i'm": "i am",
    "you're": "you are",
    "he's": "he is",
    "she's": "she is",
    "it's": "it is",
    "we're": "we are",
    "they're": "they are",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'll": "i will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "it'll": "it will",
    "we'll": "we will",
    "they'll": "they will",
    "i'd": "i would",
    "you'd": "you would",
    "he'd": "he would",
    "she'd": "she would",
    "it'd": "it would",
    "we'd": "we would",
    "they'd": "they would",
    "let's": "let us",
  };

  let expandedText = text.toLowerCase();

  // Replace contractions with their expanded forms
  Object.entries(contractions).forEach(([contraction, expansion]) => {
    const regex = new RegExp(`\\b${contraction}\\b`, "gi");
    expandedText = expandedText.replace(regex, expansion);
  });

  return expandedText;
};

/**
 * Compares two texts and returns detailed information about their similarities and differences
 */
export const compareTexts = (said: string, expected: string) => {
  // Convert to lowercase and split into words
  const saidWords = said
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const expectedWords = expected
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // Track matched, incorrect, missing, and extra words
  const matchedWords: string[] = [];
  const incorrectWords: Record<string, string> = {};
  const missingWords: string[] = [];
  const extraWords: string[] = [];

  // Create a working copy of the expected words to mark as matched
  const remainingExpectedWords = [...expectedWords];

  // First pass: find exact matches
  for (let i = 0; i < saidWords.length; i++) {
    const saidWord = saidWords[i];
    const indexInExpected = remainingExpectedWords.findIndex(
      (word) => word.toLowerCase() === saidWord.toLowerCase()
    );

    if (indexInExpected !== -1) {
      // Found an exact match
      matchedWords.push(saidWord);
      // Remove from remaining expected words
      remainingExpectedWords.splice(indexInExpected, 1);
    } else {
      // No exact match found, will check for similar words in second pass
      extraWords.push(saidWord);
    }
  }

  // Second pass: check for similar words (for approximate matching)
  if (extraWords.length > 0 && remainingExpectedWords.length > 0) {
    const newExtraWords: string[] = [];

    for (const extraWord of extraWords) {
      let bestMatch = "";
      let bestSimilarity = 0;
      let bestMatchIndex = -1;

      // Find the most similar remaining expected word
      for (let i = 0; i < remainingExpectedWords.length; i++) {
        const expectedWord = remainingExpectedWords[i];
        const similarity = wordSimilarity(extraWord, expectedWord);

        if (similarity > bestSimilarity && similarity > 0.6) {
          // 60% similarity threshold
          bestSimilarity = similarity;
          bestMatch = expectedWord;
          bestMatchIndex = i;
        }
      }

      if (bestMatchIndex !== -1) {
        // Found a similar word
        incorrectWords[extraWord] = bestMatch;
        // Remove from remaining expected words
        remainingExpectedWords.splice(bestMatchIndex, 1);
      } else {
        // No similar word found, keep as extra
        newExtraWords.push(extraWord);
      }
    }

    // Update extra words with those that couldn't be matched
    extraWords.length = 0;
    extraWords.push(...newExtraWords);
  }

  // All remaining expected words are missing
  missingWords.push(...remainingExpectedWords);

  // Calculate similarity score (0.0 to 1.0)
  const totalExpectedWords = expectedWords.length;
  const matchedCount = matchedWords.length + Object.keys(incorrectWords).length;
  const similarity =
    totalExpectedWords > 0 ? matchedCount / totalExpectedWords : 0;

  // Check for word order issues (only for perfect matches)
  const wordOrderIssues: any[] = [];

  return {
    matchedWords,
    incorrectWords,
    missingWords,
    extraWords,
    similarity,
    wordOrderIssues,
  };
};

/**
 * Helper function to calculate word similarity (0.0 to 1.0) using Levenshtein distance
 */
export const wordSimilarity = (a: string, b: string): number => {
  // Convert to lowercase
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();

  // Calculate Levenshtein distance
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }

  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);

  // Return similarity as 1 - normalized distance
  return maxLength > 0 ? 1 - distance / maxLength : 1;
};

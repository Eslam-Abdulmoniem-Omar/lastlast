import { Podcast } from "../types";

export const sampleYoutubeShort: Podcast = {
  id: "sample-youtube-short-1",
  title: "Dramatic Dialogue Practice",
  description:
    "Practice English with this dramatic dialogue between two speakers discussing their relationship.",
  audioUrl: "https://example.com/audio.mp3", // Placeholder
  transcriptUrl: "https://example.com/transcript.txt", // Placeholder
  youtubeUrl: "https://www.youtube.com/embed/91MhNtDNAbg", // The provided YouTube URL in embed format
  level: "intermediate",
  duration: 30, // Estimated duration in seconds
  topics: ["conversation", "relationships", "emotions"],
  hostName: "English Drama Practice",
  publishedDate: new Date().toISOString(),
  isShort: true,
  questions: [
    {
      id: "q1",
      text: "What emotions is Speaker A expressing in this dialogue?",
      timestamp: 5,
    },
    {
      id: "q2",
      text: "How does Speaker B respond to Speaker A's feelings?",
      timestamp: 15,
    },
  ],
  referenceAnswers: [
    {
      questionId: "q1",
      text: "Speaker A is expressing frustration, love, and a need for resolution in their relationship with Joe.",
    },
    {
      questionId: "q2",
      text: "Speaker B responds by mentioning sacrifices they've made (giving up billiards) and expressing their assumption that Speaker A would love them.",
    },
  ],
  dialogueSegments: [
    {
      id: "segment1",
      speakerName: "Speaker A",
      text: "It's no use, Joe. Joe, we've got to have it",
      startTime: 0.06,
      endTime: 2.399,
      vocabularyItems: [
        {
          word: "no use",
          definition: "Not helpful or effective; pointless",
          exampleSentence: "It's no use trying to persuade him.",
          translation: "inútil",
        },
      ],
    },
    {
      id: "segment2",
      speakerName: "Speaker A",
      text: "out. I've loved you ever since I've known",
      startTime: 2.399,
      endTime: 4.5,
      vocabularyItems: [
        {
          word: "have it out",
          definition:
            "To discuss or argue about a disagreement until it is resolved",
          exampleSentence:
            "We need to have it out and clear the air between us.",
          translation: "resolver un asunto",
        },
      ],
    },
    {
      id: "segment3",
      speakerName: "Speaker A",
      text: "you, Joe. I couldn't help it, and and I",
      startTime: 4.5,
      endTime: 6.6,
      vocabularyItems: [
        {
          word: "ever since",
          definition: "From a particular time in the past until now",
          exampleSentence: "I've been waiting for you ever since you left.",
          translation: "desde que",
        },
      ],
    },
    {
      id: "segment4",
      speakerName: "Speaker A",
      text: "tried to show, and you wouldn't let me",
      startTime: 6.6,
      endTime: 7.799,
      vocabularyItems: [
        {
          word: "couldn't help it",
          definition: "Unable to prevent or control something",
          exampleSentence: "I couldn't help laughing at his joke.",
          translation: "no pude evitarlo",
        },
      ],
    },
    {
      id: "segment5",
      speakerName: "Speaker A",
      text: "which is fine, but I must make you hear me",
      startTime: 7.799,
      endTime: 9.9,
      vocabularyItems: [
        {
          word: "make you hear",
          definition: "To force someone to listen and understand",
          exampleSentence: "I need to make you hear my side of the story.",
          translation: "hacer que escuches",
        },
      ],
    },
    {
      id: "segment6",
      speakerName: "Speaker A",
      text: "now and give me an answer because I",
      startTime: 9.9,
      endTime: 12.0,
      vocabularyItems: [
        {
          word: "give me an answer",
          definition: "To provide a response to a question or request",
          exampleSentence: "I need you to give me an answer by tomorrow.",
          translation: "dame una respuesta",
        },
      ],
    },
    {
      id: "segment7",
      speakerName: "Speaker A",
      text: "cannot go on like this any longer. Even",
      startTime: 12.0,
      endTime: 14.16,
      vocabularyItems: [
        {
          word: "go on like this",
          definition: "To continue in the current situation or behavior",
          exampleSentence: "We can't go on like this, working 16 hours a day.",
          translation: "seguir así",
        },
      ],
    },
    {
      id: "segment8",
      speakerName: "Speaker A",
      text: "Billiards, I gave up everything you",
      startTime: 14.16,
      endTime: 15.599,
      vocabularyItems: [
        {
          word: "gave up",
          definition: "To stop doing or having something",
          exampleSentence: "She gave up smoking last year.",
          translation: "renuncié a",
        },
      ],
    },
    {
      id: "segment9",
      speakerName: "Speaker A",
      text: "didn't like. I'm happy I did, it's fine and I waited, and I never complained",
      startTime: 15.599,
      endTime: 19.5,
      vocabularyItems: [
        {
          word: "I'm happy I did",
          definition: "Expressing satisfaction with a past decision",
          exampleSentence: "I'm happy I decided to come to the party.",
          translation: "Me alegro de haberlo hecho",
        },
      ],
    },
    {
      id: "segment10",
      speakerName: "Speaker A",
      text: "because I",
      startTime: 19.5,
      endTime: 22.02,
      vocabularyItems: [
        {
          word: "complained",
          definition: "Expressed dissatisfaction or annoyance",
          exampleSentence:
            "He complained about the poor service at the restaurant.",
          translation: "me quejé",
        },
      ],
    },
    {
      id: "segment11",
      speakerName: "Speaker A",
      text: "you know, I figured you'd love me, Joe.",
      startTime: 22.02,
      endTime: 25.0,
      vocabularyItems: [
        {
          word: "figured",
          definition: "Believed or assumed something",
          exampleSentence: "I figured you would be late as usual.",
          translation: "supuse",
        },
      ],
    },
  ],
};

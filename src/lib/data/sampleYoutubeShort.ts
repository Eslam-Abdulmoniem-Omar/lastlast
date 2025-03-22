import { Podcast } from "../types";

export const sampleYoutubeShort: Podcast = {
  id: "sample-youtube-short-1",
  title: "Police Confrontation",
  description:
    "Practice English with this tense dialogue between a police officer and a suspect.",
  audioUrl: "https://example.com/audio.mp3", // Placeholder
  transcriptUrl: "https://example.com/transcript.txt", // Placeholder
  youtubeUrl: "https://www.youtube.com/embed/DxmiTVV3GHY", // New video URL
  level: "intermediate",
  duration: 40, // Estimated duration in seconds
  topics: ["conversation", "confrontation", "police", "crime"],
  hostName: "English Drama Practice",
  publishedDate: new Date().toISOString(),
  isShort: true,
  questions: [
    {
      id: "q1",
      text: "What is the suspect threatening to do?",
      timestamp: 15,
    },
    {
      id: "q2",
      text: "How does the police officer try to defuse the situation?",
      timestamp: 25,
    },
  ],
  referenceAnswers: [
    {
      questionId: "q1",
      text: "The suspect is threatening to detonate IEDs (improvised explosive devices) rigged throughout the house.",
    },
    {
      questionId: "q2",
      text: "The officer tries to defuse the situation by asking questions, staying calm, and eventually instructing the suspect to let go of the wire slowly.",
    },
  ],
  dialogueSegments: [
    {
      id: "segment1",
      speakerName: "Speaker A",
      text: "Hi, how are you?",
      startTime: 0,
      endTime: 2,
      vocabularyItems: [],
    },
    {
      id: "segment2",
      speakerName: "Speaker B",
      text: "I'm fine, sir. What do you want?",
      startTime: 2,
      endTime: 4,
      vocabularyItems: [],
    },
    {
      id: "segment3",
      speakerName: "Speaker A",
      text: "Could I have a glass of water?",
      startTime: 4,
      endTime: 6,
      vocabularyItems: [],
    },
    {
      id: "segment4",
      speakerName: "Speaker B",
      text: "Are you a cop too?",
      startTime: 6,
      endTime: 8,
      vocabularyItems: [],
    },
    {
      id: "segment5",
      speakerName: "Speaker A",
      text: "Yeah, that's my partner outside conducting a lawful search. You just need to relax, Harper.",
      startTime: 8,
      endTime: 12,
      vocabularyItems: [
        {
          word: "lawful search",
          definition:
            "A search conducted by police with proper legal authorization",
          exampleSentence:
            "The officers performed a lawful search of the premises.",
        },
      ],
    },
    {
      id: "segment6",
      speakerName: "Speaker B",
      text: "He's running—hands where I can see them!",
      startTime: 12,
      endTime: 14,
      vocabularyItems: [],
    },
    {
      id: "segment7",
      speakerName: "Speaker A",
      text: "What the hell was that?",
      startTime: 14,
      endTime: 16,
      vocabularyItems: [],
    },
    {
      id: "segment8",
      speakerName: "Speaker B",
      text: "It's the burglar alarm system. There are pressure plates all throughout the floor, rigged to IEDs. One wrong step, and they'll be cleaning you off the ceiling with a squeegee.",
      startTime: 16,
      endTime: 22,
      vocabularyItems: [
        {
          word: "pressure plates",
          definition: "Devices that activate when stepped on or pressed",
          exampleSentence:
            "The trap was triggered by a pressure plate hidden under the floorboards.",
        },
        {
          word: "IEDs",
          definition: "Improvised Explosive Devices; homemade bombs",
          exampleSentence:
            "The soldiers were trained to identify and avoid IEDs.",
        },
        {
          word: "squeegee",
          definition:
            "A tool with a rubber blade for removing liquid from a surface",
          exampleSentence: "He used a squeegee to clean the shower glass.",
        },
      ],
    },
    {
      id: "segment9",
      speakerName: "Speaker A",
      text: "You don't need to do this.",
      startTime: 22,
      endTime: 24,
      vocabularyItems: [],
    },
    {
      id: "segment10",
      speakerName: "Speaker B",
      text: "Why not? I'm caught. Might as well go out with a bang.",
      startTime: 24,
      endTime: 27,
      vocabularyItems: [
        {
          word: "go out with a bang",
          definition: "To end something in a dramatic or spectacular way",
          exampleSentence:
            "After 30 years in business, they decided to go out with a bang by throwing a huge farewell party.",
        },
      ],
    },
    {
      id: "segment11",
      speakerName: "Speaker A",
      text: "How long ago did you rig the house?",
      startTime: 27,
      endTime: 30,
      vocabularyItems: [
        {
          word: "rig",
          definition:
            "To set up or arrange something, often in a way that's meant to deceive or for a specific purpose",
          exampleSentence:
            "He rigged the door to make a sound when someone entered.",
        },
      ],
    },
    {
      id: "segment12",
      speakerName: "Speaker B",
      text: "Almost a decade. I've been waiting that long for a cop to show up on my doorstep.",
      startTime: 30,
      endTime: 34,
      vocabularyItems: [
        {
          word: "doorstep",
          definition: "The step at the entrance to a building",
          exampleSentence: "She left the package on the doorstep.",
        },
      ],
    },
    {
      id: "segment13",
      speakerName: "Speaker A",
      text: "Let go of the wire—slowly. Turn around, hands behind your back.",
      startTime: 34,
      endTime: 38,
      vocabularyItems: [],
    },
  ],
};

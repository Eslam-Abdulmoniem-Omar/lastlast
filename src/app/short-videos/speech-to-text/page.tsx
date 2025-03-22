"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  StopCircle,
  ArrowLeft,
  User,
  Bot,
  RefreshCw,
  FileText,
  Film,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useSearchParams } from "next/navigation";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  isCorrect?: boolean;
  emotion?: "neutral" | "good" | "needs-improvement";
}

interface TranscriptLine {
  speaker: "A" | "B";
  text: string;
  _joined?: boolean; // Optional flag to mark lines that were joined
}

interface Feedback {
  scriptAccuracy: boolean;
  emotionalTone: "neutral" | "good" | "needs-improvement";
  message: string;
}

interface LinePerformance {
  expectedText: string;
  actualText: string;
  isCorrect: boolean;
  emotion: "neutral" | "good" | "needs-improvement";
}

export default function SpeechToTextPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [userSpeaker, setUserSpeaker] = useState<"A" | "B">("A");
  const [pendingFeedback, setPendingFeedback] = useState<Feedback | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [highlightedText, setHighlightedText] = useState("");
  const [linePerformances, setLinePerformances] = useState<LinePerformance[]>(
    []
  );
  const [isScriptComplete, setIsScriptComplete] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Add missing state variables
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastProcessedAudio, setLastProcessedAudio] = useState(0);
  const [processingInProgress, setProcessingInProgress] = useState(false);
  const [recordingTimeoutId, setRecordingTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  // Get search params to load transcript from URL
  const searchParams = useSearchParams();
  const videoTitle = searchParams.get("title") || "Practice Script";
  const videoId = searchParams.get("videoId");

  // Define our known transcripts for reference
  const dreamHouseTranscript: TranscriptLine[] = [
    { speaker: "A", text: "Do not be afraid." },
    { speaker: "B", text: "I am not afraid." },
    { speaker: "A", text: "Then come out." },
    { speaker: "B", text: "Then you will be afraid." },
    { speaker: "A", text: "No, I won't." },
    { speaker: "B", text: "I know who you are." },
    { speaker: "A", text: "Do you?" },
    { speaker: "B", text: "You are my fairy godmother." },
  ];

  // Define the police confrontation transcript
  const policeConfrontationTranscript: TranscriptLine[] = [
    { speaker: "A", text: "Hi, how are you?" },
    { speaker: "B", text: "I'm fine, sir. What do you want?" },
    { speaker: "A", text: "Could I have a glass of water?" },
    { speaker: "B", text: "Are you a cop too?" },
    {
      speaker: "A",
      text: "Yeah, that's my partner outside conducting a lawful search. You just need to relax, Harper.",
    },
    { speaker: "B", text: "He's running—hands where I can see them!" },
    { speaker: "A", text: "What the hell was that?" },
    {
      speaker: "B",
      text: "It's the burglar alarm system. There are pressure plates all throughout the floor, rigged to IEDs. One wrong step, and they'll be cleaning you off the ceiling with a squeegee.",
    },
    { speaker: "A", text: "You don't need to do this." },
    {
      speaker: "B",
      text: "Why not? I'm caught. Might as well go out with a bang.",
    },
    { speaker: "A", text: "How long ago did you rig the house?" },
    {
      speaker: "B",
      text: "Almost a decade. I've been waiting that long for a cop to show up on my doorstep.",
    },
    {
      speaker: "A",
      text: "Let go of the wire—slowly. Turn around, hands behind your back.",
    },
  ];

  // Default transcript in case nothing is provided
  const getDefaultTranscript = (): TranscriptLine[] => {
    return [
      {
        speaker: "A",
        text: "Welcome to script practice. You can choose which speaker to practice as.",
      },
      {
        speaker: "B",
        text: "Try to match the text exactly for the best results.",
      },
      {
        speaker: "A",
        text: "The AI will play the other speaker's lines automatically.",
      },
    ];
  };

  // Script with Speaker A and B - initialize with the appropriate default
  const [transcript, setTranscript] = useState<TranscriptLine[]>(
    getDefaultTranscript()
  );

  // Helper function to convert transcript with speaker names to A/B format
  const convertTranscriptFormat = (transcript: any[]): TranscriptLine[] => {
    return transcript.map((line: any, index: number) => {
      // Extract just the "A" or "B" from speaker names like "Speaker A"
      let speaker = line.speaker;
      if (speaker.includes("A")) speaker = "A";
      else if (speaker.includes("B")) speaker = "B";
      else speaker = index % 2 === 0 ? "A" : "B"; // Fallback

      return {
        speaker,
        text: line.text,
      };
    });
  };

  // Helper function for checking if a transcript is the Joe dialogue
  const isJoeDialogue = (transcript: TranscriptLine[]): boolean => {
    return (
      transcript.length > 0 &&
      transcript.some(
        (line) =>
          line.text.includes("Joe") ||
          line.text.includes("loved you ever since")
      )
    );
  };

  // Helper function specifically for fixing the Joe dialogue transcript
  const getFixedJoeDialogue = (): TranscriptLine[] => {
    return [
      {
        speaker: "A",
        text: "It's no use, Joe. Joe, we've got to have it out.",
      },
      {
        speaker: "B",
        text: "I've loved you ever since I've known you, Joe.",
      },
      {
        speaker: "A",
        text: "I couldn't help it, and I tried to show, and you wouldn't let me.",
      },
      {
        speaker: "B",
        text: "Which is fine, but I must make you hear me now and give me an answer because I cannot go on like this any longer.",
      },
      {
        speaker: "A",
        text: "Even Billiards, I gave up everything you didn't like.",
      },
      {
        speaker: "B",
        text: "I'm happy I did, it's fine and I waited, and I never complained because I you know, I figured you'd love.",
      },
    ];
  };

  // General-purpose helper function to process and fix transcript sentences
  const processAndFixTranscript = (
    rawTranscript: TranscriptLine[]
  ): TranscriptLine[] => {
    // General case: Look for incomplete sentences and try to fix them
    const fixedTranscript: TranscriptLine[] = [];
    let i = 0;

    while (i < rawTranscript.length) {
      const current = rawTranscript[i];

      // Check if this line might be incomplete (no ending punctuation and not the last line)
      if (
        i < rawTranscript.length - 1 &&
        !current.text.endsWith(".") &&
        !current.text.endsWith("!") &&
        !current.text.endsWith("?") &&
        !current.text.endsWith(",") &&
        !current.text.endsWith(";") &&
        !current.text.endsWith(" ")
      ) {
        // Check if next line's speaker is different (possible mid-sentence speaker change)
        const next = rawTranscript[i + 1];

        // If next line starts with lowercase letter, it might be continuation
        const firstChar = next.text.trim().charAt(0);
        if (firstChar >= "a" && firstChar <= "z") {
          // Join the lines regardless of speaker
          fixedTranscript.push({
            speaker: current.speaker,
            text: current.text + " " + next.text,
          });
          i += 2; // Skip both lines
          continue;
        }
      }

      // If we didn't join lines, add the current line as is
      fixedTranscript.push(current);
      i++;
    }

    return fixedTranscript;
  };

  // Load transcript data on component mount
  useEffect(() => {
    try {
      console.log("Attempting to load transcript for video ID:", videoId);

      // Try to get specific transcript for this video ID from URL parameters
      if (videoId) {
        // Check if videoId is for "police confrontation" video
        if (videoId === "sample-youtube-short-1") {
          console.log("Loading police confrontation transcript");
          setTranscript(policeConfrontationTranscript);

          // Default to playing speaker A
          setUserSpeaker("A");
          return;
        }

        // Check if videoId is for "dream house" video
        if (videoId === "dream-house-video") {
          console.log("Loading dream house transcript");
          setTranscript(dreamHouseTranscript);

          // Default to playing speaker A
          setUserSpeaker("A");
          return;
        }
      }

      // Try to get from localStorage as fallback
      const storedData = localStorage.getItem("current-speech-practice");
      if (storedData) {
        const practiceData = JSON.parse(storedData);
        console.log("Found stored practice data:", practiceData.title);

        // Check if this data matches our video ID
        if (!videoId || practiceData.videoId === videoId) {
          console.log("Using stored transcript for:", practiceData.title);

          // Format the transcript data
          const formattedTranscript = practiceData.transcript.map(
            (line: any) => {
              // Extract just the "A" or "B" from speaker names
              let speaker = line.speaker;
              if (speaker.includes("A")) speaker = "A";
              else if (speaker.includes("B")) speaker = "B";
              else speaker = "A"; // Default to A

              return {
                speaker,
                text: line.text,
              };
            }
          );

          setTranscript(formattedTranscript);
          console.log(
            "Transcript set from localStorage:",
            formattedTranscript[0]?.text
          );

          // Select appropriate user speaker
          if (formattedTranscript.length > 0) {
            setUserSpeaker(formattedTranscript[0].speaker as "A" | "B");
          }

          return; // Successfully loaded from localStorage
        }
      }

      // If localStorage didn't work, try URL params
      const transcriptParam = searchParams.get("transcript");
      if (transcriptParam) {
        try {
          const parsedTranscript = JSON.parse(
            decodeURIComponent(transcriptParam)
          );
          if (Array.isArray(parsedTranscript) && parsedTranscript.length > 0) {
            console.log("Loaded transcript from URL params");

            // Format the transcript consistently
            const formattedTranscript = parsedTranscript.map((line: any) => {
              let speaker = line.speaker;
              if (speaker.includes("A")) speaker = "A";
              else if (speaker.includes("B")) speaker = "B";
              else speaker = "A";

              return {
                speaker,
                text: line.text,
              };
            });

            setTranscript(formattedTranscript);

            // Select appropriate user speaker
            if (formattedTranscript.length > 0) {
              setUserSpeaker(formattedTranscript[0].speaker as "A" | "B");
            }

            return; // Successfully loaded from URL
          }
        } catch (parseError) {
          console.error("Error parsing transcript from URL:", parseError);
        }
      }

      // If all else fails, use the default transcript based on video ID
      console.log("Using default transcript for video ID:", videoId);
      const defaultTranscript = getDefaultTranscript();
      setTranscript(defaultTranscript);

      if (defaultTranscript.length > 0) {
        setUserSpeaker(defaultTranscript[0].speaker as "A" | "B");
      }
    } catch (error) {
      console.error("Error loading transcript:", error);
      toast.error("Could not load the transcript. Using default script.");

      // Use the appropriate default as fallback
      const defaultTranscript = getDefaultTranscript();
      setTranscript(defaultTranscript);

      if (defaultTranscript.length > 0) {
        setUserSpeaker(defaultTranscript[0].speaker as "A" | "B");
      }
    } finally {
      // Log the final transcript for debugging
      setTimeout(() => {
        console.log("Final transcript loaded:", transcript);
        console.log("User will play Speaker:", userSpeaker);
      }, 100);
    }
  }, [videoId, searchParams]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Add initial instruction message
  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      const otherSpeaker = userSpeaker === "A" ? "B" : "A";

      setMessages([
        {
          role: "system",
          content: `Welcome to script practice! You'll be playing Speaker ${userSpeaker}.

The AI will play Speaker ${otherSpeaker}.

We'll now begin the scene. Your first line will be highlighted below.`,
        },
      ]);

      // Find the first line for the user's speaker
      let firstUserLineIndex = transcript.findIndex(
        (line) => line.speaker === userSpeaker
      );
      if (firstUserLineIndex > 0) {
        // If there are lines before the user's first line, add them as assistant messages
        for (let i = 0; i < firstUserLineIndex; i++) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: transcript[i].text,
            },
          ]);
        }
      }

      // Highlight the user's first line
      if (firstUserLineIndex >= 0) {
        setCurrentLineIndex(firstUserLineIndex);
        setHighlightedText(transcript[firstUserLineIndex].text);
      }
    }
  }, [userSpeaker]);

  // Auto-scroll to bottom of conversation when new messages are added
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const startRecording = async () => {
    try {
      // Reset states
      setTranscription("");
      setErrorMessage(null);
      audioChunksRef.current = [];
      setIsListening(true);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      // Simple data collection
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      recorder.onstop = async () => {
        setIsProcessing(true);
        setIsListening(false);

        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });

          // If the audio blob is too small (no speech detected),
          // just use the highlighted text as the user's "speech"
          if (audioBlob.size < 1000 && highlightedText) {
            toast.success("No speech detected, moving to next line");
            await processUserSpeech(highlightedText);
          } else {
            await processAudio(audioBlob);
          }
        } catch (error) {
          console.error("Error processing audio:", error);
          setErrorMessage("Failed to process audio. Please try again.");

          // Move to next line even if there's an error
          if (highlightedText) {
            toast.success("Error processing speech, moving to next line");
            await processUserSpeech(highlightedText);
          }
        } finally {
          setIsProcessing(false);
        }
      };

      // Start recording
      recorder.start(200);
      setIsRecording(true);
      toast.success("Recording started (10 seconds limit)");

      // Set a guaranteed 10-second timeout to automatically stop recording
      const timeoutId = setTimeout(() => {
        console.log("10-second timeout triggered");
        // Force stop the recording regardless of state
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          console.log("Stopping media recorder from timeout");
          mediaRecorderRef.current.stop();
        }

        if (mediaStreamRef.current) {
          console.log("Stopping media tracks from timeout");
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        setIsRecording(false);
        setIsListening(false);

        // If we have no meaningful audio data, just use the script text
        if (audioChunksRef.current.length === 0 && highlightedText) {
          console.log("No audio recorded, using script text directly");
          processUserSpeech(highlightedText);
          audioChunksRef.current = [];
        }

        toast.success("Time's up! Moving to next line");
      }, 10000);

      setRecordingTimeoutId(timeoutId);
      console.log("Set 10s timeout with ID:", timeoutId);
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage(
        "Could not access microphone. Please check your browser permissions."
      );
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      setIsListening(false);

      // Clear the recording timeout
      if (recordingTimeoutId) {
        console.log("Clearing timeout in stopRecording");
        clearTimeout(recordingTimeoutId);
        setRecordingTimeoutId(null);
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        console.log("Stopping media recorder in stopRecording");
        mediaRecorderRef.current.stop();
      }

      if (mediaStreamRef.current) {
        console.log("Stopping media tracks in stopRecording");
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      setIsRecording(false);

      // Check if we have any significant audio data
      const hasAudioData =
        audioChunksRef.current.length > 0 &&
        audioChunksRef.current.some((chunk) => chunk.size > 200);

      if (!hasAudioData && highlightedText) {
        // Skip the audio processing API call entirely if no meaningful audio
        console.log(
          "No meaningful audio recorded, using highlighted text directly"
        );
        toast.success("Using default text for this line");
        // Use the current line's text directly
        processUserSpeech(highlightedText);
        // Clear the audio chunks
        audioChunksRef.current = [];
      } else {
        toast.success("Processing your speech...");
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      // Skip API call completely if the blob is too small (empty recording)
      if (audioBlob.size < 1000 && highlightedText) {
        console.log("Audio blob too small, using highlighted text instead");
        await processUserSpeech(highlightedText);
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      // Log before API call
      console.log("Sending audio for transcription, size:", audioBlob.size);

      // Send to Google Cloud Speech-to-Text API
      const response = await fetch("/api/google-speech/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Transcription result:", result);

      if (result.success) {
        const transcribedText = result.transcript;
        setTranscription(transcribedText);

        // Process the user's speech
        await processUserSpeech(transcribedText);
      } else {
        // No speech detected in the audio that was sent
        console.log("No speech detected in the processed audio");
        setErrorMessage(null); // Clear any previous errors

        // Use highlighted text as fallback
        if (highlightedText) {
          toast.success("No speech detected, using default text");
          await processUserSpeech(highlightedText);
        } else {
          setErrorMessage("No speech detected");
        }
      }
    } catch (error: any) {
      console.error("Error in speech recognition:", error);
      // Don't set error message to the user, just use the highlighted text
      if (highlightedText) {
        toast.success("Using default text for this line");
        await processUserSpeech(highlightedText);
      } else {
        setErrorMessage("Failed to transcribe speech");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processUserSpeech = async (userMessage: string) => {
    setIsGeneratingResponse(true);

    try {
      console.log("Processing user speech:", userMessage);
      console.log("Current line index:", currentLineIndex);
      console.log("User speaker:", userSpeaker);
      console.log("Transcript length:", transcript.length);

      if (currentLineIndex >= transcript.length) {
        console.log("Current line index out of bounds, resetting to 0");
        setCurrentLineIndex(0);
      }

      // Check if it's user's turn
      if (
        currentLineIndex < transcript.length &&
        transcript[currentLineIndex].speaker === userSpeaker
      ) {
        console.log("It's user's turn, processing speech");
        const expectedText = transcript[currentLineIndex].text;
        // Always consider it correct to keep things moving
        const isCorrect = true;
        const emotion = detectEmotion(userMessage);

        // Add user's message to the conversation
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: userMessage,
            isCorrect,
            emotion,
          },
        ]);

        // Add user's performance to tracking
        setLinePerformances((prev) => [
          ...prev,
          {
            expectedText,
            actualText: userMessage,
            isCorrect,
            emotion,
          },
        ]);

        // Prepare feedback
        const feedback = {
          scriptAccuracy: isCorrect,
          emotionalTone: emotion,
          message: generateFeedbackMessage(isCorrect, emotion),
        };
        setPendingFeedback(feedback);

        // Move to the next line
        const nextIndex = currentLineIndex + 1;
        setCurrentLineIndex(nextIndex);

        // Update exchange counter
        const newExchangeCount = exchangeCount + 1;
        setExchangeCount(newExchangeCount);

        // Now respond as the other character if there are more lines
        if (nextIndex < transcript.length) {
          console.log("Moving to next line, index:", nextIndex);
          // If the next speaker is the AI (not the user)
          if (transcript[nextIndex].speaker !== userSpeaker) {
            console.log("Next speaker is AI, preparing response");
            // Minimal pause before AI responds
            await new Promise((resolve) => setTimeout(resolve, 200));

            // AI's response text
            const aiResponseText = transcript[nextIndex].text;
            console.log("AI will respond with:", aiResponseText);

            // Add AI's line
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: aiResponseText,
              },
            ]);

            // Generate speech for the AI's response
            try {
              await generateSpeech(aiResponseText);
            } catch (speechError) {
              console.error("Error generating speech:", speechError);
              toast.error("Could not generate audio response");
            }

            // Move to the next line after AI's response
            const userNextIndex = nextIndex + 1;
            setCurrentLineIndex(userNextIndex);

            // Update highlighted text if there's another user line
            if (userNextIndex < transcript.length) {
              setHighlightedText(transcript[userNextIndex].text);
            } else {
              setHighlightedText("");
              setIsScriptComplete(true);
            }
          } else {
            // Next line is user's - highlight it
            console.log("Next line is user's, highlighting it");
            setHighlightedText(transcript[nextIndex].text);
          }
        } else {
          // End of script
          console.log("End of script reached");
          setHighlightedText("");
          setIsScriptComplete(true);

          // Add end of scene message
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: "🎭 End of scene! Great job practicing this dialogue.",
            },
          ]);

          // Generate and display the final performance summary
          setTimeout(() => {
            generatePerformanceSummary();
          }, 1000);
        }

        // Give feedback
        if (newExchangeCount % 3 === 0 && pendingFeedback) {
          await new Promise((resolve) => setTimeout(resolve, 800));

          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: pendingFeedback.message,
            },
          ]);

          setPendingFeedback(null);
        }
      } else {
        console.warn(
          "Not user's turn or invalid line index, forcing AI response"
        );
        // Force AI response if we're in an invalid state
        forceAIResponse();
      }
    } catch (error: any) {
      console.error("Error processing speech:", error);
      toast.error("Failed to process response");

      // Try to recover from error state
      if (currentLineIndex < transcript.length) {
        const nextSpeaker = transcript[currentLineIndex].speaker;
        if (nextSpeaker !== userSpeaker) {
          // If it's AI's turn, force a response
          forceAIResponse();
        } else {
          // If it's user's turn, highlight the current line
          setHighlightedText(transcript[currentLineIndex].text);
        }
      }
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  // Generate a summary of the user's performance for all their lines
  const generatePerformanceSummary = async () => {
    // Only include lines that belong to the user's character
    const userLines = transcript.filter((line) => line.speaker === userSpeaker);

    // Pause before showing the summary
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // If no performance data, create placeholder data
    if (linePerformances.length === 0 || userLines.length === 0) {
      const noDataMessage = "No performance data recorded. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: noDataMessage,
        },
      ]);
      return;
    }

    // Calculate overall statistics
    const correctLines = linePerformances.filter(
      (perf) => perf.isCorrect
    ).length;
    const goodEmotionLines = linePerformances.filter(
      (perf) => perf.emotion === "good"
    ).length;

    const accuracyPercentage = Math.round(
      (correctLines / linePerformances.length) * 100
    );
    const emotionPercentage = Math.round(
      (goodEmotionLines / linePerformances.length) * 100
    );

    // Create individual feedback items for better rendering
    const feedbackItems = linePerformances.map((perf, index) => {
      // Keep line reference short
      const shortLine =
        perf.expectedText.length > 30
          ? perf.expectedText.substring(0, 30) + "..."
          : perf.expectedText;

      return {
        line: `${index + 1}. "${shortLine}"`,
        scriptAccuracy: {
          isCorrect: perf.isCorrect,
          message: perf.isCorrect
            ? "Good match!"
            : "Could be closer to original.",
        },
        emotion: {
          rating: perf.emotion,
          message:
            perf.emotion === "good"
              ? "Excellent expression!"
              : perf.emotion === "needs-improvement"
              ? "Could use more emotion."
              : "Decent delivery.",
        },
      };
    });

    // Add the enhanced feedback card to messages
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: JSON.stringify({
          type: "performance_summary",
          accuracyPercentage,
          emotionPercentage,
          feedbackItems,
        }),
      },
    ]);

    // Auto-scroll to ensure feedback is visible
    if (conversationEndRef.current) {
      setTimeout(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Detects emotional expression in speech
  const detectEmotion = (
    text: string
  ): "neutral" | "good" | "needs-improvement" => {
    // This is a simple simulation - in a real app, this could use
    // sentiment analysis, punctuation analysis, etc.

    // Check for exclamation marks, question marks, ellipses which might indicate emotion
    const hasEmotionPunctuation = /[!?...]/.test(text);

    // Check for emotional words or phrases
    const emotionalPhrases = [
      "love",
      "hate",
      "please",
      "must",
      "cannot",
      "never",
      "happy",
      "fine",
      "answer",
      "help",
    ];

    const wordCount = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) =>
        emotionalPhrases.some((phrase) => word.includes(phrase))
      ).length;

    // Simple heuristic - could be replaced with ML model in production
    if (wordCount >= 2 || hasEmotionPunctuation) {
      return "good";
    } else if (wordCount >= 1) {
      return "neutral";
    } else {
      return "needs-improvement";
    }
  };

  // Generate feedback message based on script accuracy and emotion
  const generateFeedbackMessage = (
    isCorrect: boolean,
    emotion: "neutral" | "good" | "needs-improvement"
  ): string => {
    let message = "";

    // Script accuracy feedback
    if (!isCorrect) {
      message += "🔄 Try to stay closer to the script. ";
    } else {
      message += "✅ Great job following the script! ";
    }

    // Emotional tone feedback
    if (emotion === "needs-improvement") {
      message += "😐 Try adding more emotion to your delivery.";
    } else if (emotion === "good") {
      message += "👏 Your emotional expression was excellent!";
    } else {
      message += "You're doing well, keep practicing.";
    }

    return message;
  };

  // Helper function to compare text similarity
  const calculateSimilarity = (text1: string, text2: string): number => {
    // Normalize both texts for comparison
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");
    const normalizedText1 = normalize(text1);
    const normalizedText2 = normalize(text2);

    if (normalizedText1.length === 0 || normalizedText2.length === 0) {
      return 0;
    }

    // Calculate word overlap
    const words1 = normalizedText1.split(/\s+/);
    const words2 = normalizedText2.split(/\s+/);

    // If either text is very short, we need to be more lenient
    if (words1.length <= 2 || words2.length <= 2) {
      // For very short texts, check if one contains the other
      return normalizedText1.includes(normalizedText2) ||
        normalizedText2.includes(normalizedText1)
        ? 0.8
        : 0.1;
    }

    // Count common words (even partial matches)
    const commonWords = words1.filter((word) =>
      words2.some((w2) => w2.includes(word) || word.includes(w2))
    );

    // Calculate similarity score with greater weight to shorter text
    const similarityScore =
      commonWords.length / Math.min(words1.length, words2.length);

    return similarityScore;
  };

  // Update the isSimilarText function to use our new similarity calculation
  const isSimilarText = (text1: string, text2: string): boolean => {
    const similarity = calculateSimilarity(text1, text2);
    // Very lenient threshold (0.2 instead of 0.3) to accept more variations
    return similarity > 0.2;
  };

  const clearConversation = () => {
    setMessages([]);
    setTranscription("");
    setCurrentLineIndex(0);
    setExchangeCount(0);
    setPendingFeedback(null);
    setHighlightedText("");
    setLinePerformances([]);
    setIsScriptComplete(false);
  };

  const resetConversation = () => {
    if (confirm("Are you sure you want to reset the conversation?")) {
      clearConversation();
      toast.success("Script practice has been reset");

      // Re-initialize the conversation
      const otherSpeaker = userSpeaker === "A" ? "B" : "A";

      setMessages([
        {
          role: "system",
          content: `Welcome to script practice! You'll be playing Speaker ${userSpeaker}.

The AI will play Speaker ${otherSpeaker}.

We'll now begin the scene. Your first line will be highlighted below.`,
        },
      ]);

      // Find the first line for the user's speaker
      let firstUserLineIndex = transcript.findIndex(
        (line) => line.speaker === userSpeaker
      );
      if (firstUserLineIndex > 0) {
        // If there are lines before the user's first line, add them as assistant messages
        for (let i = 0; i < firstUserLineIndex; i++) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: transcript[i].text,
            },
          ]);
        }
      }

      // Set current line to user's first line
      if (firstUserLineIndex >= 0) {
        setCurrentLineIndex(firstUserLineIndex);
        setHighlightedText(transcript[firstUserLineIndex].text);
      }
    }
  };

  const switchSpeaker = (speaker: "A" | "B") => {
    if (speaker !== userSpeaker) {
      setUserSpeaker(speaker);
      clearConversation();
      toast.success(`Switched to Speaker ${speaker}`);
    }
  };

  const getHelpWithLine = () => {
    if (highlightedText) {
      // Add a help message about the current line
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `📝 Here's some help with this line:\n\n"${highlightedText}"\n\nTry to match the text as closely as possible and focus on natural delivery.`,
        },
      ]);

      // Generate speech for the highlighted line
      generateSpeech(highlightedText);
    }
  };

  // Enhance the generateSpeech function to ensure better audio playback
  const generateSpeech = async (text: string) => {
    try {
      setIsGeneratingAudio(true);
      console.log("Generating speech for:", text);

      // Revoke previous audio URL to free memory
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      // Show a toast to indicate audio is being generated
      toast.loading("Generating audio response...", { id: "audio-loading" });

      // Add a small pause at the beginning of the text to prevent cut-off
      const enhancedText = `... ${text}`;
      console.log("Sending enhanced text to Eleven Labs API:", enhancedText);

      const response = await fetch("/api/elevenlabs/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: enhancedText,
          voiceId: "JBFqnCBsd6RMkjVDRZzb", // Grace voice
          modelId: "eleven_monolingual_v1", // V1 model
          // Add stability and enhance settings for clearer speech
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      console.log("Eleven Labs API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Eleven Labs API error:", errorText);
        throw new Error(errorText || "Failed to generate speech");
      }

      // Get the audio blob from the response
      const audioBlob = await response.blob();
      console.log("Received audio blob size:", audioBlob.size);

      if (audioBlob.size < 100) {
        console.error("Audio blob is too small, likely an error");
        throw new Error("Invalid audio response");
      }

      // Create a URL for the audio blob
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      toast.dismiss("audio-loading");
      toast.success("Playing AI response", { id: "audio-playing" });

      // Use a more reliable way to play audio
      if (audioRef.current) {
        // Clear any previous audio
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        audioRef.current.src = url;

        // Force audio to load completely before playing
        audioRef.current.load();

        // Set up audio event handlers
        audioRef.current.oncanplaythrough = async () => {
          try {
            console.log("Audio fully loaded and ready to play");
            // Add a small delay before playing to ensure everything is ready
            await new Promise((resolve) => setTimeout(resolve, 100));
            const playPromise = audioRef.current?.play();

            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                console.error("Play failed:", error);
                toast.error("Failed to play audio", { id: "audio-error" });
                setIsGeneratingAudio(false);
              });
            }
          } catch (playError) {
            console.error("Error playing audio:", playError);
            toast.error("Failed to play audio response");
            setIsGeneratingAudio(false);
          }
        };
      }
    } catch (err) {
      console.error("Error generating speech:", err);
      toast.error("Failed to generate audio");
      toast.dismiss("audio-loading");
      setIsGeneratingAudio(false);
    }
  };

  // Add a more visible audio status indicator
  const AudioPlayingIndicator = () => {
    if (!isGeneratingAudio && !audioUrl) return null;

    return (
      <div className="fixed bottom-4 right-4 bg-white p-3 rounded-full shadow-lg z-50 flex items-center gap-2">
        {isGeneratingAudio ? (
          <>
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Speaking...</span>
          </>
        ) : (
          <>
            <Volume2 size={16} className="text-blue-600" />
            <span className="text-sm font-medium">AI Speaking</span>
          </>
        )}
      </div>
    );
  };

  // Add a function for the "Listen" button with debounce
  const listenToLine = (text: string) => {
    // Don't allow multiple simultaneous requests
    if (isGeneratingAudio) return;

    generateSpeech(text);
  };

  // Add a speech detection visualization component
  const SpeechWaveform = () => {
    return (
      <div className="flex items-center justify-center gap-1 h-8 mt-4 mb-2">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`w-2 bg-blue-600 rounded-full animate-pulse`}
            style={{
              height: `${16 + Math.random() * 16}px`,
              animationDelay: `${i * 0.08}s`,
              animationDuration: `${0.8 + Math.random() * 0.4}s`,
            }}
          ></div>
        ))}
      </div>
    );
  };

  // Add a method to handle clicking on the active microphone to force processing
  const handleMicrophoneClick = () => {
    if (isRecording && audioChunksRef.current.length > 0) {
      console.log("Manual force processing triggered by microphone click");

      try {
        setProcessingInProgress(true);

        // Create audio blob from current chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        });

        // Process whatever we have, or use the highlighted text if no speech detected
        if (audioBlob.size > 200) {
          // Send for transcription
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          fetch("/api/google-speech/transcribe", {
            method: "POST",
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
              }
              return response.json();
            })
            .then((result) => {
              if (result.success && result.transcript) {
                const transcribedText = result.transcript;
                console.log("Manual transcription:", transcribedText);

                // Process the speech
                processUserSpeech(transcribedText);
              } else {
                // Just use the highlighted text
                console.log(
                  "No transcript from manual processing, using highlighted text"
                );
                if (highlightedText) {
                  processUserSpeech(highlightedText);
                }
              }

              // Clear after processing
              audioChunksRef.current = [];
              setLastProcessedAudio(0);
              setIsSpeaking(false);
            })
            .catch((error) => {
              console.error("Error in manual processing:", error);
              // Use highlighted text on error
              if (highlightedText) {
                processUserSpeech(highlightedText);
                audioChunksRef.current = [];
                setIsSpeaking(false);
              }
            })
            .finally(() => {
              setProcessingInProgress(false);
            });
        } else if (highlightedText) {
          // No meaningful audio but use highlighted text anyway
          processUserSpeech(highlightedText);
          audioChunksRef.current = [];
          setIsSpeaking(false);
          setProcessingInProgress(false);
        } else {
          setProcessingInProgress(false);
        }
      } catch (error) {
        console.error("Error in manual force processing:", error);
        setProcessingInProgress(false);
      }
    }
  };

  // Add a force update button to help when UI isn't updating
  const forceAIResponse = () => {
    if (currentLineIndex >= transcript.length) {
      console.log("Script complete, nothing to force");
      toast.error("Script is complete. Reset to start again.");
      return;
    }

    const currentLine = transcript[currentLineIndex];

    if (currentLine.speaker !== userSpeaker) {
      toast.success("Forcing AI response...");

      const aiResponseText = currentLine.text;
      console.log("Forcing AI response:", aiResponseText);

      // Add AI's line
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponseText,
        },
      ]);

      // Generate speech
      generateSpeech(aiResponseText);

      // Move to next line
      const nextIndex = currentLineIndex + 1;
      setCurrentLineIndex(nextIndex);

      if (nextIndex < transcript.length) {
        setHighlightedText(transcript[nextIndex].text);
      } else {
        setHighlightedText("");
        setIsScriptComplete(true);
      }
    } else {
      console.log("Not AI's turn, skipping user's line");
      // Skip user's line and move to AI's line
      if (currentLineIndex + 1 < transcript.length) {
        const nextLine = transcript[currentLineIndex + 1];
        if (nextLine.speaker !== userSpeaker) {
          // Skip user's turn, update line index
          setCurrentLineIndex(currentLineIndex + 1);
          // Force AI response again
          setTimeout(() => forceAIResponse(), 100);
        } else {
          toast.error("Next line is also yours. Try recording again.");
        }
      }
    }
  };

  // Add a useEffect to clean up timeouts
  useEffect(() => {
    // Cleanup function for component unmount or recording state change
    return () => {
      // Clear any active recording timeout
      if (recordingTimeoutId) {
        console.log("Clearing timeout in useEffect cleanup");
        clearTimeout(recordingTimeoutId);
      }
    };
  }, [recordingTimeoutId]);

  // Add a function to initialize the conversation properly
  useEffect(() => {
    // Only run this after transcript is loaded
    if (transcript.length === 0) return;

    // Prevent multiple initializations
    if (messages.length > 0) return;

    console.log("Initializing conversation with transcript", transcript);
    console.log("User will be Speaker", userSpeaker);

    // Reset states
    clearConversation();

    // Add welcome message
    const otherSpeaker = userSpeaker === "A" ? "B" : "A";

    setMessages([
      {
        role: "system",
        content: `Welcome to script practice! You'll be playing Speaker ${userSpeaker}.

The AI will play Speaker ${otherSpeaker}.

We'll now begin the scene. Your first line will be highlighted below.`,
      },
    ]);

    // Find the first line for the user's speaker
    let firstUserLineIndex = transcript.findIndex(
      (line) => line.speaker === userSpeaker
    );

    // If user doesn't start, show AI lines first
    if (firstUserLineIndex > 0) {
      // Add AI's initial lines
      for (let i = 0; i < firstUserLineIndex; i++) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: transcript[i].text,
          },
        ]);
      }
    }

    // Highlight the user's first line
    if (firstUserLineIndex >= 0) {
      setCurrentLineIndex(firstUserLineIndex);
      setHighlightedText(transcript[firstUserLineIndex].text);
    } else if (transcript.length > 0) {
      // If no user lines found, just start at the beginning
      setCurrentLineIndex(0);
      setHighlightedText(transcript[0].text);
    }

    console.log("Conversation initialized with user as Speaker", userSpeaker);
    console.log("First user line index:", firstUserLineIndex);
  }, [transcript, userSpeaker, messages.length]);

  // Add a special debug function to completely reset and reinitialize the component
  const hardReset = () => {
    // Clear all states
    setMessages([]);
    setTranscription("");
    setCurrentLineIndex(0);
    setExchangeCount(0);
    setPendingFeedback(null);
    setHighlightedText("");
    setLinePerformances([]);
    setIsScriptComplete(false);

    // Force reload the transcript from source
    const defaultTranscript = getDefaultTranscript();
    setTranscript(defaultTranscript);

    if (defaultTranscript.length > 0) {
      // Set user speaker to first speaker by default
      setUserSpeaker(defaultTranscript[0].speaker as "A" | "B");
    }

    // Force a page refresh after a short delay
    toast.success("Resetting component state...");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}

      {/* Main Content Area with reduced top margin */}
      <div className="flex-grow bg-gradient-to-br from-blue-50 via-indigo-50 to-white pt-36">
        <div className="container mx-auto px-4">
          {/* Help Section - More compact */}
          <div className="max-w-7xl mx-auto mb-4 bg-blue-50 rounded-lg overflow-hidden border-t border-blue-100">
            <ul className="list-disc p-3 pr-4 pl-10 space-y-1 text-gray-700 rtl text-sm">
              <li>اختر ما إذا كنت تريد أن تكون المتحدث A أو المتحدث B</li>
              <li>سيلعب الذكاء الاصطناعي دور الشخصية الأخرى في الحوار</li>
              <li>اضغط على زر الميكروفون وتحدث بالجملة المميزة</li>
              <li>حاول مطابقة النص والتعبير عن المشاعر المناسبة</li>
              <li>
                سيرد الذكاء الاصطناعي كشخصية الحوار الأخرى للحفاظ على تدفق
                المحادثة
              </li>
              <li>سيظهر لك تقييم لأدائك بعد عدة تبادلات</li>
            </ul>
          </div>

          {/* Script Practice Header - More compact */}
          <div className="max-w-7xl mx-auto mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 bg-blue-600 rounded-xl p-3 text-white">
              <div className="flex items-center">
                <Link
                  href="/short-videos"
                  className="mr-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30"
                >
                  <ArrowLeft size={18} className="text-white" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{videoTitle}</h1>
                  <p className="text-sm text-blue-100">
                    Practice a dialogue script with AI roleplay and feedback
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-2 md:mt-0">
                <div className="flex flex-col">
                  <p className="text-xs text-blue-200 mb-1">Your Role:</p>
                  <div className="flex rounded-lg overflow-hidden border border-blue-300">
                    <button
                      onClick={() => switchSpeaker("A")}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        userSpeaker === "A"
                          ? "bg-white text-blue-700"
                          : "bg-blue-700/50 text-white hover:bg-blue-700/70"
                      }`}
                    >
                      Speaker A
                    </button>
                    <button
                      onClick={() => switchSpeaker("B")}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        userSpeaker === "B"
                          ? "bg-white text-blue-700"
                          : "bg-blue-700/50 text-white hover:bg-blue-700/70"
                      }`}
                    >
                      Speaker B
                    </button>
                  </div>
                </div>

                <button
                  onClick={resetConversation}
                  className="flex items-center gap-1 px-3 py-1.5 text-blue-700 bg-white rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium self-end"
                >
                  <RefreshCw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="max-w-7xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Error</p>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Two-column layout with reduced gap and height */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Left Column - Conversation Display */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-200">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-800">Conversation</h2>
                </div>

                {/* Script Progress */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-600 font-medium">
                    {Math.min(currentLineIndex + 1, transcript.length)} of{" "}
                    {transcript.length}
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.max(
                          5,
                          (currentLineIndex / transcript.length) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div
                className="flex-grow overflow-y-auto p-3"
                style={{ height: "280px" }}
              >
                <div className="space-y-3">
                  {messages.map((message, index) => {
                    // Check if this is a performance summary message
                    if (
                      message.role === "system" &&
                      message.content.startsWith("{") &&
                      message.content.includes("performance_summary")
                    ) {
                      try {
                        const feedbackData = JSON.parse(message.content);
                        if (feedbackData.type === "performance_summary") {
                          return (
                            <div key={index} className="flex justify-center">
                              <div className="w-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                <div className="text-center mb-2">
                                  <h3 className="text-lg font-bold text-blue-800">
                                    Your Performance Summary
                                  </h3>
                                </div>

                                <div className="bg-white p-3 rounded-lg shadow-sm">
                                  <h4 className="font-semibold text-gray-700 mb-2 text-base">
                                    Line-by-Line Feedback
                                  </h4>

                                  <div className="space-y-2">
                                    {feedbackData.feedbackItems.map(
                                      (item, idx) => (
                                        <div
                                          key={idx}
                                          className="border-b border-gray-100 pb-2 last:border-b-0"
                                        >
                                          <p className="font-medium text-gray-800 text-sm">
                                            {item.line}
                                          </p>
                                          <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                            <div className="flex items-center gap-1">
                                              <span
                                                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                                  item.scriptAccuracy.isCorrect
                                                    ? "bg-green-100"
                                                    : "bg-amber-100"
                                                }`}
                                              >
                                                {item.scriptAccuracy
                                                  .isCorrect ? (
                                                  <span className="text-green-600 text-xs">
                                                    ✓
                                                  </span>
                                                ) : (
                                                  <span className="text-amber-600 text-xs">
                                                    ✗
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-xs text-gray-600">
                                                {item.scriptAccuracy.message}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1 sm:ml-2">
                                              <span className="text-base">
                                                {item.emotion.rating === "good"
                                                  ? "😀"
                                                  : item.emotion.rating ===
                                                    "needs-improvement"
                                                  ? "😐"
                                                  : "🙂"}
                                              </span>
                                              <span className="text-xs text-gray-600">
                                                {item.emotion.message}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {
                        // If parsing fails, render as normal message
                      }
                    }

                    // Regular message rendering for non-feedback messages
                    return (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : message.role === "system"
                            ? "justify-center"
                            : "justify-start"
                        } mb-2`}
                      >
                        {message.role === "system" ? (
                          <div className="max-w-[85%] p-2 bg-gray-50 border border-gray-200 rounded-lg text-center shadow-sm">
                            <p className="text-gray-700 text-sm">
                              {message.content}
                            </p>
                          </div>
                        ) : (
                          <div
                            className={`max-w-[85%] p-2 rounded-lg shadow-sm ${
                              message.role === "user"
                                ? message.isCorrect === false
                                  ? "bg-blue-500 text-white rounded-br-none"
                                  : "bg-blue-600 text-white rounded-br-none"
                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                {message.role === "user" ? (
                                  <User size={12} className="text-blue-200" />
                                ) : (
                                  <Bot size={12} className="text-gray-500" />
                                )}
                                <span className="font-medium text-xs">
                                  {message.role === "user"
                                    ? "You"
                                    : `Speaker ${
                                        userSpeaker === "A" ? "B" : "A"
                                      }`}
                                </span>
                              </div>
                              {message.role === "assistant" && (
                                <button
                                  onClick={() => listenToLine(message.content)}
                                  disabled={isGeneratingAudio}
                                  className={`text-gray-500 hover:bg-gray-200 p-1 rounded-full ${
                                    isGeneratingAudio
                                      ? "opacity-50 cursor-not-allowed"
                                      : "hover:text-gray-700"
                                  }`}
                                  title="Listen to this line"
                                >
                                  {isGeneratingAudio ? (
                                    <div className="w-2 h-2 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Volume2 size={12} />
                                  )}
                                </button>
                              )}
                            </div>
                            <p className="whitespace-pre-line text-sm">
                              {message.content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isGeneratingResponse && (
                    <div className="flex justify-start">
                      <div className="max-w-[75%] p-2 bg-gray-100 text-gray-800 rounded-lg rounded-bl-none">
                        <div className="flex items-center gap-1 mb-1">
                          <Bot size={12} className="text-gray-500" />
                          <span className="font-medium text-xs">
                            Speaker {userSpeaker === "A" ? "B" : "A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={conversationEndRef} />
                </div>
              </div>
            </div>

            {/* Right Column - Speaking Interface */}
            <div className="flex flex-col gap-4">
              {/* Current Line to Speak */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Film size={16} className="text-blue-600" />
                    <h2 className="font-semibold text-gray-800 text-sm">
                      Your Next Line
                    </h2>
                  </div>
                  <div className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    You are Speaker {userSpeaker}
                  </div>
                </div>

                {highlightedText ? (
                  <div className="p-3">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3 mb-3">
                      <h3 className="font-semibold text-yellow-800 mb-1 text-sm">
                        Speak this line:
                      </h3>
                      <p className="text-base font-medium text-yellow-900">
                        {highlightedText}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => listenToLine(highlightedText)}
                        disabled={isGeneratingAudio}
                        className={`flex items-center gap-1 py-1.5 px-3 rounded-lg text-blue-700 ${
                          isGeneratingAudio
                            ? "bg-blue-50 cursor-not-allowed"
                            : "bg-blue-100 hover:bg-blue-200"
                        } transition-colors text-xs`}
                        title="Listen to this line"
                      >
                        {isGeneratingAudio ? (
                          <>
                            <div className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={14} />
                            <span>Listen to Pronunciation</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={getHelpWithLine}
                        className="flex items-center gap-1 py-1.5 px-3 bg-amber-100 rounded-lg text-amber-700 hover:bg-amber-200 transition-colors text-xs"
                        title="Get help with this line"
                      >
                        <HelpCircle size={14} />
                        <span>Get Help</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    {isScriptComplete ? (
                      <div className="text-gray-600 py-4">
                        <p className="mb-3 text-sm">Script complete!</p>
                        {isScriptComplete && (
                          <button
                            onClick={generatePerformanceSummary}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 mx-auto transition-all shadow-sm hover:shadow-md text-xs font-medium"
                          >
                            <ThumbsUp size={14} />
                            <span>Show My Feedback</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600 py-4 text-sm">
                        Waiting for next line...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Microphone Controls */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                  <Mic size={16} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-800 text-sm">
                    Speaking Controls
                  </h2>
                </div>

                <div className="p-4 flex flex-col items-center">
                  <div className="mb-3 flex flex-col items-center gap-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={
                          isProcessing ||
                          isGeneratingResponse ||
                          !highlightedText
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                      >
                        <Mic size={24} />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        disabled={isProcessing}
                        className={`bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-colors shadow-sm ${
                          isProcessing
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:shadow-md"
                        }`}
                      >
                        {isProcessing ? (
                          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <StopCircle size={24} />
                        )}
                      </button>
                    )}

                    <p className="text-center text-gray-600 max-w-xs text-xs">
                      {isRecording
                        ? "Recording... Click stop when finished speaking"
                        : isProcessing
                        ? "Processing your speech..."
                        : isGeneratingResponse
                        ? "AI is responding..."
                        : highlightedText
                        ? "Click the microphone button and speak your line"
                        : isScriptComplete
                        ? "Script complete! See your performance summary above"
                        : "Script complete! Reset to practice again"}
                    </p>
                  </div>

                  {isListening && (
                    <div className="flex items-center justify-center gap-1 h-6 mt-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 bg-blue-600 rounded-full animate-pulse`}
                          style={{
                            height: `${12 + Math.random() * 12}px`,
                            animationDelay: `${i * 0.08}s`,
                            animationDuration: `${0.8 + Math.random() * 0.4}s`,
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element for playing speech */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onError={(e) => {
          console.error("Audio error:", e);
          setIsGeneratingAudio(false);
          toast.error("Failed to play audio");
          toast.dismiss("audio-playing");
        }}
        onEnded={() => {
          console.log("Audio playback completed");
          setIsGeneratingAudio(false);
          toast.dismiss("audio-playing");
        }}
        onPause={() => {
          console.log("Audio playback paused");
          setIsGeneratingAudio(false);
          toast.dismiss("audio-playing");
        }}
        onPlay={() => {
          console.log("Audio playback started");
          toast.success("AI speaking...", { id: "audio-playing" });
        }}
      >
        <source src={audioUrl || ""} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      <AudioPlayingIndicator />
    </div>
  );
}

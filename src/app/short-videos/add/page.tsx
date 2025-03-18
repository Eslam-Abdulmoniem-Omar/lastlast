"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash,
  Edit,
  Clock,
  Play,
  Headphones,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { createPodcastWithYouTube } from "@/lib/firebase/podcastUtils";
import { Podcast, DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-hot-toast";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import TimestampedYouTubePlayer from "@/components/TimestampedYouTubePlayer";
import TikTokPlayer from "@/components/TikTokPlayer";
// Import utility functions
import {
  validateYoutubeUrl,
  extractVideoId,
  convertToEmbedUrl,
  createDefaultSegments,
  formatTime,
  fetchVideoTranscript,
  validateTikTokUrl,
  saveTemporaryPracticeData,
  getTranscriptSourceInfo,
} from "@/lib/utils/youtubeUtils";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { TranscriptSegment } from "@/types/transcript";
import { processTranscriptWithOpenAI } from "@/lib/utils/openai";

export default function AddYouTubeShortPageWrapper() {
  // Use the ProtectedRoute component to wrap the actual page content
  return (
    <ProtectedRoute>
      <AddYouTubeShortPage />
    </ProtectedRoute>
  );
}

function AddYouTubeShortPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "intermediate"
  );
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [dialogueSegments, setDialogueSegments] = useState<DialogueSegment[]>(
    []
  );
  const [currentSegment, setCurrentSegment] = useState<DialogueSegment>({
    id: uuidv4(),
    speakerName: "",
    text: "",
    startTime: 0,
    endTime: 0,
    vocabularyItems: [],
  });
  const [isAutoSubmitMode, setIsAutoSubmitMode] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [practiceStarted, setPracticeStarted] = useState(false);

  const fetchTranscript = useCallback(async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Extract video ID from URL
      const extractedVideoId = extractVideoId(url);
      if (!extractedVideoId) {
        throw new Error("Invalid YouTube URL");
      }
      setVideoId(extractedVideoId);

      // Fetch transcript using RapidAPI
      const response = await fetch(
        `http://localhost:3000/api/youtube/rapidapi-transcript?url=${encodeURIComponent(
          url
        )}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.statusText}`);
      }
      const data = await response.json();

      // Check if data has the expected structure
      if (!data || !data.data || !data.data.segments) {
        console.error("Unexpected response structure:", data);
        throw new Error("Invalid transcript data format");
      }

      // Set video metadata first
      if (data.data.title) {
        setTitle(data.data.title);
      }
      if (data.data.embedUrl) {
        setEmbedUrl(data.data.embedUrl);
      }

      // Convert transcript segments to dialogue segments
      const convertedSegments = data.data.segments.map((segment: any) => ({
        id: segment.id || uuidv4(),
        speakerName: segment.speakerName || "Speaker",
        text: segment.text,
        startTime: parseFloat(segment.startTime) || 0,
        endTime: parseFloat(segment.endTime) || 0,
        vocabularyItems: segment.vocabularyItems || [],
      }));

      // Set the initial segments
      setDialogueSegments(convertedSegments);

      // Try to process with OpenAI, but don't block if it fails
      try {
        const processedSegments = await processTranscriptWithOpenAI(
          convertedSegments
        );
        setDialogueSegments(processedSegments);
      } catch (openaiError) {
        console.error("OpenAI processing failed:", openaiError);
        // Don't throw the error, just log it and continue with original segments
      }
    } catch (err) {
      console.error("Error fetching transcript:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch transcript"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVideoUrlChange = async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // First try to get the transcript using RapidAPI
      const rapidApiResponse = await fetch(
        `http://localhost:3001/api/youtube/rapidapi-transcript?url=${encodeURIComponent(
          url
        )}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!rapidApiResponse.ok) {
        console.error("RapidAPI request failed:", {
          status: rapidApiResponse.status,
          statusText: rapidApiResponse.statusText,
        });
        throw new Error(`RapidAPI request failed: ${rapidApiResponse.status}`);
      }

      const transcriptData = await rapidApiResponse.json();
      console.log("Received transcript data:", transcriptData);

      if (!transcriptData.data || !transcriptData.data.segments) {
        throw new Error("Invalid transcript data format");
      }

      // Process transcript in chunks
      const processedSegments = await processTranscriptInChunks(
        transcriptData.data.segments
      );

      setTranscriptData({
        ...transcriptData.data,
        segments: processedSegments,
      });
      setVideoUrl(url);
    } catch (error) {
      console.error("Error fetching transcript:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch transcript"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle large responses
  async function processTranscriptInChunks(segments: DialogueSegment[]) {
    const CHUNK_SIZE = 50;
    const chunks = [];

    for (let i = 0; i < segments.length; i += CHUNK_SIZE) {
      chunks.push(segments.slice(i, i + CHUNK_SIZE));
    }

    const processedChunks = [];
    for (const chunk of chunks) {
      const processedChunk = await processSegmentsWithOpenAI(chunk);
      processedChunks.push(...processedChunk);
    }

    return processedChunks;
  }

  // Function to process segments with OpenAI
  const processSegmentsWithOpenAI = async (segments: DialogueSegment[]) => {
    try {
      // Prepare the text for OpenAI
      const text = segments
        .map((segment) => `${segment.speakerName}: ${segment.text}`)
        .join("\n");

      // Create the messages array for OpenAI
      const messages = [
        {
          role: "system",
          content: `You are a helpful assistant that processes dialogue segments. Your task is to:
1. Keep the same speaker names and timing
2. Improve the text to be more natural and fluent
3. Maintain the same meaning and context
4. Return the response as a JSON array of objects with the same structure as the input

Input format example:
[
  {
    "speakerName": "Speaker A",
    "text": "Original text here",
    "startTime": 0,
    "endTime": 5
  }
]

Return the response in exactly the same format, just with improved text.`,
        },
        {
          role: "user",
          content: text,
        },
      ];

      console.log("Sending request to OpenAI...");
      const response = await fetch("/api/openai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process with OpenAI");
      }

      // Get the response data
      const processedSegments = await response.json();
      console.log("Received OpenAI response:", processedSegments);

      // Validate the response format
      if (!Array.isArray(processedSegments)) {
        throw new Error("OpenAI response is not an array");
      }

      // Map the processed segments back to the original timing
      return processedSegments.map((segment: any, index: number) => ({
        ...segment,
        startTime: segments[index].startTime,
        endTime: segments[index].endTime,
        speakerName: segments[index].speakerName, // Keep original speaker names
      }));
    } catch (error) {
      console.error("Error processing segments with OpenAI:", error);
      throw error;
    }
  };

  // Function to handle speech recognition
  const handleSpeechRecognition = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process speech");
      }

      const data = await response.json();
      return data.transcript;
    } catch (error) {
      console.error("Error in speech recognition:", error);
      throw error;
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate YouTube URL
      if (!youtubeUrl) {
        toast.error("Please enter a YouTube URL");
        return;
      }

      if (!validateYoutubeUrl(youtubeUrl)) {
        toast.error("Please enter a valid YouTube URL");
        return;
      }

      // Validate title
      if (!title.trim()) {
        toast.error("Please enter a title for the video");
        return;
      }

      // Validate dialogue segments
      if (!dialogueSegments || dialogueSegments.length === 0) {
        toast.error("Please add at least one dialogue segment");
        return;
      }

      // Validate each segment
      const invalidSegments = dialogueSegments.filter(
        (segment) =>
          !segment.text.trim() ||
          segment.startTime < 0 ||
          segment.endTime <= segment.startTime
      );

      if (invalidSegments.length > 0) {
        toast.error(
          "Please ensure all dialogue segments have valid text and timestamps"
        );
        return;
      }

      if (!user) {
        toast.error("Please sign in to add a video");
        return;
      }

      try {
        setIsSubmitting(true);

        // Create the short video document
        const shortVideoRef = await addDoc(collection(db, "shortVideos"), {
          youtubeUrl,
          embedUrl: convertToEmbedUrl(youtubeUrl),
          userId: user.uid,
          createdAt: serverTimestamp(),
          topics: topics,
          dialogueSegments,
          title: title.trim(),
          description: description.trim() || "",
          level,
          isPublic,
        });

        toast.success("Video added successfully!");

        // Redirect to the video page
        router.push(`/short-videos/${shortVideoRef.id}`);
      } catch (error) {
        console.error("Error adding video:", error);
        toast.error("Failed to add video. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      youtubeUrl,
      user,
      topics,
      dialogueSegments,
      title,
      description,
      level,
      router,
    ]
  );

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const handleUrlFromQuery = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlFromQuery = searchParams.get("url");

      if (urlFromQuery && validateYoutubeUrl(urlFromQuery)) {
        setVideoUrl(urlFromQuery);
        setIsAutoSubmitMode(true);

        await fetchTranscript(urlFromQuery);

        if (user) {
          setTimeout(() => {
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
          }, 3000);
        }
      }
    };

    handleUrlFromQuery();
  }, [user, router, isAutoSubmitMode, handleSubmit, fetchTranscript]);

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (topicToRemove: string) => {
    setTopics(topics.filter((topic: string) => topic !== topicToRemove));
  };

  const handleAddSegment = () => {
    if (
      currentSegment.text.trim() &&
      currentSegment.startTime >= 0 &&
      currentSegment.endTime > currentSegment.startTime
    ) {
      setDialogueSegments([...dialogueSegments, currentSegment]);
      setCurrentSegment({
        id: uuidv4(),
        speakerName: "", // Empty speaker name
        text: "",
        startTime: currentSegment.endTime,
        endTime: currentSegment.endTime + 2, // Default 2 second duration
      });
    }
  };

  const handleEditSegment = (index: number) => {
    setEditingSegmentId(dialogueSegments[index].id);
    toast.success("Editing segment");
  };

  const handleCancelEdit = () => {
    setEditingSegmentId(null);
  };

  const handleRemoveSegment = (index: number) => {
    // Show confirmation toast
    toast.success("Segment removed");
    setDialogueSegments(
      dialogueSegments.filter((_: any, i: number) => i !== index)
    );
  };

  // Function to handle starting practice
  const handleStartPractice = () => {
    // Validate that we have the necessary data
    if (!title || !embedUrl || dialogueSegments.length === 0) {
      setError(
        "Please ensure you have a title, valid YouTube URL, and dialogue segments before starting practice"
      );
      return;
    }

    // Create a temporary practice session in localStorage using our utility
    saveTemporaryPracticeData({
      title: title || "YouTube Video",
      embedUrl: embedUrl,
      youtubeUrl: youtubeUrl,
      dialogueSegments,
    });

    // Instead of navigating away, set practice started to true
    setPracticeStarted(true);
    toast.success("Practice started! Speak along with the video.");
  };

  // Handle completion of practice
  const handlePracticeComplete = () => {
    toast.success(
      "Practice completed! You can continue editing or save this video."
    );
  };

  // Render YouTube URL input with start button
  const renderYoutubeUrlInput = () => {
    return (
      <div className="mb-4">
        <label
          htmlFor="youtubeUrl"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          YouTube URL
        </label>
        <div className="flex">
          <input
            id="youtubeUrl"
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Enter YouTube or TikTok URL..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            required
          />
          <button
            type="button"
            onClick={() => fetchTranscript(youtubeUrl)}
            disabled={isLoading || !validateYoutubeUrl(youtubeUrl)}
            className={`bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 flex items-center ${
              isLoading || !validateYoutubeUrl(youtubeUrl)
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            ) : (
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
            {isLoading ? "Processing..." : "Start"}
          </button>
        </div>
        {isLoading && youtubeUrl && (
          <p className="mt-1 text-sm text-blue-600">
            Fetching video data and generating transcript...
          </p>
        )}
        {youtubeUrl && validateYoutubeUrl(youtubeUrl) && !isLoading && (
          <p className="mt-1 text-sm text-green-600">
            Valid YouTube URL.{" "}
            {dialogueSegments.length > 0
              ? `${dialogueSegments.length} dialogue segments loaded.`
              : 'Click "Start" to generate segments.'}
          </p>
        )}
      </div>
    );
  };

  // Improve dialogue segment display by adding an information icon for transcript source
  const renderTranscriptSourceInfo = () => {
    const info = getTranscriptSourceInfo(transcriptSource);

    return (
      <div className={`mt-2 p-3 rounded-md ${info.colorClass}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">Transcript Information</h3>
            <p className="mt-1 text-sm">{info.message}</p>
          </div>
        </div>
      </div>
    );
  };

  const handleTranslateVocabulary = async (segmentId: string, word: string) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch("/api/openai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word,
          context: dialogueSegments.find((s) => s.id === segmentId)?.text || "",
          isFullSentence: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to translate vocabulary");
      }

      const data = await response.json();

      // Update the segment with the translation
      setDialogueSegments((prevSegments) =>
        prevSegments.map((segment) =>
          segment.id === segmentId
            ? {
                ...segment,
                vocabularyItems: [
                  ...segment.vocabularyItems,
                  {
                    word,
                    translation: data.contextual_translation.translation,
                    example: data.additional_example.english,
                    explanation: data.meaning_comparison,
                  },
                ],
              }
            : segment
        )
      );

      toast.success("Translation added successfully!");
    } catch (error) {
      console.error("Translation error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to translate vocabulary"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto px-4 pt-28 pb-12 mt-16">
        <div className="max-w-6xl mx-auto">
          {!practiceStarted ? (
            <>
              {/* Header section */}
              <div className="mb-8 flex items-center">
                <Link
                  href="/short-videos"
                  className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Add YouTube Short Video
                  </h1>
                  <p className="text-gray-600">
                    Add a YouTube video for speaking practice. You&apos;ll need
                    to provide dialogue timestamps.
                  </p>
                </div>
              </div>

              {/* Notification messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <svg
                      className="h-6 w-6 text-green-500 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <h3 className="text-green-800 font-medium">
                        Video Loaded Successfully!
                      </h3>
                      <p className="text-green-700">
                        Your YouTube video is ready for speaking practice.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="bg-white p-8 rounded-xl shadow-sm">
                  <h2 className="text-2xl font-semibold mb-6">Video Details</h2>

                  {/* 2-column layout with wider YouTube component */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left column: YouTube URL and preview (wider) */}
                    <div className="lg:col-span-3">
                      {renderYoutubeUrlInput()}

                      {embedUrl && (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preview
                          </label>
                          <div className="aspect-video rounded-md overflow-hidden bg-gray-100 shadow-md">
                            {validateYoutubeUrl(youtubeUrl) ? (
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            ) : validateTikTokUrl(youtubeUrl) ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <div
                                  className="w-full h-full"
                                  dangerouslySetInnerHTML={{
                                    __html: `
                                    <blockquote 
                                      class="tiktok-embed w-full h-full" 
                                      cite="${youtubeUrl}"
                                      data-video-id="${
                                        youtubeUrl
                                          .split("/")
                                          .pop()
                                          ?.split("?")[0]
                                      }"
                                      style="max-width: 100%; min-width: 100%;">
                                      <section></section>
                                    </blockquote>
                                    <script async src="https://www.tiktok.com/embed.js"></script>
                                    `,
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <label
                          htmlFor="title"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Title
                        </label>
                        <input
                          id="title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Video title"
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          required
                        />
                      </div>
                    </div>

                    {/* Right column: Dialogue Segments */}
                    <div className="lg:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        Dialogue Segments
                      </h3>

                      {renderTranscriptSourceInfo()}

                      <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {dialogueSegments.length > 0 ? (
                          dialogueSegments.map((segment, index) => (
                            <div
                              key={segment.id}
                              className="p-3 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                              {editingSegmentId === segment.id ? (
                                // Inline edit mode - only text editing, no time editing
                                <div className="space-y-3 p-4 bg-blue-50 rounded-md border-2 border-blue-300 shadow-md">
                                  <div className="flex items-center mb-2">
                                    <div className="flex items-center">
                                      <span className="text-xs font-medium text-blue-700 mr-2">
                                        Time:
                                      </span>
                                      <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {formatTime(segment.startTime)} -{" "}
                                        {formatTime(segment.endTime)}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-blue-700 mb-1">
                                      Dialogue Text:
                                    </label>
                                    <div className="relative">
                                      <textarea
                                        value={segment.text}
                                        onChange={(e) => {
                                          const updatedSegments = [
                                            ...dialogueSegments,
                                          ];
                                          updatedSegments[index] = {
                                            ...segment,
                                            text: e.target.value,
                                          };
                                          setDialogueSegments(updatedSegments);
                                        }}
                                        rows={4}
                                        className="w-full px-3 py-2 text-sm border-2 border-blue-300 rounded-md bg-white shadow-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900 font-medium"
                                        placeholder="Enter dialogue text"
                                        style={{
                                          boxShadow:
                                            "inset 0 2px 4px rgba(0, 0, 0, 0.1)",
                                        }}
                                        autoFocus
                                      ></textarea>
                                      <div className="absolute inset-0 pointer-events-none border-2 border-blue-300 rounded-md opacity-0"></div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end space-x-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSegmentId(null);
                                        toast.success("Changes saved");
                                      }}
                                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Display mode
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center mb-1">
                                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {formatTime(segment.startTime)} -{" "}
                                        {formatTime(segment.endTime)}
                                      </span>
                                    </div>
                                    <p className="text-gray-800">
                                      {segment.text}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditSegment(index)}
                                      className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                      aria-label="Edit segment"
                                      title="Edit segment"
                                    >
                                      <Edit className="h-5 w-5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSegment(index)}
                                      className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                                      aria-label="Delete segment"
                                      title="Delete segment"
                                    >
                                      <Trash className="h-5 w-5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-center">
                            No segments available yet. Click &quot;Start&quot;
                            to generate segments.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  <Link
                    href="/short-videos"
                    className="flex items-center px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    Cancel
                  </Link>

                  <button
                    type="button"
                    disabled={isLoading || dialogueSegments.length === 0}
                    onClick={handleStartPractice}
                    className={`w-2/3 py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-300 ${
                      isLoading || dialogueSegments.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                    }`}
                    style={{
                      boxShadow:
                        isLoading || dialogueSegments.length === 0
                          ? "none"
                          : "0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -4px rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    <span className="flex items-center justify-center relative z-10">
                      <Play className="mr-3 h-6 w-6" />
                      <span className="tracking-wide">Start Practice</span>
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Practice mode view using appropriate player component based on URL type
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                </div>
                <button
                  onClick={() => setPracticeStarted(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Edit
                </button>
              </div>

              <DeepgramContextProvider>
                {validateYoutubeUrl(youtubeUrl) ? (
                  <TimestampedYouTubePlayer
                    podcast={{
                      id: `temp-${uuidv4()}`,
                      title: title || "YouTube Video",
                      description: description || "",
                      audioUrl: "",
                      transcriptUrl: "",
                      youtubeUrl: youtubeUrl,
                      level: level,
                      duration:
                        dialogueSegments.length > 0
                          ? Math.max(
                              ...dialogueSegments.map(
                                (segment) => segment.endTime
                              )
                            )
                          : 0,
                      topics: topics,
                      hostName: "",
                      publishedDate: new Date().toISOString(),
                      questions: [],
                      referenceAnswers: [],
                      dialogueSegments: dialogueSegments,
                      isShort: true,
                    }}
                    onComplete={handlePracticeComplete}
                  />
                ) : validateTikTokUrl(youtubeUrl) ? (
                  <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <TikTokPlayer
                          tiktokUrl={youtubeUrl}
                          dialogueLines={dialogueSegments.map((segment) => ({
                            id: segment.id,
                            text: segment.text,
                            startTime: segment.startTime,
                            endTime: segment.endTime,
                          }))}
                        />
                      </div>
                      <div>
                        <div className="p-4 bg-blue-50 rounded-lg mb-4">
                          <h3 className="font-medium text-lg mb-2">
                            Practice Instructions
                          </h3>
                          <p>
                            Watch the TikTok video and practice speaking along
                            with it. Focus on pronunciation and timing.
                          </p>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <h3 className="px-4 py-2 bg-gray-50 font-medium border-b">
                            Transcript
                          </h3>
                          <div className="divide-y max-h-[500px] overflow-y-auto custom-scrollbar">
                            {dialogueSegments.map((segment, index) => (
                              <div key={segment.id} className="p-3">
                                <p className="text-sm text-gray-500 mb-1">
                                  {formatTime(segment.startTime)} -{" "}
                                  {formatTime(segment.endTime)}
                                </p>
                                <p>{segment.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handlePracticeComplete}
                          className="mt-4 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                        >
                          <Headphones className="h-5 w-5 mr-2" />
                          Complete Practice
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DeepgramContextProvider>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c5c5c5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </main>
  );
}

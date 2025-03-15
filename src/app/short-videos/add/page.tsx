"use client";

import { useState, useEffect } from "react";
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
// Import utility functions
import {
  validateYoutubeUrl,
  extractVideoId,
  convertToEmbedUrl,
  createDefaultSegments,
  formatTime,
  fetchTranscript as fetchYoutubeTranscript,
  saveTemporaryPracticeData,
  getTranscriptSourceInfo,
} from "@/lib/utils/youtubeUtils";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// Export the page directly without the ProtectedRoute wrapper for testing
export default function AddYouTubeShortPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
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

  const handleYoutubeUrlChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const url = e.target.value;
    setYoutubeUrl(url);

    if (validateYoutubeUrl(url)) {
      try {
        // Just convert to embed URL without API call
        const embed = convertToEmbedUrl(url);
        setEmbedUrl(embed);
        setError(null);

        // Automatically fetch transcript when a valid URL is entered
        fetchTranscript(url);
      } catch (error) {
        console.error("Error processing URL:", error);
        setError("Invalid YouTube URL format");
        setEmbedUrl("");
      }
    } else {
      setEmbedUrl("");
    }
  };

  // Function to fetch transcript for a YouTube URL
  const fetchTranscript = async (url: string) => {
    if (!validateYoutubeUrl(url)) {
      setError("Please enter a valid YouTube URL first");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsProcessing(true);

      const response = await fetchYoutubeTranscript(url, {
        onStart: () => {
          // We handle loading state in component
        },
        onSuccess: (data) => {
          // Set video details from metadata
          setTitle(data.title);
          setEmbedUrl(data.embedUrl);

          // Use the segments from metadata response
          if (data.segments && data.segments.length > 0) {
            setDialogueSegments(data.segments);
            setTranscriptSource(data.transcriptSource);
            setSuccess(true);
          } else {
            // If no segments were returned, leave the array empty
            // This will show our "no transcript available" UI
            setDialogueSegments([]);
            setTranscriptSource("unavailable");

            // Still show as success because we got the video metadata
            setSuccess(true);

            // Show a specific error for no transcript
            toast.error(
              "No transcript available for this video. You'll need to create dialogue segments manually."
            );
          }
        },
        onError: (error) => {
          setError(
            `Failed to fetch YouTube data: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );

          // Keep the segments array empty on error
          setDialogueSegments([]);
          setTranscriptSource("unavailable");
        },
        onComplete: () => {
          setIsLoading(false);
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("Error in fetchTranscript:", error);
      // This is a fallback in case something goes wrong with the utility function
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const handleUrlFromQuery = async () => {
      // Check for URL in query parameters
      const searchParams = new URLSearchParams(window.location.search);
      const urlFromQuery = searchParams.get("url");

      if (urlFromQuery && validateYoutubeUrl(urlFromQuery)) {
        setYoutubeUrl(urlFromQuery);
        setIsAutoSubmitMode(true);

        // Use the fetchTranscript function to get segments
        await fetchTranscript(urlFromQuery);

        // Auto-submit after a short delay to allow user to see what's being submitted
        if (user) {
          setTimeout(() => {
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
          }, 3000);
        }
      }
    };

    handleUrlFromQuery();
  }, [user, router, isAutoSubmitMode]); // Added isAutoSubmitMode to dependencies

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!title) {
      setError("Please enter a title");
      return;
    }

    if (!embedUrl) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    if (!dialogueSegments || dialogueSegments.length === 0) {
      setError("Please add at least one dialogue segment");
      return;
    }

    try {
      setIsLoading(true);
      setIsSubmitting(true);
      setError(null);

      // Create the podcast with YouTube data
      const newVideoData: Omit<Podcast, "id"> = {
        title,
        description: title, // Just use title as description
        audioUrl: "", // Placeholder
        transcriptUrl: "", // Placeholder
        youtubeUrl: embedUrl,
        level: "intermediate" as "beginner" | "intermediate" | "advanced", // Properly typed default level
        duration:
          dialogueSegments.length > 0
            ? Math.max(...dialogueSegments.map((segment) => segment.endTime))
            : 30,
        topics,
        hostName: user?.displayName || "Anonymous User",
        publishedDate: new Date().toISOString(),
        questions: [],
        referenceAnswers: [],
        dialogueSegments,
        isShort: true,
      };

      // Check if user is authenticated - for testing purposes, we'll allow proceeding without auth
      if (user) {
        const result = await createPodcastWithYouTube(newVideoData);

        if (result && result.id) {
          toast.success("YouTube short added successfully!");

          // Create a temporary practice session in localStorage
          const practiceData = {
            id: result.id,
            title,
            embedUrl,
            youtubeUrl,
            dialogueSegments,
            isTemporary: false,
            createdAt: new Date().toISOString(),
          };

          // Save to localStorage for practice
          localStorage.setItem(
            "current-practice-data",
            JSON.stringify(practiceData)
          );

          // Log for debugging
          console.log("Saved practice data to localStorage:", practiceData);
          console.log("Navigating to practice page...");

          // Navigate directly to the practice page instead of the short videos page
          router.push("/practice/short-video");
        } else {
          setError("Failed to add YouTube short");
        }
      } else {
        // For testing when authentication is not working
        toast.success("Testing mode: YouTube short processed successfully!");

        // Create a temporary practice session in localStorage
        const practiceData = {
          id: `temp-${uuidv4()}`,
          title,
          embedUrl,
          youtubeUrl,
          dialogueSegments,
          isTemporary: true,
          createdAt: new Date().toISOString(),
        };

        // Save to localStorage for practice
        localStorage.setItem(
          "current-practice-data",
          JSON.stringify(practiceData)
        );

        // Navigate to practice page
        router.push("/practice/short-video");
      }
    } catch (error: any) {
      console.error("Error adding YouTube short:", error);
      setError(
        error.message || "An error occurred while adding the YouTube short"
      );
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
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
            onChange={handleYoutubeUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
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

  // Update the renderTranscriptSection function to handle the case when no transcript is available
  const renderTranscriptSection = () => {
    return (
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
                            const updatedSegments = [...dialogueSegments];
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
                            boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.1)",
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
                      <p className="text-gray-800">{segment.text}</p>
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
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                No transcript segments available for this video.
              </p>
              <p className="text-gray-600 mb-6">
                You can add dialogue segments manually using the form below.
              </p>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Add your first segment:
                </h4>
                {/* Create the first segment form here - copy the one from below */}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              title="YouTube video player"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
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
                    {renderTranscriptSection()}
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
            // Practice mode view using TimestampedYouTubePlayer component
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

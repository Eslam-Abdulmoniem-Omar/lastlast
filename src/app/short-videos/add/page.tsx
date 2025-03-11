"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash, Edit, Clock } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { createPodcastWithYouTube } from "@/lib/firebase/podcastUtils";
import { Podcast, DialogueSegment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-hot-toast";

// Function to format time in seconds to MM:SS format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function AddYouTubeShortPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "intermediate"
  );
  const [targetLanguage, setTargetLanguage] = useState<string>("Arabic");
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

  // Authentication protection - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // User is not authenticated, redirect to login page
      toast.error("Please sign in to add videos");
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0c1527] to-[#111f3d]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#232323] rounded-xl mb-4 flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-700 animate-pulse rounded-lg"></div>
          </div>
          <div className="h-4 w-24 bg-gray-700 animate-pulse rounded mb-3"></div>
          <div className="h-3 w-32 bg-gray-700/50 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  // If user is not authenticated and not in loading state, don't render the actual page content
  if (!user && !authLoading) {
    return null; // This will prevent any flickering before the redirect happens
  }

  const validateYoutubeUrl = (url: string) => {
    // Simple validation for YouTube URL, including Shorts format
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts)|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
  };

  const extractVideoId = (url: string): string | null => {
    // Extract video ID from various YouTube URL formats
    let videoId = null;

    if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(new URL(url).search);
      videoId = urlParams.get("v");
    } else if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("youtube.com/embed")) {
      videoId = url.split("youtube.com/embed/")[1].split("?")[0];
    } else if (url.includes("youtube.com/shorts")) {
      videoId = url.split("youtube.com/shorts/")[1].split("?")[0];
    }

    return videoId;
  };

  const convertToEmbedUrl = (url: string) => {
    let videoId = "";

    // Extract video ID from various YouTube URL formats
    if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(new URL(url).search);
      videoId = urlParams.get("v") || "";
    } else if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("youtube.com/embed")) {
      videoId = url.split("youtube.com/embed/")[1].split("?")[0];
    } else if (url.includes("youtube.com/shorts")) {
      // Handle YouTube Shorts format
      videoId = url.split("youtube.com/shorts/")[1].split("?")[0];
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return "";
  };

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

      console.log("Fetching transcript for:", url);

      // First, try to get the video metadata
      const metadataResponse = await fetch(
        `/api/youtube/metadata?url=${encodeURIComponent(url)}`
      );

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json();
        throw new Error(errorData.error || "Failed to fetch video data");
      }

      const { data: metaData } = await metadataResponse.json();

      // Check if video duration is longer than 60 seconds
      if (metaData.duration > 60) {
        setError(
          `Video is ${Math.floor(
            metaData.duration
          )} seconds long. Only videos 1 minute (60 seconds) or shorter are allowed for short video practice.`
        );
        setIsLoading(false);
        // Clear any existing dialogue segments
        setDialogueSegments([]);
        return;
      }

      // Try to get the transcript using the Python-based API
      console.log("Trying Python-based transcript API...");
      const pythonTranscriptResponse = await fetch(
        `/api/youtube/python-transcript?url=${encodeURIComponent(url)}`
      );
      let segments = [];
      let transcriptSource = "default";

      if (pythonTranscriptResponse.ok) {
        const { data: transcriptData } = await pythonTranscriptResponse.json();

        if (
          transcriptData &&
          transcriptData.segments &&
          transcriptData.segments.length > 0
        ) {
          console.log(
            `Received ${transcriptData.segments.length} dialogue segments from Python transcript API`
          );
          segments = transcriptData.segments;
          transcriptSource = "transcript";
        } else {
          console.warn(
            "No Python transcript segments returned, trying direct API"
          );

          // Fall back to the direct transcript API
          const directTranscriptResponse = await fetch(
            `/api/youtube/transcript?url=${encodeURIComponent(url)}`
          );

          if (directTranscriptResponse.ok) {
            const { data: directTranscriptData } =
              await directTranscriptResponse.json();

            if (
              directTranscriptData &&
              directTranscriptData.segments &&
              directTranscriptData.segments.length > 0
            ) {
              console.log(
                `Received ${directTranscriptData.segments.length} dialogue segments from direct transcript API`
              );
              segments = directTranscriptData.segments;
              transcriptSource = "transcript";
            } else {
              console.warn(
                "No direct transcript segments returned, using metadata segments"
              );
              segments = metaData.segments || [];

              // Determine source based on segments
              if (
                segments.some((s: DialogueSegment) =>
                  s.text.includes(metaData.title)
                )
              ) {
                transcriptSource = "title";
              } else if (segments.length > 0) {
                transcriptSource = "description";
              } else {
                transcriptSource = "default";
              }
            }
          } else {
            console.warn(
              "Failed to fetch direct transcript, using metadata segments"
            );
            segments = metaData.segments || [];

            // Determine source based on segments
            if (
              segments.some((s: DialogueSegment) =>
                s.text.includes(metaData.title)
              )
            ) {
              transcriptSource = "title";
            } else if (segments.length > 0) {
              transcriptSource = "description";
            } else {
              transcriptSource = "default";
            }
          }
        }
      } else {
        console.warn("Failed to fetch Python transcript, trying direct API");

        // Fall back to the direct transcript API
        const directTranscriptResponse = await fetch(
          `/api/youtube/transcript?url=${encodeURIComponent(url)}`
        );

        if (directTranscriptResponse.ok) {
          const { data: directTranscriptData } =
            await directTranscriptResponse.json();

          if (
            directTranscriptData &&
            directTranscriptData.segments &&
            directTranscriptData.segments.length > 0
          ) {
            console.log(
              `Received ${directTranscriptData.segments.length} dialogue segments from direct transcript API`
            );
            segments = directTranscriptData.segments;
            transcriptSource = "transcript";
          } else {
            console.warn(
              "No direct transcript segments returned, using metadata segments"
            );
            segments = metaData.segments || [];

            // Determine source based on segments
            if (
              segments.some((s: DialogueSegment) =>
                s.text.includes(metaData.title)
              )
            ) {
              transcriptSource = "title";
            } else if (segments.length > 0) {
              transcriptSource = "description";
            } else {
              transcriptSource = "default";
            }
          }
        } else {
          console.warn(
            "Failed to fetch direct transcript, using metadata segments"
          );
          segments = metaData.segments || [];

          // Determine source based on segments
          if (
            segments.some((s: DialogueSegment) =>
              s.text.includes(metaData.title)
            )
          ) {
            transcriptSource = "title";
          } else if (segments.length > 0) {
            transcriptSource = "description";
          } else {
            transcriptSource = "default";
          }
        }
      }

      // If we still don't have segments, create default ones
      if (!segments || segments.length === 0) {
        console.warn("No segments available, creating default segments");

        const videoId = extractVideoId(url);
        if (videoId) {
          // Create 10 default segments of 5 seconds each
          const defaultSegments = [];
          const sentences = [
            "Hello, welcome to this video.",
            "Today we're going to discuss an interesting topic.",
            "I hope you find this information useful.",
            "Let me know what you think in the comments.",
            "This is an important point to understand.",
            "Let's break this down step by step.",
            "First, we need to consider the context.",
            "Second, we should analyze the details.",
            "Finally, we can draw some conclusions.",
            "Thank you for watching this video.",
          ];

          for (let i = 0; i < 10; i++) {
            defaultSegments.push({
              id: uuidv4(),
              speakerName: i % 2 === 0 ? "Speaker A" : "Speaker B",
              text: sentences[i],
              startTime: i * 5,
              endTime: (i + 1) * 5,
              vocabularyItems: [],
            });
          }

          segments = defaultSegments;
          transcriptSource = "default";
        }
      }

      // If we have transcript segments, process them through GPT-4o Mini
      if (segments.length > 0 && transcriptSource === "transcript") {
        try {
          setIsProcessing(true);
          toast.loading("Processing transcript with AI...");

          console.log("Processing segments with GPT-4o Mini...");
          const processResponse = await fetch("/api/openai/process-segments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ segments }),
          });

          if (processResponse.ok) {
            const { data: processedData } = await processResponse.json();

            if (
              processedData &&
              processedData.segments &&
              processedData.segments.length > 0
            ) {
              console.log(
                `Received ${processedData.segments.length} processed segments from GPT-4o Mini`
              );
              segments = processedData.segments;
              transcriptSource = "transcript-processed";
              toast.dismiss();
              toast.success("Transcript processed successfully!");
            } else {
              console.warn(
                "No processed segments returned, using original segments"
              );
              toast.dismiss();
              toast.error(
                "Failed to process transcript, using original segments"
              );
            }
          } else {
            console.warn("Failed to process segments, using original segments");
            toast.dismiss();
            toast.error(
              "Failed to process transcript, using original segments"
            );
          }
        } catch (error) {
          console.error("Error processing segments:", error);
          toast.dismiss();
          toast.error("Error processing transcript, using original segments");
        } finally {
          setIsProcessing(false);
        }
      }

      // Auto-populate fields with the fetched data
      setEmbedUrl(metaData.embedUrl || convertToEmbedUrl(url));
      setTitle(metaData.title || "YouTube Video");
      setDialogueSegments(segments);
      setTranscriptSource(transcriptSource);

      // Reset the current segment - we don't need users to add more segments
      setCurrentSegment({
        id: uuidv4(),
        speakerName: "",
        text: "",
        startTime: 0,
        endTime: 0,
        vocabularyItems: [],
      });
    } catch (error: any) {
      console.error("Error fetching transcript:", error);
      setError(error.message || "Failed to get transcript. Please try again.");
      toast.error("Failed to get transcript. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this at the component level, not inside a condition
  useEffect(() => {
    const handleUrlFromQuery = async () => {
      // Check for URL in query parameters
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        const urlFromQuery = searchParams.get("url");

        if (urlFromQuery && validateYoutubeUrl(urlFromQuery)) {
          setYoutubeUrl(urlFromQuery);
          await fetchTranscript(urlFromQuery);
          handleSubmit(new Event("submit") as unknown as React.FormEvent);
        }
      }
    };

    handleUrlFromQuery();
  }, []); // Empty dependency array

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (topicToRemove: string) => {
    setTopics(topics.filter((topic) => topic !== topicToRemove));
  };

  const handleEditSegment = (index: number) => {
    // Toggle editing mode for the segment
    const updatedSegments = [...dialogueSegments];

    // If already editing this segment, cancel editing
    if (updatedSegments[index].isEditing) {
      updatedSegments[index].isEditing = false;
      setDialogueSegments(updatedSegments);
      return;
    }

    // Reset editing flag for all segments
    updatedSegments.forEach((segment) => (segment.isEditing = false));

    // Set editing flag for this segment
    updatedSegments[index].isEditing = true;

    // Create a temporary copy for editing
    updatedSegments[index].editText = updatedSegments[index].text;
    updatedSegments[index].editStartTime = updatedSegments[index].startTime;
    updatedSegments[index].editEndTime = updatedSegments[index].endTime;

    setDialogueSegments(updatedSegments);
  };

  const handleUpdateSegment = (index: number) => {
    const updatedSegments = [...dialogueSegments];
    const segment = updatedSegments[index];

    // Update the segment with edited values
    segment.text = segment.editText || segment.text;
    segment.startTime = segment.editStartTime || segment.startTime;
    segment.endTime = segment.editEndTime || segment.endTime;

    // Reset editing mode
    segment.isEditing = false;

    // Sort segments by start time
    updatedSegments.sort((a, b) => a.startTime - b.startTime);

    setDialogueSegments(updatedSegments);
  };

  const handleCancelEdit = (index: number) => {
    const updatedSegments = [...dialogueSegments];
    updatedSegments[index].isEditing = false;
    setDialogueSegments(updatedSegments);
  };

  // Update a specific field of a segment being edited
  const handleEditSegmentField = (
    index: number,
    field: "editText" | "editStartTime" | "editEndTime",
    value: string | number
  ) => {
    const updatedSegments = [...dialogueSegments];
    if (field === "editText") {
      updatedSegments[index].editText = value as string;
    } else if (field === "editStartTime") {
      updatedSegments[index].editStartTime = value as number;
    } else if (field === "editEndTime") {
      updatedSegments[index].editEndTime = value as number;
    }
    setDialogueSegments(updatedSegments);
  };

  const handleRemoveSegment = (index: number) => {
    setDialogueSegments(dialogueSegments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!embedUrl) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    if (!dialogueSegments || dialogueSegments.length === 0) {
      setError("Please add at least one dialogue segment");
      return;
    }

    // No longer requiring users to add additional segments
    // The segments from the transcript are sufficient

    try {
      setIsLoading(true);
      setIsSubmitting(true);
      setError(null);

      // Generate a title from the YouTube URL if not provided
      const generatedTitle =
        title || `YouTube Video - ${new Date().toLocaleDateString()}`;

      // Create the podcast with YouTube data
      const newVideoData: Omit<Podcast, "id"> = {
        title: generatedTitle,
        description: generatedTitle, // Just use generated title as description
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
          targetLanguage,
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
      toast.error(
        "Please fill in all required fields before starting practice"
      );
      return;
    }

    // Set practice loading state to true
    setIsPracticeLoading(true);

    // Show loading feedback with ID that we can dismiss
    const toastId = toast.loading("Preparing your practice session...");

    // Create a temporary practice session in localStorage
    const practiceData = {
      id: `temp-${uuidv4()}`,
      title: title || "YouTube Video",
      embedUrl: embedUrl,
      youtubeUrl: youtubeUrl,
      dialogueSegments,
      targetLanguage,
      isTemporary: true,
      createdAt: new Date().toISOString(),
    };

    try {
      // Save to localStorage
      localStorage.setItem(
        "current-practice-data",
        JSON.stringify(practiceData)
      );

      // Log for debugging
      console.log("Starting practice with data:", practiceData);

      // Dismiss the loading toast before navigation
      toast.dismiss(toastId);

      // Add a success message that auto-dismisses
      toast.success("Practice session ready!");

      // Navigate to the practice page
      router.push("/practice");
    } catch (error) {
      // Dismiss loading toast and show error if something goes wrong
      toast.dismiss(toastId);
      toast.error("Something went wrong. Please try again.");
      console.error("Error starting practice:", error);
      // Reset loading state on error
      setIsPracticeLoading(false);
    }
  };

  // Render Submit Button - now only showing Start Practice
  const renderSubmitButton = () => {
    return (
      <button
        type="button"
        disabled={
          isLoading ||
          isSubmitting ||
          isPracticeLoading ||
          dialogueSegments.length === 0
        }
        onClick={handleStartPractice}
        className={`flex items-center justify-center px-10 py-3.5 text-lg font-semibold rounded-lg shadow-md transition-all duration-300 ${
          isLoading ||
          isSubmitting ||
          isPracticeLoading ||
          dialogueSegments.length === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105"
        }`}
      >
        {isLoading || isSubmitting || isPracticeLoading ? (
          <svg
            className="animate-spin mr-3 h-6 w-6 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {isPracticeLoading ? "Loading..." : "Start Practice"}
      </button>
    );
  };

  // Render YouTube URL input with fetch transcript button
  const renderYoutubeUrlInput = () => {
    return (
      <div className="mb-6">
        <label
          htmlFor="youtube-url"
          className="block text-white font-medium mb-2"
        >
          YouTube URL
        </label>
        <div className="flex">
          <input
            type="text"
            id="youtube-url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 px-4 py-2 border border-[#2e3b56] bg-[#1b2b48]/50 backdrop-blur-sm rounded-l-md text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={() => fetchTranscript(youtubeUrl)}
            disabled={!youtubeUrl || isProcessing}
            className={`bg-primary text-white px-4 py-2 rounded-r-md hover:bg-primary-dark flex items-center justify-center transition-all ${
              isProcessing
                ? "opacity-50 cursor-not-allowed"
                : "hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Start
              </span>
            )}
          </button>
        </div>
        <p className="mt-1 text-sm text-primary/80">
          Enter a valid YouTube video URL. Short videos (under 2 minutes) work
          best.
        </p>

        {/* Language Selector */}
        <div className="mt-4">
          <label
            htmlFor="language-select"
            className="block text-white font-medium mb-2"
          >
            Translation Language
          </label>
          <select
            id="language-select"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full px-4 py-2 border border-[#2e3b56] bg-[#1b2b48]/50 backdrop-blur-sm rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Arabic">Arabic</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Chinese">Chinese</option>
            <option value="Japanese">Japanese</option>
          </select>
          <p className="mt-1 text-sm text-primary/80">
            Select the language for translations in the listening and vocabulary
            sections.
          </p>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0c1527] to-[#111f3d] py-12 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center mb-8">
            <Link
              href="/short-videos"
              className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </Link>
            <h1 className="text-3xl font-bold text-white">
              Add YouTube Short Video
            </h1>
          </div>

          {/* Content container with glass effect */}
          <div className="bg-[#1b2b48]/80 backdrop-blur-sm rounded-xl p-6 border border-[#2e3b56]/50 shadow-lg mb-8">
            {/* Show success message if video was added successfully */}
            {success && (
              <div className="mb-6 p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-lg text-green-300">
                <p className="font-medium">YouTube video added successfully!</p>
                <p>
                  You can now practice with this video or add more videos to
                  your collection.
                </p>
                <div className="mt-4 flex gap-4">
                  <Link
                    href="/practice"
                    className="inline-flex items-center bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Start Practice
                  </Link>
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setYoutubeUrl("");
                      setEmbedUrl("");
                      setTitle("");
                      setDescription("");
                      setTopics([]);
                      setDialogueSegments([]);
                      setCurrentSegment({
                        id: uuidv4(),
                        speakerName: "",
                        text: "",
                        startTime: 0,
                        endTime: 0,
                        vocabularyItems: [],
                      });
                    }}
                    className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Another Video
                  </button>
                </div>
              </div>
            )}

            {/* Show error message if there was an error */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg text-red-300">
                <p className="font-medium">Error adding YouTube video:</p>
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
                {/* Left column - Video Details */}
                <div className="bg-transparent p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold mb-4">Video Details</h2>

                  {renderYoutubeUrlInput()}

                  {embedUrl && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Preview
                      </label>
                      <div className="aspect-video rounded-md overflow-hidden border border-[#2e3b56]/50">
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
                </div>

                {/* Right column - Dialogue Segments */}
                <div className="bg-transparent p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold mb-4">
                    Dialogue Segments
                  </h2>
                  <div>
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-blue-400"
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
                          <h3 className="text-sm font-medium text-blue-800">
                            Transcript Information
                          </h3>
                          <p className="mt-1 text-sm text-blue-700">
                            {transcriptSource === "transcript-processed" &&
                              "These segments contain the actual transcript from the video, processed by AI for better sentence breaks and timestamps."}
                            {transcriptSource === "transcript" &&
                              "These segments contain the actual transcript from the video with accurate timestamps."}
                            {transcriptSource === "description" &&
                              "These segments are created from the video description since a transcript wasn't available."}
                            {transcriptSource === "title" &&
                              "These segments are based on the video title since a transcript wasn't available."}
                            {transcriptSource === "default" &&
                              "No transcript was available for this video, so default segments were created."}
                            {!transcriptSource &&
                              "Segments with timestamps will be created for speaking practice."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="mt-2 p-3 bg-yellow-50 rounded-md">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-yellow-400 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-yellow-800">
                              Processing transcript with AI...
                            </p>
                            <p className="mt-1 text-xs text-yellow-700">
                              Breaking down segments into natural sentences with
                              accurate timestamps.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {dialogueSegments.length > 0 ? (
                      <p className="text-sm text-gray-600 mt-3 mb-1">
                        Loaded {dialogueSegments.length} dialogue segments.
                      </p>
                    ) : (
                      <div className="mt-3 mb-1"></div>
                    )}

                    <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {dialogueSegments.map((segment, index) => (
                        <div
                          key={segment.id}
                          className="p-3 border rounded-md bg-white shadow-sm"
                        >
                          {/* Timestamps above the text */}
                          <div className="text-xs text-gray-500 mb-2">
                            {segment.isEditing ? (
                              <div className="flex space-x-3">
                                <div className="flex items-center">
                                  <span className="mr-1">Start:</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={
                                      segment.editStartTime || segment.startTime
                                    }
                                    onChange={(e) =>
                                      handleEditSegmentField(
                                        index,
                                        "editStartTime",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs"
                                  />
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-1">End:</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min={
                                      (segment.editStartTime ||
                                        segment.startTime) + 0.1
                                    }
                                    value={
                                      segment.editEndTime || segment.endTime
                                    }
                                    onChange={(e) =>
                                      handleEditSegmentField(
                                        index,
                                        "editEndTime",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs"
                                  />
                                </div>
                              </div>
                            ) : (
                              <span>
                                {formatTime(segment.startTime)} -{" "}
                                {formatTime(segment.endTime)}
                              </span>
                            )}
                          </div>

                          {/* Text display/edit */}
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              {segment.isEditing ? (
                                <textarea
                                  value={segment.editText || segment.text}
                                  onChange={(e) =>
                                    handleEditSegmentField(
                                      index,
                                      "editText",
                                      e.target.value
                                    )
                                  }
                                  rows={2}
                                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-gray-800 text-sm"
                                />
                              ) : (
                                <p className="text-gray-800">{segment.text}</p>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-2">
                              {segment.isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSegment(index)}
                                    className="text-green-600 hover:text-green-800"
                                    title="Save changes"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEdit(index)}
                                    className="text-gray-600 hover:text-gray-800"
                                    title="Cancel editing"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditSegment(index)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit segment"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSegment(index)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Remove segment"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form footer with buttons - outside the grid */}
              <div className="flex justify-end pt-6 items-center space-x-4">
                <Link
                  href="/short-videos"
                  className="flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-0.5"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Cancel
                </Link>
                {renderSubmitButton()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

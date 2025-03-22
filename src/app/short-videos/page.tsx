"use client";

import { useState, useEffect } from "react";
import TimestampedYouTubePlayer from "../../components/TimestampedYouTubePlayer";
import { sampleYoutubeShort } from "../../lib/data/sampleYoutubeShort";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Video,
  Clock,
  User,
  Tag,
  LogIn,
  Mic,
  Save,
} from "lucide-react";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getPodcasts,
  getUserSavedVideos,
  saveVideoToCollection,
} from "@/lib/firebase/podcastUtils";
import { Podcast } from "@/lib/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// Update Dream House video data with new content
const dreamHouseVideo: Podcast = {
  id: "dream-house-video",
  title: "What I Want - Dream House",
  description: "A fairy tale dialogue between two mysterious characters",
  youtubeUrl: "https://www.youtube.com/embed/5u9CxCgRjvk",
  level: "intermediate",
  duration: 30, // seconds (approximate for YouTube short)
  topics: ["conversation", "fairy tale", "mystery", "fantasy"],
  isShort: true,
  videoSource: "youtube",
  hostName: "English Conversation",
  publishedDate: new Date().toISOString(),
  audioUrl: "",
  transcriptUrl: "",
  dialogueSegments: [
    {
      id: "segment1",
      speakerName: "Speaker A",
      text: "Do not be afraid.",
      startTime: 0,
      endTime: 3,
      vocabularyItems: [],
    },
    {
      id: "segment2",
      speakerName: "Speaker B",
      text: "I am not afraid.",
      startTime: 3,
      endTime: 6,
      vocabularyItems: [],
    },
    {
      id: "segment3",
      speakerName: "Speaker A",
      text: "Then come out.",
      startTime: 6,
      endTime: 9,
      vocabularyItems: [],
    },
    {
      id: "segment4",
      speakerName: "Speaker B",
      text: "Then you will be afraid.",
      startTime: 9,
      endTime: 12,
      vocabularyItems: [
        {
          word: "afraid",
          definition: "Feeling fear or anxiety; frightened",
          exampleSentence: "She was afraid of the dark.",
        },
      ],
    },
    {
      id: "segment5",
      speakerName: "Speaker A",
      text: "No, I won't.",
      startTime: 12,
      endTime: 15,
      vocabularyItems: [],
    },
    {
      id: "segment6",
      speakerName: "Speaker B",
      text: "I know who you are.",
      startTime: 15,
      endTime: 18,
      vocabularyItems: [],
    },
    {
      id: "segment7",
      speakerName: "Speaker A",
      text: "Do you?",
      startTime: 18,
      endTime: 21,
      vocabularyItems: [],
    },
    {
      id: "segment8",
      speakerName: "Speaker B",
      text: "You are my fairy godmother.",
      startTime: 21,
      endTime: 25,
      vocabularyItems: [
        {
          word: "fairy godmother",
          definition:
            "A fictional character in fairy tales who uses magic to help the protagonist",
          exampleSentence:
            "In Cinderella, the fairy godmother transformed a pumpkin into a carriage.",
        },
      ],
    },
  ],
  questions: [],
  referenceAnswers: [],
};

export default function ShortVideosPage() {
  const [completed, setCompleted] = useState(false);
  const [dreamHouseCompleted, setDreamHouseCompleted] = useState(false);
  const [userVideos, setUserVideos] = useState<Podcast[]>([]);
  const [savedVideos, setSavedVideos] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // For demo purposes, include the sample video
        let videos = [sampleYoutubeShort];

        // If user is logged in, fetch their videos from Firebase
        if (user) {
          // Fetch podcasts with isShort flag
          const fetchedVideos = await getPodcasts();
          const shortVideos = fetchedVideos.filter(
            (video: any) => video.isShort
          );

          // Fetch saved videos from the savedVideos collection
          const fetchedSavedVideos = await getUserSavedVideos(user.uid);
          setSavedVideos(fetchedSavedVideos);

          // Add unique videos from the fetched list (avoid duplicating the sample)
          videos = [
            ...videos,
            ...shortVideos.filter((v: any) => v.id !== sampleYoutubeShort.id),
          ];
        }

        setUserVideos(videos);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [user]);

  const handleComplete = () => {
    setCompleted(true);
  };

  // Format date to a readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format duration from seconds to MM:SS format
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Add a handlePractice function to start practice with a selected video
  const handlePractice = (video: Podcast) => {
    // Create a practice session in localStorage
    const practiceData = {
      id: video.id,
      title: video.title,
      embedUrl: video.youtubeUrl,
      youtubeUrl: video.youtubeUrl,
      dialogueSegments: video.dialogueSegments,
      isTemporary: false,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem("current-practice-data", JSON.stringify(practiceData));

    // Log for debugging
    console.log(
      "Starting practice from short-videos page with data:",
      practiceData
    );
    console.log("Navigating to practice page...");

    // Navigate to the practice page
    router.push("/practice/short-video");
  };

  const handleAddNewVideo = () => {
    if (!user) {
      toast.error("Please sign in to add a new video");
      router.push("/login?redirect=/short-videos/add");
    } else {
      router.push("/short-videos/add");
    }
  };

  // Render a video card
  const renderVideoCard = (video: Podcast & { saved?: boolean }) => {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="relative pb-[56.25%] bg-gray-100">
          {video.youtubeUrl ? (
            <iframe
              src={`https://www.youtube.com/embed/${extractVideoId(
                video.youtubeUrl
              )}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <Video className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {video.title}
          </h3>
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <Clock size={14} className="mr-1" />
            <span>{formatDuration(video.duration || 0)}</span>
            <span className="mx-2">•</span>
            <Tag size={14} className="mr-1" />
            <span>{video.level || "intermediate"}</span>
          </div>
          <div className="flex space-x-2">
            <Link
              href={`/short-videos/${video.id}`}
              className="flex-1 text-center py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
            >
              View
            </Link>
            <button
              onClick={() => handlePractice(video)}
              className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors"
            >
              Practice
            </button>
            {user && !video.saved && (
              <button
                onClick={() => handleSaveVideo(video)}
                className="flex-1 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm transition-colors"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add function to save a video to user's collection
  const handleSaveVideo = async (video: Podcast & { saved?: boolean }) => {
    if (!user) {
      toast.error("Please sign in to save videos");
      return;
    }

    try {
      // Prepare video data for saving
      const videoData: Partial<Podcast> = {
        title: video.title,
        description: video.description || "Saved for practice",
        youtubeUrl: video.youtubeUrl,
        tiktokUrl: video.tiktokUrl,
        videoSource: video.videoSource || "youtube",
        level: video.level || "intermediate",
        duration: video.duration || 0,
        topics: video.topics || ["practice"],
        hostName: video.hostName || "Unknown",
        questions: video.questions || [],
        referenceAnswers: video.referenceAnswers || [],
        dialogueSegments: video.dialogueSegments || [],
        isShort: true,
      };

      // Save to collection
      await saveVideoToCollection(user.uid, videoData);

      // Update local state to refresh the UI
      const savedVideo = { ...video, saved: true };
      setSavedVideos([savedVideo, ...savedVideos]);

      toast.success("Video saved to your collection!");
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Failed to save video");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto px-4 pt-28 pb-12 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div className="flex items-center">
              <Link
                href="/"
                className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Short Video Practice
                </h1>
                <p className="text-gray-600">
                  Improve your English with short, engaging videos designed for
                  language learners.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              {user ? <div></div> : <div></div>}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              Featured Practice: Dramatic Dialogue
            </h2>
            <p className="text-gray-600 mb-6">
              Practice English with this dramatic dialogue between two speakers
              discussing their relationship. Click on any dialogue line to jump
              to that timestamp in the video.
            </p>

            <DeepgramContextProvider key="dramatic-dialogue-unique-key">
              <TimestampedYouTubePlayer
                podcast={sampleYoutubeShort}
                onComplete={handleComplete}
              />
            </DeepgramContextProvider>

            {completed && (
              <div className="p-4 bg-green-100 text-green-800 rounded-lg mt-6">
                <p className="font-medium">
                  You&apos;ve completed this practice!
                </p>
                <p>
                  Try clicking on different dialogue lines or using the guided
                  practice mode.
                </p>
              </div>
            )}

            <div className="mt-8 flex justify-between items-center">
              <div className="p-6 bg-blue-50 rounded-lg flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-4">
                  How to Use This Feature
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-blue-800">
                  <li>
                    Click on any dialogue line to jump to that timestamp in the
                    video
                  </li>
                  <li>Use the play/pause button to control playback</li>
                  <li>
                    Switch between &quot;Listening&quot; and &quot;Guided
                    Practice&quot; modes using the tabs
                  </li>
                  <li>
                    In guided practice mode, you&apos;ll be prompted to repeat
                    each line
                  </li>
                  <li>
                    Your speech will be transcribed in real-time using Deepgram
                    AI
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Second Video: What I Want - Short Conversation */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              Practice: Fairy Tale Dialogue
            </h2>
            <p className="text-gray-600 mb-6">
              Practice English with this mysterious dialogue between two
              characters in a fantasy setting. Perfect for practicing tone and
              emotion in your speech.
            </p>

            <DeepgramContextProvider key="dream-house-unique">
              <TimestampedYouTubePlayer
                podcast={dreamHouseVideo}
                onComplete={() => setDreamHouseCompleted(true)}
              />
            </DeepgramContextProvider>

            {dreamHouseCompleted && (
              <div className="p-4 bg-green-100 text-green-800 rounded-lg mt-6">
                <p className="font-medium">
                  You&apos;ve completed this practice!
                </p>
                <p>
                  Try clicking on different dialogue lines or using the guided
                  practice mode.
                </p>
              </div>
            )}

            <div className="mt-8 flex justify-between items-center">
              <div className="p-6 bg-blue-50 rounded-lg flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-4">
                  How to Use This Feature
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-blue-800">
                  <li>
                    Click on any dialogue line to jump to that timestamp in the
                    video
                  </li>
                  <li>Use the play/pause button to control playback</li>
                  <li>
                    Switch between &quot;Listening&quot; and &quot;Guided
                    Practice&quot; modes using the tabs
                  </li>
                  <li>
                    In guided practice mode, you&apos;ll be prompted to repeat
                    each line
                  </li>
                  <li>
                    Your speech will be transcribed in real-time using Deepgram
                    AI
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Saved Videos Section - New */}
          {savedVideos.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Your Saved Videos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedVideos.map((video) => (
                  <div key={video.id}>{renderVideoCard(video)}</div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
          )}

          {/* No videos state */}
          {!loading && userVideos.length === 0 && savedVideos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                You don't have any saved videos yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Helper function to extract video ID from YouTube URL - optimize to handle both shorts and regular links
function extractVideoId(url: string | undefined): string | null {
  if (!url) return null;

  // Handle YouTube Shorts format
  if (url.includes("youtube.com/shorts/")) {
    const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?&]+)/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
  }

  // Handle standard YouTube URL formats (watch, embed, youtu.be)
  const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
}

"use client";

import { useState, useEffect } from "react";
import TimestampedYouTubePlayer from "../../components/TimestampedYouTubePlayer";
import { sampleYoutubeShort } from "../../lib/data/sampleYoutubeShort";
import Link from "next/link";
import { ArrowLeft, Plus, Video, Clock, User, Tag, LogIn } from "lucide-react";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { getPodcasts } from "@/lib/firebase/podcastUtils";
import { Podcast } from "@/lib/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function ShortVideosPage() {
  const [completed, setCompleted] = useState(false);
  const [userVideos, setUserVideos] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchUserVideos = async () => {
      setLoading(true);
      try {
        // For demo purposes, include the sample video
        let videos = [sampleYoutubeShort];

        // If user is logged in, fetch their videos from Firebase
        if (user) {
          const fetchedVideos = await getPodcasts();
          // Filter to only include short videos
          const shortVideos = fetchedVideos.filter(
            (video: any) => video.isShort
          );
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

    fetchUserVideos();
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto px-4 pt-28 pb-12 mt-16">
        <div className="max-w-5xl mx-auto">
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

            {user ? (
              <Link
                href="/short-videos/add"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus size={18} className="mr-2" />
                Add New Video
              </Link>
            ) : (
              <button
                onClick={handleAddNewVideo}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
              >
                <LogIn size={18} className="mr-2" />
                Sign in to Add Video
              </button>
            )}
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

            <DeepgramContextProvider>
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

            <div className="mt-8 p-6 bg-blue-50 rounded-lg">
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
                  Your speech will be transcribed in real-time using Deepgram AI
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

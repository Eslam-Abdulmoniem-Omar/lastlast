"use client";

import { useState, useEffect } from "react";
import TimestampedYouTubePlayer from "../../components/TimestampedYouTubePlayer";
import { sampleYoutubeShort } from "../../lib/data/sampleYoutubeShort";
import Link from "next/link";
import { ArrowLeft, Plus, Video, Clock, User, Tag } from "lucide-react";
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
          const shortVideos = fetchedVideos.filter((video) => video.isShort);
          // Add unique videos from the fetched list (avoid duplicating the sample)
          videos = [
            ...videos,
            ...shortVideos.filter((v) => v.id !== sampleYoutubeShort.id),
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
    // Check if user is logged in
    if (!user) {
      toast.error("Please sign in to practice with videos");
      router.push("/login");
      return;
    }

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

    // Navigate to the new practice page
    router.push("/practice");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0c1527] to-[#111f3d] py-12 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div className="flex items-center">
              <Link
                href="/"
                className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={20} className="text-white" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Short Video Practice
                </h1>
                <p className="text-white/70">
                  Improve your English with short, engaging videos designed for
                  language learners.
                </p>
              </div>
            </div>

            {user ? (
              <Link
                href="/short-videos/add"
                className="bg-secondary text-white px-5 py-2.5 rounded-lg hover:bg-secondary-light flex items-center font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-secondary-light/30"
              >
                <Plus size={18} className="mr-2" />
                Add New Video
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-primary/80 text-white px-5 py-2.5 rounded-lg hover:bg-primary flex items-center font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-primary-light/30"
              >
                <User size={18} className="mr-2" />
                Sign in to Add Videos
              </Link>
            )}
          </div>

          <div className="mb-12">
            <div className="bg-[#1b2b48]/80 backdrop-blur-sm rounded-xl p-6 border border-[#2e3b56]/50 shadow-lg">
              <DeepgramContextProvider>
                <TimestampedYouTubePlayer
                  podcast={sampleYoutubeShort}
                  onComplete={handleComplete}
                />
              </DeepgramContextProvider>

              {completed && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 backdrop-blur-sm text-green-300 rounded-lg mt-6">
                  <p className="font-medium">
                    You&apos;ve completed this practice!
                  </p>
                  <p>
                    Try clicking on different dialogue lines or using the guided
                    practice mode.
                  </p>
                </div>
              )}

              {!user && (
                <div className="p-4 bg-primary/10 border border-primary/30 backdrop-blur-sm text-primary-light rounded-lg mt-6">
                  <p className="font-medium">
                    Want to save your progress and add your own videos?
                  </p>
                  <div className="mt-2 flex gap-3">
                    <Link
                      href="/login"
                      className="px-4 py-2 bg-primary/80 hover:bg-primary transition-colors rounded-lg text-white font-medium text-sm"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="px-4 py-2 bg-secondary/80 hover:bg-secondary transition-colors rounded-lg text-white font-medium text-sm"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}

              <div className="mt-8 p-6 bg-[#1b2b48]/80 backdrop-blur-sm rounded-lg border border-[#2e3b56]/50 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-4">
                  How to Use This Feature
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-white/80">
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
        </div>
      </div>
    </main>
  );
}

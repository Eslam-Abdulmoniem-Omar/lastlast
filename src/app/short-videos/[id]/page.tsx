"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import TimestampedYouTubePlayer from "../../../components/TimestampedYouTubePlayer";
import { getPodcastById } from "@/lib/firebase/podcastUtils";
import { Podcast } from "@/lib/types";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import { sampleYoutubeShort } from "@/lib/data/sampleYoutubeShort";

export default function ShortVideoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      setLoading(true);
      try {
        // If it's the sample video ID, use the sample data
        if (id === sampleYoutubeShort.id) {
          setPodcast(sampleYoutubeShort);
        } else {
          // Otherwise fetch from Firebase
          const data = await getPodcastById(id);
          setPodcast(data);
        }
      } catch (error) {
        console.error("Error fetching video:", error);
        setError("Video not found or error loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  const handleComplete = () => {
    setCompleted(true);
  };

  const handlePractice = () => {
    if (!podcast) return;

    // Create a practice session in localStorage
    const practiceData = {
      id: podcast.id,
      title: podcast.title,
      embedUrl: podcast.youtubeUrl,
      youtubeUrl: podcast.youtubeUrl,
      dialogueSegments: podcast.dialogueSegments,
      isTemporary: false,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem("current-practice-data", JSON.stringify(practiceData));

    // Navigate to the practice page
    router.push("/practice/short-video");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !podcast) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <Link
                href="/short-videos"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Videos
              </Link>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h1 className="text-2xl font-bold text-red-800 mb-4">
                {error || "Video Not Found"}
              </h1>
              <p className="text-red-600 mb-6">
                Sorry, we couldn&apos;t find the video you&apos;re looking for.
              </p>
              <Link
                href="/short-videos"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Return to Videos
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <Link
              href="/short-videos"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Videos
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {podcast.title}
            </h1>

            <div className="flex items-center space-x-3 mb-4">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  podcast.level === "beginner"
                    ? "bg-green-100 text-green-800"
                    : podcast.level === "intermediate"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {podcast.level.charAt(0).toUpperCase() + podcast.level.slice(1)}
              </span>

              {podcast.topics.map((topic) => (
                <span
                  key={topic}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>

            <p className="text-gray-600 mb-8">{podcast.description}</p>

            <DeepgramContextProvider>
              <TimestampedYouTubePlayer
                podcast={podcast}
                onComplete={handleComplete}
              />
            </DeepgramContextProvider>

            {completed && (
              <div className="p-4 bg-green-100 text-green-800 rounded-lg mt-6">
                <p className="font-medium">
                  Great job! You've completed this practice.
                </p>
                <p>
                  Continue practicing with other videos or try this one again to
                  improve your fluency.
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-4 mb-6">
            <Link
              href="/short-videos"
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Videos
            </Link>
            <button
              onClick={handlePractice}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Practice
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PodcastPlayer from "../../../components/PodcastPlayer";
import YouTubeShortPlayer from "../../../components/YouTubeShortPlayer";
import WritingPractice from "../../../components/WritingPractice";
import ConversationPractice from "../../../components/ConversationPractice";
import WordTranslation from "../../../components/WordTranslation";
import { getPodcastById } from "../../../lib/firebase/podcastUtils";
import { Podcast } from "../../../lib/types";
import { useAuth } from "../../../lib/hooks/useAuth";
import { samplePodcast } from "../../../lib/data/samplePodcast";
import { sampleYoutubeShort } from "../../../lib/data/sampleYoutubeShort";
import { Headphones, BookOpen, Mic, Languages } from "lucide-react";

export default function PodcastDetailPage() {
  const { id } = useParams();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("listen");
  const [transcriptShown, setTranscriptShown] = useState(false);
  const { user } = useAuth();

  // Get podcast data
  useEffect(() => {
    const fetchPodcast = async () => {
      setLoading(true);

      try {
        // For demo purposes, use the sample podcast or YouTube short
        if (id === "sample-podcast-1") {
          setPodcast(samplePodcast);
          setLoading(false);
          return;
        } else if (id === "sample-youtube-short-1") {
          setPodcast(sampleYoutubeShort);
          setLoading(false);
          return;
        }

        // In a real app, fetch from Firebase
        if (typeof id === "string") {
          const podcastData = await getPodcastById(id);
          setPodcast(podcastData);
        }
      } catch (err) {
        console.error("Error fetching podcast:", err);
        setError("Failed to load podcast. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPodcast();
  }, [id]);

  // Show transcript after a listening session
  const handleListeningComplete = () => {
    setTranscriptShown(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading podcast...</p>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-red-500 text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Podcast Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "We couldn't find the podcast you're looking for."}
          </p>
          <a
            href="/dashboard"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg inline-block"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // If this is a YouTube Short, we use a simplified layout with just the YouTubeShortPlayer
  if (podcast.isShort) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {podcast.title}
              </h1>
              <p className="text-gray-600">{podcast.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {podcast.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              <YouTubeShortPlayer
                podcast={podcast}
                onComplete={handleListeningComplete}
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Regular podcast layout with tabs
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {podcast.title}
            </h1>
            <p className="text-gray-600">{podcast.description}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="flex flex-wrap">
              <button
                onClick={() => setActiveTab("listen")}
                className={`flex items-center px-6 py-4 ${
                  activeTab === "listen"
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <Headphones className="mr-2 h-5 w-5" />
                <span>Listen</span>
              </button>

              <button
                onClick={() => setActiveTab("write")}
                className={`flex items-center px-6 py-4 ${
                  activeTab === "write"
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <BookOpen className="mr-2 h-5 w-5" />
                <span>Write</span>
              </button>

              <button
                onClick={() => setActiveTab("speak")}
                className={`flex items-center px-6 py-4 ${
                  activeTab === "speak"
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <Mic className="mr-2 h-5 w-5" />
                <span>Speak</span>
              </button>

              <button
                onClick={() => setActiveTab("translate")}
                className={`flex items-center px-6 py-4 ${
                  activeTab === "translate"
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <Languages className="mr-2 h-5 w-5" />
                <span>Translate</span>
              </button>
            </div>

            <div className="p-6">
              {activeTab === "listen" && (
                <PodcastPlayer
                  podcast={podcast}
                  showTranscript={transcriptShown}
                  onComplete={handleListeningComplete}
                />
              )}

              {activeTab === "write" && <WritingPractice podcast={podcast} />}

              {activeTab === "speak" && (
                <ConversationPractice podcast={podcast} />
              )}

              {activeTab === "translate" && (
                <WordTranslation
                  context={podcast.description}
                  targetLanguage="Chinese"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

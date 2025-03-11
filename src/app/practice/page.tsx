"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Podcast, DialogueSegment } from "@/lib/types";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import TimestampedYouTubePlayer from "@/components/TimestampedYouTubePlayer";

export default function PracticePage() {
  const router = useRouter();
  const [practiceData, setPracticeData] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [videoSource, setVideoSource] = useState<"library" | "new">("library");
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Enhanced function to ensure timestamps are precise
  const processTimestamps = (
    segments: DialogueSegment[]
  ): DialogueSegment[] => {
    if (!segments || segments.length === 0) {
      console.warn("No dialogue segments to process");
      return [];
    }

    try {
      console.log(
        `Processing ${segments.length} dialogue segments for precise timestamps`
      );

      // Sort segments by start time to ensure sequential order
      const sortedSegments = [...segments].sort(
        (a, b) => a.startTime - b.startTime
      );

      // Ensure no overlap and precise timing between segments
      const processedSegments = sortedSegments.map((segment, index) => {
        // Round timestamps to 2 decimal places for precision
        const startTime = parseFloat(segment.startTime.toFixed(2));

        // For the end time, either use the next segment's start time or add a default duration
        let endTime: number;

        if (index < sortedSegments.length - 1) {
          // Use the next segment's start time as this segment's end time
          endTime = parseFloat(sortedSegments[index + 1].startTime.toFixed(2));
        } else {
          // For the last segment, add a default duration (3 seconds)
          endTime = parseFloat(
            (
              segment.startTime + (segment.endTime - segment.startTime || 3)
            ).toFixed(2)
          );
        }

        // Ensure end time is greater than start time with minimum duration
        endTime = Math.max(startTime + 0.8, endTime);

        return {
          ...segment,
          startTime,
          endTime,
        };
      });

      console.log(
        "Timestamp processing complete. Sample:",
        processedSegments.length > 0
          ? `First segment: ${processedSegments[0].startTime}s - ${processedSegments[0].endTime}s`
          : "No segments"
      );

      return processedSegments;
    } catch (error) {
      console.error("Error processing timestamps:", error);
      setProcessingError(
        "Failed to process video timestamps. Please try refreshing the page."
      );
      // Return original segments as fallback
      return segments;
    }
  };

  useEffect(() => {
    // Load practice data from localStorage
    const loadPracticeData = () => {
      try {
        console.log("Loading practice data from localStorage");
        const storedData = localStorage.getItem("current-practice-data");
        console.log("Stored data:", storedData ? "Found" : "Not found");

        if (!storedData) {
          console.error("No practice data found in localStorage");
          toast.error("No practice data found. Please select a video first.");
          router.push("/short-videos");
          return;
        }

        const data = JSON.parse(storedData);
        console.log("Parsed practice data:", data);

        // Determine if this is a new video or from the library
        setVideoSource(data.isTemporary ? "new" : "library");

        // Process dialogue segments to ensure precise timestamps
        const processedSegments = processTimestamps(
          data.dialogueSegments || []
        );

        // Convert the data to match the Podcast type
        const podcastData: Podcast = {
          id: data.id,
          title: data.title,
          description:
            data.description ||
            "Practice with this video to improve your English skills.",
          audioUrl: data.audioUrl || "",
          transcriptUrl: data.transcriptUrl || "",
          youtubeUrl: data.embedUrl,
          level: data.level || "intermediate",
          duration: data.duration || 30,
          topics: data.topics || ["conversation", "practice"],
          hostName: data.hostName || "English Practice",
          publishedDate: data.createdAt || new Date().toISOString(),
          questions: data.questions || [],
          referenceAnswers: data.referenceAnswers || [],
          dialogueSegments: processedSegments,
          isShort: true,
        };

        setPracticeData(podcastData);
      } catch (error) {
        console.error("Error loading practice data:", error);
        toast.error("Error loading practice data. Please try again.");
        router.push("/short-videos");
      } finally {
        setLoading(false);
      }
    };

    loadPracticeData();
  }, [router]);

  const handleComplete = () => {
    setCompleted(true);
    toast.success("Practice completed! Great job!");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0c1527] to-[#111f3d] py-12 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <Link
              href="/"
              className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors inline-flex items-center text-white"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
          </div>

          {processingError && (
            <div className="bg-red-500/10 border-l-4 border-red-500/50 p-4 mb-6 text-red-300 backdrop-blur-sm">
              <h3 className="font-bold">Error Processing Video</h3>
              <p>{processingError}</p>
            </div>
          )}

          <div className="mb-8">
            <div className="flex space-x-4 mb-6"></div>

           
          </div>

          <div className="mb-6">
           

            {practiceData?.topics && practiceData.topics.length > 0 && (
              <div className="flex items-center space-x-3 mb-4">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium 
                  ${
                    practiceData.level === "beginner"
                      ? "bg-green-100 text-green-800"
                      : practiceData.level === "intermediate"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {practiceData.level.charAt(0).toUpperCase() +
                    practiceData.level.slice(1)}
                </span>

                {practiceData.topics.map((topic) => (
                  <span
                    key={topic}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            <p className="text-gray-600 mb-8">{practiceData?.description}</p>

            {loading ? (
              <div className="animate-pulse">
                <div className="h-96 bg-[#1b2b48]/80 backdrop-blur-sm rounded-lg mb-4"></div>
                <div className="h-8 bg-[#1b2b48]/80 w-1/3 rounded mb-4"></div>
                <div className="h-4 bg-[#1b2b48]/80 w-1/2 rounded mb-2"></div>
                <div className="h-4 bg-[#1b2b48]/80 w-2/3 rounded"></div>
              </div>
            ) : !practiceData ? (
              <div className="bg-[#1b2b48]/80 backdrop-blur-sm rounded-xl p-6 border border-[#2e3b56]/50 shadow-lg mb-6">
                <h2 className="text-2xl font-semibold mb-4">
                  Choose a Short Video to Practice With
                </h2>
                <p className="mb-4 text-white/70">
                  Our short video practice helps you improve your listening and
                  speaking skills with bite-sized content.
                </p>
                <Link
                  href="/short-videos"
                  className="inline-flex items-center bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Browse Short Videos
                </Link>
              </div>
            ) : (
              <>
                <div className="bg-[#1b2b48]/80 backdrop-blur-sm rounded-xl p-6 border border-[#2e3b56]/50 shadow-lg">
                  {/* YouTube Player with Timestamped Dialogue */}
                  <DeepgramContextProvider>
                    <TimestampedYouTubePlayer
                      podcast={practiceData}
                      onComplete={() => setCompleted(true)}
                    />
                  </DeepgramContextProvider>
                </div>

                {completed && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 backdrop-blur-sm text-green-300 rounded-lg mt-6">
                    <h3 className="font-bold text-lg mb-2">
                      Practice Completed!
                    </h3>
                    <p>
                      Great job completing this practice session. Ready for
                      another one?
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/short-videos"
                        className="inline-flex items-center bg-green-500/20 hover:bg-green-500/30 text-green-300 px-4 py-2 rounded-lg transition-colors"
                      >
                        Browse More Videos
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-8 p-6 bg-[#1b2b48]/80 backdrop-blur-sm rounded-lg border border-[#2e3b56]/50 shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">
                How to Use This Feature
              </h2>
              <div className="space-y-4 text-white/80">
                <p>
                  <span className="font-medium text-white">
                    1. Choose a mode:
                  </span>{" "}
                  Switch between Listening, Vocabulary, and Speaking practice
                  modes using the tabs.
                </p>
                <p>
                  <span className="font-medium text-white">
                    2. Listening mode:
                  </span>{" "}
                  Click on any dialogue line to play that segment of the video.
                </p>
                <p>
                  <span className="font-medium text-white">
                    3. Vocabulary mode:
                  </span>{" "}
                  Click on any word to see its translation and learn more about
                  its usage.
                </p>
                <p>
                  <span className="font-medium text-white">
                    4. Speaking mode:
                  </span>{" "}
                  Practice your pronunciation by repeating dialogue lines and
                  get feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

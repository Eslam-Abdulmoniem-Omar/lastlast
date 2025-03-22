"use client";

import { useState, useEffect } from "react";
import { fetchTranscript } from "@/lib/utils/youtubeUtils";

// Add a list of sample videos to test with
const SAMPLE_VIDEOS = [
  {
    title: "Default Test Video",
    url: "https://www.youtube.com/watch?v=ZacjOVVgoLY",
  },
  {
    title: "Short Video with Transcript",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", // First YouTube video (Me at the zoo)
  },
  {
    title: "YouTube Short",
    url: "https://www.youtube.com/shorts/VynLcYOUPz0",
  },
  {
    title: "Playlist Item",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLuKg-WhduhklQR2uqYo2MOEU2lJlGRzQ4",
  },
];

// Add debug logs to the component
export default function TestRapidAPI() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState(SAMPLE_VIDEOS[0].url);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"result" | "logs">("result");

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    setDebugLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFetchTranscript = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDebugLogs([]);
    addLog(`Starting fetch for URL: ${videoUrl}`);

    try {
      await fetchTranscript(videoUrl, {
        onStart: () => {
          console.log("Starting transcript fetch...");
          addLog("Starting transcript fetch...");
        },
        onSuccess: (data) => {
          console.log("Transcript fetch successful:", data);
          addLog(
            `Success! Source: ${data.transcriptSource}, Segments: ${
              data.segments?.length || 0
            }`
          );
          setResult(data);
        },
        onError: (err) => {
          console.error("Transcript fetch error:", err);
          addLog(`Error: ${err.message}`);
          setError(err.message || "An error occurred");
        },
        onComplete: () => {
          addLog("Fetch operation completed");
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error("Unhandled error in fetchTranscript:", err);
      addLog(`Unhandled error: ${err.message}`);
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on first load
    handleFetchTranscript();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        RapidAPI YouTube Transcript Test
      </h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          YouTube Video URL
        </label>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md p-2"
            placeholder="Enter YouTube URL"
          />
          <button
            onClick={handleFetchTranscript}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? "Loading..." : "Fetch Transcript"}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Sample Videos:
        </h3>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_VIDEOS.map((video, index) => (
            <button
              key={index}
              onClick={() => setVideoUrl(video.url)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full"
            >
              {video.title}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-md mb-4">
          <h2 className="font-bold">Error</h2>
          <p>{error}</p>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${
              activeTab === "result"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "bg-white text-gray-600"
            }`}
            onClick={() => setActiveTab("result")}
          >
            Result
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === "logs"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "bg-white text-gray-600"
            }`}
            onClick={() => setActiveTab("logs")}
          >
            Debug Logs ({debugLogs.length})
          </button>
        </div>

        <div className="p-4">
          {activeTab === "result" ? (
            result ? (
              <div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                  <p>
                    <strong>Source:</strong> {result.transcriptSource}
                  </p>
                  <p>
                    <strong>Title:</strong> {result.title}
                  </p>
                  <p>
                    <strong>Segments:</strong> {result.segments?.length || 0}
                  </p>
                </div>

                <h3 className="text-lg font-semibold mb-2">Segments</h3>
                {result.segments && result.segments.length > 0 ? (
                  <div className="overflow-y-auto max-h-[500px] border border-gray-200 rounded-md">
                    {result.segments.map((segment: any, index: number) => (
                      <div
                        key={segment.id}
                        className={`p-3 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } border-b border-gray-200`}
                      >
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">
                            {segment.speakerName}
                          </span>{" "}
                          ({segment.startTime.toFixed(2)}s -{" "}
                          {segment.endTime.toFixed(2)}s)
                        </p>
                        <p className="mt-1">{segment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No segments found</div>
                )}

                <h3 className="text-lg font-semibold mt-6 mb-2">
                  Raw Response
                </h3>
                <pre className="bg-gray-800 text-gray-100 p-4 rounded-md text-sm overflow-x-auto max-h-[300px]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : loading ? (
              <div className="py-10 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Fetching transcript...</p>
              </div>
            ) : (
              <div className="py-10 text-center text-gray-500">
                No results to display. Enter a YouTube URL and click "Fetch
                Transcript".
              </div>
            )
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-2">Debug Logs</h3>
              <div className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-y-auto max-h-[500px] font-mono text-sm">
                {debugLogs.length > 0 ? (
                  debugLogs.map((log, i) => (
                    <div key={i} className="py-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic">No logs available</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

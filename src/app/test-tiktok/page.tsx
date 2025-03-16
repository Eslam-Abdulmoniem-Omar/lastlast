"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import TikTokPlayer from "@/components/TikTokPlayer";
import { validateTikTokUrl } from "@/lib/utils/youtubeUtils";
import { DialogueLine } from "@/lib/types";

export default function TestTikTokPage() {
  const [tiktokUrl, setTiktokUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<DialogueLine[]>([]);
  const [rawResponse, setRawResponse] = useState<string>("");

  const sampleUrls = [
    "https://www.tiktok.com/@sambucha/video/7217107009999785262",
    "https://www.tiktok.com/@primemovies/video/7417251264725011755",
  ];

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTiktokUrl(e.target.value);
  };

  const handleSampleUrlClick = (url: string) => {
    setTiktokUrl(url);
  };

  const fetchTranscript = async () => {
    if (!validateTikTokUrl(tiktokUrl)) {
      toast.error("Please enter a valid TikTok URL");
      return;
    }

    setIsLoading(true);
    setTranscript([]);
    setRawResponse("");

    try {
      const response = await fetch(
        `/api/tiktok/transcript?url=${encodeURIComponent(
          tiktokUrl
        )}&t=${Date.now()}`
      );

      const data = await response.json();

      if (data.error) {
        toast.error(`Error: ${data.error}`);
        setRawResponse(JSON.stringify(data, null, 2));
        return;
      }

      if (data.data && data.data.segments) {
        setTranscript(
          data.data.segments.map((segment: any) => ({
            id: segment.id,
            text: segment.text,
            startTime: segment.startTime,
            endTime: segment.endTime,
          }))
        );

        toast.success(`Found ${data.data.segments.length} segments`);
      } else {
        toast.error("No transcript segments found");
      }

      setRawResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error fetching transcript:", error);
      toast.error("Failed to fetch transcript");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-12 pt-28 mt-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TikTok Transcript Test</h1>

        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Sample TikTok URLs</h2>
          <div className="flex flex-col gap-2">
            {sampleUrls.map((url) => (
              <button
                key={url}
                onClick={() => handleSampleUrlClick(url)}
                className="text-left text-blue-600 hover:underline"
              >
                {url}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={tiktokUrl}
              onChange={handleUrlChange}
              placeholder="Enter TikTok URL"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={fetchTranscript}
              disabled={isLoading || !tiktokUrl}
              className={`px-4 py-2 rounded-md ${
                isLoading || !tiktokUrl
                  ? "bg-gray-300 text-gray-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Loading..." : "Fetch Transcript"}
            </button>
          </div>
        </div>

        {tiktokUrl && validateTikTokUrl(tiktokUrl) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">TikTok Video</h2>
              <TikTokPlayer tiktokUrl={tiktokUrl} dialogueLines={transcript} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Transcript</h2>
              {transcript.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="divide-y">
                    {transcript.map((line) => (
                      <div key={line.id} className="p-3">
                        <p className="text-sm text-gray-500 mb-1">
                          {line.startTime.toFixed(1)}s -{" "}
                          {line.endTime?.toFixed(1)}s
                        </p>
                        <p>{line.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-center">
                  {isLoading
                    ? "Loading transcript..."
                    : "No transcript available. Click 'Fetch Transcript' to get transcript."}
                </div>
              )}
            </div>
          </div>
        )}

        {rawResponse && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">API Response</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
              {rawResponse}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}

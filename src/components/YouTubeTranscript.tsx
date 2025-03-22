"use client";

import { useState, useEffect } from "react";
import { extractYouTubeVideoId } from "@/lib/utils/youtubeUtils";

interface YouTubeTranscriptProps {
  transcriptUrl: string;
  youtubeUrl?: string;
}

export default function YouTubeTranscript({
  transcriptUrl,
  youtubeUrl,
}: YouTubeTranscriptProps) {
  const [transcript, setTranscript] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTranscript = async () => {
      if (!transcriptUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        // Check if this is our API-generated transcript URL
        if (transcriptUrl.startsWith("/api/youtube/transcript/")) {
          const videoId = transcriptUrl.split("/").pop();
          if (!videoId) throw new Error("Invalid transcript URL");

          const response = await fetch(`/api/youtube/transcript/${videoId}`);

          if (!response.ok) {
            throw new Error("Failed to fetch transcript");
          }

          const data = await response.json();
          setTranscript(data.transcript);
        } else {
          // Regular transcript URL
          const response = await fetch(transcriptUrl);

          if (!response.ok) {
            throw new Error("Failed to fetch transcript");
          }

          const text = await response.text();
          setTranscript(text);
        }
      } catch (error) {
        console.error("Error fetching transcript:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load transcript"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscript();
  }, [transcriptUrl]);

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-indigo-600 animate-pulse"></div>
          <div className="w-4 h-4 rounded-full bg-indigo-600 animate-pulse delay-75"></div>
          <div className="w-4 h-4 rounded-full bg-indigo-600 animate-pulse delay-150"></div>
        </div>
        <p className="text-center text-gray-500 mt-2">Loading transcript...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <p className="font-medium">Error loading transcript</p>
        <p className="text-sm">{error}</p>
        {youtubeUrl && (
          <p className="mt-2 text-sm">
            You can view captions directly on{" "}
            <a
              href={youtubeUrl.replace("/embed/", "/watch?v=")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              YouTube
            </a>
          </p>
        )}
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="p-4 bg-gray-50 text-gray-700 rounded-md">
        <p>No transcript available for this podcast.</p>
        {youtubeUrl && (
          <p className="mt-2 text-sm">
            You can view captions directly on{" "}
            <a
              href={youtubeUrl.replace("/embed/", "/watch?v=")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              YouTube
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-md">
      <h3 className="text-lg font-medium mb-3">Transcript</h3>
      <div className="max-h-96 overflow-y-auto prose prose-sm">
        {transcript.split("\n").map((paragraph, index) => (
          <p key={index} className="mb-2">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

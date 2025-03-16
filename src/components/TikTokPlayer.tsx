"use client";

import React, { useEffect, useState } from "react";
import { DialogueLine } from "@/lib/types";

interface TikTokPlayerProps {
  tiktokUrl: string;
  dialogueLines?: DialogueLine[];
  onPlaybackTimeUpdate?: (time: number) => void;
  currentLineIndex?: number;
}

export default function TikTokPlayer({
  tiktokUrl,
  dialogueLines = [],
  onPlaybackTimeUpdate,
  currentLineIndex = 0,
}: TikTokPlayerProps) {
  const [embedHtml, setEmbedHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate TikTok embed HTML
    const generateEmbedHtml = () => {
      if (!tiktokUrl || !validateTikTokUrl(tiktokUrl)) {
        setError("Invalid TikTok URL");
        setIsLoading(false);
        return;
      }

      try {
        // Extract the TikTok URL path for embedding
        const url = new URL(tiktokUrl);
        const path = url.pathname;

        // Create blockquote element for TikTok embed
        const html = `
          <blockquote class="tiktok-embed" cite="${tiktokUrl}" 
            data-video-id="${path.split("/").pop()}" 
            style="max-width: 100%; min-width: 100%; min-height: 750px;">
            <section></section>
          </blockquote>
        `;

        setEmbedHtml(html);
        setIsLoading(false);
      } catch (err) {
        console.error("Error generating TikTok embed:", err);
        setError("Failed to generate TikTok embed");
        setIsLoading(false);
      }
    };

    generateEmbedHtml();

    // Load TikTok embed script
    const loadTikTokScript = () => {
      if (
        document.querySelector('script[src="https://www.tiktok.com/embed.js"]')
      ) {
        // If script already exists, reload it
        window.TIKTOK && window.TIKTOK.reload && window.TIKTOK.reload();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.tiktok.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    };

    // Load TikTok script after embed HTML is set
    if (embedHtml) {
      loadTikTokScript();
    }
  }, [tiktokUrl]);

  return (
    <div className="w-full flex flex-col items-center">
      {isLoading ? (
        <div className="w-full h-[750px] bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
        </div>
      ) : error ? (
        <div className="w-full p-4 bg-red-50 text-red-500 rounded-lg">
          <p className="font-medium">Error loading TikTok video</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div
          className="w-full overflow-hidden rounded-lg bg-white"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      )}

      {dialogueLines && dialogueLines.length > 0 && (
        <div className="w-full mt-4 border rounded-lg overflow-hidden">
          <h3 className="px-4 py-2 bg-gray-50 font-medium border-b">
            Transcript
          </h3>
          <div className="divide-y">
            {dialogueLines.map((line, index) => (
              <div
                key={line.id}
                className={`p-3 ${
                  index === currentLineIndex ? "bg-blue-50" : ""
                }`}
              >
                <p className="text-sm text-gray-500 mb-1">
                  {line.startTime.toFixed(1)}s - {line.endTime.toFixed(1)}s
                </p>
                <p>{line.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Validate TikTok URL
function validateTikTokUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.includes("tiktok.com");
  } catch {
    return false;
  }
}

// Add this to global.d.ts or add it here
declare global {
  interface Window {
    TIKTOK?: {
      reload?: () => void;
    };
  }
}

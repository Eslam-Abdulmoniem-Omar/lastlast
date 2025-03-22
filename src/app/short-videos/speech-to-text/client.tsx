"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Mic, Volume2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SpeechToTextClient() {
  // Get search params to load transcript from URL
  const searchParams = useSearchParams();
  const videoTitle = searchParams.get("title") || "Practice Script";
  const videoId = searchParams.get("videoId");

  // Simple state for demo purposes
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow bg-gradient-to-br from-blue-50 via-indigo-50 to-white pt-36">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 bg-blue-600 rounded-xl p-3 text-white">
              <div className="flex items-center">
                <Link
                  href="/short-videos"
                  className="mr-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30"
                >
                  <ArrowLeft size={18} className="text-white" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{videoTitle}</h1>
                  <p className="text-sm text-blue-100">
                    Practice a dialogue script with AI roleplay and feedback
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Left panel */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Script Practice</h2>
              <p className="text-gray-600 mb-4">
                Practice your speaking with our AI-powered pronunciation
                feedback.
              </p>

              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <h3 className="font-medium mb-2">Current Script:</h3>
                <p className="italic">
                  "Do not be afraid. I am not afraid. Then come out."
                </p>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  className={`rounded-full p-4 ${
                    isRecording ? "bg-red-500" : "bg-blue-500"
                  } text-white`}
                  onClick={() => setIsRecording(!isRecording)}
                >
                  <Mic size={24} />
                </button>
              </div>
            </div>

            {/* Right panel */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Conversation</h2>

              <div className="space-y-4">
                <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none max-w-[80%]">
                  <p className="text-sm">Do not be afraid.</p>
                </div>

                <div className="bg-blue-500 text-white p-3 rounded-lg rounded-tr-none max-w-[80%] ml-auto">
                  <p className="text-sm">I am not afraid.</p>
                </div>

                <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <p className="text-sm">Then come out.</p>
                    <button className="p-1 bg-gray-200 rounded-full">
                      <Volume2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-700 text-sm">
                  Your next line: "Then you will be afraid."
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mb-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-yellow-700 text-center">
              Note: This is a simplified version of the speech-to-text
              functionality. Video ID: {videoId || "None"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

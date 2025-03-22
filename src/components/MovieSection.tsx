"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

export default function MovieSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Ensure video properly loads first frame for thumbnail
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      // Set current time to 0 to ensure thumbnail shows the first frame
      video.currentTime = 0;

      // Mark video as loaded after it's ready
      const handleCanPlay = () => {
        setVideoLoaded(true);
      };

      video.addEventListener("canplay", handleCanPlay);

      return () => {
        video.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;

      // Update progress
      setProgress((current / total) * 100);

      // Update time display
      setCurrentTime(formatTime(current));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(formatTime(videoRef.current.duration));
    }
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <section className="py-24 relative bg-gradient-to-b from-black to-[#0a192f] overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] -z-1"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -z-1"></div>

      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text content */}
          <div className="lg:w-1/2 text-white">
            <div className="inline-block px-4 py-2 bg-blue-500/10 rounded-full mb-6 border border-blue-500/30 backdrop-blur-sm">
              <span className="text-sm font-medium text-blue-400">
                Interactive Speaking Practice
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Speak like your{" "}
              <span className="text-[#5d9bff] italic relative inline-block transform hover:scale-105 transition-all duration-300">
                favorite actor
              </span>
            </h2>

            <p className="text-xl mb-8 text-gray-300 max-w-xl">
              Practice real-world English by speaking along with scenes from
              popular movies and TV shows. Get instant feedback on your
              pronunciation and fluency.
            </p>

            <div className="space-y-5 mb-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-[#5d9bff]/20 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-[#5d9bff]" />
                </div>
                <p className="text-gray-300">
                  Real-time pronunciation feedback as you speak famous movie
                  lines
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-[#5d9bff]/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-[#5d9bff]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                </div>
                <p className="text-gray-300">
                  Learn authentic expressions and slang used by native speakers
                </p>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center bg-[#5d9bff] text-white hover:bg-[#4a89ff] px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg shadow-blue-500/20 hover:-translate-y-1"
            >
              Try Speaking Practice
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Movie video with player */}
          <div className="lg:w-2/3 flex items-center justify-center">
            <div
              ref={containerRef}
              className="relative rounded-xl overflow-hidden shadow-2xl border border-[#1a2e4a] group w-full max-w-2xl"
            >
              <div className="aspect-video w-full relative overflow-hidden bg-[#060C15]">
                <video
                  ref={videoRef}
                  src="/video/speakSec.mp4"
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                ></video>

                {/* Loading indicator */}
                {!videoLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#5d9bff] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Center play button */}
                <div
                  className={`absolute inset-0 flex items-center justify-center ${
                    isPlaying
                      ? "opacity-0"
                      : "opacity-100 group-hover:opacity-100"
                  } transition-opacity duration-300`}
                  onClick={togglePlay}
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center cursor-pointer shadow-lg">
                    <svg
                      className="w-8 h-8 text-[#5d9bff] translate-x-0.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Player controls */}
              <div className="bg-[#060C15] py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full bg-[#5d9bff] flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {isPlaying ? (
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </div>
                  <div className="h-1 w-32 bg-gray-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#5d9bff] rounded"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-white/70 text-sm">
                  {currentTime} / {duration}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

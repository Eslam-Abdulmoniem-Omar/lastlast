"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Play, Pause } from "lucide-react";

export default function HowItWorksSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

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

  return (
    <section
      id="how-it-works"
      className="py-20 bg-gradient-to-b from-primary-light to-[#1a2a4d]"
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-blue-500/10 rounded-full mb-4 border border-blue-500/30 shadow-sm">
            <span className="text-sm font-bold text-white">How It Works</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
            Simple Steps to Improve Your English
          </h2>
          <p className="text-white/80 max-w-3xl mx-auto">
            Watch how easy it is to practice with your favorite YouTube content
            and improve your English speaking skills.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Video Player */}
          <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#0a1428]">
            <div
              className="aspect-video relative cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <video
                ref={videoRef}
                src="/video/movie.mp4"
                className="w-full h-full object-cover"
                onClick={togglePlay}
              />

              {/* Play/Pause overlay - hidden when playing unless hovering */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                  isPlaying && !isHovering
                    ? "opacity-0"
                    : "opacity-100 bg-black/30"
                }`}
                onClick={togglePlay}
              >
                <div
                  className={`w-16 h-16 rounded-full bg-white/80 flex items-center justify-center text-[#5d9bff] transition-all duration-300 ${
                    isPlaying && !isHovering
                      ? "opacity-0 scale-75"
                      : "opacity-100 hover:scale-110"
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step by step instructions */}
          <div className="text-white">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#5d9bff] flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    Paste a YouTube URL
                  </h3>
                  <p className="text-white/70">
                    Find your favorite YouTube Shorts or videos and paste the
                    URL into our platform.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#5d9bff] flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    Our AI Analyzes the Content
                  </h3>
                  <p className="text-white/70">
                    Our AI technology automatically extracts the dialogue,
                    creates practice segments, and prepares interactive
                    exercises.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#5d9bff] flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    Practice and Get Feedback
                  </h3>
                  <p className="text-white/70">
                    Speak along with the video and receive instant feedback on
                    your pronunciation and fluency from our AI.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/short-videos/add"
                  className="inline-flex items-center bg-[#5d9bff] text-white hover:bg-[#4a89ff] px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg hover:-translate-y-1"
                >
                  Try It Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

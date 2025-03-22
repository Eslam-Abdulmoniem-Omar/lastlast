"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play, Info, Menu, X } from "lucide-react";
import TimestampedYouTubePlayer from "@/components/TimestampedYouTubePlayer";
import { sampleYoutubeShort } from "@/lib/data/sampleYoutubeShort";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Home() {
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handlePracticeComplete = () => {
    setPracticeCompleted(true);
  };

  const toggleVideo = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  // If user is authenticated, they will be redirected by the useEffect
  // Only show home page content for non-authenticated users
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-950/95 to-indigo-950/95 backdrop-blur-md z-50 shadow-md shadow-blue-900/20 border-b border-blue-800/30">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 overflow-hidden flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-300 rounded-lg">
                <Image
                  src="/logo.png"
                  alt="SayFluent Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10 group-hover:opacity-0 transition-opacity"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-indigo-200 group-hover:from-blue-200 group-hover:to-indigo-300 transition-all duration-300">
                  SayFluent
                </span>
                <span className="text-blue-400 text-[10px] font-medium leading-none -mt-1 opacity-80">
                  AI-Powered Learning
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-7">
              <Link
                href="#how-it-works"
                className="text-blue-100 hover:text-white transition-colors hover:underline underline-offset-4 decoration-blue-400/30"
              >
                How It Works
              </Link>
              <Link
                href="#try-it"
                className="text-blue-100 hover:text-white transition-colors hover:underline underline-offset-4 decoration-blue-400/30"
              >
                Try It
              </Link>
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Login
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white p-1 rounded-md hover:bg-blue-800/40 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pt-5 pb-3 flex flex-col gap-3 border-t border-blue-800/30 mt-3 animate-fadeIn">
              <Link
                href="#how-it-works"
                className="text-blue-100 hover:text-white transition-colors py-2.5 px-2 hover:bg-blue-800/20 rounded-lg flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Info className="w-4 h-4 mr-2 text-blue-400" />
                How It Works
              </Link>
              <Link
                href="#try-it"
                className="text-blue-100 hover:text-white transition-colors py-2.5 px-2 hover:bg-blue-800/20 rounded-lg flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Play className="w-4 h-4 mr-2 text-blue-400" />
                Try It
              </Link>
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center mt-2 w-full sm:w-fit"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Empty space to compensate for fixed header */}
      <div className="h-16"></div>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white py-20">
        <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-10">
            <div className="mb-3">
              <span className="px-4 py-1 rounded-full bg-blue-800/60 text-blue-200 text-sm font-medium">
                AI-powered English coach
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Turn YouTube Shorts into Your English Trainer – No More{" "}
              <span className="text-blue-400">Boring</span> Lessons!
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Paste a YouTube Shorts link & start practicing instantly! Watch,
              listen, and speak with real-time AI feedback.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Link
                href="/dashboard"
                className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-3 rounded-lg font-medium flex items-center justify-center"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/short-videos"
                className="bg-blue-800 text-white hover:bg-blue-900 px-8 py-3 rounded-lg font-medium flex items-center justify-center"
              >
                Practice with Short Videos
                <Play className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 mt-10 lg:mt-0">
            <div className="relative rounded-lg overflow-hidden shadow-2xl">
              <Image
                src="/hero-image.png"
                alt="English Learning with SayFluent"
                width={1200}
                height={800}
                className="w-full h-auto object-cover"
                priority
                quality={100}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-16 bg-gradient-to-r from-indigo-900 to-purple-900 text-white"
      >
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center mb-10">
              <Info className="w-10 h-10 mr-4 text-purple-300" />
              <h2 className="text-4xl md:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-200">
                How It Works
              </h2>
            </div>

            <div className="relative bg-black/40 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm border border-purple-500/30">
              <div className="aspect-video relative">
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-black/30 z-10 transition-opacity duration-300 ${
                    isVideoPlaying
                      ? "opacity-0 pointer-events-none"
                      : "opacity-100"
                  }`}
                  onClick={toggleVideo}
                >
                  <div className="text-center">
                    <button
                      className="w-24 h-24 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg transition-transform duration-300 hover:scale-110 mb-4 mx-auto"
                      aria-label="Play video"
                    >
                      <Play className="w-12 h-12 text-white ml-1" />
                    </button>
                    <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">
                      Watch How SayFluent Works
                    </h3>
                  </div>
                </div>

                <video
                  ref={videoRef}
                  className="w-full h-full object-cover rounded-xl"
                  src="/video/movie.mp4"
                  preload="metadata"
                  onClick={toggleVideo}
                  onEnded={() => setIsVideoPlaying(false)}
                  controls={isVideoPlaying}
                  muted={true}
                  playsInline
                  onLoadedData={(e) => {
                    // Set current time to 0.5 seconds to get a good thumbnail frame
                    const video = e.currentTarget;
                    video.currentTime = 0.5;
                    // Once we've set the time, remove the muted attribute so real playback is normal
                    video.addEventListener(
                      "seeked",
                      () => {
                        video.muted = false;
                      },
                      { once: true }
                    );
                  }}
                ></video>

                {/* Decorative elements */}
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full opacity-40 blur-xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full opacity-30 blur-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Short Video Section */}
      <section
        id="try-it"
        className="py-16 bg-gradient-to-br from-slate-800 to-blue-900 text-white"
      >
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-200">
              Try It Out– See How It Works
            </h2>

            <div className="bg-slate-900/50 p-6 rounded-xl shadow-2xl backdrop-blur-sm">
              <DeepgramContextProvider>
                <TimestampedYouTubePlayer
                  podcast={sampleYoutubeShort}
                  onComplete={handlePracticeComplete}
                />
              </DeepgramContextProvider>
            </div>

            {practiceCompleted && (
              <div className="p-5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-xl mt-8 shadow-lg">
                <p className="font-semibold text-emerald-300 text-lg mb-1">
                  You&apos;ve completed this practice!
                </p>
                <p className="text-emerald-100">
                  Try clicking on different dialogue lines or using the guided
                  practice mode.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Ready to Transform Your English?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Join thousands of learners who have accelerated their English
            fluency using our innovative platform.
          </p>
          <Link
            href="#try-it"
            className="bg-white text-green-700 hover:bg-green-50 px-10 py-4 rounded-lg font-medium text-lg inline-block"
          >
            Start Your Journey Today
          </Link>
        </div>
      </section>
    </main>
  );
}

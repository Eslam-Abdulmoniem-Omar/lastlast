"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Headphones,
  BookOpen,
  Languages,
  Mic,
  Video,
} from "lucide-react";
import WorldMap from "@/components/WorldMap";
import MovieSection from "@/components/MovieSection";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Home() {
  const { user } = useAuth();

  // Determine the destination for CTA buttons based on auth status
  const ctaPath = user ? "/dashboard" : "/signup";

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#102054] via-primary to-primary-light text-white py-24">
        <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-10">
            <div className="inline-block px-3 py-1 bg-secondary/20 rounded-full mb-6 border border-secondary/30">
              <span className="text-sm font-medium text-white">
                AI-powered English coach
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
              Turn YouTube Shorts into Your English Trainer – No More{" "}
              <span className="text-[#5d9bff] relative inline-block text-[105%] italic transform -rotate-1 px-0.5 hover:rotate-0 transition-all duration-300 bg-gradient-to-r from-[#4d7efa]/0 via-[#4d7efa]/10 to-[#4d7efa]/0 bg-[length:100%_6px] bg-bottom bg-no-repeat">
                Boring
              </span>{" "}
              Lessons!
            </h1>
            <p className="text-xl mb-8 text-white">
              Paste a YouTube Shorts link & start practicing instantly! Watch,
              listen, and speak with real-time AI feedback.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Link
                href={ctaPath}
                className="bg-secondary text-white hover:bg-secondary-light px-8 py-4 rounded-lg font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 border-2 border-secondary-light/30 text-lg"
              >
                Start Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/short-videos"
                className="bg-primary-light text-white hover:bg-primary px-8 py-4 rounded-lg font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 border-2 border-white/20 text-lg"
              >
                Try it Free
                <Video className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 mt-10 lg:mt-0">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-secondary/30 rounded-full z-0"></div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/20 rounded-full z-0"></div>
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shadow-2xl relative z-10">
                <Image
                  src="/hero-image.png"
                  alt="Learn English with Podcasts"
                  width={720}
                  height={600}
                  className="rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* World Map Section */}
      <WorldMap />

      {/* Movie Speaking Section */}
      <MovieSection />

      {/* Avoid Wrong Translation Section */}
      <section className="py-16 bg-gradient-to-b from-primary-light to-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-secondary/10 rounded-full mb-4 border border-secondary/20 shadow-sm">
              <span className="text-sm font-bold text-white">
                Contextual Understanding
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
              Get the Right Meaning, Every Time
            </h2>
            <p className="text-white/80 max-w-3xl mx-auto">
              Our AI ensures precise translations by understanding context, so
              you never get misled by words with multiple meanings.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Movie image at the top */}
            <div className="mb-8 flex flex-col items-center">
              <div className="relative w-[350px] h-[600px] rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 group">
                <Image
                  src="/movie.png"
                  alt="Movie scene with English subtitles"
                  fill
                  sizes="(max-width: 768px) 100vw, 350px"
                  className="object-cover object-center"
                  priority
                />
              </div>

              {/* Titles below the movie image */}
              <div className="text-center mt-6 mb-2">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Translation Accuracy Comparison:{" "}
                  <span className="text-secondary">Our AI</span> vs. Google
                  Translate vs. ChatGPT
                </h3>
                <p className="text-xl text-white/90 font-semibold">
                  &quot;Billiards&quot;? See Which Translator Understands
                  Context!
                </p>
              </div>
            </div>

            {/* Three images side by side */}
            <div className="grid grid-cols-1 gap-8 mb-8">
              {/* First image - billard.png */}
              <div className="bg-[#102054] p-4 rounded-xl shadow-xl border border-white/10 transition-all hover:shadow-2xl duration-300 overflow-hidden">
                <h3 className="text-xl font-bold mb-3 text-white text-center">
                  Our AI{" "}
                </h3>
                <div className="flex justify-center">
                  <div className="relative w-full max-w-[600px]">
                    <Image
                      src="/billard.png"
                      alt="Context-aware translation example"
                      width={600}
                      height={400}
                      className="rounded-lg w-full"
                      quality={100}
                    />
                  </div>
                </div>
              </div>

              {/* Second row with two images side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Second image - billard2.png */}
                <div className="bg-[#102054] p-4 rounded-xl shadow-xl border border-white/10 transition-all hover:shadow-2xl duration-300 overflow-hidden">
                  <h3 className="text-xl font-bold mb-3 text-white text-center">
                    Google Translate
                  </h3>
                  <div className="flex justify-center">
                    <div className="relative w-full">
                      <Image
                        src="/billard2.png"
                        alt="Translation comparison"
                        width={500}
                        height={650}
                        className="rounded-lg mx-auto"
                        quality={100}
                      />
                    </div>
                  </div>
                </div>

                {/* Third image - billard3.png */}
                <div className="bg-[#102054] p-4 rounded-xl shadow-xl border border-white/10 transition-all hover:shadow-2xl duration-300 overflow-hidden">
                  <h3 className="text-xl font-bold mb-3 text-white text-center">
                    ChatGPT{" "}
                  </h3>
                  <div className="flex justify-center">
                    <div className="relative w-full">
                      <Image
                        src="/billard3.png"
                        alt="Standard translation example"
                        width={500}
                        height={650}
                        className="rounded-lg mx-auto"
                        quality={100}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-white/80 mb-6 italic">
                &quot;Billiards&quot; correctly translated based on the
                scene&apos;s context - not just a generic dictionary definition
              </p>
              <Link
                href={ctaPath}
                className="inline-flex items-center bg-secondary/90 hover:bg-secondary text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md"
              >
                Try It Yourself
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-[#102054] via-primary to-primary-light text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Ready to Transform Your English?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-white">
            Join thousands of learners who have accelerated their English
            fluency using our innovative podcast-based learning platform.
          </p>
          <Link
            href={ctaPath}
            className="bg-secondary text-white hover:bg-secondary-light px-10 py-5 rounded-lg font-bold text-lg inline-flex items-center transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 border-2 border-secondary-light/30"
          >
            Start Your Journey Today
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}

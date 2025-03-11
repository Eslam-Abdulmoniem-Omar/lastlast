"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ArrowRight, FilePlus, Clock, BookOpen, User } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // If not logged in and not loading, redirect to login
    if (mounted && !loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router, mounted]);

  // Loading state
  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0c1527] to-[#111f3d]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#232323] rounded-xl mb-4 flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-700 animate-pulse rounded-lg"></div>
          </div>
          <div className="h-4 w-24 bg-gray-700 animate-pulse rounded mb-3"></div>
          <div className="h-3 w-32 bg-gray-700/50 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0c1527] to-[#111f3d] py-12 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          </div>

          {/* Welcome section */}
          <div className="bg-[#1b2b48]/80 backdrop-blur-sm rounded-xl p-6 border border-[#2e3b56]/50 shadow-lg mb-8">
            <div className="flex items-center mb-4">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-12 h-12 rounded-full mr-4 border-2 border-secondary/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-white mr-4">
                  <User size={24} />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">
                  Welcome{user?.displayName ? `, ${user.displayName}` : ""}!
                </h2>
                <p className="text-gray-300">
                  Ready to improve your English with YouTube videos?
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/short-videos/add"
              className="bg-[#1b2b48]/80 backdrop-blur-sm rounded-xl p-6 border border-[#2e3b56]/50 hover:bg-[#1b2b48] transition-colors hover:shadow-lg"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-white">
                  <FilePlus size={20} />
                </div>
                <h3 className="text-lg font-semibold ml-3">Add Video</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Add a new YouTube video to practice with
              </p>
              <div className="flex items-center text-secondary">
                <span className="text-sm font-medium">Get Started</span>
                <ArrowRight size={16} className="ml-2" />
              </div>
            </Link>

            <Link
              href="/short-videos"
              className="bg-[#1b2b48]/80 backdrop-blur-sm rounded-xl p-6 border border-[#2e3b56]/50 hover:bg-[#1b2b48] transition-colors hover:shadow-lg"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-white">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-semibold ml-3">My Videos</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Browse your saved videos and continue practice
              </p>
              <div className="flex items-center text-secondary">
                <span className="text-sm font-medium">View Library</span>
                <ArrowRight size={16} className="ml-2" />
              </div>
            </Link>
          </div>

          {/* Get started prompt */}
          <div className="bg-gradient-to-r from-primary to-[#1a2242] rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-2">Start Practicing Now</h2>
            <p className="text-gray-300 mb-4">
              Find a YouTube short video and start improving your English skills
              with real-world content.
            </p>
            <Link
              href="/short-videos/add"
              className="inline-flex items-center bg-secondary hover:bg-secondary-light text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Add YouTube Video
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

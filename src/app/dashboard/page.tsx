"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../lib/hooks/useAuth";
import { Plus, Video, FileText, Upload } from "lucide-react";
import ProtectedRoute from "../components/ProtectedRoute";
import UserProfile from "../components/UserProfile";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Simulate loading to give time for authentication
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with padding for fixed navbar */}
      <div className="pt-20 pb-6 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome to Your Dashboard
          </h1>
          <p className="text-indigo-100 mt-2">
            Manage your short videos and practice sessions
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* User Profile Section */}
          <div className="lg:col-span-1">
            <UserProfile />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
              {/* Short Videos Container */}
              <Link
                href="/short-videos"
                className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group"
              >
                <div className="p-8 flex flex-col items-center text-center h-full">
                  <div className="bg-white/20 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Video className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">
                    Browse Short Videos
                  </h3>
                  <p className="text-blue-100 mb-6">
                    View and practice with our library of short videos for
                    language learning
                  </p>
                  <div className="mt-auto inline-flex items-center justify-center px-5 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white font-medium group-hover:bg-white/20 transition-colors">
                    Browse Videos <FileText className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Welcome message for new users */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="bg-white shadow-md rounded-xl p-6 border border-indigo-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Getting Started
                </h2>
                <p className="text-gray-600 mb-4">
                  Welcome to your dashboard! From here you can:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                  <li>
                    Browse our library of short videos for language practice
                  </li>
                  <li>Track your learning progress</li>
                </ul>
                <p className="text-gray-600">
                  Click on the card above to get started!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

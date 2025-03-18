"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import AuthButtons from "@/app/components/AuthButtons";
import Link from "next/link";

export default function AuthTestPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#102054] via-primary to-primary-light py-16">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-xl border border-white/20">
            <h1 className="text-3xl font-bold text-white mb-6">
              Authentication Test Page
            </h1>

            <div className="bg-white/10 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                Authentication Status:
              </h2>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                  <p className="text-white">Loading authentication state...</p>
                </div>
              ) : user ? (
                <div className="text-white">
                  <p className="mb-2">
                    ✅ <span className="font-medium">Authenticated</span>
                  </p>
                  <div className="bg-white/10 p-4 rounded-lg">
                    <p>
                      <span className="font-medium">User ID:</span> {user.uid}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {user.email}
                    </p>
                    <p>
                      <span className="font-medium">Display Name:</span>{" "}
                      {user.displayName || "Not set"}
                    </p>
                    <p>
                      <span className="font-medium">Email Verified:</span>{" "}
                      {user.emailVerified ? "Yes" : "No"}
                    </p>
                    {user.photoURL && (
                      <div className="mt-2">
                        <p className="font-medium mb-1">Profile Photo:</p>
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          className="w-16 h-16 rounded-full border-2 border-white/30"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-white">❌ Not authenticated</p>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                Authentication Actions:
              </h2>
              <AuthButtons />
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

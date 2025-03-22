"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { Home } from "lucide-react";
import { signInWithGoogleRedirect } from "@/lib/firebase/authService";

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in - always to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // No need to redirect here, the useEffect will handle it
    } catch (error) {
      console.error("Error during Google sign in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRedirectSignIn = () => {
    setIsLoading(true);
    // We don't need a try/catch here as the redirect will take the user away from this page
    signInWithGoogleRedirect().catch((error) => {
      console.error("Error during Google redirect sign in:", error);
      setIsLoading(false);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Simple Header with only Home button */}
      <header className="bg-gradient-to-r from-blue-950/95 to-indigo-950/95 backdrop-blur-md z-50 shadow-md shadow-blue-900/20 border-b border-blue-800/30">
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

            {/* Only a Home button */}
            <Link
              href="/"
              className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-blue-800/20"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pt-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Link href="/">
              <div className="inline-block">
                <Image
                  src="/logo.png"
                  alt="SayFluent Logo"
                  width={180}
                  height={60}
                  className="mx-auto"
                  onError={(e) => {
                    // Fallback if logo image doesn't exist
                    e.currentTarget.src =
                      "https://via.placeholder.com/180x60?text=SayFluent";
                  }}
                />
              </div>
            </Link>
            <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Or{" "}
              <Link
                href="/signup"
                className="font-medium text-green-600 hover:text-green-500"
              >
                create a new account
              </Link>
            </p>
          </div>

          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 relative"
              >
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                ) : null}
                <span
                  className={`flex items-center ${
                    isLoading ? "opacity-0" : ""
                  }`}
                >
                  <FcGoogle className="h-5 w-5 mr-2" />
                  Sign in with Google (Popup)
                </span>
              </button>

              <button
                onClick={handleGoogleRedirectSignIn}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 relative"
              >
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : null}
                <span
                  className={`flex items-center ${
                    isLoading ? "opacity-0" : ""
                  }`}
                >
                  <FcGoogle className="h-5 w-5 mr-2" />
                  Sign in with Google (Redirect)
                </span>
              </button>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      SayFluent uses Google for secure authentication
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-center">
                <Link
                  href="/"
                  className="font-medium text-green-600 hover:text-green-500"
                >
                  Return to home page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

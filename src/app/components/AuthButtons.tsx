"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from "@/lib/firebase/authService";
import { toast } from "react-hot-toast";

export default function AuthButtons() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (isSignUp) {
      await signUpWithEmail(email, password, displayName);
    } else {
      await signInWithEmail(email, password);
    }

    // Clear form
    setPassword("");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    await resetPassword(email);
    setShowResetPassword(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <p className="font-medium">Signed in as:</p>
          <p className="text-gray-600">{user.name || user.email}</p>
          {user.profilePicture && (
            <img
              src={user.profilePicture}
              alt="Profile"
              className="w-10 h-10 rounded-full mx-auto mt-2"
            />
          )}
        </div>
        <button
          onClick={signOut}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-lg shadow-md w-full max-w-md">
      {!showResetPassword ? (
        <>
          <h2 className="text-2xl font-bold text-center">
            {isSignUp ? "Create an Account" : "Sign In"}
          </h2>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            {isSignUp && (
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  isSignUp ? "Create a password" : "Enter your password"
                }
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          {!isSignUp && (
            <button
              onClick={() => setShowResetPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-800 text-center"
            >
              Forgot password?
            </button>
          )}

          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-300 flex-grow"></div>
            <span className="px-3 text-gray-500 text-sm">OR</span>
            <div className="border-t border-gray-300 flex-grow"></div>
          </div>

          <button
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              width="24px"
              height="24px"
            >
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="text-sm text-center">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-1 text-blue-600 hover:text-blue-800"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-center">Reset Password</h2>

          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="resetEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="resetEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Send Reset Link
            </button>
          </form>

          <button
            onClick={() => setShowResetPassword(false)}
            className="text-sm text-blue-600 hover:text-blue-800 text-center"
          >
            Back to Sign In
          </button>
        </>
      )}
    </div>
  );
}

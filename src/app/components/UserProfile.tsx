"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiLogOut, FiUser } from "react-icons/fi";

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-4">
          {user.profilePicture && !imageError ? (
            <Image
              src={user.profilePicture}
              alt={user.name || "User"}
              fill
              className="rounded-full object-cover"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
              <FiUser className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-800">
          {user.name || "User"}
        </h2>

        <p className="text-sm text-gray-500 mt-1">{user.email}</p>

        <div className="w-full mt-6">
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 relative"
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : null}
            <span
              className={`flex items-center ${isLoading ? "opacity-0" : ""}`}
            >
              <FiLogOut className="mr-2" />
              Sign Out
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

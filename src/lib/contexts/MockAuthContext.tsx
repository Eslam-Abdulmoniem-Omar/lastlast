"use client";

import React, { createContext, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

// Simplified mock user type
interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface MockAuthContextType {
  user: MockUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<MockUser | null>;
  signOut: () => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => null,
  signOut: async () => {},
});

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user exists in local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("mockUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing stored user:", e);
      }
    }
    setLoading(false);
  }, []);

  const signInWithGoogle = async (): Promise<MockUser | null> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      // Create a mock user
      const mockUser: MockUser = {
        uid: "mock-uid-" + Math.random().toString(36).substring(2, 9),
        email: "user@example.com",
        displayName: "Mock User",
        photoURL:
          "https://ui-avatars.com/api/?name=Mock+User&background=random",
      };

      // Save to localStorage to persist across page refreshes
      localStorage.setItem("mockUser", JSON.stringify(mockUser));

      // Update state
      setUser(mockUser);
      toast.success("Successfully signed in with mock authentication!");

      return mockUser;
    } catch (error) {
      console.error("Error in mock sign in:", error);
      toast.error("Mock sign-in failed");
      return null;
    }
  };

  const signOutUser = async () => {
    try {
      // Remove from localStorage
      localStorage.removeItem("mockUser");
      setUser(null);
      toast.success("Successfully signed out");
    } catch (error) {
      toast.error("Sign-out failed");
    }
  };

  return (
    <MockAuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signOut: signOutUser,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
}

export { MockAuthContext };

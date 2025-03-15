"use client";

import React, { createContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { toast } from "react-hot-toast";
import {
  signInWithGoogle,
  logoutUser,
  handleRedirectResult,
} from "../firebase/authService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Handle redirect result on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkRedirectResult = async () => {
        try {
          const redirectUser = await handleRedirectResult();
          if (redirectUser) {
            console.log("User signed in via redirect:", redirectUser);
          }
        } catch (error) {
          console.error("Error handling redirect result:", error);
        }
      };

      checkRedirectResult();
    }
  }, []);

  useEffect(() => {
    // Set a timeout to prevent indefinite loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth state loading timed out after 5 seconds");
        setLoading(false);
      }
    }, 5000);

    // Only set up the auth listener if auth is not null
    if (!auth) {
      console.error(
        "Auth object is null, Firebase may not be initialized correctly"
      );
      setLoading(false);
      clearTimeout(loadingTimeout);
      return;
    }

    try {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          setUser(user);
          setLoading(false);
          setAuthInitialized(true);
          clearTimeout(loadingTimeout);
        },
        (error) => {
          console.error("Auth state change error:", error);
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      );

      return () => {
        unsubscribe();
        clearTimeout(loadingTimeout);
      };
    } catch (error) {
      console.error("Error setting up auth state listener:", error);
      setLoading(false);
      clearTimeout(loadingTimeout);
      return () => {
        clearTimeout(loadingTimeout);
      };
    }
  }, [loading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading && !authInitialized,
        signInWithGoogle,
        signOut: logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };

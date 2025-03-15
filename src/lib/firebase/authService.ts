import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  browserPopupRedirectResolver,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth } from "./firebase";
import { toast } from "react-hot-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
  const provider = new GoogleAuthProvider();
  // Add scopes for better profile access
  provider.addScope("email");
  provider.addScope("profile");

  try {
    // Use a simpler approach without the browserPopupRedirectResolver
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Store user data in Firestore
    await saveUserToFirestore(user);

    toast.success("Successfully signed in with Google!");
    return user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    console.log("Detailed error information:", JSON.stringify(error, null, 2));

    if (error.code === "auth/popup-closed-by-user") {
      toast.error("Sign-in was cancelled");
    } else if (error.code === "auth/popup-blocked") {
      toast.error(
        "Pop-up was blocked by your browser. Please allow pop-ups for this site."
      );
    } else if (error.code === "auth/unauthorized-domain") {
      toast.error(
        "This domain is not authorized for Firebase authentication. Please try again later."
      );
      console.error(
        "Unauthorized domain. Current URL:",
        window.location.origin,
        "Add this domain to Firebase Console -> Authentication -> Settings -> Authorized domains."
      );
    } else {
      toast.error(error.message || "Failed to sign in with Google");
    }

    return null;
  }
};

// Sign out
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    toast.success("Successfully signed out");
  } catch (error: any) {
    console.error("Error signing out", error);
    toast.error(error.message || "Failed to sign out");
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Save user data to Firestore
const saveUserToFirestore = async (user: User): Promise<void> => {
  if (!user.email) return;

  const userRef = doc(db, "users", user.uid);

  try {
    // Check if user document already exists
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // Create new user document if it doesn't exist
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "User",
        photoURL: user.photoURL || "",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });
    } else {
      // Update last login time
      await setDoc(
        userRef,
        {
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error("Error saving user data to Firestore:", error);
  }
};

// Sign in with email and password
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User | null> => {
  try {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    toast.success("Successfully signed in!");
    return userCredential.user;
  } catch (error: any) {
    console.error("Error signing in with email", error);

    if (error.code === "auth/invalid-credential") {
      toast.error("Invalid email or password. Please try again.");
    } else if (error.code === "auth/too-many-requests") {
      toast.error(
        "Too many failed login attempts. Please try again later or reset your password."
      );
    } else {
      toast.error(error.message || "Failed to sign in");
    }

    return null;
  }
};

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<User | null> => {
  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import(
      "firebase/auth"
    );
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update profile with display name
    if (user) {
      await updateProfile(user, { displayName });

      // Save to Firestore
      await saveUserToFirestore({
        ...user,
        displayName, // Ensure the displayName is included in Firestore
      });
    }

    toast.success("Account successfully created!");
    return user;
  } catch (error: any) {
    console.error("Error signing up with email", error);

    if (error.code === "auth/email-already-in-use") {
      toast.error("Email already in use. Try signing in instead.");
    } else if (error.code === "auth/weak-password") {
      toast.error("Password is too weak. Please use a stronger password.");
    } else {
      toast.error(error.message || "Failed to create account");
    }

    return null;
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const { sendPasswordResetEmail } = await import("firebase/auth");
    await sendPasswordResetEmail(auth, email);
    toast.success("Password reset email sent! Check your inbox.");
    return true;
  } catch (error: any) {
    console.error("Error resetting password", error);

    if (error.code === "auth/user-not-found") {
      toast.error("No account found with this email address.");
    } else if (error.code === "auth/invalid-email") {
      toast.error("Invalid email address. Please check and try again.");
    } else {
      toast.error(error.message || "Failed to send reset email");
    }

    return false;
  }
};

// Sign in with Google using redirect (as fallback)
export const signInWithGoogleRedirect = async (): Promise<void> => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  try {
    await signInWithRedirect(auth, provider);
    // The user will be redirected to Google's authorization page
    // After authentication, they'll be redirected back to your app
    // Handle the redirect result in your AuthContext useEffect
  } catch (error: any) {
    console.error("Error setting up Google redirect sign in:", error);
    toast.error("Failed to set up Google authentication");
  }
};

// Function to handle redirect result - should be called on page load
export const handleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // User successfully authenticated
      const user = result.user;
      await saveUserToFirestore(user);
      toast.success("Successfully signed in with Google!");
      return user;
    }
    return null;
  } catch (error: any) {
    console.error("Error handling redirect result:", error);
    if (error.code === "auth/unauthorized-domain") {
      toast.error("This domain is not authorized for Firebase authentication.");
      console.error("Unauthorized domain:", window.location.origin);
    } else if (error.code) {
      toast.error(`Authentication error: ${error.code}`);
    } else {
      toast.error("Failed to complete authentication");
    }
    return null;
  }
};
